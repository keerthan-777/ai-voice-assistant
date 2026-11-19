
from pydantic import BaseModel, ConfigDict


class BusinessCreate(BaseModel):
    business_name: str
    business_type: str | None = None
    phone_number: str | None = None
    email: str | None = None
    address: str | None = None


class BusinessResponse(BaseModel):
    id: int
    business_name: str
    business_type: str | None
    phone_number: str | None
    email: str | None
    address: str | None

    model_config = ConfigDict(from_attributes=True)

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)
    business_id: int


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    business_id: int

    model_config = ConfigDict(from_attributes=True)
