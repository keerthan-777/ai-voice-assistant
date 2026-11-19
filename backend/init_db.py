
from database import engine
from models import Base

# Create database tables
Base.metadata.create_all(bind=engine)

print("Database tables created successfully!")
