from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class FAQCreate(BaseModel):
    question: str = Field(min_length=3, max_length=500)
    answer: str = Field(min_length=2, max_length=2000)


class FAQUpdate(BaseModel):
    question: str | None = Field(default=None, min_length=3, max_length=500)
    answer: str | None = Field(default=None, min_length=2, max_length=2000)
    is_active: bool | None = None


class FAQResponse(BaseModel):
    id: int
    business_id: int
    question: str
    answer: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
