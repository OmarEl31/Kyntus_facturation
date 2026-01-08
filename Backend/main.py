# Backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings
from routes.dossiers import router as dossiers_router
from routes.imports import router as imports_router
from routes.regles import router as regles_router
from routes.debug_db import router as debug_router 

app = FastAPI(title="Kyntus Facturation API")
settings = get_settings()

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")] if settings.CORS_ORIGINS else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dossiers_router)
app.include_router(imports_router)
app.include_router(regles_router)
app.include_router(debug_router)


@app.get("/")
def root():
    return {"status": "ok"}
