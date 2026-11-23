import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

import main
from ai_schemas import ChatRequest
from conversation_schemas import ConversationDetail, ConversationPage
from conversation_service import (
    get_conversation_history,
    get_or_create_active_conversation,
    save_message,
)
from models import Base, Business, BusinessFAQ, Conversation, ConversationMessage, Customer


class ConversationHistoryTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)

        self.business = Business(business_name="Business One")
        self.other_business = Business(business_name="Business Two")
        self.db.add_all([self.business, self.other_business])
        self.db.flush()

        self.customer = Customer(
            name="Customer One",
            phone_number="9876543210",
            business_id=self.business.id
        )
        self.other_customer = Customer(
            name="Customer Two",
            phone_number="9876543211",
            business_id=self.other_business.id
        )
        self.db.add_all([self.customer, self.other_customer])
        self.db.commit()

        self.user = SimpleNamespace(
            id=1,
            business_id=self.business.id
        )
        self.other_user = SimpleNamespace(
            id=2,
            business_id=self.other_business.id
        )

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def chat(self, message, customer_id=None):
        return main.ai_chat(
            ChatRequest(message=message, customer_id=customer_id),
            self.db,
            self.user
        )

    def messages_for(self, conversation_id):
        return (
            self.db.query(ConversationMessage)
            .filter(ConversationMessage.conversation_id == conversation_id)
            .order_by(ConversationMessage.id)
            .all()
        )

    def assert_chat_history(self, response, expected_reply):
        self.assertEqual(response, {"reply": expected_reply})
        conversation = self.db.query(Conversation).one()
        messages = self.messages_for(conversation.id)
        self.assertEqual(
            [(message.role, message.content) for message in messages],
            [("user", messages[0].content), ("assistant", expected_reply)]
        )
        return conversation

    def test_normal_chat_records_messages_and_reuses_customer_conversation(self):
        with patch("main.get_ai_response", side_effect=["Hello!", "Welcome back!"]):
            first = self.chat("hello", self.customer.id)
            conversation = self.assert_chat_history(first, "Hello!")
            old_timestamp = datetime(2000, 1, 1)
            conversation.last_message_at = old_timestamp
            self.db.commit()
            second = self.chat("how are you?", self.customer.id)

        self.assertEqual(second, {"reply": "Welcome back!"})
        self.assertEqual(
            self.db.query(Conversation).filter(
                Conversation.business_id == self.business.id,
                Conversation.customer_id == self.customer.id
            ).count(),
            1
        )
        messages = self.messages_for(conversation.id)
        self.assertEqual(
            [message.role for message in messages],
            ["user", "assistant", "user", "assistant"]
        )
        self.assertEqual(messages[2].content, "how are you?")
        self.assertGreater(conversation.last_message_at, old_timestamp)

    def test_anonymous_messages_reuse_business_conversation(self):
        with patch("main.get_ai_response", side_effect=["Hello!", "Hi again!"]):
            self.chat("hello")
            response = self.chat("hello again")

        self.assertEqual(response, {"reply": "Hi again!"})
        self.assertEqual(
            self.db.query(Conversation).filter(
                Conversation.business_id == self.business.id,
                Conversation.customer_id.is_(None)
            ).count(),
            1
        )

    def test_booking_reply_is_recorded(self):
        with patch(
            "main.process_booking",
            return_value={"reply": "What is your name?", "status": "collecting"}
        ):
            response = self.chat("I want to book an appointment")

        self.assert_chat_history(response, "What is your name?")

    def test_faq_reply_is_recorded(self):
        self.db.add(BusinessFAQ(
            business_id=self.business.id,
            question="What are your working hours?",
            answer="We are open from 9 AM to 5 PM."
        ))
        self.db.commit()

        response = self.chat("What are your working hours?")

        self.assert_chat_history(response, "We are open from 9 AM to 5 PM.")

    def test_cancellation_reply_is_recorded(self):
        with patch("main.find_customer_appointments", return_value=[]):
            response = self.chat("cancel appointment for 9876543210")

        self.assert_chat_history(
            response,
            "No upcoming confirmed appointments were found."
        )

    def test_rescheduling_reply_is_recorded(self):
        with patch("main.find_customer_appointments", return_value=[]):
            response = self.chat("reschedule appointment for 9876543210")

        self.assert_chat_history(
            response,
            "I couldn't find an upcoming confirmed appointment for that phone number."
        )

    def test_customer_must_belong_to_authenticated_business(self):
        with self.assertRaises(HTTPException) as error:
            self.chat("hello", self.other_customer.id)

        self.assertEqual(error.exception.status_code, 404)
        self.assertEqual(self.db.query(Conversation).count(), 0)

    def test_whitespace_message_is_not_saved(self):
        with self.assertRaises(HTTPException) as error:
            self.chat("   ")

        self.assertEqual(error.exception.status_code, 422)
        self.assertEqual(self.db.query(Conversation).count(), 0)
        self.assertEqual(self.db.query(ConversationMessage).count(), 0)

    def test_conversation_routes_are_paginated_and_business_scoped(self):
        own_conversation = get_or_create_active_conversation(
            self.db,
            self.business.id,
            self.customer.id
        )
        own_conversation.summary = "Customer asked about booking."
        save_message(self.db, own_conversation.id, "user", "Hello")
        save_message(self.db, own_conversation.id, "assistant", "Hi")
        other_conversation = get_or_create_active_conversation(
            self.db,
            self.other_business.id,
            self.other_customer.id
        )
        save_message(self.db, other_conversation.id, "user", "Private")
        self.db.commit()

        page_data = main.list_conversations(
            limit=1,
            offset=0,
            db=self.db,
            current_user=self.user
        )
        page = ConversationPage.model_validate(page_data)
        self.assertEqual(page.total, 1)
        self.assertEqual([item.id for item in page.items], [own_conversation.id])
        self.assertEqual(
            page.items[0].summary,
            "Customer asked about booking."
        )

        history_data = main.read_conversation(
            own_conversation.id,
            self.db,
            self.user
        )
        detail = ConversationDetail.model_validate(history_data)
        self.assertEqual(
            detail.conversation.summary,
            "Customer asked about booking."
        )
        self.assertEqual(
            [message.role for message in detail.messages],
            ["user", "assistant"]
        )
        self.assertIsNone(get_conversation_history(
            self.db,
            own_conversation.id,
            self.other_business.id
        ))

        with self.assertRaises(HTTPException) as error:
            main.read_conversation(
                own_conversation.id,
                self.db,
                self.other_user
            )
        self.assertEqual(error.exception.status_code, 404)

        with self.assertRaises(HTTPException) as error:
            main.complete_conversation(
                own_conversation.id,
                self.db,
                self.other_user
            )
        self.assertEqual(error.exception.status_code, 404)

        closed = main.complete_conversation(
            own_conversation.id,
            self.db,
            self.user
        )
        self.assertEqual(closed.status, "completed")


if __name__ == "__main__":
    unittest.main()
