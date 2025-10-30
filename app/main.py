from fastapi import FastAPI
from database.connection import Base, engine
from database import models
from routes import intervention_routes

app = FastAPI(title="Kyntus Facturation API", version="1.0")

Base.metadata.create_all(bind=engine)

app.include_router(intervention_routes.router, prefix="/interventions", tags=["Interventions"])

@app.get("/")
def root():
    return {"status": "ok", "service": "Kyntus Facturation API"}
