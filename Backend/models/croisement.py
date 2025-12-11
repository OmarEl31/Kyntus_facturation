#Backen/models/croisement.py
from sqlalchemy import Column, Text, TIMESTAMP, Boolean
from database.connection import Base

class VCroisement(Base):
    __tablename__ = "v_croisement"
    __table_args__ = {"schema": "canonique"}

    key_match = Column(Text, primary_key=True)
    ot_key = Column(Text)
    nd_global = Column(Text)
    statut_croisement = Column(Text)

    # Praxedo
    praxedo_ot_key = Column(Text)
    praxedo_nd = Column(Text)
    activite_code = Column(Text)
    produit_code = Column(Text)
    code_cloture_code = Column(Text)
    statut_praxedo = Column(Text)
    date_planifiee = Column(TIMESTAMP)
    date_cloture = Column(TIMESTAMP)
    technicien = Column(Text)
    commentaire_praxedo = Column(Text)

    # PIDI
    statut_pidi = Column(Text)
    code_cible = Column(Text)
    pidi_date_creation = Column(TIMESTAMP)
    numero_att = Column(Text)
    liste_articles = Column(Text)
    commentaire_pidi = Column(Text)
