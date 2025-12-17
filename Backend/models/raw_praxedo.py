from sqlalchemy import Column, Text, TIMESTAMP
from database.connection import Base

class RawPraxedo(Base):
    __tablename__ = "praxedo"
    __table_args__ = {"schema": "raw"}

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
