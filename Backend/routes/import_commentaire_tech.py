# Backend/routes/import_commentaire_tech.py
from __future__ import annotations

import csv
import io
import re
import unicodedata
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.orm import Session

from database.connection import get_db

router = APIRouter(prefix="/api/import", tags=["imports"])


# --------------------
# Helpers
# --------------------
def _norm(s: str) -> str:
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
        nk = _norm(k)
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


def _norm_ot(v: str | None) -> str | None:
    if not v:
        return None
    s = re.sub(r"\s+", "", str(v).strip())
    if not s:
        return None
    # garde tel quel si alphanum, sinon supprime 0 à gauche si digits
    if s.isdigit():
        s2 = s.lstrip("0")
        return s2 if s2 != "" else "0"
    return s


def _guess_delimiter(first_line: str, prefer: str | None) -> str:
    if prefer == r"\t":
        prefer = "\t"
    allowed = {";", ",", "\t", "|"}
    if prefer and prefer in allowed:
        return prefer

    counts = {
        ";": first_line.count(";"),
        ",": first_line.count(","),
        "\t": first_line.count("\t"),
        "|": first_line.count("|"),
    }
    sep = max(counts, key=counts.get)
    return sep if counts[sep] > 0 else ";"


# --------------------
# Endpoint: CSV commentairetech -> raw.praxedo_cr10 (UPSERT)
# --------------------
@router.post("/commentaire-tech-cr10")
async def import_commentaire_tech_cr10(
    file: UploadFile = File(...),
    delimiter: str | None = Form(None),
    db: Session = Depends(get_db),
):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Fichier vide")

    txt = content.decode("utf-8-sig", errors="ignore")
    if not txt.strip():
        raise HTTPException(status_code=400, detail="Fichier vide")

    lines = txt.splitlines()
    first = lines[0] if lines else ""
    sep = _guess_delimiter(first, delimiter)

    reader = csv.DictReader(io.StringIO(txt), delimiter=sep)
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="En-têtes CSV introuvables")

    # détecter colonnes (après normalisation)
    norm_fields = [_norm(x) for x in (reader.fieldnames or [])]

    def has_any(cands: set[str]) -> bool:
        return any(f in cands for f in norm_fields)

    # OT
    ot_candidates = {
        "id_externe", "n_ot", "numero_ot", "num_ot", "ot", "ot_key",
        "n_cac", "numero_cac", "cac", "commande"
    }
    # evenements
    ev_candidates = {
        "evenements", "evenement", "events", "event",
        "commentaire_tech", "commentaire", "commentaire_technicien",
        "compte_rendu", "cr", "remarque", "observations"
    }
    # palier
    pal_candidates = {"palier", "pallier", "tier", "niveau"}

    if not has_any(ot_candidates):
        raise HTTPException(
            status_code=400,
            detail="Colonne OT introuvable dans commentairetech.csv (ex: id_externe / N° OT / OT / n_cac / commande).",
        )

    # préparation batch UPSERT
    batch: list[dict[str, Any]] = []
    kept = 0

    for raw in reader:
        h = _normalize_row(raw)

        ot_raw = _pick(h, *ot_candidates)
        ot_key = _norm_ot(ot_raw)
        if not ot_key:
            continue

        evenements = _pick(h, *ev_candidates)
        palier = _pick(h, *pal_candidates)

        # si aucune donnée à enrichir, skip
        if not evenements and not palier:
            continue

        batch.append(
            {
                "id_externe": ot_key,
                "evenements": evenements,
                "palier": palier,
            }
        )
        kept += 1

    if not batch:
        raise HTTPException(status_code=400, detail="Aucune ligne exploitable")

    # UPSERT: met à jour uniquement evenements/palier (ne casse rien)
    db.execute(
        text("""
            INSERT INTO raw.praxedo_cr10 (id_externe, evenements, palier)
            VALUES (:id_externe, :evenements, :palier)
            ON CONFLICT (id_externe) DO UPDATE SET
              evenements = COALESCE(EXCLUDED.evenements, raw.praxedo_cr10.evenements),
              palier     = COALESCE(EXCLUDED.palier,     raw.praxedo_cr10.palier)
        """),
        batch,
    )

    db.commit()
    return {
        "ok": True,
        "message": "Import commentaire tech -> Praxedo CR10 terminé",
        "count": kept,
        "rows": kept,
    }