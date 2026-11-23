import unittest
from datetime import date, timedelta
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import main
from database import get_db
from models import Base, BookingSession


class BackendV1ApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)

        def override_get_db():
            with Session(self.engine) as db:
                yield db

        self.original_overrides = main.app.dependency_overrides.copy()
        main.app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(main.app)
        self.client.__enter__()

        self.business_id, self.headers, self.email = self.create_account(
            "Primary Business"
        )

    def tearDown(self):
        self.client.__exit__(None, None, None)
        main.app.dependency_overrides.clear()
        main.app.dependency_overrides.update(self.original_overrides)
        self.engine.dispose()

    def create_account(self, business_name):
        unique = uuid4().hex
        business_response = self.client.post(
            "/businesses",
            json={"business_name": business_name}
        )
        self.assertEqual(business_response.status_code, 201)
        business_id = business_response.json()["id"]

        email = f"{unique}@example.com"
        registration = self.client.post(
            "/auth/register",
            json={
                "name": "Business User",
                "email": email,
                "password": "StrongPass123!",
                "business_id": business_id
            }
        )
        self.assertEqual(registration.status_code, 201)

        login = self.client.post(
            "/auth/login",
            data={
                "username": email,
                "password": "StrongPass123!"
            }
        )
        self.assertEqual(login.status_code, 200)
        token = login.json()["access_token"]
        return business_id, {"Authorization": f"Bearer {token}"}, email

    def create_customer(self, phone_number="9876543210"):
        response = self.client.post(
            "/customers",
            headers=self.headers,
            json={
                "name": "Test Customer",
                "phone_number": phone_number,
                "email": None,
                "notes": "API integration test"
            }
        )
        self.assertEqual(response.status_code, 201)
        return response.json()

    def set_open_all_days(self):
        response = self.client.put(
            "/business/working-hours",
            headers=self.headers,
            json={
                "working_hours": [
                    {
                        "weekday": weekday,
                        "open_time": "09:00",
                        "close_time": "17:00"
                    }
                    for weekday in range(7)
                ]
            }
        )
        self.assertEqual(response.status_code, 200, response.text)

    def test_cors_is_limited_to_local_vite_origin(self):
        preflight_headers = {
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type"
        }
        allowed = self.client.options(
            "/health",
            headers=preflight_headers
        )
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(
            allowed.headers["access-control-allow-origin"],
            "http://localhost:5173"
        )

        preflight_headers["Origin"] = "http://localhost:5174"
        rejected = self.client.options(
            "/health",
            headers=preflight_headers
        )
        self.assertNotIn(
            "access-control-allow-origin",
            rejected.headers
        )

    def create_appointment(self, customer_id, appointment_date, time_text):
        return self.client.post(
            "/appointments",
            headers=self.headers,
            json={
                "customer_id": customer_id,
                "appointment_date": appointment_date.strftime("%Y-%m-%d"),
                "appointment_time": time_text,
                "reason": "Consultation"
            }
        )

    def test_auth_business_and_customer_crud(self):
        failed_login = self.client.post(
            "/auth/login",
            data={
                "username": self.email,
                "password": "wrong-password"
            }
        )
        self.assertEqual(failed_login.status_code, 401)

        profile = self.client.get("/auth/me", headers=self.headers)
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.json()["business_id"], self.business_id)

        business = self.client.get(
            f"/businesses/{self.business_id}",
            headers=self.headers
        )
        self.assertEqual(business.status_code, 200)
        self.assertEqual(business.json()["business_name"], "Primary Business")

        customer = self.create_customer()
        customer_id = customer["id"]

        listed = self.client.get("/customers", headers=self.headers)
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.json()), 1)

        retrieved = self.client.get(
            f"/customers/{customer_id}",
            headers=self.headers
        )
        self.assertEqual(retrieved.status_code, 200)

        updated = self.client.put(
            f"/customers/{customer_id}",
            headers=self.headers,
            json={"name": "Updated Customer"}
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["name"], "Updated Customer")

        deleted_customer = self.create_customer("9876543212")
        deleted = self.client.delete(
            f"/customers/{deleted_customer['id']}",
            headers=self.headers
        )
        self.assertEqual(deleted.status_code, 200)

    def test_business_profile_update_is_scoped(self):
        updated = self.client.put(
            f"/businesses/{self.business_id}",
            headers=self.headers,
            json={
                "business_name": "Updated Business",
                "business_type": "Consulting",
                "phone_number": "5550101234",
                "email": "contact@example.com",
                "address": "123 Main Street"
            }
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["business_name"], "Updated Business")
        self.assertEqual(updated.json()["business_type"], "Consulting")

        _, other_headers, _ = self.create_account("Other Business")
        denied = self.client.put(
            f"/businesses/{self.business_id}",
            headers=other_headers,
            json={"business_name": "Unauthorized Change"}
        )
        self.assertEqual(denied.status_code, 403)

        own_business = self.client.get(
            f"/businesses/{self.business_id}",
            headers=self.headers
        )
        self.assertEqual(own_business.json()["business_name"], "Updated Business")

    def test_standalone_ai_booking_endpoint(self):
        self.set_open_all_days()
        appointment_date = date.today() + timedelta(days=4)

        messages = [
            "I want to book an appointment",
            "Standalone Booking Customer",
            "9876543230",
            appointment_date.isoformat(),
            "14:00",
            "Consultation",
            "yes"
        ]
        replies = []
        for message in messages:
            response = self.client.post(
                "/ai/book-appointment",
                headers=self.headers,
                json={"message": message}
            )
            self.assertEqual(response.status_code, 200, response.text)
            self.assertIn("status", response.json())
            replies.append(response.json()["reply"])

        self.assertIn("successfully booked", replies[-1])
        appointments = self.client.get(
            "/appointments",
            headers=self.headers,
            params={"appointment_date": appointment_date.isoformat()}
        )
        self.assertEqual(appointments.status_code, 200)
        self.assertEqual(len(appointments.json()), 1)

    def test_working_hours_holidays_and_direct_appointment_crud(self):
        customer = self.create_customer()
        self.set_open_all_days()

        hours = self.client.get(
            "/business/working-hours",
            headers=self.headers
        )
        self.assertEqual(hours.status_code, 200)
        self.assertEqual(len(hours.json()), 7)

        appointment_date = date.today() + timedelta(days=14)
        holiday = self.client.post(
            "/business/holidays",
            headers=self.headers,
            json={
                "holiday_date": appointment_date.isoformat(),
                "name": "Closed for the day"
            }
        )
        self.assertEqual(holiday.status_code, 201)

        holiday_list = self.client.get(
            "/business/holidays",
            headers=self.headers
        )
        self.assertEqual(len(holiday_list.json()), 1)
        duplicate_holiday = self.client.post(
            "/business/holidays",
            headers=self.headers,
            json={"holiday_date": appointment_date.isoformat()}
        )
        self.assertEqual(duplicate_holiday.status_code, 409)

        on_holiday = self.create_appointment(
            customer["id"],
            appointment_date,
            "10:00 AM"
        )
        self.assertEqual(on_holiday.status_code, 409)

        removed = self.client.delete(
            f"/business/holidays/{holiday.json()['id']}",
            headers=self.headers
        )
        self.assertEqual(removed.status_code, 200)

        first = self.create_appointment(
            customer["id"],
            appointment_date,
            "10:00 AM"
        )
        self.assertEqual(first.status_code, 201, first.text)
        first_id = first.json()["id"]

        overlap = self.create_appointment(
            customer["id"],
            appointment_date,
            "10:15"
        )
        self.assertEqual(overlap.status_code, 409)

        adjacent = self.create_appointment(
            customer["id"],
            appointment_date,
            "10:30"
        )
        self.assertEqual(adjacent.status_code, 201, adjacent.text)
        adjacent_id = adjacent.json()["id"]

        conflicting_update = self.client.put(
            f"/appointments/{first_id}",
            headers=self.headers,
            json={"appointment_time": "10:15 AM"}
        )
        self.assertEqual(conflicting_update.status_code, 409)

        moved = self.client.put(
            f"/appointments/{first_id}",
            headers=self.headers,
            json={"appointment_time": "11:00"}
        )
        self.assertEqual(moved.status_code, 200)
        self.assertEqual(moved.json()["appointment_time"], "11:00:00")

        listed = self.client.get(
            "/appointments",
            headers=self.headers,
            params={"appointment_date": appointment_date.isoformat()}
        )
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.json()), 2)

        retrieved = self.client.get(
            f"/appointments/{first_id}",
            headers=self.headers
        )
        self.assertEqual(retrieved.status_code, 200)

        cancelled = self.client.patch(
            f"/appointments/{adjacent_id}/cancel",
            headers=self.headers
        )
        self.assertEqual(cancelled.status_code, 200)

        after_cancel = self.create_appointment(
            customer["id"],
            appointment_date,
            "10:30"
        )
        self.assertEqual(after_cancel.status_code, 201, after_cancel.text)

        past = self.create_appointment(
            customer["id"],
            date.today() - timedelta(days=1),
            "10:00"
        )
        self.assertEqual(past.status_code, 409)

        closed_weekday = (date.today() + timedelta(days=1)).weekday()
        today_weekday = date.today().weekday()
        self.client.put(
            "/business/working-hours",
            headers=self.headers,
            json={
                "working_hours": [
                    {
                        "weekday": today_weekday,
                        "open_time": "09:00",
                        "close_time": "17:00"
                    }
                ]
            }
        )
        self.assertNotEqual(closed_weekday, today_weekday)
        closed_day = self.create_appointment(
            customer["id"],
            date.today() + timedelta(days=1),
            "10:00"
        )
        self.assertEqual(closed_day.status_code, 409)

    def test_ai_booking_faq_cancellation_rescheduling_and_history(self):
        customer = self.create_customer()
        self.set_open_all_days()

        faq = self.client.post(
            "/faqs",
            headers=self.headers,
            json={
                "question": "What are your working hours?",
                "answer": "We are open from 9 AM to 5 PM."
            }
        )
        self.assertEqual(faq.status_code, 201)
        faq_id = faq.json()["id"]
        self.assertEqual(
            len(self.client.get("/faqs", headers=self.headers).json()),
            1
        )
        self.assertEqual(
            self.client.get(
                f"/faqs/{faq_id}",
                headers=self.headers
            ).status_code,
            200
        )
        updated_faq = self.client.put(
            f"/faqs/{faq_id}",
            headers=self.headers,
            json={"answer": "Open every day from 9 AM to 5 PM."}
        )
        self.assertEqual(updated_faq.status_code, 200)

        chat_payload = {"customer_id": customer["id"]}
        with patch("main.get_ai_response", return_value="Hello from AI."):
            normal_reply = self.client.post(
                "/ai/chat",
                headers=self.headers,
                json={**chat_payload, "message": "Hello"}
            )
        self.assertEqual(normal_reply.status_code, 200)
        self.assertEqual(normal_reply.json(), {"reply": "Hello from AI."})

        faq_reply = self.client.post(
            "/ai/chat",
            headers=self.headers,
            json={
                **chat_payload,
                "message": "What are your working hours?"
            }
        )
        self.assertEqual(faq_reply.status_code, 200)
        self.assertEqual(
            faq_reply.json()["reply"],
            "Open every day from 9 AM to 5 PM."
        )

        booking_date = date.today() + timedelta(days=2)
        booking_messages = [
            "I want to book an appointment",
            "AI Booking Customer",
            "9876543220",
            booking_date.isoformat(),
            "10:30 AM",
            "Consultation",
            "yes"
        ]
        replies = []
        for message in booking_messages:
            response = self.client.post(
                "/ai/chat",
                headers=self.headers,
                json={**chat_payload, "message": message}
            )
            self.assertEqual(response.status_code, 200, response.text)
            replies.append(response.json()["reply"])
        with Session(self.engine) as db:
            booking_states = [
                (
                    item.id,
                    item.user_id,
                    item.business_id,
                    item.status,
                    item.customer_name,
                    item.customer_phone,
                    item.appointment_date,
                    item.appointment_time
                )
                for item in db.query(BookingSession).all()
            ]
        self.assertIn(
            "successfully booked",
            replies[-1],
            f"replies={replies!r}, booking_states={booking_states!r}"
        )

        booking_cancel = self.client.post(
            "/ai/chat",
            headers=self.headers,
            json={
                **chat_payload,
                "message": "cancel appointment 9876543220"
            }
        )
        self.assertEqual(booking_cancel.status_code, 200)
        cancellation_confirmed = self.client.post(
            "/ai/chat",
            headers=self.headers,
            json={**chat_payload, "message": "yes"}
        )
        self.assertIn("cancelled successfully", cancellation_confirmed.json()["reply"])

        reschedule_customer = self.create_customer("9876543221")
        reschedule_date = date.today() + timedelta(days=3)
        appointment = self.create_appointment(
            reschedule_customer["id"],
            reschedule_date,
            "11:00 AM"
        )
        self.assertEqual(appointment.status_code, 201, appointment.text)
        appointment_id = appointment.json()["id"]

        begin_reschedule = self.client.post(
            "/ai/chat",
            headers=self.headers,
            json={
                **chat_payload,
                "message": "reschedule appointment 9876543221"
            }
        )
        self.assertIn("What new date and time", begin_reschedule.json()["reply"])

        target_date = reschedule_date + timedelta(days=1)
        propose_reschedule = self.client.post(
            "/ai/chat",
            headers=self.headers,
            json={
                **chat_payload,
                "message": f"{target_date.isoformat()} at 14:00"
            }
        )
        self.assertIn("Would you like to confirm", propose_reschedule.json()["reply"])

        confirm_reschedule = self.client.post(
            "/ai/chat",
            headers=self.headers,
            json={**chat_payload, "message": "yes"}
        )
        self.assertIn("rescheduled successfully", confirm_reschedule.json()["reply"])

        updated_appointment = self.client.get(
            f"/appointments/{appointment_id}",
            headers=self.headers
        )
        self.assertEqual(
            updated_appointment.json()["appointment_date"],
            target_date.isoformat()
        )
        self.assertEqual(
            updated_appointment.json()["appointment_time"],
            "14:00:00"
        )

        faq_delete = self.client.delete(
            f"/faqs/{faq_id}",
            headers=self.headers
        )
        self.assertEqual(faq_delete.status_code, 200)

        conversations = self.client.get(
            "/conversations",
            headers=self.headers,
            params={"limit": 10, "offset": 0}
        )
        self.assertEqual(conversations.status_code, 200)
        conversation_id = next(
            item["id"]
            for item in conversations.json()["items"]
            if item["customer_id"] == customer["id"]
        )
        history = self.client.get(
            f"/conversations/{conversation_id}",
            headers=self.headers
        )
        self.assertEqual(history.status_code, 200)
        roles = [message["role"] for message in history.json()["messages"]]
        self.assertIn("user", roles)
        self.assertIn("assistant", roles)
        self.assertGreaterEqual(
            history.json()["conversation"]["last_message_at"],
            history.json()["conversation"]["started_at"]
        )

        close = self.client.patch(
            f"/conversations/{conversation_id}/close",
            headers=self.headers
        )
        self.assertEqual(close.status_code, 200)
        self.assertEqual(close.json()["status"], "completed")

        inactive_faq = self.client.get(
            f"/faqs/{faq_id}",
            headers=self.headers
        )
        self.assertFalse(inactive_faq.json()["is_active"])

    def test_business_settings_and_records_are_isolated(self):
        customer = self.create_customer()
        self.set_open_all_days()
        appointment_date = date.today() + timedelta(days=10)
        appointment = self.create_appointment(
            customer["id"],
            appointment_date,
            "10:00"
        )
        self.assertEqual(appointment.status_code, 201)
        holiday = self.client.post(
            "/business/holidays",
            headers=self.headers,
            json={"holiday_date": appointment_date.isoformat()}
        )
        self.assertEqual(holiday.status_code, 201)

        other_business_id, other_headers, _ = self.create_account(
            "Other Business"
        )
        self.assertEqual(
            self.client.get(
                f"/businesses/{self.business_id}",
                headers=other_headers
            ).status_code,
            403
        )
        self.assertEqual(
            self.client.get(
                f"/customers/{customer['id']}",
                headers=other_headers
            ).status_code,
            404
        )
        self.assertEqual(
            self.client.get(
                f"/appointments/{appointment.json()['id']}",
                headers=other_headers
            ).status_code,
            404
        )
        self.assertEqual(
            self.client.get(
                "/business/working-hours",
                headers=other_headers
            ).json(),
            []
        )
        self.assertEqual(
            self.client.delete(
                f"/business/holidays/{holiday.json()['id']}",
                headers=other_headers
            ).status_code,
            404
        )
        self.assertNotEqual(other_business_id, self.business_id)


if __name__ == "__main__":
    unittest.main()
