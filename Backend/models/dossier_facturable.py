# backend/models/dossier_facturable.py
from sqlalchemy import Column, Integer, String, Float, DateTime
from core.database import Base

class DossierFacturable(Base):
    __tablename__ = "dossier_facturable"
    __table_args__ = {"schema": "canonique"}

    id = Column(Integer, primary_key=True, index=True)
    nd_global = Column(String)
    nd_praxedo = Column(String)
    nd_pidi = Column(String)
    act_praxedo = Column(String)
    act_pidi = Column(String)
    code_source_map = Column(String)
    code_cible = Column(String)
    regle_code = Column(String)
    regle_facturable = Column(String)
    statut_facturation = Column(String)
    commentaire = Column(String)
    montant = Column(Float)
    client_id = Column(String)
    statut_metier = Column(String)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
