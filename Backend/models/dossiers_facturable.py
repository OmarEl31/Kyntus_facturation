#Backen/models/dossiers_facturable.py

from sqlalchemy import Column, Text, TIMESTAMP, Boolean
from database.connection import Base

class VDossierFacturable(Base):
    __tablename__ = "v_dossier_facturable"
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

    # RÈGLES
    regle_code = Column(Text)
    libelle_regle = Column(Text)
    condition_sql = Column(Text)
    statut_facturation = Column(Text)
    codes_cloture_facturables = Column(Text)
    type_branchement = Column(Text)
    plp_applicable = Column(Text)
    services = Column(Text)
    prix_degressifs = Column(Text)
    articles_optionnels = Column(Text)
    documents_attendus = Column(Text)
    pieces_facturation = Column(Text)
    outils_depose = Column(Text)
    justificatifs = Column(Text)
    code_chantier_generique = Column(Text)
    categorie = Column(Text)

    # FINAL
    statut_final = Column(Text)
    cloture_facturable = Column(Boolean)
    generated_at = Column(TIMESTAMP)
