import re
from datetime import datetime, date, timedelta, time

from sqlalchemy.orm import Session

from appointment_date_utils import (
    is_valid_appointment_date,
    parse_appointment_date,
)
from models import BookingSession, Appointment, Customer



def extract_phone(message: str):
    # Extract digits from the message
    digits = re.sub(r"\D", "", message)

    # Remove India's country code
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]

    # Validate Indian mobile number
    if re.fullmatch(r"[6-9]\d{9}", digits):
        return digits

    return None



def extract_time(message: str):
    text = message.strip().lower()

    # 12-hour format: 10 AM, 2:30 PM
    match = re.search(
        r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b",
        text,
        re.IGNORECASE
    )

    if match:
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

    # 24-hour format: 14:00, 09:30, 18:45
    match = re.search(
        r"\b([01]?\d|2[0-3]):([0-5]\d)\b",
        text
    )

    if match:
        hour = int(match.group(1))
        minute = int(match.group(2))

        return time(hour, minute)

    return None



def extract_date(message: str):
    return parse_appointment_date(message)



def get_or_create_booking(db: Session, user_id: int, business_id: int):

    # Expire unfinished sessions inactive for more than 30 minutes
    expiry_time = datetime.now() - timedelta(minutes=30)

    db.query(BookingSession).filter(
        BookingSession.user_id == user_id,
        BookingSession.business_id == business_id,
        BookingSession.status.in_(
            ["collecting", "awaiting_confirmation"]
        ),
        BookingSession.last_activity_at < expiry_time
    ).update(
        {"status": "expired"},
        synchronize_session=False
    )

    db.commit()

    # Find the latest active booking session
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

    # Create a new session if no active session exists
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
    booking.last_activity_at = datetime.now()
    db.commit()

    # 1. Cancel booking conversation
    if text in ["cancel booking", "stop booking"]:
        booking.status = "cancelled"
        db.commit()

        return {
            "reply": "Your booking process has been cancelled.",
            "status": "cancelled"
        }

    # 2. Handle confirmation FIRST
    
    # Allow customers to edit details before confirmation
    if booking.status == "awaiting_confirmation":

        # Change appointment time
        time_match = re.search(
            r"(?:change|update)\s+time\s+to\s+(.+)",
            text
        )

        if time_match:
            new_time = extract_time(time_match.group(1))

            if not new_time:
                return {
                    "reply": "Please provide a valid time, such as 11 AM or 2:30 PM.",
                    "status": "awaiting_confirmation"
                }

            booking.appointment_time = new_time

        # Change appointment date
        date_match = re.search(
            r"(?:change|update)\s+date\s+to\s+(.+)",
            text
        )

        if date_match:
            new_date = extract_date(date_match.group(1))

            if not is_valid_appointment_date(new_date):
                return {
                    "reply": (
                        "Please provide a valid future date, such as "
                        "25-11-2026, 25/11/2026, or November 25."
                    ),
                    "status": "awaiting_confirmation"
                }

            booking.appointment_date = new_date

        # Change customer name
        name_match = re.search(
            r"(?:change|update)\s+name\s+to\s+(.+)",
            message,
            re.IGNORECASE
        )

        if name_match:
            new_name = name_match.group(1).strip()

            if len(new_name) < 2:
                return {
                    "reply": "Please provide a valid name.",
                    "status": "awaiting_confirmation"
                }

            booking.customer_name = new_name

        # Change phone number
        phone_match = re.search(
            r"(?:change|update)\s+(?:phone|number)\s+to\s+(.+)",
            message,
            re.IGNORECASE
        )

        if phone_match:
            new_phone = extract_phone(phone_match.group(1))

            if not new_phone:
                return {
                    "reply": "Please provide a valid 10-digit mobile number.",
                    "status": "awaiting_confirmation"
                }

            booking.customer_phone = new_phone

        # Change appointment reason
        reason_match = re.search(
            r"(?:change|update)\s+reason\s+to\s+(.+)",
            message,
            re.IGNORECASE
        )

        if reason_match:
            new_reason = reason_match.group(1).strip()

            if not new_reason:
                return {
                    "reply": "Please provide a valid appointment reason.",
                    "status": "awaiting_confirmation"
                }

            booking.reason = new_reason

        # Save and display updated details if an edit was requested
        if any([
            time_match,
            date_match,
            name_match,
            phone_match,
            reason_match
        ]):
            db.commit()

            return {
                "reply": (
                    "Your appointment details have been updated:\n"
                    f"Name: {booking.customer_name}\n"
                    f"Phone: {booking.customer_phone}\n"
                    f"Date: {booking.appointment_date}\n"
                    f"Time: {booking.appointment_time}\n"
                    f"Reason: {booking.reason}\n\n"
                    "Reply YES to confirm or NO to cancel."
                ),
                "status": "awaiting_confirmation"
            }

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
            "reply": (
                "What date would you prefer? You can say tomorrow, "
                "25-11-2026, 25/11/2026, or November 25."
            ),
            "status": "collecting"
        }

    # 5. Collect appointment date
    if booking.appointment_date is None:
        appointment_date = extract_date(message)

        if not is_valid_appointment_date(appointment_date):
            return {
                "reply": (
                    "Please provide a valid future date, such as tomorrow, "
                    "25-11-2026, 25/11/2026, or November 25."
                ),
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
