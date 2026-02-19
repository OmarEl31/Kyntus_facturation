from sqlalchemy import Column, Text, TIMESTAMP
from database.connection import Base

class RawPraxedoCr10(Base):
    __tablename__ = "praxedo_cr10"
    __table_args__ = {"schema": "raw"}

    id_externe = Column(Text, primary_key=True)  # OT
    nom_site = Column(Text)                      # ND
    compte_rendu = Column(Text)                  # COMPTE-RENDU
    imported_at = Column(TIMESTAMP)
