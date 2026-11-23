
from datetime import date, time
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator

from appointment_date_utils import parse_appointment_date
from appointment_time_utils import parse_appointment_time


class AppointmentCreate(BaseModel):
    customer_id: int
    appointment_date: date
    appointment_time: time
    reason: str | None = None

    @field_validator("appointment_date", mode="before")
    @classmethod
    def parse_date(cls, value):
        if isinstance(value, date) and not isinstance(value, datetime):
            return value

        parsed_date = parse_appointment_date(str(value))
        if parsed_date is None:
            raise ValueError(
                "Enter a valid appointment date, such as 2026-11-25 "
                "or 25-11-2026."
            )
        return parsed_date

    @field_validator("appointment_time", mode="before")
    @classmethod
    def parse_time(cls, value):
        parsed_time = parse_appointment_time(value)
        if parsed_time is None:
            raise ValueError(
                "Enter a valid time, such as 10:30 AM or 14:00."
            )
        return parsed_time


class AppointmentUpdate(BaseModel):
    appointment_date: date | None = None
    appointment_time: time | None = None
    reason: str | None = None

    @field_validator("appointment_date", mode="before")
    @classmethod
    def parse_date(cls, value):
        if value is None or (
            isinstance(value, date) and not isinstance(value, datetime)
        ):
            return value

        parsed_date = parse_appointment_date(str(value))
        if parsed_date is None:
            raise ValueError(
                "Enter a valid appointment date, such as 2026-11-25 "
                "or 25-11-2026."
            )
        return parsed_date

    @field_validator("appointment_time", mode="before")
    @classmethod
    def parse_time(cls, value):
        if value is None:
            return value

        parsed_time = parse_appointment_time(value)
        if parsed_time is None:
            raise ValueError(
                "Enter a valid time, such as 10:30 AM or 14:00."
            )
        return parsed_time


class AppointmentResponse(BaseModel):
    id: int
    customer_id: int
    business_id: int
    appointment_date: date
    appointment_time: time
    reason: str | None
    status: str

    model_config = ConfigDict(from_attributes=True)
