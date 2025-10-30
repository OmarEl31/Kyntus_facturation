import os

class Settings:
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "kyntus_user")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "kyntus_pass")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "kyntus_db")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "kyntus_db")  # ✅ doit être kyntus_db

    DATABASE_URL: str = (
        f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:5432/{POSTGRES_DB}"
    )

settings = Settings()
