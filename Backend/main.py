# Backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.dossiers import router as dossiers_router   # ✅ Chemin correct si "routes" est dans Backend/

app = FastAPI(title="Kyntus Facturation API")

# ✅ Autoriser le frontend Docker à accéder à l’API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tu peux restreindre à http://localhost:3000 plus tard
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Endpoint racine pour test
@app.get("/")
async def root():
    return {"status": "ok", "service": "Kyntus Facturation API"}

# ✅ Inclusion des routes
app.include_router(dossiers_router)
