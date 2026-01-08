# Backend/routes/imports.py
from __future__ import annotations

import os
import csv
import re
import unicodedata
from datetime import datetime
from io import TextIOWrapper
from typing import Any

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session

from database.connection import get_db
from models.raw_praxedo import RawPraxedo
from models.raw_pidi import RawPidi

router = APIRouter(prefix="/api/import", tags=["imports"])

DEBUG_IMPORTS = os.getenv("DEBUG_IMPORTS", "0") == "1"

CLOTURE_CODES = {
    "DMS", "DEF", "RRC", "TSO", "PDC",
    "DMP", "DMA", "DMC", "DME", "DMI", "DMR", "DMT", "DMX",
    "TVC", "ETU", "RMC", "RMF", "ORT", "MAJ", "TKO", "REA",
}

# -------------------------
# Utils
# -------------------------
def _norm(s: str) -> str:
    s = (s or "").replace("\ufeff", "").strip().lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.replace("°", "").replace("’", "'")
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^a-z0-9_]+", "_", s)
    return s.strip("_")

def _val(h: dict[str, Any], *keys: str) -> str | None:
    for k in keys:
        v = h.get(k)
        if v is not None and str(v).strip() != "":
            return str(v).strip()
    return None

def _pick_first(old: str | None, new: str | None) -> str | None:
    if old is not None and str(old).strip() != "":
        return old
    if new is not None and str(new).strip() != "":
        return new
    return None

def _fix_mojibake(s: str | None) -> str | None:
    if not s:
        return s
    t = str(s)
    if ("Ã" in t) or ("Â" in t):
        try:
            return t.encode("latin1", errors="ignore").decode("utf-8", errors="ignore")
        except Exception:
            return t
    return t

def _clean_text(s: str | None) -> str | None:
    if s is None:
        return None
    out = _fix_mojibake(str(s).strip())
    return out if out and out.strip() != "" else None

def _merge_articles(old: str | None, new: str | None) -> str | None:
    a = _clean_text(old)
    b = _clean_text(new)
    if not a and not b:
        return None
    if a and not b:
        return a
    if b and not a:
        return b

    def split_items(x: str) -> list[str]:
        parts = re.split(r"[,\n;|]+", x)
        return [p.strip() for p in parts if p and p.strip()]

    sa = split_items(a or "")
    sb = split_items(b or "")
    seen = set()
    merged: list[str] = []
    for it in sa + sb:
        key = it.lower()
        if key in seen:
            continue
        seen.add(key)
        merged.append(it)
    return ", ".join(merged) if merged else (a or b)

def _detect_delimiter(file: UploadFile, requested: str) -> str:
    try:
        pos = file.file.tell()
    except Exception:
        pos = None

    try:
        head = file.file.read(4096)
        if pos is not None:
            file.file.seek(pos)

        txt = head.decode("utf-8-sig", errors="ignore")
        first = (txt.splitlines()[0] if txt else "")

        if requested == "," and first.count(";") > first.count(","):
            return ";"
        if requested == ";" and first.count(",") > first.count(";"):
            return ","

        try:
            sniffed = csv.Sniffer().sniff(txt, delimiters=[",", ";", "\t", "|"])
            return sniffed.delimiter
        except Exception:
            return requested
    except Exception:
        return requested

def _read_header_and_reader(file: UploadFile, delimiter: str):
    try:
        file.file.seek(0)
    except Exception:
        pass

    text = TextIOWrapper(file.file, encoding="utf-8-sig", errors="ignore", newline="")
    reader = csv.DictReader(text, delimiter=delimiter)

    raw_headers = reader.fieldnames or []
    norm_headers = [_norm(h) for h in raw_headers]
    return raw_headers, norm_headers, reader

def _require_file_type(expected: str, norm_headers: list[str]) -> None:
    hs = set(norm_headers)
    prax_markers = {"planifiee", "act_prod", "nom_technicien", "ville_site", "code_intervention"}
    pidi_markers = {"oeie", "code_secteur", "numero_att", "liste_articles", "liste_des_articles", "contrat", "numero_ot", "nd"}

    if expected == "PRAXEDO":
        if not (hs & prax_markers):
            raise HTTPException(status_code=400, detail="CSV ne ressemble pas à un export Praxedo.")
    elif expected == "PIDI":
        # soft check
        if not (hs & pidi_markers):
            raise HTTPException(status_code=400, detail="CSV ne ressemble pas à un export PIDI.")

def _sa_only_known_columns(model_cls, payload: dict) -> dict:
    allowed = set(model_cls.__table__.columns.keys())
    return {k: v for k, v in payload.items() if k in allowed}

def _normalize_row(r: dict[str, Any]) -> dict[str, Any]:
    """
    Normalisation sans écraser une valeur non vide par une valeur vide (collision de keys).
    """
    out: dict[str, Any] = {}
    for k, v in r.items():
        if k is None:
            continue
        nk = _norm(k)
        vv = v.strip() if isinstance(v, str) else v

        # ne pas écraser une valeur existante non vide
        if nk in out and str(out.get(nk) or "").strip() != "":
            continue
        # ne pas écraser par vide
        if str(vv or "").strip() == "" and nk in out:
            continue

        out[nk] = vv
    return out

