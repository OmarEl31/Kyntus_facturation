# Backend/models/ping.py
from sqlalchemy import Column, Integer, String
from database.connection import Base

class Ping(Base):
    __tablename__ = "ping"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String)
