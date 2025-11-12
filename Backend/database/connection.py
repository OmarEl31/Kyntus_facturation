from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# 🔧 Paramètres de connexion (tu peux adapter les variables d'environnement)
DB_USER = os.getenv("POSTGRES_USER", "kyntus_user")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "kyntus_pass")
DB_HOST = os.getenv("POSTGRES_HOST", "db")  # attention: doit correspondre au service docker
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "Kynt_fac_DB")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 🚀 Création de l'engine
engine = create_engine(DATABASE_URL)

# 🧱 Base ORM
Base = declarative_base()

# 🧩 Session locale
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 📦 Fonction utilitaire FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
