# Backend/models/raw_orange_ppd_import.py
from __future__ import annotations

from sqlalchemy import Column, DateTime, Integer, String, func
from sqlalchemy.orm import relationship

from database.connection import Base


class RawOrangePpdImport(Base):
    __tablename__ = "orange_ppd_imports"
    __table_args__ = {"schema": "canonique"}

    import_id = Column(String, primary_key=True)
    filename = Column(String, nullable=True)
    imported_by = Column(String, nullable=True)
    row_count = Column(Integer, nullable=False, default=0)
    imported_at = Column(DateTime, nullable=False, server_default=func.now())

    # Relation vers rows (OT)
    rows = relationship(
        "RawOrangePpdRow",
        back_populates="import_batch",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # Relation vers pivot rows
    pivot_rows = relationship(
        "RawOrangePpdPivotRow",
        back_populates="import_batch",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )