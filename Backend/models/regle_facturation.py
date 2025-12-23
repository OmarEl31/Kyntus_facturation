from sqlalchemy import Column, Integer, Text, Boolean
from database.connection import Base

class RegleFacturation(Base):
    __tablename__ = "regle_facturation"
    __table_args__ = {"schema": "referentiels"}

    id = Column(Integer, primary_key=True, index=True)

    code = Column(Text, nullable=False)
    libelle = Column(Text)
    condition_sql = Column(Text)
    statut_facturation = Column(Text)

    # ✅ pour les tags
    code_activite = Column(Text)
    code_produit = Column(Text)
    plp_applicable = Column(Boolean)
    categorie = Column(Text)
