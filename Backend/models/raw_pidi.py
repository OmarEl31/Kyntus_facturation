from sqlalchemy import Column, Text, TIMESTAMP, Numeric
from database.connection import Base

class RawPidi(Base):
    __tablename__ = "pidi"
    __table_args__ = {"schema": "raw"}

    # PK stable : si ton fichier a N° de flux PIDI, on l’utilise
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

    numero_ppd = Column(Text)
    attachement_valide = Column(Text)

    bordereau = Column(Text, nullable=True)
    ht = Column(Numeric, nullable=True)

    liste_articles = Column(Text)
    imported_at = Column(TIMESTAMP)
