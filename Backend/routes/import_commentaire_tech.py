from __future__ import annotations

import csv
import io
import re
import unicodedata
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.orm import Session

from routes.auth import get_current_user
from models.user import User
from database.connection import get_db

router = APIRouter(prefix="/api/import", tags=["imports"])


def _norm(s: str) -> str:
    s = (s or "").replace("\ufeff", "").strip().lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.replace("°", "")
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

    s = str(v).strip().replace("\u00a0", "")
    s = re.sub(r"\s+", "", s)
    s = s.split("#", 1)[0]
    s = re.sub(r"[^0-9]", "", s)

    if not s:
        return None

    s = s.lstrip("0")
    return s if s else "0"


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


def _fix_mojibake(s: str | None) -> str | None:
    if not s:
        return s
    t = str(s)
    if ("Ã" in t) or ("Â" in t) or ("č" in t) or ("ę" in t):
        try:
            t2 = t.encode("latin1", errors="ignore").decode("utf-8", errors="ignore")
            return t2 or t
        except Exception:
            return t
    return t


def _clean_text(v: str | None) -> str | None:
    if v is None:
        return None
    s = _fix_mojibake(str(v).strip())
    if s is None:
        return None
    s = s.replace("\ufeff", "").strip()
    return s if s else None


def _normalize_evenements_for_match(evenements: str | None) -> str:
    s = _clean_text(evenements) or ""
    s = s.replace(chr(160), " ")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s


def _extract_palier_from_evenements(evenements: str | None) -> str | None:
    s = _normalize_evenements_for_match(evenements)
    if not s:
        return None

    low = s.lower()

    m = re.search(r"\bpalier\s*([123])\b", low, flags=re.IGNORECASE)
    if m:
        return f"PALIER_{m.group(1)}"

    if ("aucun" in low or "aucune" in low or "aucunes" in low) and ("regle" in low or "règle" in low) and ("applic" in low):
        return "PALIER_1"

    return None


@router.post("/commentaire-tech-cr10")
async def import_commentaire_tech_cr10(
    file: UploadFile = File(...),
    delimiter: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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

    norm_fields = [_norm(x) for x in (reader.fieldnames or [])]

    def has_any(cands: set[str]) -> bool:
        return any(f in cands for f in norm_fields)

    ot_candidates = {
        "id_externe", "idexterne", "id_externe_ot",
        "n_ot", "numero_ot", "num_ot", "ot", "ot_key",
        "n_cac", "numero_cac", "cac", "commande"
    }

    ev_candidates = {"evenements", "evenement", "events", "event"}

    cr_candidates = {
        "compte_rendu", "compterendu", "commentaire_technicien",
        "commentaire", "commentaire_releve", "commentairereleve",
        "remarque", "observations"
    }

    pal_candidates = {"palier", "pallier", "tier", "niveau"}

    if not has_any(ot_candidates):
        raise HTTPException(
            status_code=400,
            detail="Colonne OT introuvable dans le fichier (ex: id_externe / N° OT / OT / n_cac / commande).",
        )

    batch: list[dict[str, Any]] = []
    kept = 0
    with_evenements = 0
    with_palier = 0
    with_compte_rendu = 0

    for raw in reader:
        h = _normalize_row(raw)

        ot_raw = _pick(h, *ot_candidates)
        ot_key = _norm_ot(ot_raw)
        if not ot_key:
            continue

        evenements = _clean_text(_pick(h, *ev_candidates))
        compte_rendu = _clean_text(_pick(h, *cr_candidates))
        palier_csv = _clean_text(_pick(h, *pal_candidates))
        palier = palier_csv or _extract_palier_from_evenements(evenements)

        if not evenements and not palier and not compte_rendu:
            continue

        if evenements:
            with_evenements += 1
        if palier:
            with_palier += 1
        if compte_rendu:
            with_compte_rendu += 1

        batch.append(
            {
                "id_externe": ot_key,
                "evenements": evenements,
                "palier": palier,
                "compte_rendu": compte_rendu,
                "user_id": current_user.id,
            }
        )
        kept += 1

    if not batch:
        raise HTTPException(status_code=400, detail="Aucune ligne exploitable")

    db.execute(
        text("""
            INSERT INTO raw.praxedo_cr10 (id_externe, evenements, palier, compte_rendu, user_id)
            VALUES (:id_externe, :evenements, :palier, :compte_rendu, :user_id)
            ON CONFLICT (id_externe, user_id) DO UPDATE SET
              compte_rendu = COALESCE(EXCLUDED.compte_rendu, raw.praxedo_cr10.compte_rendu),
              evenements   = COALESCE(EXCLUDED.evenements, raw.praxedo_cr10.evenements),
              palier       = COALESCE(EXCLUDED.palier, raw.praxedo_cr10.palier)
        """),
        batch,
    )

    db.commit()

    return {
        "ok": True,
        "message": "Import commentaire tech -> raw.praxedo_cr10 terminé",
        "count": kept,
        "rows": kept,
        "with_evenements": with_evenements,
        "with_palier": with_palier,
        "with_compte_rendu": with_compte_rendu,
        "delimiter_used": "\\t" if sep == "\t" else sep,
    }