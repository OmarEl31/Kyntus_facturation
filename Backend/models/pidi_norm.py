from sqlalchemy import Column, BigInteger, Text, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class PIDINorm(Base):
    __tablename__ = "pidi_norm"
    __table_args__ = {"schema": "norm"}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ot_key = Column(Text)
    nd = Column(Text)
    nd_pidi = Column(Text)
    statut_pidi = Column(Text)
    code_cible = Column(Text)
    date_creation = Column(DateTime)
    numero_att = Column(Text)
    oeie = Column(Text)
    code_gestion = Column(Text)
    agence = Column(Text)
    liste_articles = Column(Text)
    commentaire_pidi = Column(Text)
    imported_at = Column(DateTime)
    match_id = Column(Text)
