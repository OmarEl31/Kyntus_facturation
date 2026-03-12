# Backend/models/raw_pidi_scrape_full.py
from sqlalchemy import Column, Text, TIMESTAMP, Numeric, Integer, ForeignKey
from database.connection import Base

class RawPidiScrapeFull(Base):
    __tablename__ = "pidi_scrape_full"
    __table_args__ = {"schema": "raw"}

    flux_pidi = Column(Text, primary_key=True)
    user_id = Column(Integer, primary_key=True)

    releve_input = Column(Text, nullable=True)
    contrat = Column(Text, nullable=True)
    type = Column(Text, nullable=True)
    statut = Column(Text, nullable=True)
    nd = Column(Text, nullable=True)
    secteur = Column(Text, nullable=True)
    num_ot = Column(Text, nullable=True)
    num_oeie = Column(Text, nullable=True)
    code_chantier = Column(Text, nullable=True)
    agence = Column(Text, nullable=True)
    num_attachement = Column(Text, nullable=True)
    num_ppd = Column(Text, nullable=True)
    num_cac = Column(Text, nullable=True)
    bordereau = Column(Text, nullable=True)
    ht = Column(Numeric, nullable=True)
    prix_majore = Column(Numeric, nullable=True)
    raw_payload = Column(Text, nullable=True)
    imported_at = Column(TIMESTAMP, nullable=True)