def _find_value_by_header_like(raw_row: dict[str, Any], *contains_all: str) -> str | None:
    """
    Cherche dans les headers originaux (non normés) un champ dont le header contient tous les mots.
    Utile quand l'export a un header bizarre.
    """
    wants = [w.lower() for w in contains_all]
    for k, v in raw_row.items():
        if not k or v is None:
            continue
        lk = str(k).lower()
        if all(w in lk for w in wants):
            s = str(v).strip()
            if s != "":
                return s
    return None

# -------------------------
# Praxedo helpers
# -------------------------
def _guess_cloture(h: dict[str, Any]) -> str | None:
    direct = _val(
        h,
        "code_cloture_code", "code_cloture", "cloture", "etat_cloture",
        "code_intervention", "code_intervenant", "code_interven", "code_interv",
    )
    if direct:
        d = direct.strip().upper()
        if d in CLOTURE_CODES:
            return d
        m = re.search(r"\b([A-Z]{3})\b", d)
        if m and m.group(1) in CLOTURE_CODES:
            return m.group(1)

    for k, v in h.items():
        if not v:
            continue
        kk = (k or "").lower()
        if ("clotur" in kk) or ("interven" in kk) or ("clot" in kk):
            vv = str(v).strip().upper()
            if vv in CLOTURE_CODES:
                return vv
            m = re.search(r"\b([A-Z]{3})\b", vv)
            if m and m.group(1) in CLOTURE_CODES:
                return m.group(1)

    for v in h.values():
        if not v:
            continue
        vv = str(v).strip().upper()
        if vv in CLOTURE_CODES:
            return vv
        m = re.search(r"\b([A-Z]{3})\b", vv)
        if m and m.group(1) in CLOTURE_CODES:
            return m.group(1)

    return None

# -------------------------
# PIDI helpers
# -------------------------
def _pidi_flux_key(h: dict[str, Any], i: int, now: datetime) -> str:
    flux = _clean_text(_val(h, "numero_flux_pidi", "n_de_flux_pidi", "n_de_flux_pid", "id_flux", "flux"))
    if flux:
        return flux
    return f"flux_{i}_{int(now.timestamp())}"

def _pidi_dossier_key_safe(h: dict[str, Any], i: int, now: datetime) -> str:
    """
    Clé dossier pour agrégation : OT|ND
    ✅ SÉCURITÉ: si OT et ND absents => fallback unique (sinon tu finis avec 1 seule ligne)
    """
    numero_ot = _clean_text(_val(h, "numero_ot", "n_ot", "ot", "ot_key", "numero_de_l_ot", "numero_intervention"))
    nd = _clean_text(_val(h, "nd", "n_d", "ndi", "n_di", "numero_di", "numero_de_di"))

    if (numero_ot is None or numero_ot == "") and (nd is None or nd == ""):
        # fallback unique par ligne
        return f"NO_OTND_{int(now.timestamp())}_{i}"

    return f"{numero_ot or 'NA'}|{nd or 'NA'}"

# -------------------------
# Imports
# -------------------------
@router.post("/praxedo")
async def import_praxedo(
    file: UploadFile = File(...),
    delimiter: str = Form(";"),
    db: Session = Depends(get_db),
):
    try:
        eff_delim = _detect_delimiter(file, delimiter)
        raw_headers, norm_headers, reader = _read_header_and_reader(file, eff_delim)
        _require_file_type("PRAXEDO", norm_headers)

        rows = 0
        ds_non_null = 0
        now = datetime.utcnow()

        for idx, raw_row in enumerate(reader):
            if not raw_row:
                continue

            h = _normalize_row(raw_row)

            numero = _val(h, "numero", "n", "ot", "numero_ot", "ot_key")
            if not numero:
                continue

            cloture = _guess_cloture(h)

            # ✅ desc_site robuste (ta donnée principale)
            ds = _clean_text(_val(h, "desc_site", "infos_site", "info_site", "infos_du_site", "infos__site"))
            if not ds:
                # fallback par header "like"
                ds = _clean_text(_find_value_by_header_like(raw_row, "desc", "site") or _find_value_by_header_like(raw_row, "infos", "site"))

            desc = _clean_text(_val(h, "description"))

            if ds:
                ds_non_null += 1

            if DEBUG_IMPORTS and idx < 2:
                print("PRAX headers norm:", norm_headers)
                print("PRAX ds sample:", (ds or "")[:120])
                print("PRAX desc sample:", (desc or "")[:120])

            obj_payload = {
                "numero": numero,
                "statut": _val(h, "statut"),
                "planifiee": _val(h, "planifiee", "planifiee_au", "date_planifiee"),
                "nom_technicien": _val(h, "nom_technicien", "nom", "technicien"),
                "prenom_technicien": _val(h, "prenom_technicien", "prenom"),
                "equipiers": _val(h, "equipiers"),
                "nd": _val(h, "nd"),
                "act_prod": _val(h, "act_prod", "activite_produit", "act_prod_code"),
                "code_intervenant": _val(h, "code_intervention", "code_intervenant", "code_interven", "code_interv") or cloture,
                "cp": _val(h, "cp"),
                "ville_site": _val(h, "ville_site", "ville"),
                "desc_site": ds,
                "description": desc,
                "imported_at": now,
            }

            obj_payload = _sa_only_known_columns(RawPraxedo, obj_payload)
            db.merge(RawPraxedo(**obj_payload))
            rows += 1

        db.commit()
        return {"ok": True, "rows": rows, "desc_site_non_null": ds_non_null, "delimiter_used": eff_delim}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/pidi")
