# Backend/models/user.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from database.connection import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String(20), nullable=False, server_default="agent")  # NEW
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now())