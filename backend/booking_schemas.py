
from pydantic import BaseModel, Field


class BookingMessage(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class BookingResponse(BaseModel):
    reply: str
    status: str
