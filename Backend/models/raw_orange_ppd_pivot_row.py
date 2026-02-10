# models/raw_orange_ppd_pivot_row.py
from sqlalchemy import Column, Text, Numeric, DateTime, ForeignKey, text
from database.connection import Base

class RawOrangePpdPivotRow(Base):
    __tablename__ = "orange_ppd_pivot_rows"
    __table_args__ = {"schema": "canonique"}

    row_id = Column(Text, primary_key=True)
    import_id = Column(Text, ForeignKey("canonique.orange_ppd_imports.import_id", ondelete="CASCADE"), nullable=False)

    etiquette_lignes = Column(Text, nullable=True)
    somme_kyntus = Column(Numeric(12, 2), nullable=True)

    imported_at = Column(DateTime, nullable=False, server_default=text("now()"))
