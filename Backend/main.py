# Backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import des routes
from routes.croisement_routes import router as croisement_router
from routes.dossiers import router as dossiers_router
from routes.imports import router as imports_router


# ------------------------------------------------------------
#              INITIALISATION DE L’APPLICATION
# ------------------------------------------------------------

app = FastAPI(
    title="Kyntus Facturation API",
    version="1.0.0",
    description="Backend pour la plateforme de facturation Kyntus"
)


# ------------------------------------------------------------
#                CONFIGURATION CORS (OK 100%)
# ------------------------------------------------------------

# Ces origines sont nécessaires pour Next.js en local
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*",  # pour les tests locaux
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        # domaines autorisés
    allow_credentials=True,
    allow_methods=["*"],          # GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],          # autoriser tous les headers
)


# ------------------------------------------------------------
#                    INCLUSION DES ROUTES
# ------------------------------------------------------------

app.include_router(croisement_router)   # /api/croisement/...
app.include_router(dossiers_router)     # /api/dossiers/...
app.include_router(imports_router)      # /api/import/...


# ------------------------------------------------------------
#                    ENDPOINT DE TEST
# ------------------------------------------------------------

@app.get("/")
def root():
    return {
        "status": "online",
        "message": "Backend Kyntus Facturation actifouii ✔️",
    }


@app.get("/health")
def healthcheck():
    return {"ok": True}
