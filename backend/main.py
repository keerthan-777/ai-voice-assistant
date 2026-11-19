from ai_service import get_ai_response
from ai_schemas import ChatRequest, ChatResponse
from ai_service import get_ai_response
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

@app.post("/ai/chat", response_model=ChatResponse)
def ai_chat(
    chat: ChatRequest,
    current_user=Depends(get_current_user)
):
    try:
        reply = get_ai_response(chat.message)
        return {"reply": reply}

    except Exception as e:
        print("OLLAMA ERROR:", repr(e))
        raise HTTPException(
            status_code=502,
            detail="Local AI service is unavailable."
        )