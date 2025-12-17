from sqlalchemy import Column, Text, TIMESTAMP
from database.connection import Base


class RawPidi(Base):
    __tablename__ = "pidi"
    __table_args__ = {"schema": "raw"}

    numero = Column(Text, primary_key=True)

    statut_pidi = Column(Text)
    code_cible = Column(Text)
    date_creation = Column(TIMESTAMP)
    numero_att = Column(Text)
    liste_articles = Column(Text)
    commentaire = Column(Text)
    imported_at = Column(TIMESTAMP)
    match_id = Column(Text)
