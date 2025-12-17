from sqlalchemy import Column, Text, TIMESTAMP
from database.connection import Base

class RawPidi(Base):
    __tablename__ = "pidi"
    __table_args__ = {"schema": "raw"}

    # clé technique
    numero_flux_pidi = Column(Text, primary_key=True)

    contrat = Column(Text)
    type_pidi = Column(Text)
    statut = Column(Text)

    nd = Column(Text)
    code_secteur = Column(Text)

    numero_ot = Column(Text)
    numero_att = Column(Text)

    oeie = Column(Text)
    code_gestion_chantier = Column(Text)
    agence = Column(Text)

    liste_articles = Column(Text)

    date_creation = Column(TIMESTAMP)
    imported_at = Column(TIMESTAMP)
