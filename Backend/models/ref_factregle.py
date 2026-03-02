# Backend/models/ref_factregle.py
from sqlalchemy import Column, Text, BigInteger, TIMESTAMP
from database.connection import Base

class RefFactRegle(Base):
    __tablename__ = "factregle"
    __table_args__ = {"schema": "ref"}

    id = Column(BigInteger, primary_key=True)

    categorie = Column(Text)
    plp = Column(Text)

    code_activite = Column(Text, nullable=False)
    code_produit = Column(Text, nullable=False)

    libelle_activite = Column(Text)
    libelle_produit = Column(Text)

    codes_cloture_facturable = Column(Text)

    branchement_immeuble = Column(Text)
    branchement_souterrain = Column(Text)
    branchement_facade_aerien = Column(Text)

    plp_articles = Column(Text)
    services = Column(Text)
    code_ve = Column(Text)

    article_etude_optionnel = Column(Text)
    article_autre_optionnel = Column(Text)

    prix_degressifs = Column(Text)
    commentaires = Column(Text)
    documents_attendus = Column(Text)
    code_chantier_generique = Column(Text)
    pieces_attendues_facturation = Column(Text)
    outils_pour_depose = Column(Text)
    justificatifs_tsfh = Column(Text)
    justificatif_pser = Column(Text)
    autre = Column(Text)

    imported_at = Column(TIMESTAMP)
