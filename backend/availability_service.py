from datetime import date, datetime, time, timedelta

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from models import (
    Appointment,
    Business,
    BusinessHoliday,
    BusinessWorkingHour,
)


APPOINTMENT_DURATION = timedelta(minutes=30)


def get_working_hours(db: Session, business_id: int):
    return (
        db.query(BusinessWorkingHour)
        .filter(BusinessWorkingHour.business_id == business_id)
        .order_by(BusinessWorkingHour.weekday)
        .all()
    )


def replace_working_hours(
    db: Session,
    business_id: int,
    working_hours: list
):
    db.query(Business.id).filter(
        Business.id == business_id
    ).with_for_update().first()

    db.query(BusinessWorkingHour).filter(
        BusinessWorkingHour.business_id == business_id
    ).delete(synchronize_session=False)

    db.add_all(
        BusinessWorkingHour(
            business_id=business_id,
            weekday=item.weekday,
            open_time=item.open_time,
            close_time=item.close_time
        )
        for item in working_hours
    )
    db.flush()

    return get_working_hours(db, business_id)


def get_business_holidays(db: Session, business_id: int):
    return (
        db.query(BusinessHoliday)
        .filter(BusinessHoliday.business_id == business_id)
        .order_by(BusinessHoliday.holiday_date)
        .all()
    )


def add_business_holiday(
    db: Session,
    business_id: int,
    holiday_date: date,
    name: str | None
):
    db.query(Business.id).filter(
        Business.id == business_id
    ).with_for_update().first()

    holiday = BusinessHoliday(
        business_id=business_id,
        holiday_date=holiday_date,
        name=name
    )
    db.add(holiday)
    db.flush()
    return holiday


def remove_business_holiday(
    db: Session,
    business_id: int,
    holiday_id: int
):
    db.query(Business.id).filter(
        Business.id == business_id
    ).with_for_update().first()

    holiday = db.query(BusinessHoliday).filter(
        BusinessHoliday.id == holiday_id,
        BusinessHoliday.business_id == business_id
    ).first()

    if holiday is None:
        return False

    db.delete(holiday)
    db.flush()
    return True


def validate_appointment_slot(
    db: Session,
    business_id: int,
    appointment_date: date | None,
    appointment_time: time | None,
    exclude_appointment_id: int | None = None,
    now: datetime | None = None
) -> str | None:
    if appointment_date is None or appointment_time is None:
        return "A valid appointment date and time are required."

    current_time = now or datetime.now()
    appointment_start = datetime.combine(
        appointment_date,
        appointment_time
    )

    if appointment_date < current_time.date():
        return "The appointment date cannot be in the past."

    if appointment_start <= current_time:
        return "The appointment time must be in the future."

    db.query(Business.id).filter(
        Business.id == business_id
    ).with_for_update().first()

    holiday = db.query(BusinessHoliday).filter(
        BusinessHoliday.business_id == business_id,
        BusinessHoliday.holiday_date == appointment_date
    ).with_for_update().first()

    if holiday is not None:
        return "The business is closed on that holiday."

    working_hours = db.query(BusinessWorkingHour).filter(
        BusinessWorkingHour.business_id == business_id
    ).with_for_update().all()

    if not working_hours:
        return "Business working hours are not configured."

    day_hours = next(
        (
            item for item in working_hours
            if item.weekday == appointment_date.weekday()
        ),
        None
    )

    if day_hours is None:
        return "The business is closed on that day."

    appointment_end = appointment_start + APPOINTMENT_DURATION

    if (
        appointment_time < day_hours.open_time
        or appointment_end.date() != appointment_date
        or appointment_end.time() > day_hours.close_time
    ):
        return "The appointment must fit within the business working hours."

    earliest_conflict = appointment_start - APPOINTMENT_DURATION
    overlapping_appointments = db.query(Appointment.id).filter(
        Appointment.business_id == business_id,
        Appointment.status != "cancelled"
    )
    if exclude_appointment_id is not None:
        overlapping_appointments = overlapping_appointments.filter(
            Appointment.id != exclude_appointment_id
        )

    if earliest_conflict.date() == appointment_date:
        overlapping_appointments = overlapping_appointments.filter(
            Appointment.appointment_date == appointment_date,
            Appointment.appointment_time > earliest_conflict.time(),
            Appointment.appointment_time < appointment_end.time()
        )
    else:
        overlapping_appointments = overlapping_appointments.filter(
            or_(
                and_(
                    Appointment.appointment_date == earliest_conflict.date(),
                    Appointment.appointment_time > earliest_conflict.time()
                ),
                and_(
                    Appointment.appointment_date == appointment_date,
                    Appointment.appointment_time < appointment_end.time()
                )
            )
        )

    if overlapping_appointments.with_for_update().first() is not None:
        return "That appointment time overlaps with an existing appointment."

    return None
