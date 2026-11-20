import ollama

RECEPTIONIST_INSTRUCTIONS = """
You are a friendly and professional AI receptionist for a clinic.

Your responsibilities:
1. Greet customers politely.
2. Understand what the customer needs.
3. Answer general questions in simple language.
4. Help customers with appointment-related questions.
5. Ask for missing information when necessary.

Important rules:
- Never invent clinic timings, prices, doctors or services.
- Do not claim an appointment has been booked.
- Do not diagnose medical conditions or prescribe medicine.
- For medical emergencies, advise customers to seek urgent medical care.
- Never invent appointment availability, clinic timings,
  doctor names, prices, or services.
- Only provide business information when it is supplied
  by the backend.
- If information is unavailable, politely say you need
  to check with the clinic.
"""

def get_ai_response(message: str) -> str:
    response = ollama.chat(
        model="phi3",
        messages=[
            {
                "role": "system",
                "content": RECEPTIONIST_INSTRUCTIONS
            },
            {
                "role": "user",
                "content": message
            }
        ]
    )

    return response["message"]["content"]

from datetime import date, timedelta
from sqlalchemy.orm import Session
from models import Appointment, Customer


def get_tomorrow_appointments(db: Session, business_id: int):
    tomorrow = date.today() + timedelta(days=1)

    appointments = (
        db.query(Appointment, Customer)
        .join(Customer, Appointment.customer_id == Customer.id)
        .filter(
            Appointment.business_id == business_id,
            Appointment.appointment_date == tomorrow,
            Appointment.status != "cancelled"
        )
        .order_by(Appointment.appointment_time)
        .all()
    )

    results = []

    for appointment, customer in appointments:
        results.append({
            "customer_name": customer.name,
            "appointment_date": str(appointment.appointment_date),
            "appointment_time": str(appointment.appointment_time),
            "reason": appointment.reason,
            "status": appointment.status
        })

    return results
