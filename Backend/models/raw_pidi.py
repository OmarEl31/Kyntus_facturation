from sqlalchemy import Column, Text, TIMESTAMP
from database.connection import Base

class RawPidi(Base):
    __tablename__ = "pidi"
    __table_args__ = {"schema": "raw"}

    # PK technique (choisis une colonne présente et stable)
    numero_ot = Column(Text, primary_key=True)

    contrat = Column(Text)
    numero_flux_pidi = Column(Text)
    type_pidi = Column(Text)
    statut = Column(Text)
    nd = Column(Text)
    code_secteur = Column(Text)
    numero_att = Column(Text)
    oeie = Column(Text)
    code_gestion = Column(Text)   # si tu l’as (sinon supprime)
    agence = Column(Text)
    liste_articles = Column(Text)
    imported_at = Column(TIMESTAMP)
