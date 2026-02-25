# backend/models/dossiers_facturable.py
from __future__ import annotations

from sqlalchemy import Boolean, Column, DateTime, Text
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
    date_planifiee = Column(Text)
    technicien = Column(Text)
    commentaire_praxedo = Column(Text)

    statut_pidi = Column(Text)
    code_cible = Column(Text)
    numero_att = Column(Text)
    liste_articles = Column(Text)
    commentaire_pidi = Column(Text)

    regle_code = Column(Text)
    libelle_regle = Column(Text)
    condition_sql = Column(Text)

    condition_json = Column(JSONB)
    type_branchement = Column(JSONB)
    services = Column(JSONB)
    prix_degressifs = Column(JSONB)
    articles_optionnels = Column(JSONB)
    justificatifs = Column(JSONB)

    statut_facturation = Column(Text)
    code_chantier_generique = Column(Text)
    categorie = Column(Text)
    motif_verification = Column(Text)
    statut_final = Column(Text)

    desc_site = Column(Text)
    description = Column(Text)
    type_site_terrain = Column(Text)
    type_pbo_terrain = Column(Text)
    mode_passage = Column(Text)

    article_facturation_propose = Column(Text)
    statut_article = Column(Text)

    numero_ppd = Column(Text)
    attachement_valide = Column(Text)

    codes_cloture_facturables = Column(ARRAY(Text))
    documents_attendus = Column(ARRAY(Text))
    pieces_facturation = Column(ARRAY(Text))
    outils_depose = Column(ARRAY(Text))

    plp_applicable = Column(Boolean)
    is_previsite = Column(Boolean)
    cloture_facturable = Column(Boolean)

    date_cloture = Column(DateTime)
    pidi_date_creation = Column(DateTime)
    generated_at = Column(DateTime)

    force_plp = Column(Boolean)
    add_tsfh = Column(Boolean)
    commentaire_technicien = Column(Text)
    source_facturation = Column(Text)

    # ✅ champs palier CR10 (existent dans ta view)
    palier = Column(Text)
    palier_phrase = Column(Text)
    evenements = Column(Text)
    compte_rendu = Column(Text)

    # ✅ la view expose aussi phrase_declencheuse (dans ton SQL)
    phrase_declencheuse = Column(Text)

    # ❌ NE PAS mapper si la colonne n'existe pas dans la view
    # (sinon SQLAlchemy la met dans le SELECT → UndefinedColumn → 500)
    @property
    def statut_article_vs_regle(self):
        return None

    @property
    def regle_articles_attendus(self):
        return None