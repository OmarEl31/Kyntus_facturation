# Backend/routes/dossiers.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, case

from database.connection import get_db
from models.dossiers_facturable import VDossierFacturable
from schemas.dossier_facturable import DossierFacturable

router = APIRouter(prefix="/api/dossiers", tags=["dossiers"])


@router.get("", response_model=list[DossierFacturable])
def get_dossiers(
    q: str | None = None,
    statut: str | None = None,
    croisement: str | None = None,
    ppd: str | None = None,
    db: Session = Depends(get_db),
):
    qs = db.query(VDossierFacturable)

    # -----------------------------
    # Filtre recherche (q)
    # -----------------------------
    if q is not None:
        needle = q.strip()
        if needle:
            qs = qs.filter(
                or_(
                    VDossierFacturable.ot_key.ilike(f"%{needle}%"),
                    VDossierFacturable.nd_global.ilike(f"%{needle}%"),
                    VDossierFacturable.praxedo_ot_key.ilike(f"%{needle}%"),
                    VDossierFacturable.praxedo_nd.ilike(f"%{needle}%"),
                )
            )

    # -----------------------------
    # Filtres
    # -----------------------------
    if statut:
        qs = qs.filter(VDossierFacturable.statut_final == statut)

    if croisement:
        qs = qs.filter(VDossierFacturable.statut_croisement == croisement)

    if ppd:
        qs = qs.filter(VDossierFacturable.numero_ppd == ppd)

    # -----------------------------
    # TRI "métier" demandé
    #
    # 1) FACTURABLE
    # 2) CONDITIONNEL
    # 3) NON_FACTURABLE
    # 4) A_VERIFIER (et autres)
    #
    # + Ceux avec CROISEMENT_INCOMPLET tout en bas
    # -----------------------------
    statut_rank = case(
        (VDossierFacturable.statut_final == "FACTURABLE", 1),
        (VDossierFacturable.statut_final == "CONDITIONNEL", 2),
        (VDossierFacturable.statut_final == "NON_FACTURABLE", 3),
        (VDossierFacturable.statut_final == "A_VERIFIER", 4),
        else_=5,
    )

    croisement_incomplet_rank = case(
        (VDossierFacturable.motif_verification == "CROISEMENT_INCOMPLET", 2),
        else_=1,
    )

    # Tie-breaks stables
    return (
        qs.order_by(
            statut_rank.asc(),
            croisement_incomplet_rank.asc(),
            VDossierFacturable.generated_at.desc().nullslast(),
            VDossierFacturable.key_match.asc(),
        )
        .all()
    )
