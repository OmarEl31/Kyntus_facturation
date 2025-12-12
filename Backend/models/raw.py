# Backend/models/raw.py

from sqlalchemy import Column, Integer, Text, TIMESTAMP
from database.connection import Base
from datetime import datetime


class RawPraxedo(Base):
    """Table raw.praxedo"""
    
    __tablename__ = "praxedo"
    __table_args__ = {"schema": "raw"}

    # ✅ Utiliser 'numero' comme clé primaire au lieu de 'id'
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
    imported_at = Column(TIMESTAMP, nullable=True)


class RawPidi(Base):
    """Table raw.pidi"""
    
    __tablename__ = "pidi"
    __table_args__ = {"schema": "raw"}

    # ✅ Utiliser 'numero_flux_pidi' comme clé primaire
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
    imported_at = Column(TIMESTAMP, nullable=True)