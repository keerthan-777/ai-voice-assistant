from datetime import date

from sqlalchemy.orm import Session
from models import Appointment, Customer, AppointmentActionSession


def find_customer_appointments(
    db: Session,
    business_id: int,
    phone_number: str
):
    """Find upcoming confirmed appointments using the customer's phone."""

    appointments = (
        db.query(Appointment, Customer)
        .join(Customer, Appointment.customer_id == Customer.id)
        .filter(
            Appointment.business_id == business_id,
            Customer.phone_number == phone_number,
            Appointment.status == "confirmed",
            Appointment.appointment_date >= date.today()
        )
        .order_by(
            Appointment.appointment_date,
            Appointment.appointment_time
        )
        .all()
    )

    return [
        {
            "appointment_id": appointment.id,
            "customer_name": customer.name,
            "phone_number": customer.phone_number,
            "appointment_date": str(appointment.appointment_date),
            "appointment_time": str(appointment.appointment_time),
            "reason": appointment.reason
        }
        for appointment, customer in appointments
    ]


def create_cancellation_session(
    db: Session,
    user_id: int,
    business_id: int,
    appointment_id: int
):
    """Create a session after verifying the appointment belongs to this business."""

    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.business_id == business_id,
        Appointment.status == "confirmed"
    ).first()

    if appointment is None:
        return None

    session = AppointmentActionSession(
        user_id=user_id,
        business_id=business_id,
        appointment_id=appointment.id,
        action="cancel",
        status="awaiting_confirmation"
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return session


def confirm_cancellation(
    db: Session,
    session: AppointmentActionSession,
    user_id: int,
    business_id: int
):
    """Cancel only the appointment linked to this user's active session."""

    if (
        session.user_id != user_id
        or session.business_id != business_id
        or session.action != "cancel"
        or session.status != "awaiting_confirmation"
        or session.appointment_id is None
    ):
        return False

    appointment = db.query(Appointment).filter(
        Appointment.id == session.appointment_id,
        Appointment.business_id == business_id,
        Appointment.status == "confirmed"
    ).first()

    if appointment is None:
        session.status = "cancelled"
        db.commit()
        return False

    appointment.status = "cancelled"
    session.status = "completed"

    db.commit()
    return True

import re
from datetime import date, datetime, time
from appointment_date_utils import (
    is_valid_appointment_date,
    parse_appointment_date,
)


def extract_reschedule_date(message: str):
    return parse_appointment_date(message)


def extract_reschedule_time(message: str):
    match = re.search(
        r"\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b",
        message,
        re.IGNORECASE
    )

    if not match:
        return None

    hour = int(match.group(1))
    minute = int(match.group(2) or 0)
    period = match.group(3).upper()

    if hour < 1 or hour > 12 or minute > 59:
        return None

    if period == "PM" and hour != 12:
        hour += 12
    elif period == "AM" and hour == 12:
        hour = 0

    return time(hour, minute)


def update_appointment_after_confirmation(
    db,
    session,
    user_id,
    business_id,
    new_date,
    new_time
):
    if (
        session.user_id != user_id
        or session.business_id != business_id
        or session.action != "reschedule"
        or session.status != "awaiting_confirmation"
        or session.appointment_id is None
    ):
        return False

    appointment = db.query(Appointment).filter(
        Appointment.id == session.appointment_id,
        Appointment.business_id == business_id,
        Appointment.status == "confirmed"
    ).first()

    if appointment is None:
        session.status = "cancelled"
        db.commit()
        return False

    if not is_valid_appointment_date(new_date, allow_today=True):
        return False

    existing = db.query(Appointment).filter(
        Appointment.business_id == business_id,
        Appointment.appointment_date == new_date,
        Appointment.appointment_time == new_time,
        Appointment.status == "confirmed",
        Appointment.id != appointment.id
    ).first()

    if existing:
        return False

    appointment.appointment_date = new_date
    appointment.appointment_time = new_time
    session.status = "completed"

    db.commit()
    return True

def create_reschedule_session(
    db: Session,
    user_id: int,
    business_id: int,
    appointment_id: int
):
    """Create a session for a verified appointment."""

    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.business_id == business_id,
        Appointment.status == "confirmed"
    ).first()

    if appointment is None:
        return None

    session = AppointmentActionSession(
        user_id=user_id,
        business_id=business_id,
        appointment_id=appointment.id,
        action="reschedule",
        status="collecting"
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return session


def save_reschedule_details(
    db: Session,
    session: AppointmentActionSession,
    new_date,
    new_time
):
    """Save the proposed date and time before asking for confirmation."""

    if session.action != "reschedule" or session.status != "collecting":
        return False

    if new_date is None or new_time is None:
        return False

    if new_date < date.today():
        return False

    session.new_appointment_date = new_date
    session.new_appointment_time = new_time
    session.status = "awaiting_confirmation"

    db.commit()
    return True
