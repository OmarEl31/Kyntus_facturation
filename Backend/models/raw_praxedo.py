from sqlalchemy import Column, Text, TIMESTAMP
from database.connection import Base

class RawPraxedo(Base):
    __tablename__ = "praxedo"
    __table_args__ = {"schema": "raw"}

    # ✅ clé primaire "technique" pour satisfaire SQLAlchemy
    numero = Column(Text, primary_key=True)

    statut = Column(Text)
    planifiee = Column(Text)  # dans ta table c'est du texte (ex: "05/11/2025 14:30")
    nom_technicien = Column(Text)
    prenom_technicien = Column(Text)
    equipiers = Column(Text)
    nd = Column(Text)
    act_prod = Column(Text)
    code_intervenant = Column(Text)
    cp = Column(Text)
    ville_site = Column(Text)
    imported_at = Column(TIMESTAMP)
