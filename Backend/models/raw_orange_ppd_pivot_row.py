# Backend/models/raw_orange_ppd_pivot_row.py
from sqlalchemy import Column, Numeric, Text, TIMESTAMP, func
from database.connection import Base

class RawOrangePpdPivot(Base):
    __tablename__ = "orange_ppd_pivot"
    __table_args__ = {"schema": "canonique"}

    pivot_id = Column(Text, primary_key=True)
    import_id = Column(Text, nullable=False, index=True)

    etiquette_lignes = Column(Text)
    somme_kyntus = Column(Numeric(12, 2))

    imported_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
