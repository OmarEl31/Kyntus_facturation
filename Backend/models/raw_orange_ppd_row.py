# Backend/models/raw_orange_ppd_row.py
from __future__ import annotations

from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey, func
from sqlalchemy.orm import relationship

from database.connection import Base


class RawOrangePpdRow(Base):
    __tablename__ = "orange_ppd_rows"
    __table_args__ = {"schema": "canonique"}

    row_id = Column(String, primary_key=True)

    import_id = Column(
        String,
        ForeignKey("canonique.orange_ppd_imports.import_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    imported_at = Column(DateTime, nullable=False, server_default=func.now())

    contrat = Column(String, nullable=True)
    numero_flux_pidi = Column(String, nullable=True)
    type_pidi = Column(String, nullable=True)
    statut = Column(String, nullable=True)
    nd = Column(String, nullable=True)
    code_secteur = Column(String, nullable=True)

    numero_ot = Column(String, nullable=True, index=True)  # OT normalisée côté import
    numero_att = Column(String, nullable=True)
    oeie = Column(String, nullable=True)
    code_gestion_chantier = Column(String, nullable=True)
    agence = Column(String, nullable=True)
    code_postal = Column(String, nullable=True)
    code_insee = Column(String, nullable=True)
    entreprise = Column(String, nullable=True)
    code_gpc = Column(String, nullable=True)
    code_etr = Column(String, nullable=True)
    chef_equipe = Column(String, nullable=True)
    ui = Column(String, nullable=True)

    numero_ppd = Column(String, nullable=True)  # important pour comparaison PPD
    act_prod = Column(String, nullable=True)
    numero_as = Column(String, nullable=True)
    centre = Column(String, nullable=True)
    date_debut = Column(String, nullable=True)
    date_fin = Column(String, nullable=True)
    numero_cac = Column(String, nullable=True)

    commentaire_interne = Column(String, nullable=True)
    commentaire_oeie = Column(String, nullable=True)
    commentaire_attelem = Column(String, nullable=True)

    motif_facturation_degradee = Column(String, nullable=True)
    categorie = Column(String, nullable=True)
    charge_affaire = Column(String, nullable=True)
    cause_acqui_rejet = Column(String, nullable=True)
    commentaire_acqui_rejet = Column(String, nullable=True)

    attachement_cree = Column(String, nullable=True)
    derniere_saisie = Column(String, nullable=True)
    attachement_definitif = Column(String, nullable=True)
    attachement_valide = Column(String, nullable=True)

    pointe_ppd = Column(String, nullable=True)
    planification_ot = Column(String, nullable=True)
    validation_interventions = Column(String, nullable=True)
    bordereau = Column(String, nullable=True)

    ht = Column(Numeric(12, 2), nullable=True)
    bordereau_sst = Column(String, nullable=True)
    ht_sst = Column(Numeric(12, 2), nullable=True)

    marge = Column(String, nullable=True)
    coeff = Column(String, nullable=True)
    kyntus = Column(String, nullable=True)
    liste_articles = Column(String, nullable=True)
    encours = Column(String, nullable=True)

    import_batch = relationship("RawOrangePpdImport", back_populates="rows")