async def import_pidi(
    file: UploadFile = File(...),
    delimiter: str = Form(";"),
    db: Session = Depends(get_db),
):
    try:
        eff_delim = _detect_delimiter(file, delimiter)
        raw_headers, norm_headers, reader = _read_header_and_reader(file, eff_delim)
        _require_file_type("PIDI", norm_headers)

        now = datetime.utcnow()

        # ✅ 1 ligne par dossier OT|ND (mais sans collapse NA|NA)
        agg: dict[str, dict[str, Any]] = {}
        rows_in = 0

        for i, raw_row in enumerate(reader):
            if not raw_row:
                continue
            rows_in += 1

            h = _normalize_row(raw_row)
            dossier_key = _pidi_dossier_key_safe(h, i, now)
            flux_key = _pidi_flux_key(h, i, now)

            rec = agg.get(dossier_key)
            if rec is None:
                rec = {
                    # on garde le flux pour debug si besoin, mais PK raw = dossier_key (ton choix)
                    "numero_flux_pidi": dossier_key,
                    "contrat": None,
                    "type_pidi": None,
                    "statut": None,
                    "nd": None,
                    "code_secteur": None,
                    "numero_ot": None,
                    "numero_att": None,
                    "oeie": None,
                    "code_gestion_chantier": None,
                    "agence": None,
                    "liste_articles": None,

                    # ✅ NOUVEAU
                    "numero_pdd": None,
                    "attachement_valide": None,

                    "imported_at": now,
                }
                agg[dossier_key] = rec

            rec["contrat"] = _pick_first(rec["contrat"], _clean_text(_val(h, "contrat")))
            rec["type_pidi"] = _pick_first(rec["type_pidi"], _clean_text(_val(h, "type", "type_pidi")))
            rec["statut"] = _clean_text(_val(h, "statut")) or rec["statut"]

            # ✅ robust OT / ND (sinon croisement KO)
            rec["nd"] = _pick_first(rec["nd"], _clean_text(_val(h, "nd", "n_d", "ndi", "n_di", "numero_di", "numero_de_di")))
            rec["numero_ot"] = _pick_first(rec["numero_ot"], _clean_text(_val(h, "numero_ot", "n_ot", "ot", "ot_key", "numero_de_l_ot", "numero_intervention")))

            rec["code_secteur"] = _pick_first(rec["code_secteur"], _clean_text(_val(h, "code_secteur")))
            rec["numero_att"] = _pick_first(rec["numero_att"], _clean_text(_val(h, "numero_att", "n_att", "n_att_")))
            rec["oeie"] = _pick_first(rec["oeie"], _clean_text(_val(h, "oeie")))
            rec["code_gestion_chantier"] = _pick_first(rec["code_gestion_chantier"], _clean_text(_val(h, "code_gestion", "code_gestion_chantier")))
            rec["agence"] = _pick_first(rec["agence"], _clean_text(_val(h, "agence")))

            rec["liste_articles"] = _merge_articles(
                rec["liste_articles"],
                _val(h, "liste_des_articles", "liste_articles", "liste_d_articles"),
            )

            # ✅ N°PDD (N°PDD -> n_pdd)
            rec["numero_pdd"] = _pick_first(rec["numero_pdd"], _clean_text(_val(h, "n_pdd", "numero_pdd", "pdd")))

            # ✅ Attachement validé (Attachement validé -> attachement_valide)
            rec["attachement_valide"] = _pick_first(
                rec["attachement_valide"],
                _clean_text(_val(h, "attachement_valide", "attachement_validee", "attachement_valide_at", "attachement_valide_le")),
            )

            if DEBUG_IMPORTS and i < 2:
                print("PIDI sample dossier_key:", dossier_key, "flux:", flux_key)
                print("PIDI sample ot:", rec["numero_ot"], "nd:", rec["nd"], "pdd:", rec["numero_pdd"], "att:", rec["attachement_valide"])

        upserted = 0
        for key, rec in agg.items():
            rec = _sa_only_known_columns(RawPidi, rec)
            db.query(RawPidi).filter(RawPidi.numero_flux_pidi == key).delete(synchronize_session=False)
            db.add(RawPidi(**rec))
            upserted += 1

        db.commit()
        return {"ok": True, "rows_in": rows_in, "rows_upserted": upserted, "delimiter_used": eff_delim}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
