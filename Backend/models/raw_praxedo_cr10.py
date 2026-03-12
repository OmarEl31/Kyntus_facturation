from sqlalchemy import Column, Text, TIMESTAMP, Integer, ForeignKey
from database.connection import Base


class RawPraxedoCr10(Base):
    __tablename__ = "praxedo_cr10"
    __table_args__ = {"schema": "raw"}

    id_externe = Column(Text, primary_key=True)
    user_id = Column(Integer, ForeignKey("public.users.id"), primary_key=True)

    nom_site = Column(Text)
    compte_rendu = Column(Text)
    evenements = Column(Text)
    palier = Column(Text)
    imported_at = Column(TIMESTAMP)