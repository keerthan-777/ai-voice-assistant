
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    customer_id: int | None = Field(default=None, gt=0)


class ChatResponse(BaseModel):
    reply: str
