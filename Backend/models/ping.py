from sqlalchemy import Column, Integer, String
from database.connection import Base  # vérifie bien que Base vient de ton fichier connection.py

class Ping(Base):
    __tablename__ = "ping"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String)