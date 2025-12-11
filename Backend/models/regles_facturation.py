#Backen/models/regles_facturation.py

from sqlalchemy import Column, Integer, Text, DateTime, Boolean, ARRAY
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class RegleFacturation(Base):
    __tablename__ = "regles_facturation"
    __table_args__ = {"schema": "referentiels"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(Text)
    libelle = Column(Text)
    condition_sql = Column(Text)
    statut_facturation = Column(Text)
    commentaire = Column(Text)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    code_activite = Column(Text)
    code_produit = Column(Text)
    libelle_activite = Column(Text)
    libelle_produit = Column(Text)
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
