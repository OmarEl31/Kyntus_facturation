# backend/core/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Charger les variables d'environnement depuis .env
load_dotenv()

# Lecture de la chaîne de connexion PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL manquant dans le fichier .env")

# Création du moteur SQLAlchemy
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,     # évite les connexions mortes
    echo=False              # passe à True pour voir les requêtes SQL dans les logs
)

# Configuration de la session locale
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base commune pour les modèles ORM
Base = declarative_base()

# Dépendance utilisée dans les routes FastAPI
def get_db():
    """Ouvre une session DB pour chaque requête API."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
