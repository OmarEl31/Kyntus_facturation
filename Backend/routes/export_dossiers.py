# backend/routes/export_dossiers.py
from __future__ import annotations

from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from database.connection import get_db

router = APIRouter(prefix="/api/dossiers", tags=["dossiers-export"])


def _autosize_columns(ws, get_column_letter):
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


@router.get("/export.xlsx")
def export_dossiers_xlsx(
    db: Session = Depends(get_db),

    # ✅ Compat front : /export.xlsx?statut=...&croisement=...
    statut_final: Optional[str] = Query(None, alias="statut"),
    statut_croisement: Optional[str] = Query(None, alias="croisement"),

    ppd: Optional[str] = Query(None),
    limit: int = Query(50000, ge=1, le=200000),
):
    # ✅ Lazy import (évite crash au démarrage si openpyxl absent)
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, Alignment
        from openpyxl.utils import get_column_letter
    except ModuleNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="Export XLSX indisponible: dépendance 'openpyxl' manquante. Ajoute openpyxl dans requirements et rebuild l’image.",
        )

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
                r.get("ot_key"),
                r.get("nd_global"),
                r.get("numero_ppd"),
                r.get("attachement_valide"),
                r.get("activite_code"),
                r.get("produit_code"),
                r.get("code_cible"),
                r.get("code_cloture_code"),
                r.get("mode_passage"),
                r.get("type_site_terrain"),
                r.get("type_pbo_terrain"),
                r.get("regle_code"),
                r.get("libelle_regle"),
                r.get("statut_facturation"),
                r.get("statut_final"),
                r.get("statut_croisement"),
                r.get("statut_praxedo"),
                r.get("statut_pidi"),
                r.get("date_planifiee"),
                r.get("generated_at"),
                r.get("articles_pidi_brut"),
                r.get("articles_app"),
                r.get("statut_article_vs_regle"),
            ]
        )

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    _autosize_columns(ws, get_column_letter)

    bio = BytesIO()
    wb.save(bio)
    bio.seek(0)

    return StreamingResponse(
        bio,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="dossiers.xlsx"'},
    )
