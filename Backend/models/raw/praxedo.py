# Backend/models/raw/praxedo.py
from sqlalchemy import Column, Text, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class PraxedoRaw(Base):
    __tablename__ = "praxedo"
    __table_args__ = {"schema": "raw"}

    numero = Column(Text, primary_key=True)
    statut = Column(Text)
    planifiee = Column(Text)
    nom_technicien = Column(Text)
    prenom_technicien = Column(Text)
    equipiers = Column(Text)
    nd = Column(Text)
    act_prod = Column(Text)
    code_intervenant = Column(Text)
    cp = Column(Text)
    ville_site = Column(Text)
    imported_at = Column(DateTime)
