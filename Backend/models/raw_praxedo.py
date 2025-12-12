# Backend/models/raw_praxedo.py
from sqlalchemy import Column, Text, TIMESTAMP
from database.connection import Base


class RawPraxedo(Base):
    __tablename__ = "praxedo"
    __table_args__ = {"schema": "raw"}

    # On utilise numero comme clé primaire "technique"
    # (ce n’est pas grave si ce n'est pas parfait, on s’en sert juste pour l’ORM)
    numero = Column(Text, primary_key=True)

    statut = Column(Text)
    planifiee = Column(TIMESTAMP)
    nom_technicien = Column(Text)
    prenom_technicien = Column(Text)
    equipiers = Column(Text)
    nd = Column(Text)
    act_prod = Column(Text)
    code_intervenant = Column(Text)
    cp = Column(Text)
    ville_site = Column(Text)
    imported_at = Column(TIMESTAMP)
    match_id = Column(Text)
