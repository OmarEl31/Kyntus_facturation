from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database.connection import get_db
from models.dossiers_facturable import VDossierFacturable
from schemas.dossier_facturable import DossierFacturable

router = APIRouter(prefix="/api/dossiers", tags=["dossiers"])

@router.get("", response_model=list[DossierFacturable])
def list_dossiers(
    q: str | None = Query(None),
    statut: str | None = Query(None),
    croisement: str | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(VDossierFacturable)

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                VDossierFacturable.ot_key.ilike(like),
                VDossierFacturable.nd_global.ilike(like),
            )
        )
    if statut:
        query = query.filter(VDossierFacturable.statut_final == statut)
    if croisement:
        query = query.filter(VDossierFacturable.statut_croisement == croisement)

    return query.all()
