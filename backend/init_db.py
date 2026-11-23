
from sqlalchemy import inspect, text

from database import engine
from models import Base

# Create database tables
Base.metadata.create_all(bind=engine)

columns = {
    column["name"]
    for column in inspect(engine).get_columns("appointment_action_sessions")
}

if "last_activity_at" not in columns:
    with engine.begin() as connection:
        connection.execute(text(
            "ALTER TABLE appointment_action_sessions "
            "ADD COLUMN last_activity_at DATETIME "
            "NOT NULL DEFAULT CURRENT_TIMESTAMP"
        ))

print("Database tables created successfully!")
