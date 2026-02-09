from sqlalchemy import Column, Numeric, Text, TIMESTAMP, func
from database.connection import Base

class RawOrangePpdRow(Base):
    __tablename__ = "orange_ppd_rows"
    __table_args__ = {"schema": "canonique"}

    row_id = Column(Text, primary_key=True)
    import_id = Column(Text, nullable=False, index=True)

    contrat = Column(Text)
    numero_flux_pidi = Column(Text)
    type_pidi = Column(Text)
    statut = Column(Text)
    nd = Column(Text)
    code_secteur = Column(Text)

    numero_ot = Column(Text, index=True)
    numero_att = Column(Text)
    oeie = Column(Text)
    code_gestion_chantier = Column(Text)
    agence = Column(Text)
    code_postal = Column(Text)
    code_insee = Column(Text)
    entreprise = Column(Text)
    code_gpc = Column(Text)
    code_etr = Column(Text)
    chef_equipe = Column(Text)
    ui = Column(Text)

    numero_ppd = Column(Text, index=True)
    act_prod = Column(Text)
    numero_as = Column(Text)
    centre = Column(Text)
    date_debut = Column(Text)
    date_fin = Column(Text)
    numero_cac = Column(Text)

    commentaire_interne = Column(Text)
    commentaire_oeie = Column(Text)
    commentaire_attelem = Column(Text)
    motif_facturation_degradee = Column(Text)
    categorie = Column(Text)
    charge_affaire = Column(Text)
    cause_acqui_rejet = Column(Text)
    commentaire_acqui_rejet = Column(Text)

    attachement_cree = Column(Text)
    derniere_saisie = Column(Text)
    attachement_definitif = Column(Text)
    attachement_valide = Column(Text)
    pointe_ppd = Column(Text)
    planification_ot = Column(Text)
    validation_interventions = Column(Text)

    bordereau = Column(Text)
    ht = Column(Numeric(12, 2))
    bordereau_sst = Column(Text)
    ht_sst = Column(Numeric(12, 2))
    marge = Column(Text)
    coeff = Column(Text)
    kyntus = Column(Text)
    liste_articles = Column(Text)
    encours = Column(Text)

    imported_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
