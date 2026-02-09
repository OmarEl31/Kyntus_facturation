# Backend/routes/orange_ppd.py
from __future__ import annotations

import csv
import io
import re
import unicodedata
import uuid
from decimal import Decimal, InvalidOperation
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import text
from sqlalchemy.orm import Session

from database.connection import get_db
from models.raw_orange_ppd_import import RawOrangePpdImport
from models.raw_orange_ppd_row import RawOrangePpdRow

router = APIRouter(prefix="/api/orange-ppd", tags=["orange-ppd"])

# --------------------
# Helpers
# --------------------

def _norm_header(s: str) -> str:
    s = (s or "").replace("\ufeff", "").strip().lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^a-z0-9_]+", "_", s)
    s = re.sub(r"_+", "_", s)
    return s.strip("_")

def _normalize_row(raw: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in (raw or {}).items():
        if not k:
            continue
        nk = _norm_header(k)
        out[nk] = v.strip() if isinstance(v, str) else v
    return out

def _pick(h: dict[str, Any], *keys: str) -> str | None:
    for k in keys:
        v = h.get(k)
        if v is None:
            continue
        vv = str(v).strip()
        if vv:
            return vv
    return None

def _parse_decimal(v: str | None) -> Decimal | None:
    if v is None:
        return None
    raw = str(v).replace("\u00a0", " ").strip()
    if raw == "":
        return None
    raw = raw.replace("€", "").replace(" ", "").replace(",", ".")
    try:
        return Decimal(raw)
    except InvalidOperation:
        return None

def _resolve_import_id(db: Session, import_id: str | None) -> str | None:
    if import_id:
        return import_id
    latest = (
        db.query(RawOrangePpdImport)
        .order_by(RawOrangePpdImport.imported_at.desc(), RawOrangePpdImport.import_id.desc())
        .first()
    )
    return latest.import_id if latest else None

# --------------------
# Routes
# --------------------

@router.get("/imports", response_model=list[dict[str, Any]])
def list_orange_imports(limit: int = Query(20, ge=1, le=200), db: Session = Depends(get_db)):
    rows = (
        db.query(RawOrangePpdImport)
        .order_by(RawOrangePpdImport.imported_at.desc(), RawOrangePpdImport.import_id.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "import_id": r.import_id,
            "filename": r.filename,
            "row_count": r.row_count,
            "imported_by": r.imported_by,
            "imported_at": r.imported_at.isoformat() if r.imported_at else None,
        }
        for r in rows
    ]

@router.post("/import")
async def import_orange_ppd(
    file: UploadFile = File(...),
    imported_by: str | None = Query(None),
    db: Session = Depends(get_db),
):
    try:
        content = await file.read()
        txt = content.decode("utf-8-sig", errors="ignore")
        if not txt.strip():
            raise HTTPException(status_code=400, detail="Fichier vide")

        first = txt.splitlines()[0] if txt.splitlines() else ""
        delimiter = ";" if first.count(";") >= first.count(",") else ","

        reader = csv.DictReader(io.StringIO(txt), delimiter=delimiter)
        if not reader.fieldnames:
            raise HTTPException(status_code=400, detail="En-têtes CSV introuvables")

        new_import_id = str(uuid.uuid4())

        # 1) insert import FIRST (fix FK)
        imp = RawOrangePpdImport(
            import_id=new_import_id,
            filename=file.filename or "orange_ppd.csv",
            imported_by=imported_by,
            row_count=0,
        )
        db.add(imp)
        db.flush()

        rows: list[RawOrangePpdRow] = []
        for idx, raw in enumerate(reader, start=1):
            h = _normalize_row(raw)

            # OT obligatoire pour une ligne exploitable "par OT"
            numero_ot = _pick(h, "n_ot", "numero_ot", "ot", "ot_key", "num_ot")
            if not numero_ot:
                # lignes pivot/total -> pas des OTs -> on ne les traite pas ici
                continue

            row_id = f"{new_import_id}:{idx}"
            rows.append(
                RawOrangePpdRow(
                    row_id=row_id,
                    import_id=new_import_id,
                    contrat=_pick(h, "contrat"),
                    numero_flux_pidi=_pick(h, "n_de_flux_pidi", "numero_flux_pidi", "flux_pidi"),
                    type_pidi=_pick(h, "type", "type_pidi"),
                    statut=_pick(h, "statut"),
                    nd=_pick(h, "nd"),
                    code_secteur=_pick(h, "code_secteur"),
                    numero_ot=numero_ot,
                    numero_att=_pick(h, "n_att", "numero_att", "numero_att_"),
                    oeie=_pick(h, "oeie"),
                    code_gestion_chantier=_pick(h, "code_gestion_chantier"),
                    agence=_pick(h, "agence"),
                    code_postal=_pick(h, "code_postal"),
                    code_insee=_pick(h, "code_insee"),
                    entreprise=_pick(h, "entreprise"),
                    code_gpc=_pick(h, "code_gpc"),
                    code_etr=_pick(h, "code_etr"),
                    chef_equipe=_pick(h, "chef_d_equipe", "chef_dequipe"),
                    ui=_pick(h, "ui"),
                    numero_ppd=_pick(h, "n_ppd", "numero_ppd", "ppd"),
                    act_prod=_pick(h, "act_prod"),
                    numero_as=_pick(h, "n_as", "numero_as"),
                    centre=_pick(h, "centre"),
                    date_debut=_pick(h, "date_debut"),
                    date_fin=_pick(h, "date_fin"),
                    numero_cac=_pick(h, "n_cac", "numero_cac"),
                    commentaire_interne=_pick(h, "commentaire_interne"),
                    commentaire_oeie=_pick(h, "commentaire_oeie"),
                    commentaire_attelem=_pick(h, "commentaire_attelem"),
                    motif_facturation_degradee=_pick(h, "motif_de_facturation_degradee", "motif_facturation_degradee"),
                    categorie=_pick(h, "categorie"),
                    charge_affaire=_pick(h, "charge_d_affaire", "charge_affaire"),
                    cause_acqui_rejet=_pick(h, "cause_acqui_rejet"),
                    commentaire_acqui_rejet=_pick(h, "comment_acqui_rejet", "commentaire_acqui_rejet"),
                    attachement_cree=_pick(h, "attachement_cree"),
                    derniere_saisie=_pick(h, "derniere_saisie"),
                    attachement_definitif=_pick(h, "attachement_definitif"),
                    attachement_valide=_pick(h, "attachement_valide"),
                    pointe_ppd=_pick(h, "pointe_ppd"),
                    planification_ot=_pick(h, "planification_ot"),
                    validation_interventions=_pick(h, "validation_des_interventions", "validation_interventions"),
                    bordereau=_pick(h, "bordereau"),
                    ht=_parse_decimal(_pick(h, "ht")),
                    bordereau_sst=_pick(h, "bordereau_sst"),
                    ht_sst=_parse_decimal(_pick(h, "ht_sst")),
                    marge=_pick(h, "marge"),
                    coeff=_pick(h, "coeff"),
                    kyntus=_pick(h, "kyntus"),
                    liste_articles=_pick(h, "liste_des_articles", "liste_articles"),
                    encours=_pick(h, "encours"),
                )
            )

        if not rows:
            raise HTTPException(status_code=400, 
                                detail="Aucune ligne exploitable (colonne N° OT manquante ?)")

        imp.row_count = len(rows)
        db.bulk_save_objects(rows)
        db.commit()

        return {"ok": True, "import_id": new_import_id, "rows": len(rows), "message": "Import Orange PPD terminé"}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/ppd-options", response_model=list[str])
def list_orange_ppd_values(import_id: str | None = Query(None), db: Session = Depends(get_db)):
    resolved = _resolve_import_id(db, import_id)
    if not resolved:
        return []
    q = text("""
        SELECT DISTINCT btrim(numero_ppd) AS ppd
        FROM canonique.orange_ppd_rows
        WHERE import_id = :imp AND numero_ppd IS NOT NULL AND btrim(numero_ppd) <> ''
        ORDER BY ppd
    """)
    rows = db.execute(q, {"imp": resolved}).fetchall()
    return [r.ppd for r in rows]

@router.get("/compare", response_model=list[dict[str, Any]])
def compare_orange_ppd(
    import_id: str | None = Query(None),
    ppd: str | None = Query(None),
    only_mismatch: bool = Query(False),
    db: Session = Depends(get_db),
):
    resolved = _resolve_import_id(db, import_id)
    if not resolved:
        return []

    sql = """
      SELECT *
      FROM canonique.v_orange_ppd_compare
      WHERE import_id = :imp
        AND (:ppd IS NULL OR btrim(numero_ppd_orange) = btrim(:ppd))
        AND (:only_mismatch = false OR a_verifier = true)
      ORDER BY num_ot
    """
    rows = db.execute(text(sql), {"imp": resolved, "ppd": ppd, "only_mismatch": only_mismatch}).mappings().all()
    return [dict(r) for r in rows]

@router.get("/totaux", response_model=dict[str, Any])
def totaux_orange_ppd(import_id: str | None = Query(None), db: Session = Depends(get_db)):
    resolved = _resolve_import_id(db, import_id)
    if not resolved:
        return {"import_id": None, "total_ht_orange": 0, "total_ht_kyntus": 0, "totals_ok": False}

    row = db.execute(
        text("SELECT * FROM canonique.v_orange_ppd_totaux WHERE import_id = :imp"),
        {"imp": resolved},
    ).mappings().first()

    if not row:
        return {"import_id": resolved, "total_ht_orange": 0, "total_ht_kyntus": 0, "totals_ok": False}

    return dict(row)
