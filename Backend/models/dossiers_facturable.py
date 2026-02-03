# backend/models/dossiers_facturable.py
from __future__ import annotations

from sqlalchemy import Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from database.connection import Base


class VDossierFacturable(Base):
    __tablename__ = "v_dossier_facturable"
    __table_args__ = {"schema": "canonique"}

    # PK
    key_match: Mapped[str] = mapped_column(Text, primary_key=True)

    # TEXT
    ot_key: Mapped[str | None] = mapped_column(Text)
    nd_global: Mapped[str | None] = mapped_column(Text)
    statut_croisement: Mapped[str | None] = mapped_column(Text)

    praxedo_ot_key: Mapped[str | None] = mapped_column(Text)
    praxedo_nd: Mapped[str | None] = mapped_column(Text)
    activite_code: Mapped[str | None] = mapped_column(Text)
    produit_code: Mapped[str | None] = mapped_column(Text)
    code_cloture_code: Mapped[str | None] = mapped_column(Text)
    statut_praxedo: Mapped[str | None] = mapped_column(Text)
    date_planifiee: Mapped[str | None] = mapped_column(Text)
    technicien: Mapped[str | None] = mapped_column(Text)
    commentaire_praxedo: Mapped[str | None] = mapped_column(Text)

    statut_pidi: Mapped[str | None] = mapped_column(Text)
    code_cible: Mapped[str | None] = mapped_column(Text)
    numero_att: Mapped[str | None] = mapped_column(Text)
    liste_articles: Mapped[str | None] = mapped_column(Text)
    commentaire_pidi: Mapped[str | None] = mapped_column(Text)

    regle_code: Mapped[str | None] = mapped_column(Text)
    libelle_regle: Mapped[str | None] = mapped_column(Text)
    condition_sql: Mapped[str | None] = mapped_column(Text)

    # JSONB
    condition_json: Mapped[dict | list | None] = mapped_column(JSONB)
    type_branchement: Mapped[dict | list | None] = mapped_column(JSONB)
    services: Mapped[dict | list | None] = mapped_column(JSONB)
    prix_degressifs: Mapped[dict | list | None] = mapped_column(JSONB)
    articles_optionnels: Mapped[dict | list | None] = mapped_column(JSONB)
    justificatifs: Mapped[dict | list | None] = mapped_column(JSONB)

    # TEXT
    statut_facturation: Mapped[str | None] = mapped_column(Text)
    code_chantier_generique: Mapped[str | None] = mapped_column(Text)
    categorie: Mapped[str | None] = mapped_column(Text)
    motif_verification: Mapped[str | None] = mapped_column(Text)
    statut_final: Mapped[str | None] = mapped_column(Text)

    desc_site: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    type_site_terrain: Mapped[str | None] = mapped_column(Text)
    type_pbo_terrain: Mapped[str | None] = mapped_column(Text)
    mode_passage: Mapped[str | None] = mapped_column(Text)

    article_facturation_propose: Mapped[str | None] = mapped_column(Text)
    statut_article: Mapped[str | None] = mapped_column(Text)

    numero_ppd: Mapped[str | None] = mapped_column(Text)
    attachement_valide: Mapped[str | None] = mapped_column(Text)

    # ARRAYS (text[])
    codes_cloture_facturables: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    documents_attendus: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    pieces_facturation: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    outils_depose: Mapped[list[str] | None] = mapped_column(ARRAY(Text))

    # BOOL
    plp_applicable: Mapped[bool | None] = mapped_column(Boolean)
    is_previsite: Mapped[bool | None] = mapped_column(Boolean)
    cloture_facturable: Mapped[bool | None] = mapped_column(Boolean)

    # TIMESTAMPS (naive)
    date_cloture: Mapped[object | None] = mapped_column(DateTime)
    pidi_date_creation: Mapped[object | None] = mapped_column(DateTime)
    generated_at: Mapped[object | None] = mapped_column(DateTime)
