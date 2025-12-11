# Backend/database/connection.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from core.config import settings

# Base ORM commune
Base = declarative_base()

# Moteur SQLAlchemy vers PostgreSQL
engine = create_engine(settings.DATABASE_URL)

# Session locale pour les requêtes synchrones
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def get_db():
    """Dépendance FastAPI pour injecter une session DB."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
