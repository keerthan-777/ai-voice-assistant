from faq_service import find_matching_faq, is_business_question
from appointment_date_utils import is_valid_appointment_date
from models import BusinessFAQ
from faq_schemas import FAQCreate, FAQUpdate, FAQResponse
from appointment_action_service import (
    find_customer_appointments,
    create_cancellation_session,
    confirm_cancellation,
    extract_reschedule_date,
    extract_reschedule_time,
    create_reschedule_session,
    update_appointment_after_confirmation
)
from models import AppointmentActionSession, BookingSession
from appointment_action_service import (
    find_customer_appointments,
    create_cancellation_session,
    confirm_cancellation
)
from booking_schemas import BookingMessage, BookingResponse
from booking_service import process_booking
from datetime import date, timedelta
from ai_service import get_ai_response, get_tomorrow_appointments
from sqlalchemy import and_
from models import Appointment, Customer
from ai_service import get_ai_response
from ai_schemas import ChatRequest, ChatResponse
from ai_schemas import ChatRequest, ChatResponse
from datetime import date
from models import Appointment
from appointment_schemas import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentResponse
)
from models import Customer
from customer_schemas import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse
)
from fastapi.security import OAuth2PasswordRequestForm
from dependencies import get_current_user
from auth import hash_password, verify_password, create_access_token
from models import User
from schemas import UserCreate, UserLogin, UserResponse
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Business
from schemas import BusinessCreate, BusinessResponse

app = FastAPI(
    title="AI Voice Assistant API",
    description="Backend API for our AI business receptionist",
    version="1.0.0"
)


@app.get("/")
def home():
    return {
        "message": "AI Voice Assistant API is running!"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


# Register a new business
@app.post(
    "/businesses",
    response_model=BusinessResponse,
    status_code=201
)
def register_business(
    business: BusinessCreate,
    db: Session = Depends(get_db)
):
    new_business = Business(
        business_name=business.business_name,
        business_type=business.business_type,
        phone_number=business.phone_number,
        email=business.email,
        address=business.address
    )

    try:
        db.add(new_business)
        db.commit()
        db.refresh(new_business)

        return new_business

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not register business."
        )



@app.get(
    "/businesses/{business_id}",
    response_model=BusinessResponse
)
def get_business(
    business_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Users can only access their own business
    if current_user.business_id != business_id:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to access this business."
        )

    business = db.query(Business).filter(
        Business.id == business_id
    ).first()

    if business is None:
        raise HTTPException(
            status_code=404,
            detail="Business not found"
        )

    return business


# Register a new user
@app.post("/auth/register", response_model=UserResponse, status_code=201)
def register_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    # Check whether the business exists
    business = db.query(Business).filter(
        Business.id == user.business_id
    ).first()

    if business is None:
        raise HTTPException(
            status_code=404,
            detail="Business not found. Register a business first."
        )

    # Check whether email is already registered
    existing_user = db.query(User).filter(
        User.email == str(user.email).lower()
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered."
        )

    new_user = User(
        name=user.name,
        email=str(user.email).lower(),
        password_hash=hash_password(user.password),
        business_id=user.business_id
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not register user."
        )


# Login an existing user

@app.post("/auth/login")
def login_user(
    credentials: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == credentials.username.lower()
    ).first()

    if not user or not verify_password(
        credentials.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    token = create_access_token(user.id)

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@app.get("/auth/me")
def get_my_profile(
    current_user=Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "business_id": current_user.business_id
    }

# 1. Add a new customer
@app.post(
    "/customers",
    response_model=CustomerResponse,
    status_code=201
)
def create_customer(
    customer: CustomerCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    new_customer = Customer(
        name=customer.name,
        phone_number=customer.phone_number,
        email=customer.email,
        notes=customer.notes,
        business_id=current_user.business_id
    )

    try:
        db.add(new_customer)
        db.commit()
        db.refresh(new_customer)
        return new_customer

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not create customer."
        )


# 2. Get all customers belonging to logged-in business
@app.get(
    "/customers",
    response_model=list[CustomerResponse]
)
def get_customers(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    customers = db.query(Customer).filter(
        Customer.business_id == current_user.business_id
    ).all()

    return customers


# 3. Get one customer by ID
@app.get(
    "/customers/{customer_id}",
    response_model=CustomerResponse
)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.business_id == current_user.business_id
    ).first()

    if customer is None:
        raise HTTPException(
            status_code=404,
            detail="Customer not found."
        )

    return customer


# 4. Update customer details
@app.put(
    "/customers/{customer_id}",
    response_model=CustomerResponse
)
def update_customer(
    customer_id: int,
    customer_data: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.business_id == current_user.business_id
    ).first()

    if customer is None:
        raise HTTPException(
            status_code=404,
            detail="Customer not found."
        )

    updates = customer_data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(customer, field, value)

    try:
        db.commit()
        db.refresh(customer)
        return customer

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update customer."
        )


