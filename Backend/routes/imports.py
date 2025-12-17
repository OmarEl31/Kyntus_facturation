from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from io import TextIOWrapper
import csv
import unicodedata
import re

from database.connection import get_db
from models.raw_praxedo import RawPraxedo
from models.raw_pidi import RawPidi

router = APIRouter(prefix="/api/import", tags=["imports"])

def _norm_header(s: str) -> str:
    if s is None:
        return ""
    s = s.replace("\ufeff", "").strip().lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.replace("°", "").replace("’", "'")
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^a-z0-9_]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s

def _parse_dt_fr(v: str | None) -> str | None:
    if not v:
        return None
    v = v.strip()
    # on garde TEXTE en brut (vu que raw.praxedo.planifiee est Text)
    return v or None

@router.post("/praxedo")
def import_praxedo(
    file: UploadFile = File(...),
    delimiter: str = Query(";", regex="^[;,]$"),
    db: Session = Depends(get_db),
):
    try:
        wrapper = TextIOWrapper(file.file, encoding="utf-8-sig", errors="replace")
        reader = csv.DictReader(wrapper, delimiter=delimiter)

        rows = []
        now = datetime.utcnow()

        for r in reader:
            rr = { _norm_header(k): (v.strip() if isinstance(v, str) else v) for k, v in r.items() }

            obj = RawPraxedo(
                numero = rr.get("numero") or rr.get("ot") or rr.get("ot_key"),
                statut = rr.get("statut"),
                planifiee = _parse_dt_fr(rr.get("planifiee") or rr.get("date_planifiee")),
                nom_technicien = rr.get("nom_technicien"),
                prenom_technicien = rr.get("prenom_technicien"),
                equipiers = rr.get("equipiers"),
                nd = rr.get("nd"),
                act_prod = rr.get("act_prod"),
                code_intervenant = rr.get("code_intervenant"),
                cp = rr.get("cp"),
                ville_site = rr.get("ville_site"),
                imported_at = now,
            )
            if obj.numero:   # garde-fou
                rows.append(obj)

        if not rows:
            return {"rows": 0}

        db.bulk_save_objects(rows)
        db.commit()
        return {"rows": len(rows)}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/pidi")
def import_pidi(
    file: UploadFile = File(...),
    delimiter: str = Query(";", regex="^[;,]$"),
    db: Session = Depends(get_db),
):
    try:
        wrapper = TextIOWrapper(file.file, encoding="utf-8-sig", errors="replace")
        reader = csv.DictReader(wrapper, delimiter=delimiter)

        rows = []
        now = datetime.utcnow()

        for r in reader:
            rr = { _norm_header(k): (v.strip() if isinstance(v, str) else v) for k, v in r.items() }

            obj = RawPidi(
                numero_flux_pidi = rr.get("numero_flux_pidi") or rr.get("id") or rr.get("flux"),
                contrat = rr.get("contrat"),
                type_pidi = rr.get("type_pidi"),
                statut = rr.get("statut"),
                nd = rr.get("nd"),
                code_secteur = rr.get("code_secteur"),
                numero_ot = rr.get("numero_ot") or rr.get("ot") or rr.get("ot_key"),
                numero_att = rr.get("numero_att"),
                oeie = rr.get("oeie"),
                code_gestion_chantier = rr.get("code_gestion_chantier"),
                agence = rr.get("agence"),
                liste_articles = rr.get("liste_articles"),
                imported_at = now,
            )
            if obj.numero_flux_pidi:
                rows.append(obj)

        if not rows:
            return {"rows": 0}

        db.bulk_save_objects(rows)
        db.commit()
        return {"rows": len(rows)}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
