from sqlalchemy import Column, BigInteger, Text, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class PraxedoNorm(Base):
    __tablename__ = "praxedo_norm"
    __table_args__ = {"schema": "norm"}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ot_key = Column(Text)
    nd = Column(Text)
    activite_code = Column(Text)
    produit_code = Column(Text)
    code_cloture_code = Column(Text)
    statut_praxedo = Column(Text)
    date_planifiee = Column(DateTime)
    date_cloture = Column(DateTime)
    created_at = Column(DateTime)
    technicien = Column(Text)
    commentaire_praxedo = Column(Text)
    imported_at = Column(DateTime)
    match_id = Column(Text)
