from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.dossiers import router as dossiers_router
from routes.imports import router as imports_router

app = FastAPI(title="Kyntus Facturation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dossiers_router)
app.include_router(imports_router)

@app.get("/")
def root():
    return {"status": "ok"}
