# Backend/models/raw/pidi.py
from sqlalchemy import Column, Text, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class PIDIRaw(Base):
    __tablename__ = "pidi"
    __table_args__ = {"schema": "raw"}

    # Colonnes dans le même ordre que le CSV
    contrat = Column(Text)
    numero_flux_pidi = Column(Text)
    type_pidi = Column(Text)
    statut = Column(Text)
    nd = Column(Text)
    code_secteur = Column(Text)
    numero_ot = Column(Text, primary_key=True)  # clé logique OT
    numero_att = Column(Text)
    oeie = Column(Text)
    code_gestion_chantier = Column(Text)
    agence = Column(Text)
    liste_articles = Column(Text)
    imported_at = Column(DateTime)
