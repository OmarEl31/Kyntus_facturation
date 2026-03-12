from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from routes import api_router
from core.config import get_settings
from database.connection import engine
from models.user import Base

from routes.dossiers import router as dossiers_router
from routes.imports import router as imports_router
from routes.regles import router as regles_router
from routes.debug_db import router as debug_router
from routes.orange_ppd import router as orange_ppd_router
from routes.praxedo_scraper import router as praxedo_scraper_router
from routes.auth import router as auth_router
from routes.admin import router as admin_router
from routes.import_commentaire_tech import router as commentaire_tech_router

SCHEMAS = [
    "referentiels",
    "raw",
    "norm",
    "canonique",
    "pilotage",
]

with engine.begin() as conn:
    for schema in SCHEMAS:
        conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Kyntus Facturation API")

settings = get_settings()

origins = (
    [o.strip() for o in (settings.CORS_ORIGINS or "").split(",") if o.strip()]
    if getattr(settings, "CORS_ORIGINS", None) is not None
    else []
)

if not origins:
    origins = [
        "http://127.0.0.1:3100",
        "http://localhost:3100",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Auth d'abord
app.include_router(auth_router)

# Routes métier
app.include_router(dossiers_router)
app.include_router(imports_router)
app.include_router(regles_router)
app.include_router(debug_router)
app.include_router(orange_ppd_router)
app.include_router(praxedo_scraper_router)
app.include_router(admin_router)
app.include_router(commentaire_tech_router)

# Router global additionnel
app.include_router(api_router)


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/health")
def health():
    return {"status": "healthy"}