# 5. Delete customer
@app.delete("/customers/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.business_id == current_user.business_id
    ).first()

    if customer is None:
        raise HTTPException(
            status_code=404,
            detail="Customer not found."
        )

    try:
        db.delete(customer)
        db.commit()

        return {
            "message": "Customer deleted successfully."
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not delete customer."
        )

@app.post(
    "/appointments",
    response_model=AppointmentResponse,
    status_code=201
)
def create_appointment(
    appointment: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Verify customer belongs to the logged-in business
    customer = db.query(Customer).filter(
        Customer.id == appointment.customer_id,
        Customer.business_id == current_user.business_id
    ).first()

    if customer is None:
        raise HTTPException(
            status_code=404,
            detail="Customer not found."
        )

    # Check whether this time slot is already booked
    existing = db.query(Appointment).filter(
        Appointment.business_id == current_user.business_id,
        Appointment.appointment_date == appointment.appointment_date,
        Appointment.appointment_time == appointment.appointment_time,
        Appointment.status != "cancelled"
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="This appointment slot is already booked."
        )

    new_appointment = Appointment(
        customer_id=appointment.customer_id,
        business_id=current_user.business_id,
        appointment_date=appointment.appointment_date,
        appointment_time=appointment.appointment_time,
        reason=appointment.reason,
        status="confirmed"
    )

    try:
        db.add(new_appointment)
        db.commit()
        db.refresh(new_appointment)
        return new_appointment

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not create appointment."
        )

@app.get(
    "/appointments",
    response_model=list[AppointmentResponse]
)
def get_appointments(
    appointment_date: date | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Appointment).filter(
        Appointment.business_id == current_user.business_id
    )

    if appointment_date:
        query = query.filter(
            Appointment.appointment_date == appointment_date
        )

    return query.order_by(
        Appointment.appointment_date,
        Appointment.appointment_time
    ).all()

@app.get(
    "/appointments/{appointment_id}",
    response_model=AppointmentResponse
)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.business_id == current_user.business_id
    ).first()

    if appointment is None:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found."
        )

    return appointment

@app.put(
    "/appointments/{appointment_id}",
    response_model=AppointmentResponse
)
def update_appointment(
    appointment_id: int,
    appointment_data: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.business_id == current_user.business_id
    ).first()

    if appointment is None:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found."
        )

    if appointment.status != "confirmed":
        raise HTTPException(
            status_code=400,
            detail="Only confirmed appointments can be updated."
        )

    updates = appointment_data.model_dump(exclude_unset=True)

    new_date = updates.get(
        "appointment_date",
        appointment.appointment_date
    )
    new_time = updates.get(
        "appointment_time",
        appointment.appointment_time
    )

    # Check whether the new slot is occupied by another appointment
    existing = db.query(Appointment).filter(
        Appointment.business_id == current_user.business_id,
        Appointment.appointment_date == new_date,
        Appointment.appointment_time == new_time,
        Appointment.status != "cancelled",
        Appointment.id != appointment_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="The new appointment slot is already booked."
        )

    for field, value in updates.items():
        setattr(appointment, field, value)

    try:
        db.commit()
        db.refresh(appointment)
        return appointment

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update appointment."
        )

