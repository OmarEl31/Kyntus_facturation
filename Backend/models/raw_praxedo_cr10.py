# Backend/models/raw_praxedo_cr10.py
from sqlalchemy import Column, Text, TIMESTAMP
from database.connection import Base

class RawPraxedoCr10(Base):
    __tablename__ = "praxedo_cr10"
    __table_args__ = {"schema": "raw"}

    id_externe = Column(Text, primary_key=True)
    nom_site = Column(Text)
    compte_rendu = Column(Text)
    evenements = Column(Text)   # NEW
    palier = Column(Text)       # NEW
    imported_at = Column(TIMESTAMP)