
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()


class Business(Base):
    __tablename__ = "businesses"

    id = Column(Integer, primary_key=True, index=True)
    business_name = Column(String(150), nullable=False)
    business_type = Column(String(100), nullable=True)
    phone_number = Column(String(20), nullable=True)
    email = Column(String(150), nullable=True)
    address = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="business")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)

    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    business = relationship("Business", back_populates="users")

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    phone_number = Column(String(20), nullable=False)
    email = Column(String(150), nullable=True)
    notes = Column(String(500), nullable=True)

    business_id = Column(
        Integer,
        ForeignKey("businesses.id"),
        nullable=False,
        index=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)

    customer_id = Column(
        Integer,
        ForeignKey("customers.id"),
        nullable=False,
        index=True
    )

    business_id = Column(
        Integer,
        ForeignKey("businesses.id"),
        nullable=False,
        index=True
    )

    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(Time, nullable=False)

    reason = Column(String(500), nullable=True)

    status = Column(
        String(20),
        nullable=False,
        default="confirmed"
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

class BookingSession(Base):
    __tablename__ = "booking_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False, index=True)

    customer_name = Column(String(150), nullable=True)
    customer_phone = Column(String(20), nullable=True)
    appointment_date = Column(Date, nullable=True)
    appointment_time = Column(Time, nullable=True)
    reason = Column(String(500), nullable=True)

    status = Column(String(30), nullable=False, default="collecting")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity_at = Column(
        DateTime(timezone=True),
        default=datetime.now,
        onupdate=datetime.now,
        nullable=False
    )

class AppointmentActionSession(Base):
    __tablename__ = "appointment_action_sessions"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    business_id = Column(
        Integer,
        ForeignKey("businesses.id"),
        nullable=False,
        index=True
    )

    appointment_id = Column(
        Integer,
        ForeignKey("appointments.id"),
        nullable=True
    )

    action = Column(String(30), nullable=False)
    status = Column(String(30), nullable=False, default="collecting")
    new_appointment_date = Column(Date, nullable=True)
    new_appointment_time = Column(Time, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    last_activity_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

class BusinessFAQ(Base):
    __tablename__ = "business_faqs"

    id = Column(Integer, primary_key=True, index=True)

    business_id = Column(
        Integer,
        ForeignKey("businesses.id"),
        nullable=False,
        index=True
    )

    question = Column(String(500), nullable=False)
    answer = Column(String(2000), nullable=False)

    is_active = Column(
        Boolean,
        nullable=False,
        default=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


class BusinessWorkingHour(Base):
    __tablename__ = "business_working_hours"
    __table_args__ = (
        UniqueConstraint(
            "business_id",
            "weekday",
            name="uq_business_working_hours_weekday"
        ),
        CheckConstraint(
            "weekday >= 0 AND weekday <= 6",
            name="ck_business_working_hours_weekday"
        ),
        CheckConstraint(
            "open_time < close_time",
            name="ck_business_working_hours_time_range"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(
        Integer,
        ForeignKey("businesses.id"),
        nullable=False,
        index=True
    )
    weekday = Column(Integer, nullable=False)
    open_time = Column(Time, nullable=False)
    close_time = Column(Time, nullable=False)


class BusinessHoliday(Base):
    __tablename__ = "business_holidays"
    __table_args__ = (
        UniqueConstraint(
            "business_id",
            "holiday_date",
            name="uq_business_holidays_date"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(
        Integer,
        ForeignKey("businesses.id"),
        nullable=False,
        index=True
    )
    holiday_date = Column(Date, nullable=False)
    name = Column(String(120), nullable=True)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)

    business_id = Column(
        Integer,
        ForeignKey("businesses.id"),
        nullable=False,
        index=True
    )

    customer_id = Column(
        Integer,
        ForeignKey("customers.id"),
        nullable=True,
        index=True
    )

    status = Column(String(30), nullable=False, default="active")

    channel = Column(String(30), nullable=False, default="chat")

    started_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )

    last_message_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    summary = Column(Text, nullable=True)


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, index=True)

    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id"),
        nullable=False,
        index=True
    )

    role = Column(String(20), nullable=False)

    content = Column(Text, nullable=False)

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )
