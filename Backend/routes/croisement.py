# Backend/routes/croisement.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database.connection import get_db
from models.croisement import VCroisement

router = APIRouter(prefix="/api/croisement", tags=["croisement"])

STATUT_MAP = {
    "OK": "OK",
    "MANQUANT_PIDI": "ABSENT_PIDI",
    "MANQUANT_PRAXEDO": "ABSENT_PRAXEDO",
    "INCONNU": "ND_DIFF"
}
def to_front_statut(v: str | None) -> str:
    if not v:
        return "ND_DIFF"
    return STATUT_MAP.get(v, "ND_DIFF")

@router.get("", response_model=list[dict])
def list_croisement(
    q: str | None = Query(None),
    statut: str | None = Query(None),
    statut_pidi: str | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(VCroisement)
    if q:
        query = query.filter(or_(
            VCroisement.ot_key.ilike(f"%{q}%"),
            VCroisement.nd_global.ilike(f"%{q}%"),
        ))
    if statut_pidi:
        query = query.filter(VCroisement.statut_pidi.ilike(f"%{statut_pidi}%"))

    rows = query.limit(5000).all()
    out = []
    for r in rows:
        s = to_front_statut(r.statut_croisement)
        if statut and s != statut:
            continue
        out.append({
            "ot_key": r.ot_key,
            "nd_global": r.nd_global,
            "statut_praxedo": r.statut_praxedo,
            "statut_pidi": r.statut_pidi,
            "date_planifiee": r.date_planifiee.isoformat() if r.date_planifiee else None,
            "statut_croisement": s,
        })
    return out