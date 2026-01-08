# Backend/models/dossiers_facturable.py
from sqlalchemy import Column, Text, Boolean, TIMESTAMP
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from database.connection import Base

class VDossierFacturable(Base):
    __tablename__ = "v_dossier_facturable"
    __table_args__ = {"schema": "canonique"}

    key_match = Column(Text, primary_key=True)

    ot_key = Column(Text)
    nd_global = Column(Text)
    statut_croisement = Column(Text)

    praxedo_ot_key = Column(Text)
    praxedo_nd = Column(Text)
    activite_code = Column(Text)
    produit_code = Column(Text)
    code_cloture_code = Column(Text)
    statut_praxedo = Column(Text)
    date_planifiee = Column(Text)  # ⚠️ text (comme ta view)
    date_cloture = Column(TIMESTAMP)
    technicien = Column(Text)
    commentaire_praxedo = Column(Text)

    statut_pidi = Column(Text)
    code_cible = Column(Text)
    pidi_date_creation = Column(TIMESTAMP)
    numero_att = Column(Text)
    liste_articles = Column(Text)
    commentaire_pidi = Column(Text)

    regle_code = Column(Text)
    libelle_regle = Column(Text)
    condition_sql = Column(Text)
    condition_json = Column(JSONB)
    statut_facturation = Column(Text)
    codes_cloture_facturables = Column(ARRAY(Text))
    type_branchement = Column(JSONB)
    plp_applicable = Column(Boolean)
    services = Column(JSONB)
    prix_degressifs = Column(JSONB)
    articles_optionnels = Column(JSONB)
    documents_attendus = Column(ARRAY(Text))
    pieces_facturation = Column(ARRAY(Text))
    outils_depose = Column(ARRAY(Text))
    justificatifs = Column(JSONB)
    code_chantier_generique = Column(Text)
    categorie = Column(Text)

    statut_articles = Column(Text)

    statut_final = Column(Text)
    cloture_facturable = Column(Boolean)
    generated_at = Column(TIMESTAMP)

    # ✅ Terrain (depuis PRAX / desc_site & description)
    desc_site = Column(Text)
    description = Column(Text)
    type_site_terrain = Column(Text)
    type_pbo_terrain = Column(Text)
    mode_passage = Column(Text)
    article_facturation_propose = Column(Text)
    statut_article = Column(Text)

    # ✅ Nouveau : contrôle terrain vs règle
    regle_articles_attendus = Column(JSONB)
    statut_article_vs_regle = Column(Text)
