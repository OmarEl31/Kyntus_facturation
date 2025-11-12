# Backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings
from routes.health import router as health_router
from routes.dossiers import router as dossiers_router
from routes.imports import router as import_router
from routes.croisement import router as croisement_router  # جديد

settings = get_settings()

app = FastAPI(title="Kyntus Facturation API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(dossiers_router)
app.include_router(import_router)
app.include_router(croisement_router)  # endpoint /api/croisement

@app.get("/")
def root():
    return {"message": "API Kyntus Facturation opérationnelle ✅"}
