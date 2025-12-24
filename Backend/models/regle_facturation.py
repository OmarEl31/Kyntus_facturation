# Backend/models/regle_facturation.py
from sqlalchemy import Column, Integer, Text, Boolean
from database.connection import Base
from sqlalchemy.dialects.postgresql import JSONB

class RegleFacturation(Base):
    __tablename__ = "regle_facturation"
    __table_args__ = {"schema": "referentiels"}

    id = Column(Integer, primary_key=True, index=True)

    code = Column(Text, nullable=False)
    libelle = Column(Text)
    condition_sql = Column(Text)
    condition_json = Column(JSONB)  # ✅ AJOUT SÛR

    statut_facturation = Column(Text)

    # ✅ pour les tags
    code_activite = Column(Text)
    code_produit = Column(Text)
    plp_applicable = Column(Boolean)
    categorie = Column(Text)