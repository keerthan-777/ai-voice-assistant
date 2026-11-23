from datetime import date, time

from pydantic import BaseModel, ConfigDict, Field, model_validator


class WorkingHourInput(BaseModel):
    weekday: int = Field(ge=0, le=6, description="Monday=0 through Sunday=6")
    open_time: time
    close_time: time

    @model_validator(mode="after")
    def validate_time_range(self):
        if self.close_time <= self.open_time:
            raise ValueError("Closing time must be after opening time.")
        return self


class WorkingHoursUpdate(BaseModel):
    working_hours: list[WorkingHourInput]

    @model_validator(mode="after")
    def validate_unique_weekdays(self):
        weekdays = [item.weekday for item in self.working_hours]
        if len(weekdays) != len(set(weekdays)):
            raise ValueError("Each weekday can only be configured once.")
        return self


class WorkingHourResponse(BaseModel):
    id: int
    business_id: int
    weekday: int
    open_time: time
    close_time: time

    model_config = ConfigDict(from_attributes=True)


class HolidayCreate(BaseModel):
    holiday_date: date
    name: str | None = Field(default=None, max_length=120)


class HolidayResponse(BaseModel):
    id: int
    business_id: int
    holiday_date: date
    name: str | None

    model_config = ConfigDict(from_attributes=True)
