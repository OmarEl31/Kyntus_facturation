from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import dossiers

app = FastAPI(title="Kyntus Facturation API")

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://kyntus_frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion des routes
app.include_router(dossiers.router)

@app.get("/")
def health_check():
    return {"status": "ok", "service": "Kyntus Facturation API"}
