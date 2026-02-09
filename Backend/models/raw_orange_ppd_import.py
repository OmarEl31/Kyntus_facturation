from sqlalchemy import Column, Integer, Text, TIMESTAMP, func
from database.connection import Base

class RawOrangePpdImport(Base):
    __tablename__ = "orange_ppd_imports"
    __table_args__ = {"schema": "canonique"}

    import_id = Column(Text, primary_key=True)
    filename = Column(Text, nullable=False)
    imported_by = Column(Text)
    row_count = Column(Integer, nullable=False, server_default="0")
    imported_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
