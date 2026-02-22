from sqlalchemy import Column, Integer, Text, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from database.connection import Base


class RegleFacturation(Base):
    __tablename__ = "regle_facturation"
    __table_args__ = {"schema": "referentiels"}

    id = Column(Integer, primary_key=True, index=True)

    code = Column(Text, nullable=False)
    libelle = Column(Text)
    condition_sql = Column(Text)
    condition_json = Column(JSONB)

    statut_facturation = Column(Text)

    code_activite = Column(Text)
    code_produit = Column(Text)
    plp_applicable = Column(Boolean)
    categorie = Column(Text)

    # ✅ Soft delete
    is_active = Column(Boolean, nullable=False, server_default="true")
    deleted_at = Column(DateTime(timezone=False), nullable=True)

    # (si tes colonnes existent déjà en DB, garde-les ici)
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    updated_at = Column(DateTime(timezone=False), onupdate=func.now())