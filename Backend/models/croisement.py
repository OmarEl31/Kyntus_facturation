from sqlalchemy import Column, String, DateTime, text
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class VCroisement(Base):
    __tablename__ = "v_croisement"
    __table_args__ = {"schema": "canonique"}

    ot_key = Column(String, primary_key=True)
    nd_global = Column(String)
    activite_code = Column(String)
    code_cible = Column(String)
    code_cloture_code = Column(String)
    date_planifiee = Column(DateTime)
    statut_praxedo = Column(String)
    statut_pidi = Column(String)
    commentaire_praxedo = Column(String)
    statut_croisement = Column(String)
    generated_at = Column(DateTime, server_default=text("now()"))
