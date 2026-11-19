
from pydantic import BaseModel, ConfigDict


class CustomerCreate(BaseModel):
    name: str
    phone_number: str
    email: str | None = None
    notes: str | None = None


class CustomerUpdate(BaseModel):
    name: str | None = None
    phone_number: str | None = None
    email: str | None = None
    notes: str | None = None


class CustomerResponse(BaseModel):
    id: int
    name: str
    phone_number: str
    email: str | None
    notes: str | None
    business_id: int

    model_config = ConfigDict(from_attributes=True)
