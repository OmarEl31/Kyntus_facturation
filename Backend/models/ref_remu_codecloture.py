# Backend/models/ref_remu_codecloture.py

from sqlalchemy import Column, Text, BigInteger, TIMESTAMP
from database.connection import Base

class RefRemuCodeCloture(Base):
    __tablename__ = "remu_codecloture"
    __table_args__ = {"schema": "ref"}

    id = Column(BigInteger, primary_key=True)

    activite = Column(Text, nullable=False)
    type_cloture = Column(Text)
    code_cloture = Column(Text, nullable=False)

    libelle_code_cloture = Column(Text)
    code_situation = Column(Text)

    remu_fournisseur = Column(Text)  # "OUI" / "NON"
    commentaire = Column(Text)

    imported_at = Column(TIMESTAMP)
