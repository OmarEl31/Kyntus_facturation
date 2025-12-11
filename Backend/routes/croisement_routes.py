# Backend/routes/croisement_routes.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database.connection import get_db
from models.croisement import VCroisement

router = APIRouter(prefix="/api/croisement", tags=["croisement"])

@router.get("")
def list_croisement(
    q: str | None = Query(None, description="Recherche OT ou ND"),
    statut_croisement: str | None = Query(
        None,
        description="Filtrer par statut croisement (OK / MANQUANT_PIDI / MANQUANT_PRAXEDO / INCONNU)"
    ),
    statut_pidi: str | None = Query(None, description="Filtrer par statut PIDI"),
    db: Session = Depends(get_db),
):
    query = db.query(VCroisement)

    # Recherche OT / ND
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                VCroisement.ot_key.ilike(like),
                VCroisement.nd_global.ilike(like),
            )
        )

    # Filtre PIDI
    if statut_pidi:
        query = query.filter(VCroisement.statut_pidi.ilike(f"%{statut_pidi}%"))

    # Filtre croisement
    if statut_croisement:
        query = query.filter(VCroisement.statut_croisement == statut_croisement)

    rows = query.all()

    result = []
    for r in rows:
        result.append({
            "ot_key": r.ot_key,
            "nd_global": r.nd_global,
            "activite_code": r.activite_code,
            "code_cible": r.code_cible,
            "code_cloture_code": r.code_cloture_code,
            "date_planifiee": r.date_planifiee,
            "statut_praxedo": r.statut_praxedo,
            "statut_pidi": r.statut_pidi,
            "statut_croisement": r.statut_croisement,
            "commentaire_praxedo": r.commentaire_praxedo,
            "generated_at": r.generated_at,
        })

    return result
