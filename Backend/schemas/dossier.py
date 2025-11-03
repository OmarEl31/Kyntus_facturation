# Backend/schemas/dossier.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DossierOut(BaseModel):
    nd_global: Optional[str] = None
    nd_praxedo: Optional[str] = None
    nd_pidi: Optional[str] = None
    code_cible: Optional[str] = None
    regle_facturable: Optional[str] = None
    statut_facturation: Optional[str] = None
    montant: Optional[float] = None
    client_id: Optional[str] = None
    created_at: Optional[datetime] = None

class PageOut(BaseModel):
    items: list[DossierOut]
    total: int
    page: int
    page_size: int
