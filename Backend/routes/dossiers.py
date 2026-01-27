# Backend/routes/dossiers.py
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from database.connection import get_db
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
    sql = text(
        """
        SELECT
            d.*,
            array_to_string(canonique.parse_articles_piditext(d.liste_articles), ' | ') AS articles_app
        FROM canonique.v_dossier_facturable d
        WHERE 1=1
          AND (
            :q IS NULL
            OR d.ot_key ILIKE '%' || :q || '%'
            OR d.nd_global ILIKE '%' || :q || '%'
          )
          AND (:statut IS NULL OR d.statut_final = :statut)
          AND (:croisement IS NULL OR d.statut_croisement = :croisement)
          AND (
            :ppd IS NULL
            OR COALESCE(d.numero_ppd,'') ILIKE '%' || :ppd || '%'
          )
        ORDER BY d.generated_at DESC NULLS LAST
        """
    )

    rows = db.execute(
        sql,
        {"q": q, "statut": statut, "croisement": croisement, "ppd": ppd},
    ).mappings().all()

    # FastAPI/Pydantic accepte une liste de dicts (mappings)
    return [dict(r) for r in rows]
