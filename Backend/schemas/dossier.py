# Backend/schemas/dossier.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DossierOut(BaseModel):
    ot_key: str
    nd_praxedo: Optional[str] = None
    nd_pidi: Optional[str] = None
    statut_praxedo: Optional[str] = None
    statut_attachement: Optional[str] = None
    date_planifiee: Optional[datetime] = None
    statut_croisement: str

class PageOut(BaseModel):
    items: list[DossierOut]
    total: int
    page: int
    page_size: int
