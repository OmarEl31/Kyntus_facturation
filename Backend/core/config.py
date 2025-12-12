# Backend/core/config.py
from functools import lru_cache
from pydantic import BaseSettings  # ✅ on utilise pydantic classique


class Settings(BaseSettings):
    # Variables d’environnement
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "db"   # nom du service docker-compose
    POSTGRES_PORT: int = 5432

    CORS_ORIGINS: str = "*"     # pour le frontend

    @property
    def DATABASE_URL(self) -> str:
        """
        Construit l’URL SQLAlchemy à partir des variables POSTGRES_*
        Exemple :
        postgresql+psycopg2://kyntus_user:kyntus_pass@db:5432/Kynt_fac_DB
        """
        return (
            f"postgresql+psycopg2://"
            f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
