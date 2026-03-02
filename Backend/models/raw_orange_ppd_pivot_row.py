# Backend/models/raw_orange_ppd_pivot_row.py
from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import relationship

from database.connection import Base


class RawOrangePpdPivotRow(Base):
    __tablename__ = "orange_ppd_pivot_rows"
    __table_args__ = {"schema": "canonique"}

    row_id = Column(String, primary_key=True)

    import_id = Column(
        String,
        ForeignKey("canonique.orange_ppd_imports.import_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    imported_at = Column(DateTime, nullable=False, server_default=func.now())

    etiquette_lignes = Column(String, nullable=True)
    somme_kyntus = Column(Numeric(12, 2), nullable=True)

    import_batch = relationship("RawOrangePpdImport", back_populates="pivot_rows")