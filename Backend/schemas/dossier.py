# backend/schemas/dossier.py
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class DossierOut(BaseModel):
    # Champs existants
    key_match: Optional[str] = None
    ot_key: Optional[str] = None
    nd_global: Optional[str] = None
    numero_ppd: Optional[str] = None
    attachement_valide: Optional[str] = None
    activite_code: Optional[str] = None
    produit_code: Optional[str] = None
    code_cible: Optional[str] = None
    code_cloture_code: Optional[str] = None
    mode_passage: Optional[str] = None
    type_site_terrain: Optional[str] = None
    type_pbo_terrain: Optional[str] = None
    desc_site: Optional[str] = None
    description: Optional[str] = None
    regle_code: Optional[str] = None
    libelle_regle: Optional[str] = None
    statut_facturation: Optional[str] = None
    codes_cloture_facturables: Optional[list[str]] = None
    statut_final: Optional[str] = None
    statut_croisement: Optional[str] = None
    motif_verification: Optional[str] = None
    is_previsite: Optional[bool] = None
    statut_praxedo: Optional[str] = None
    statut_pidi: Optional[str] = None
    liste_articles: Optional[str] = None
    date_planifiee: Optional[datetime] = None
    generated_at: Optional[datetime] = None
    technicien: Optional[str] = None
    type_branchement: Optional[Any] = None
    plp_applicable: Optional[bool] = None
    services: Optional[Any] = None
    prix_degressifs: Optional[Any] = None
    articles_optionnels: Optional[Any] = None
    documents_attendus: Optional[list[str]] = None
    pieces_facturation: Optional[list[str]] = None
    outils_depose: Optional[list[str]] = None
    justificatifs: Optional[Any] = None
    article_facturation_propose: Optional[str] = None
    regle_articles_attendus: Optional[Any] = None
    statut_article: Optional[str] = None
    statut_article_vs_regle: Optional[str] = None
    
    # NOUVEAUX CHAMPS
    palier: Optional[str] = None
    palier_phrase: Optional[str] = None
    evenements: Optional[str] = None
    compte_rendu: Optional[str] = None

class PageOut(BaseModel):
    items: list[DossierOut]
    total: int
    page: int
    page_size: int