
from datetime import date, time
from pydantic import BaseModel, ConfigDict


class AppointmentCreate(BaseModel):
    customer_id: int
    appointment_date: date
    appointment_time: time
    reason: str | None = None


class AppointmentUpdate(BaseModel):
    appointment_date: date | None = None
    appointment_time: time | None = None
    reason: str | None = None


class AppointmentResponse(BaseModel):
    id: int
    customer_id: int
    business_id: int
    appointment_date: date
    appointment_time: time
    reason: str | None
    status: str

    model_config = ConfigDict(from_attributes=True)
