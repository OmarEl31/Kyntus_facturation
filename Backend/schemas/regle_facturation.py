from pydantic import BaseModel
from typing import Optional, Dict, Any


class RegleFacturationOut(BaseModel):
    id: int
    code: str
    libelle: Optional[str] = None
    condition_sql: Optional[str] = None
    condition_json: Optional[Dict[str, Any]] = None
    statut_facturation: Optional[str] = None

    code_activite: Optional[str] = None
    code_produit: Optional[str] = None
    plp_applicable: Optional[bool] = None
    categorie: Optional[str] = None

    # ✅ soft delete
    is_active: bool = True
    deleted_at: Optional[str] = None

    model_config = {"from_attributes": True}


class RegleFacturationCreate(BaseModel):
    code: str
    libelle: Optional[str] = None
    condition_sql: Optional[str] = None
    condition_json: Optional[Dict[str, Any]] = None
    statut_facturation: Optional[str] = None

    code_activite: Optional[str] = None
    code_produit: Optional[str] = None
    plp_applicable: Optional[bool] = None
    categorie: Optional[str] = None


class RegleFacturationUpdate(BaseModel):
    code: Optional[str] = None
    libelle: Optional[str] = None
    condition_sql: Optional[str] = None
    condition_json: Optional[Dict[str, Any]] = None
    statut_facturation: Optional[str] = None

    code_activite: Optional[str] = None
    code_produit: Optional[str] = None
    plp_applicable: Optional[bool] = None
    categorie: Optional[str] = None

    # ✅ allow toggle active via PATCH (optionnel)
    is_active: Optional[bool] = None