@app.patch("/appointments/{appointment_id}/cancel")
def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.business_id == current_user.business_id
    ).first()

    if appointment is None:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found."
        )

    if appointment.status == "cancelled":
        raise HTTPException(
            status_code=400,
            detail="Appointment is already cancelled."
        )

    appointment.status = "cancelled"

    try:
        db.commit()

        return {
            "message": "Appointment cancelled successfully."
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not cancel appointment."
        )


# =========================
# BUSINESS FAQ APIs
# =========================

@app.post("/faqs", response_model=FAQResponse, status_code=201)
def create_faq(
    faq_data: FAQCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_faq = BusinessFAQ(
        business_id=current_user.business_id,
        question=faq_data.question,
        answer=faq_data.answer
    )

    db.add(new_faq)
    db.commit()
    db.refresh(new_faq)

    return new_faq


@app.get("/faqs", response_model=list[FAQResponse])
def get_faqs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (
        db.query(BusinessFAQ)
        .filter(BusinessFAQ.business_id == current_user.business_id)
        .order_by(BusinessFAQ.id.desc())
        .all()
    )


@app.get("/faqs/{faq_id}", response_model=FAQResponse)
def get_faq(
    faq_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    faq = (
        db.query(BusinessFAQ)
        .filter(
            BusinessFAQ.id == faq_id,
            BusinessFAQ.business_id == current_user.business_id
        )
        .first()
    )

    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")

    return faq


@app.put("/faqs/{faq_id}", response_model=FAQResponse)
def update_faq(
    faq_id: int,
    faq_data: FAQUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    faq = (
        db.query(BusinessFAQ)
        .filter(
            BusinessFAQ.id == faq_id,
            BusinessFAQ.business_id == current_user.business_id
        )
        .first()
    )

    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")

    updates = faq_data.model_dump(exclude_unset=True, exclude_none=True)

    for field, value in updates.items():
        setattr(faq, field, value)

    db.commit()
    db.refresh(faq)

    return faq


@app.delete("/faqs/{faq_id}")
def delete_faq(
    faq_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    faq = (
        db.query(BusinessFAQ)
        .filter(
            BusinessFAQ.id == faq_id,
            BusinessFAQ.business_id == current_user.business_id
        )
        .first()
    )

    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")

    # Soft delete: keep the FAQ but deactivate it
    faq.is_active = False

    db.commit()

    return {"message": "FAQ deactivated successfully"}




@app.post("/ai/chat", response_model=ChatResponse)
def ai_chat(
    chat: ChatRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        import re

        message = chat.message.strip()
        lower_message = message.lower()

        # ==========================================
        # 1. HANDLE APPOINTMENT BOOKING
        # ==========================================

        active_booking = (
            db.query(BookingSession)
            .filter(
                BookingSession.user_id == current_user.id,
                BookingSession.business_id == current_user.business_id,
                BookingSession.status.in_(
                    ["collecting", "awaiting_confirmation"]
                )
            )
            .order_by(BookingSession.id.desc())
            .first()
        )

        booking_intent = (
            "appointment" in lower_message
            and any(
                word in lower_message
                for word in ["book", "booking", "schedule", "want"]
            )
        )

        if active_booking or booking_intent:
            result = process_booking(
                db=db,
                user_id=current_user.id,
                business_id=current_user.business_id,
                message=message
            )

            return {"reply": result["reply"]}

        # ==========================================
        # 2. FIND ACTIVE ACTION SESSION
        # ==========================================

        active_session = (
            db.query(AppointmentActionSession)
            .filter(
                AppointmentActionSession.user_id == current_user.id,
                AppointmentActionSession.business_id == current_user.business_id,
                AppointmentActionSession.status.in_(
                    ["collecting", "awaiting_confirmation"]
                )
            )
            .order_by(AppointmentActionSession.id.desc())
            .first()
        )

        # ==========================================
        # 3. HANDLE YES CONFIRMATION
        # ==========================================

        if active_session and lower_message in [
            "yes", "confirm", "yes confirm"
        ]:

            if active_session.action == "cancel":
                success = confirm_cancellation(
                    db=db,
                    session=active_session,
                    user_id=current_user.id,
                    business_id=current_user.business_id
                )

                return {
                    "reply": (
                        "Your appointment has been cancelled successfully."
                        if success
                        else "I couldn't cancel the appointment."
                    )
                }

            if active_session.action == "reschedule":
                success = update_appointment_after_confirmation(
                    db=db,
                    session=active_session,
                    user_id=current_user.id,
                    business_id=current_user.business_id,
                    new_date=active_session.new_appointment_date,
                    new_time=active_session.new_appointment_time
                )

                return {
                    "reply": (
                        "Your appointment has been rescheduled successfully."
                        if success
                        else "I couldn't reschedule that appointment. Please check availability."
                    )
                }

        # ==========================================
        # 4. HANDLE NO CONFIRMATION
        # ==========================================

        if active_session and lower_message in [
            "no", "cancel", "no thanks"
        ]:
            active_session.status = "cancelled"
            db.commit()

            return {
                "reply": (
                    "Your request has been cancelled. "
                    "Your existing appointment remains unchanged."
                )
            }

        # ==========================================
        # 5. COLLECT RESCHEDULE DATE AND TIME
        # ==========================================

        if active_session and active_session.action == "reschedule":

            if active_session.status == "collecting":

                new_date = extract_reschedule_date(message)
                new_time = extract_reschedule_time(message)

                if new_date:
                    active_session.new_appointment_date = new_date

                if new_time:
                    active_session.new_appointment_time = new_time

                if (
                    active_session.new_appointment_date is None
                    or active_session.new_appointment_time is None
                ):
                    db.commit()

                    missing = []

                    if active_session.new_appointment_date is None:
                        missing.append(
                            "new date, for example 25-11-2026 or November 25"
                        )

                    if active_session.new_appointment_time is None:
                        missing.append(
                            "new time, for example 10 AM"
                        )

                    return {
                        "reply": (
                            "Please provide your "
                            + " and ".join(missing)
                            + "."
                        )
                    }

                new_date = active_session.new_appointment_date
                new_time = active_session.new_appointment_time

                if not is_valid_appointment_date(new_date, allow_today=True):
                    active_session.new_appointment_date = None
                    active_session.new_appointment_time = None
                    db.commit()

                    return {
                        "reply": (
                            "That date is in the past. "
                            "Please provide a future date and time."
                        )
                    }

                existing = db.query(Appointment).filter(
                    Appointment.business_id == current_user.business_id,
                    Appointment.appointment_date == new_date,
                    Appointment.appointment_time == new_time,
                    Appointment.status == "confirmed",
                    Appointment.id != active_session.appointment_id
                ).first()

                if existing:
                    active_session.new_appointment_date = None
                    active_session.new_appointment_time = None
                    db.commit()

                    return {
                        "reply": (
                            "That time slot is already booked. "
                            "Please provide another date and time."
                        )
                    }

                active_session.status = "awaiting_confirmation"
                db.commit()

                return {
                    "reply": (
                        f"Your proposed appointment time is "
                        f"{new_date} at {new_time}. "
                        "Would you like to confirm this change? "
                        "Reply YES or NO."
                    )
                }

            if active_session.status == "awaiting_confirmation":
                return {
                    "reply": (
                        "Please reply YES to confirm the rescheduling "
                        "or NO to keep your existing appointment."
                    )
                }

        # ==========================================
        # 6. START RESCHEDULING REQUEST
        # ==========================================

        if "reschedule" in lower_message and "appointment" in lower_message:

            phone_match = re.search(r"\b[6-9]\d{9}\b", message)

            if not phone_match:
                return {
                    "reply": (
                        "Please provide the registered "
                        "10-digit phone number for your appointment."
                    )
                }

            appointments = find_customer_appointments(
                db=db,
                business_id=current_user.business_id,
                phone_number=phone_match.group()
            )

            if not appointments:
                return {
                    "reply": (
                        "I couldn't find an upcoming confirmed "
                        "appointment for that phone number."
                    )
                }

            if len(appointments) > 1:
                details = "\n".join(
                    f"ID: {a['appointment_id']}, "
                    f"Date: {a['appointment_date']}, "
                    f"Time: {a['appointment_time']}"
                    for a in appointments
                )

                return {
                    "reply": (
                        "I found multiple appointments. Please contact "
                        "the receptionist to select the correct appointment:\n"
                        + details
                    )
                }

            appointment = appointments[0]

            session = create_reschedule_session(
                db=db,
                user_id=current_user.id,
                business_id=current_user.business_id,
                appointment_id=appointment["appointment_id"]
            )

            if session is None:
                return {
                    "reply": "I couldn't start the rescheduling request."
                }

            return {
                "reply": (
                    f"I found your appointment on "
                    f"{appointment['appointment_date']} "
                    f"at {appointment['appointment_time']}. "
                    "What new date and time would you prefer?"
                )
            }

        # ==========================================
        # 7. START CANCELLATION REQUEST
        # ==========================================

        if "cancel" in lower_message and "appointment" in lower_message:

            phone_match = re.search(r"\b[6-9]\d{9}\b", message)

            if not phone_match:
                return {
                    "reply": (
                        "Please provide the registered "
                        "10-digit phone number."
                    )
                }

            appointments = find_customer_appointments(
                db=db,
                business_id=current_user.business_id,
                phone_number=phone_match.group()
            )

            if not appointments:
                return {
                    "reply": (
                        "No upcoming confirmed appointments were found."
                    )
                }

            if len(appointments) > 1:
                return {
                    "reply": (
                        "Multiple appointments were found. "
                        "Please contact the receptionist to select "
                        "the correct appointment."
                    )
                }

            appointment = appointments[0]

            create_cancellation_session(
                db=db,
                user_id=current_user.id,
                business_id=current_user.business_id,
                appointment_id=appointment["appointment_id"]
            )

            return {
                "reply": (
                    f"Appointment found for "
                    f"{appointment['customer_name']} on "
                    f"{appointment['appointment_date']} at "
                    f"{appointment['appointment_time']}. "
                    "Reply YES to cancel or NO to keep it."
                )
            }

        # ==========================================
        # 8. TOMORROW APPOINTMENT ENQUIRY
        # ==========================================

        if "appointment" in lower_message and "tomorrow" in lower_message:

            appointments = get_tomorrow_appointments(
                db=db,
                business_id=current_user.business_id
            )

            context = (
                f"Actual appointments for tomorrow: {appointments}. "
                "Use only these records."
                if appointments
                else "There are no appointments scheduled for tomorrow."
            )

            reply = get_ai_response(
                f"Customer message: {message}\n"
                f"Database information: {context}"
            )

            return {"reply": reply}

        # ==========================================
        # 9. CHECK BUSINESS FAQs
        # ==========================================

        matched_faq = find_matching_faq(
            db=db,
            business_id=current_user.business_id,
            message=message
        )

        if matched_faq:
            return {
                "reply": matched_faq.answer
            }

        # ==========================================
        # 10. SAFE BUSINESS INFORMATION FALLBACK
        # ==========================================

        if is_business_question(message):
            return {
                "reply": (
                    "I don't have verified information about that yet. "
                    "Please contact our receptionist for assistance."
                )
            }

        # ==========================================
        # 11. NORMAL AI CONVERSATION
        # ==========================================

        reply = get_ai_response(message)

        return {"reply": reply}

    except Exception as e:
        db.rollback()

        print("AI ERROR:", repr(e))

        raise HTTPException(
            status_code=502,
            detail="AI receptionist service is unavailable."
        )



@app.post("/ai/book-appointment", response_model=BookingResponse)
def ai_book_appointment(
    booking: BookingMessage,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        result = process_booking(
            db=db,
            user_id=current_user.id,
            business_id=current_user.business_id,
            message=booking.message
        )

        return result

    except Exception as e:
        db.rollback()
        print("BOOKING ERROR:", repr(e))
        raise HTTPException(
            status_code=500,
            detail="Unable to process appointment booking."
        )
