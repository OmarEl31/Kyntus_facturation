# Backend/routes/dossiers.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

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

    if q:
        like = f"%{q}%"
        qs = qs.filter(
            (VDossierFacturable.ot_key.ilike(like)) |
            (VDossierFacturable.nd_global.ilike(like))
        )

    if statut:
        qs = qs.filter(VDossierFacturable.statut_final == statut)

    if croisement:
        qs = qs.filter(VDossierFacturable.statut_croisement == croisement)

    if ppd:
        qs = qs.filter(VDossierFacturable.numero_ppd == ppd)

    return qs.order_by(VDossierFacturable.generated_at.desc()).all()
