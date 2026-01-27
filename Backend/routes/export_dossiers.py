# backend/routes/export_dossiers.py
from __future__ import annotations

from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment
from openpyxl.utils import get_column_letter

from database.connection import get_db

router = APIRouter(prefix="/api/dossiers", tags=["dossiers-export"])


def _autosize_columns(ws):
    for col_idx in range(1, ws.max_column + 1):
        max_len = 0
        col_letter = get_column_letter(col_idx)
        for row_idx in range(1, min(ws.max_row, 2000) + 1):
            v = ws.cell(row=row_idx, column=col_idx).value
            if v is None:
                continue
            s = str(v)
            if len(s) > max_len:
                max_len = len(s)
        ws.column_dimensions[col_letter].width = min(max(10, max_len + 2), 60)


def _excel_safe(v):
    """
    Openpyxl refuse les datetime avec tzinfo.
    - datetime aware -> datetime naive (tzinfo=None)
    - tout le reste inchangé
    """
    if v is None:
        return None
    try:
        # datetime/date/time -> si tzinfo existe, on le retire
        tz = getattr(v, "tzinfo", None)
        if tz is not None:
            # datetime a replace(tzinfo=None)
            rep = getattr(v, "replace", None)
            if callable(rep):
                return v.replace(tzinfo=None)
    except Exception:
        pass
    return v


@router.get("/export.xlsx")
def export_dossiers_xlsx(
    db: Session = Depends(get_db),
    statut_final: Optional[str] = Query(None),
    statut_croisement: Optional[str] = Query(None),
    ppd: Optional[str] = Query(None),
    limit: int = Query(50000, ge=1, le=200000),
):
    sql = text(
        """
        SELECT
            d.ot_key,
            d.nd_global,
            d.numero_ppd,
            d.attachement_valide,
            d.activite_code,
            d.produit_code,
            d.code_cible,
            d.code_cloture_code,
            d.mode_passage,
            d.type_site_terrain,
            d.type_pbo_terrain,

            d.regle_code,
            d.libelle_regle,
            d.statut_facturation,
            d.statut_final,
            d.statut_croisement,

            d.statut_praxedo,
            d.statut_pidi,
            d.date_planifiee,
            d.generated_at,

            d.liste_articles AS articles_pidi_brut,
            array_to_string(canonique.parse_articles_piditext(d.liste_articles), ' | ') AS articles_app,

            d.statut_article_vs_regle

        FROM canonique.v_dossier_facturable d
        WHERE 1=1
          AND (:statut_final IS NULL OR d.statut_final = :statut_final)
          AND (:statut_croisement IS NULL OR d.statut_croisement = :statut_croisement)
          AND (:ppd IS NULL OR COALESCE(d.numero_ppd,'') ILIKE '%' || :ppd || '%')
        ORDER BY d.generated_at DESC NULLS LAST
        LIMIT :limit
        """
    )

    rows = db.execute(
        sql,
        {
            "statut_final": statut_final,
            "statut_croisement": statut_croisement,
            "ppd": ppd,
            "limit": limit,
        },
    ).mappings().all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Dossiers"

    headers = [
        "OT",
        "ND",
        "PPD",
        "Attachement",
        "Act",
        "Prod",
        "Code cible",
        "Clôture",
        "Terrain",
        "Type site",
        "Type PBO",
        "Règle",
        "Libellé règle",
        "Statut règle",
        "Statut final",
        "Croisement",
        "Praxedo",
        "PIDI",
        "Planifiée",
        "Généré le",
        "Articles PIDI (brut)",
        "Articles APP (parse PIDI)",
        "Articles vs règle",
    ]
    ws.append(headers)

    header_font = Font(bold=True)
    for c in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=c)
        cell.font = header_font
        cell.alignment = Alignment(vertical="center")

    for r in rows:
        ws.append(
            [
                _excel_safe(r.get("ot_key")),
                _excel_safe(r.get("nd_global")),
                _excel_safe(r.get("numero_ppd")),
                _excel_safe(r.get("attachement_valide")),
                _excel_safe(r.get("activite_code")),
                _excel_safe(r.get("produit_code")),
                _excel_safe(r.get("code_cible")),
                _excel_safe(r.get("code_cloture_code")),
                _excel_safe(r.get("mode_passage")),
                _excel_safe(r.get("type_site_terrain")),
                _excel_safe(r.get("type_pbo_terrain")),
                _excel_safe(r.get("regle_code")),
                _excel_safe(r.get("libelle_regle")),
                _excel_safe(r.get("statut_facturation")),
                _excel_safe(r.get("statut_final")),
                _excel_safe(r.get("statut_croisement")),
                _excel_safe(r.get("statut_praxedo")),
                _excel_safe(r.get("statut_pidi")),
                _excel_safe(r.get("date_planifiee")),
                _excel_safe(r.get("generated_at")),
                _excel_safe(r.get("articles_pidi_brut")),
                _excel_safe(r.get("articles_app")),
                _excel_safe(r.get("statut_article_vs_regle")),
            ]
        )

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    _autosize_columns(ws)

    bio = BytesIO()
    wb.save(bio)
    bio.seek(0)

    return StreamingResponse(
        bio,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="dossiers.xlsx"'},
    )
