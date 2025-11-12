#Backend/routes/dossiers.py
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from io import StringIO
import csv

from database.connection import get_db
from Backend.models.croisement import VCroisement

router = APIRouter(prefix="/api/dossiers", tags=["dossiers"])

# mapping back-end vers front
STATUT_MAP = {
    "OK": "OK",
    "MANQUANT_PIDI": "ABSENT_PIDI",
    "MANQUANT_PRAXEDO": "ABSENT_PRAXEDO",
    "INCONNU": "ND_DIFF"
}

def to_front_statut(db_value: str) -> str:
    return STATUT_MAP.get(db_value, "ND_DIFF")

@router.get("", response_model=list[dict])
def list_dossiers(
    q: str | None = Query(None),
    statut: str | None = Query(None),
    attachement: str | None = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(VCroisement)

    if q:
        query = query.filter(or_(
            VCroisement.ot_key.ilike(f"%{q}%"),
            VCroisement.nd_global.ilike(f"%{q}%")
        ))

    rows = query.limit(5000).all()
    result = []

    for r in rows:
        front_statut = to_front_statut(r.statut_croisement)
        if statut and front_statut != statut:
            continue

        result.append({
            "ot_key": r.ot_key,
            "nd_praxedo": None,
            "nd_pidi": None,
            "statut_praxedo": r.statut_praxedo,
            "statut_attachement": r.statut_pidi,
            "date_planifiee": r.date_planifiee.isoformat() if r.date_planifiee else None,
            "statut_croisement": front_statut
        })

    return result


@router.get("/export")
def export_csv(
    q: str | None = Query(None),
    statut: str | None = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(VCroisement)
    if q:
        query = query.filter(or_(
            VCroisement.ot_key.ilike(f"%{q}%"),
            VCroisement.nd_global.ilike(f"%{q}%")
        ))

    rows = query.all()
    buffer = StringIO()
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(["ot_key", "nd_global", "statut_praxedo", "statut_pidi", "date_planifiee", "statut_croisement"])
    for r in rows:
        writer.writerow([
            r.ot_key,
            r.nd_global,
            r.statut_praxedo,
            r.statut_pidi,
            r.date_planifiee.isoformat() if r.date_planifiee else "",
            to_front_statut(r.statut_croisement)
        ])
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="dossiers.csv"'}
    )
