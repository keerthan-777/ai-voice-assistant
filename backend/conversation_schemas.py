from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ConversationSummary(BaseModel):
    id: int
    business_id: int
    customer_id: int | None
    status: str
    channel: str
    started_at: datetime
    last_message_at: datetime
    summary: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ConversationMessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationDetail(BaseModel):
    conversation: ConversationSummary
    messages: list[ConversationMessageResponse]


class ConversationPage(BaseModel):
    items: list[ConversationSummary]
    total: int
    limit: int
    offset: int
