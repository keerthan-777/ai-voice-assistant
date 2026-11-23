
from datetime import datetime
from sqlalchemy.orm import Session

from models import Business, Conversation, ConversationMessage


def create_conversation(
    db: Session,
    business_id: int,
    customer_id: int | None = None,
    channel: str = "chat"
):
    conversation = Conversation(
        business_id=business_id,
        customer_id=customer_id,
        status="active",
        channel=channel
    )

    db.add(conversation)
    db.flush()

    return conversation


def get_or_create_active_conversation(
    db: Session,
    business_id: int,
    customer_id: int | None = None,
    channel: str = "chat"
):
    customer_filter = (
        Conversation.customer_id.is_(None)
        if customer_id is None
        else Conversation.customer_id == customer_id
    )

    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.business_id == business_id,
            customer_filter,
            Conversation.status == "active"
        )
        .order_by(
            Conversation.last_message_at.desc(),
            Conversation.id.desc()
        )
        .first()
    )

    if conversation is not None:
        return conversation

    # Serialize first-conversation creation for a business to avoid duplicates.
    db.query(Business.id).filter(
        Business.id == business_id
    ).with_for_update().first()

    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.business_id == business_id,
            customer_filter,
            Conversation.status == "active"
        )
        .order_by(
            Conversation.last_message_at.desc(),
            Conversation.id.desc()
        )
        .with_for_update()
        .first()
    )

    if conversation is None:
        conversation = create_conversation(
            db=db,
            business_id=business_id,
            customer_id=customer_id,
            channel=channel
        )

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

    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()

    if conversation is None:
        raise ValueError("Conversation not found")

    message = ConversationMessage(
        conversation_id=conversation_id,
        role=role,
        content=content.strip()
    )

    db.add(message)
    conversation.last_message_at = datetime.now()
    db.flush()

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
    business_id: int,
    limit: int = 20,
    offset: int = 0
):
    query = db.query(Conversation).filter(
        Conversation.business_id == business_id
    )

    return {
        "items": query.order_by(
            Conversation.last_message_at.desc(),
            Conversation.id.desc()
        ).offset(offset).limit(limit).all(),
        "total": query.count(),
        "limit": limit,
        "offset": offset
    }


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
    db.flush()

    return conversation
