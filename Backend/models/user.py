# Backend/models/user.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from database.connection import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "public"} # Ghandiroha f public bach teb9a m3zoula 3la canonique/raw

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now())