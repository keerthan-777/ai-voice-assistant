
from datetime import datetime
from sqlalchemy.orm import Session

from models import Conversation, ConversationMessage


def create_conversation(
    db: Session,
    business_id: int,
    customer_id: int = None,
    channel: str = "chat"
):
    conversation = Conversation(
        business_id=business_id,
        customer_id=customer_id,
        status="active",
        channel=channel
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return conversation


def save_message(
    db: Session,
    conversation_id: int,
    role: str,
    content: str
):
    if role not in ["user", "assistant"]:
        raise ValueError("Invalid message role")

    if not content or not content.strip():
        raise ValueError("Message content cannot be empty")

    message = ConversationMessage(
        conversation_id=conversation_id,
        role=role,
        content=content.strip()
    )

    db.add(message)

    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    db.commit()
    db.refresh(message)

    return message


def get_conversation_history(
    db: Session,
    conversation_id: int,
    business_id: int
):
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.business_id == business_id
    ).first()

    if not conversation:
        return None

    messages = db.query(ConversationMessage).filter(
        ConversationMessage.conversation_id == conversation_id
    ).order_by(
        ConversationMessage.created_at.asc(),
        ConversationMessage.id.asc()
    ).all()

    return {
        "conversation": conversation,
        "messages": messages
    }


def get_business_conversations(
    db: Session,
    business_id: int
):
    return db.query(Conversation).filter(
        Conversation.business_id == business_id
    ).order_by(
        Conversation.last_message_at.desc()
    ).all()


def close_conversation(
    db: Session,
    conversation_id: int,
    business_id: int
):
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.business_id == business_id
    ).first()

    if not conversation:
        return None

    conversation.status = "completed"

    db.commit()
    db.refresh(conversation)

    return conversation
