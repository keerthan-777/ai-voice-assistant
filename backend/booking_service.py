
import re
from datetime import date, time, datetime, timedelta

from sqlalchemy.orm import Session

from models import BookingSession, Appointment, Customer


def extract_phone(message: str):
    match = re.search(r"\b[6-9]\d{9}\b", message)
    return match.group(0) if match else None


def extract_time(message: str):
    match = re.search(
        r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b",
        message,
        re.IGNORECASE
    )

    if not match:
        return None

    hour = int(match.group(1))
    minute = int(match.group(2) or 0)
    period = match.group(3).lower()

    if hour < 1 or hour > 12 or minute > 59:
        return None

    if period == "pm" and hour != 12:
        hour += 12
    elif period == "am" and hour == 12:
        hour = 0

    return time(hour, minute)


def extract_date(message: str):
    text = message.lower()

    if "tomorrow" in text:
        return date.today() + timedelta(days=1)

    if "today" in text:
        return date.today()

    match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", text)

    if match:
        try:
            return datetime.strptime(
                match.group(1), "%Y-%m-%d"
            ).date()
        except ValueError:
            return None

    return None


def get_or_create_booking(db: Session, user_id: int, business_id: int):
    booking = (
        db.query(BookingSession)
        .filter(
            BookingSession.user_id == user_id,
            BookingSession.business_id == business_id,
            BookingSession.status.in_(
                ["collecting", "awaiting_confirmation"]
            )
        )
        .order_by(BookingSession.id.desc())
        .first()
    )

    if booking is None:
        booking = BookingSession(
            user_id=user_id,
            business_id=business_id,
            status="collecting"
        )

        db.add(booking)
        db.commit()
        db.refresh(booking)

    return booking


def process_booking(
    db: Session,
    user_id: int,
    business_id: int,
    message: str
):
    text = message.strip().lower()

    booking = get_or_create_booking(
        db, user_id, business_id
    )

    # 1. Cancel booking conversation
    if text in ["cancel booking", "stop booking"]:
        booking.status = "cancelled"
        db.commit()

        return {
            "reply": "Your booking process has been cancelled.",
            "status": "cancelled"
        }

    # 2. Handle confirmation FIRST
    if booking.status == "awaiting_confirmation":

        if text in ["no", "cancel"]:
            booking.status = "cancelled"
            db.commit()

            return {
                "reply": "Your booking has been cancelled.",
                "status": "cancelled"
            }

        if text not in ["yes", "confirm", "yes confirm"]:
            return {
                "reply": "Please reply YES to confirm or NO to cancel.",
                "status": "awaiting_confirmation"
            }

        # Find or create customer
        customer = db.query(Customer).filter(
            Customer.business_id == business_id,
            Customer.phone_number == booking.customer_phone
        ).first()

        if not customer:
            customer = Customer(
                name=booking.customer_name,
                phone_number=booking.customer_phone,
                business_id=business_id
            )
            db.add(customer)
            db.flush()

        # Check whether requested slot is already booked
        existing = db.query(Appointment).filter(
            Appointment.business_id == business_id,
            Appointment.appointment_date == booking.appointment_date,
            Appointment.appointment_time == booking.appointment_time,
            Appointment.status != "cancelled"
        ).first()

        if existing:
            booking.status = "collecting"
            booking.appointment_time = None
            db.commit()

            return {
                "reply": "Sorry, this time is already booked. Please choose another time.",
                "status": "collecting"
            }

        # Save appointment
        appointment = Appointment(
            customer_id=customer.id,
            business_id=business_id,
            appointment_date=booking.appointment_date,
            appointment_time=booking.appointment_time,
            reason=booking.reason,
            status="confirmed"
        )

        db.add(appointment)
        booking.status = "completed"
        db.commit()

        return {
            "reply": "Your appointment has been successfully booked!",
            "status": "completed"
        }

    # 3. Collect customer name
    if booking.customer_name is None:

        if "appointment" in text and any(
            word in text for word in ["book", "schedule", "want"]
        ):
            return {
                "reply": "Sure! May I know your name?",
                "status": "collecting"
            }

        booking.customer_name = message.strip()
        db.commit()

        return {
            "reply": "Thanks! Please provide your 10-digit mobile number.",
            "status": "collecting"
        }

    # 4. Collect phone number
    if booking.customer_phone is None:
        phone = extract_phone(message)

        if not phone:
            return {
                "reply": "Please enter a valid 10-digit mobile number.",
                "status": "collecting"
            }

        booking.customer_phone = phone
        db.commit()

        return {
            "reply": "What date would you prefer? You can say tomorrow or YYYY-MM-DD.",
            "status": "collecting"
        }

    # 5. Collect appointment date
    if booking.appointment_date is None:
        appointment_date = extract_date(message)

        if not appointment_date or appointment_date <= date.today():
            return {
                "reply": "Please provide a valid future date, such as tomorrow or 2026-11-25.",
                "status": "collecting"
            }

        booking.appointment_date = appointment_date
        db.commit()

        return {
            "reply": "What time would you prefer? For example, 10 AM or 2:30 PM.",
            "status": "collecting"
        }

    # 6. Collect appointment time
    if booking.appointment_time is None:
        appointment_time = extract_time(message)

        if not appointment_time:
            return {
                "reply": "Please provide a valid time, such as 10 AM or 2:30 PM.",
                "status": "collecting"
            }

        booking.appointment_time = appointment_time
        db.commit()

        if booking.reason:
            booking.status = "awaiting_confirmation"
            db.commit()

            return {
                "reply": (
                    f"Please confirm your appointment:\n"
                    f"Name: {booking.customer_name}\n"
                    f"Phone: {booking.customer_phone}\n"
                    f"Date: {booking.appointment_date}\n"
                    f"Time: {booking.appointment_time}\n"
                    f"Reason: {booking.reason}\n\n"
                    "Reply YES to confirm or NO to cancel."
                ),
                "status": "awaiting_confirmation"
            }

        return {
            "reply": "What is the reason for your appointment?",
            "status": "collecting"
        }

    # 7. Collect reason
    if booking.reason is None:
        booking.reason = message.strip()
        booking.status = "awaiting_confirmation"
        db.commit()

        return {
            "reply": (
                f"Please confirm your appointment:\n"
                f"Name: {booking.customer_name}\n"
                f"Phone: {booking.customer_phone}\n"
                f"Date: {booking.appointment_date}\n"
                f"Time: {booking.appointment_time}\n"
                f"Reason: {booking.reason}\n\n"
                "Reply YES to confirm or NO to cancel."
            ),
            "status": "awaiting_confirmation"
        }

    return {
        "reply": "Please reply YES to confirm or NO to cancel.",
        "status": booking.status
    }
