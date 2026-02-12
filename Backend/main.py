# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings
from routes.dossiers import router as dossiers_router
from routes.imports import router as imports_router
from routes.export_dossiers import router as export_dossiers_router
from routes.regles import router as regles_router
from routes.debug_db import router as debug_router
from routes.orange_ppd import router as orange_ppd_router

app = FastAPI(title="Kyntus Facturation API")
settings = get_settings()

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")] if settings.CORS_ORIGINS else ["*"]

app.add_middleware(
    CORSMiddleware,
     allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dossiers_router)
app.include_router(imports_router)
app.include_router(export_dossiers_router)
app.include_router(regles_router)
app.include_router(debug_router)
app.include_router(orange_ppd_router)

@app.get("/")
def root():
    return {"status": "ok"}
