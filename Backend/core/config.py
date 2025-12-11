# Backend/core/config.py
import os
from dotenv import load_dotenv

# Charge les variables à partir du .env si présent
load_dotenv()

class Settings:
    DB_USER = os.getenv("POSTGRES_USER", "kyntus_user")
    DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "kyntus_pass")
    DB_NAME = os.getenv("POSTGRES_DB", "Kynt_fac_DB")
    DB_HOST = os.getenv("POSTGRES_HOST", "db")
    DB_PORT = os.getenv("POSTGRES_PORT", "5432")

    DATABASE_URL = (
        f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

settings = Settings()
