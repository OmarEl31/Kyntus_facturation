# backend/schemas/dossier_facturable.py
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class DossierFacturable(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key_match: str

    ot_key: Optional[str] = None
    nd_global: Optional[str] = None
    statut_croisement: Optional[str] = None

    praxedo_ot_key: Optional[str] = None
    praxedo_nd: Optional[str] = None

    activite_code: Optional[str] = None
    produit_code: Optional[str] = None
    code_cloture_code: Optional[str] = None
    statut_praxedo: Optional[str] = None

    date_planifiee: Optional[str] = None
    date_cloture: Optional[datetime] = None

    technicien: Optional[str] = None
    commentaire_praxedo: Optional[str] = None

    statut_pidi: Optional[str] = None
    code_cible: Optional[str] = None
    pidi_date_creation: Optional[datetime] = None
    numero_att: Optional[str] = None
    liste_articles: Optional[str] = None
    commentaire_pidi: Optional[str] = None

    regle_code: Optional[str] = None
    libelle_regle: Optional[str] = None

    condition_sql: Optional[str] = None
    condition_json: Optional[Any] = None

    statut_facturation: Optional[str] = None

    codes_cloture_facturables: Optional[list[str]] = None
    documents_attendus: Optional[list[str]] = None
    pieces_facturation: Optional[list[str]] = None
    outils_depose: Optional[list[str]] = None

    type_branchement: Optional[Any] = None
    services: Optional[Any] = None
    prix_degressifs: Optional[Any] = None
    articles_optionnels: Optional[Any] = None
    justificatifs: Optional[Any] = None

    plp_applicable: Optional[bool] = None
    categorie: Optional[str] = None
    is_previsite: Optional[bool] = None

    motif_verification: Optional[str] = None
    statut_final: Optional[str] = None
    cloture_facturable: Optional[bool] = None

    generated_at: Optional[datetime] = None

    desc_site: Optional[str] = None
    description: Optional[str] = None
    type_site_terrain: Optional[str] = None
    type_pbo_terrain: Optional[str] = None
    mode_passage: Optional[str] = None

    article_facturation_propose: Optional[str] = None
    regle_articles_attendus: Optional[Any] = None  # renverra null (fallback)
    statut_article: Optional[str] = None
    statut_article_vs_regle: Optional[str] = None  # renverra null (fallback)

    numero_ppd: Optional[str] = None
    attachement_valide: Optional[str] = None
    code_chantier_generique: Optional[str] = None

    # ✅ champs ajoutés
    commentaire_technicien: Optional[str] = None
    source_facturation: Optional[str] = None
    force_plp: Optional[bool] = None
    add_tsfh: Optional[bool] = None

    palier: Optional[str] = None
    palier_phrase: Optional[str] = None
    evenements: Optional[str] = None
    compte_rendu: Optional[str] = None
    phrase_declencheuse: Optional[str] = None