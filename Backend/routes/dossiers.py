# Backend/routes/dossiers.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_

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

    if q is not None:
        needle = q.strip()
        if needle:
            # 1) match EXACT prioritaire (OT/ND)
            qs = qs.filter(
                or_(
                    VDossierFacturable.ot_key == needle,
                    VDossierFacturable.nd_global == needle,
                    VDossierFacturable.praxedo_ot_key == needle,
                    VDossierFacturable.praxedo_nd == needle,
                )
            ).union_all(
                # 2) fallback fuzzy si besoin (au cas où l’utilisateur tape partiel)
                db.query(VDossierFacturable).filter(
                    or_(
                        VDossierFacturable.ot_key.ilike(f"%{needle}%"),
                        VDossierFacturable.nd_global.ilike(f"%{needle}%"),
                        VDossierFacturable.praxedo_ot_key.ilike(f"%{needle}%"),
                        VDossierFacturable.praxedo_nd.ilike(f"%{needle}%"),
                    )
                )
            )

    if statut:
        qs = qs.filter(VDossierFacturable.statut_final == statut)

    if croisement:
        qs = qs.filter(VDossierFacturable.statut_croisement == croisement)

    if ppd:
        qs = qs.filter(VDossierFacturable.numero_ppd == ppd)

    return qs.order_by(VDossierFacturable.generated_at.desc()).all()
