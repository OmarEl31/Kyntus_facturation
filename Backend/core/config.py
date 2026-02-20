# Backend/core/config.py
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432

    # Exemple: "http://localhost:3100,http://127.0.0.1:3100"
    CORS_ORIGINS: str = "http://localhost:3100,http://127.0.0.1:3100"

     # Identifiants Praxedo pour le Scraper (Optionnels, n'empêchent pas le reste de marcher)
    PRAXEDO_USER: str | None = None
    PRAXEDO_PASSWORD: str | None = None


    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",  # ✅ ignore les variables non attendues
    )

@lru_cache
def get_settings():
    return Settings()
