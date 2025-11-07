# Backend/core/database.py
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# ----------------------------------------------------------------------
# 1️⃣ Chargement des variables d’environnement
# ----------------------------------------------------------------------
load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://kyntus_user:kyntus_pass@kyntus_db_main:5432/kyntus_db"
)

if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL manquant dans .env")

# ----------------------------------------------------------------------
# 2️⃣ Création du moteur SQLAlchemy asynchrone
# ----------------------------------------------------------------------
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

# ----------------------------------------------------------------------
# 3️⃣ Session asynchrone (pour FastAPI)
# ----------------------------------------------------------------------
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# ----------------------------------------------------------------------
# 4️⃣ Base ORM commune
# ----------------------------------------------------------------------
Base = declarative_base()

# ----------------------------------------------------------------------
# 5️⃣ Dépendance FastAPI : session par requête
# ----------------------------------------------------------------------
async def get_async_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
