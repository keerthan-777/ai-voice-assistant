
from sqlalchemy import Date, Time
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
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
