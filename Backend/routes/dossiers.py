from __future__ import annotations

from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, case

from database.connection import get_db
from models.dossiers_facturable import VDossierFacturable
from schemas.dossier_facturable import DossierFacturable

import io
from openpyxl import Workbook
from openpyxl.utils import get_column_letter

router = APIRouter(prefix="/api/dossiers", tags=["dossiers"])


def _clean(s: Optional[str]) -> Optional[str]:
    if s is None:
        return None
    x = s.strip()
    if not x:
        return None
    if x.lower() in ("tous", "tout", "all", "*"):
        return None
    return x


def _apply_filters(qs, q: Optional[str], statut: Optional[str], croisement: Optional[str], ppd: Optional[str]):
    q = _clean(q)
    statut = _clean(statut)
    croisement = _clean(croisement)
    ppd = _clean(ppd)

    if q:
        qs = qs.filter(
            or_(
                VDossierFacturable.ot_key.ilike(f"%{q}%"),
                VDossierFacturable.nd_global.ilike(f"%{q}%"),
                VDossierFacturable.key_match.ilike(f"%{q}%"),
            )
        )

    if statut:
        qs = qs.filter(VDossierFacturable.statut_final == statut)

    if croisement:
        qs = qs.filter(VDossierFacturable.statut_croisement == croisement)

    if ppd:
        qs = qs.filter(VDossierFacturable.numero_ppd.ilike(f"%{ppd}%"))

    return qs


def _apply_order(qs):
    return qs.order_by(
        case(
            (VDossierFacturable.statut_final == "FACTURABLE", 1),
            (VDossierFacturable.statut_final == "CONDITIONNEL", 2),
            (VDossierFacturable.statut_final == "NON_FACTURABLE", 3),
            (VDossierFacturable.statut_final == "A_VERIFIER", 4),
            else_=5,
        ).asc(),
        case(
            (VDossierFacturable.motif_verification == "CROISEMENT_INCOMPLET", 1),
            else_=2,
        ).asc(),
        VDossierFacturable.generated_at.desc().nullslast(),
        VDossierFacturable.key_match.asc(),
    )


@router.get("/", response_model=List[DossierFacturable])
def get_dossiers(
    q: str | None = None,
    statut: str | None = None,
    croisement: str | None = None,
    ppd: str | None = None,
    limit: int = Query(50, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    qs = db.query(VDossierFacturable)
    qs = _apply_filters(qs, q=q, statut=statut, croisement=croisement, ppd=ppd)
    qs = _apply_order(qs)
    return qs.limit(limit).offset(offset).all()


@router.get("/export.xlsx")
def export_dossiers_xlsx(
    q: str | None = None,
    statut: str | None = None,
    croisement: str | None = None,
    ppd: str | None = None,
    db: Session = Depends(get_db),
):
    qs = db.query(VDossierFacturable)
    qs = _apply_filters(qs, q=q, statut=statut, croisement=croisement, ppd=ppd)
    qs = _apply_order(qs)

    rows = qs.all()  # export = TOUT ce qui correspond aux filtres

    wb = Workbook()
    ws = wb.active
    ws.title = "dossiers"

    headers = [
        "key_match",
        "ot_key",
        "nd_global",
        "statut_croisement",
        "numero_ppd",
        "attachement_valide",
        "activite_code",
        "produit_code",
        "code_cible",
        "code_cloture_code",
        "mode_passage",
        "libelle_regle",
        "statut_final",
        "motif_verification",
        "statut_praxedo",
        "statut_pidi",
        "date_planifiee",
        "generated_at",
    ]
    ws.append(headers)

    def _cell(v):
        if v is None:
            return ""
        return str(v)

    for r in rows:
        ws.append([_cell(getattr(r, h, None)) for h in headers])

    for i, h in enumerate(headers, start=1):
        ws.column_dimensions[get_column_letter(i)].width = max(12, min(40, len(h) + 2))

    buff = io.BytesIO()
    wb.save(buff)
    buff.seek(0)

    filename = "dossiers_export.xlsx"
    return StreamingResponse(
        buff,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
