from pydantic import BaseModel
from typing import Optional

class RegleFacturationOut(BaseModel):
    id: int
    code: str
    libelle: Optional[str] = None
    condition_sql: Optional[str] = None
    statut_facturation: Optional[str] = None

    # ✅ pour les tags
    code_activite: Optional[str] = None
    code_produit: Optional[str] = None
    plp_applicable: Optional[bool] = None
    categorie: Optional[str] = None

    model_config = {"from_attributes": True}


class RegleFacturationCreate(BaseModel):
    code: str
    libelle: Optional[str] = None
    condition_sql: Optional[str] = None
    statut_facturation: Optional[str] = None

    code_activite: Optional[str] = None
    code_produit: Optional[str] = None
    plp_applicable: Optional[bool] = None
    categorie: Optional[str] = None


class RegleFacturationUpdate(BaseModel):
    code: Optional[str] = None
    libelle: Optional[str] = None
    condition_sql: Optional[str] = None
    statut_facturation: Optional[str] = None

    code_activite: Optional[str] = None
    code_produit: Optional[str] = None
    plp_applicable: Optional[bool] = None
    categorie: Optional[str] = None
