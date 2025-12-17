from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class DossierFacturable(BaseModel):
    key_match: Optional[str]

    ot_key: Optional[str]
    nd_global: Optional[str]
    statut_croisement: Optional[str]

    praxedo_ot_key: Optional[str]
    praxedo_nd: Optional[str]
    activite_code: Optional[str]
    produit_code: Optional[str]
    code_cloture_code: Optional[str]
    statut_praxedo: Optional[str]
    date_planifiee: Optional[str]     # ✅ text
    date_cloture: Optional[datetime]
    technicien: Optional[str]
    commentaire_praxedo: Optional[str]

    statut_pidi: Optional[str]
    code_cible: Optional[str]
    pidi_date_creation: Optional[datetime]
    numero_att: Optional[str]
    liste_articles: Optional[str]
    commentaire_pidi: Optional[str]

    regle_code: Optional[str]
    libelle_regle: Optional[str]
    condition_sql: Optional[str]
    statut_facturation: Optional[str]
    codes_cloture_facturables: Optional[List[str]]
    type_branchement: Optional[Any]
    plp_applicable: Optional[bool]
    services: Optional[Any]
    prix_degressifs: Optional[Any]
    articles_optionnels: Optional[Any]
    documents_attendus: Optional[List[str]]
    pieces_facturation: Optional[List[str]]
    outils_depose: Optional[List[str]]
    justificatifs: Optional[Any]
    code_chantier_generique: Optional[str]
    categorie: Optional[str]

    statut_articles: Optional[str]

    statut_final: Optional[str]
    cloture_facturable: Optional[bool]
    generated_at: Optional[datetime]

    class Config:
        from_attributes = True
