# backend/models/dossiers_facturable.py
from __future__ import annotations

from sqlalchemy import Boolean, Column, DateTime, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import column_property
from sqlalchemy.sql import literal_column

from database.connection import Base


class VDossierFacturable(Base):
    __tablename__ = "v_dossier_facturable"
    __table_args__ = {"schema": "canonique"}

    # PK
    key_match = Column(Text, primary_key=True)

    # TEXT
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

    # JSONB
    condition_json = Column(JSONB)
    type_branchement = Column(JSONB)
    services = Column(JSONB)
    prix_degressifs = Column(JSONB)
    articles_optionnels = Column(JSONB)
    justificatifs = Column(JSONB)

    # TEXT
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

    # ARRAYS
    codes_cloture_facturables = Column(ARRAY(Text))
    documents_attendus = Column(ARRAY(Text))
    pieces_facturation = Column(ARRAY(Text))
    outils_depose = Column(ARRAY(Text))

    # BOOL
    plp_applicable = Column(Boolean)
    is_previsite = Column(Boolean)
    cloture_facturable = Column(Boolean)

    # TIMESTAMPS
    date_cloture = Column(DateTime)
    pidi_date_creation = Column(DateTime)
    generated_at = Column(DateTime)

    # AUDIT / FACTURATION
    force_plp = Column(Boolean)
    add_tsfh = Column(Boolean)
    commentaire_technicien = Column(Text)
    source_facturation = Column(Text)

    # ✅ NOUVEAUX CHAMPS (présents dans ta view)
    palier = Column(Text)
    palier_phrase = Column(Text)
    evenements = Column(Text)
    compte_rendu = Column(Text)

    # ✅ CHAMP présent dans la view (tu l'as dans le SELECT final)
    # phrase_declencheuse existe dans ta view, mais tu ne l'as pas encore dans le modèle :
    phrase_declencheuse = Column(Text)

    # ❌ colonnes ABSENTES de la view => on mappe en NULL pour éviter les 500
    statut_article_vs_regle = column_property(literal_column("NULL::text"))
    regle_articles_attendus = column_property(literal_column("NULL::jsonb"))