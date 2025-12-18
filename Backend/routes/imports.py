# Backend/routes/imports.py
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from datetime import datetime
from io import TextIOWrapper
import csv
import re
import unicodedata

from database.connection import get_db
from models.raw_praxedo import RawPraxedo
from models.raw_pidi import RawPidi

git config --global user.email "oelmahi31@gmail.com"
git config --global user.name "OmarEL31"



router = APIRouter(prefix="/api/import", tags=["imports"])

def _norm(s: str) -> str:
    s = (s or "").replace("\ufeff", "").strip().lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.replace("°", "").replace("’", "'")
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^a-z0-9_]+", "_", s)
    return s.strip("_")

def _parse_dt(v: str):
    if not v:
        return None
    v = v.strip()
    # accepte ISO ou "dd/mm/yyyy hh:mm"
    try:
        return datetime.fromisoformat(v.replace("Z", "+00:00"))
    except:
        pass
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})(?:\s+(\d{2}):(\d{2}))?", v)
    if m:
        d, mo, y, hh, mm = m.groups()
        return datetime(int(y), int(mo), int(d), int(hh or 0), int(mm or 0))
    return None

@router.post("/praxedo")
async def import_praxedo(
    file: UploadFile = File(...),
    delimiter: str = Form(";"),
    db: Session = Depends(get_db),
):
    try:
        text = TextIOWrapper(file.file, encoding="utf-8", errors="ignore")
        reader = csv.DictReader(text, delimiter=delimiter)

        rows = 0
        now = datetime.utcnow()

        # mapping flexible depuis CSV -> colonnes RAW praxedo
        # adapte si ton CSV a d’autres libellés
        for r in reader:
            h = { _norm(k): (v.strip() if isinstance(v, str) else v) for k, v in (r or {}).items() }

            obj = RawPraxedo(
                numero=h.get("numero") or h.get("ot") or h.get("numero_ot") or h.get("ot_key"),
                statut=h.get("statut"),
                planifiee=_parse_dt(h.get("planifiee") or h.get("date_planifiee") or h.get("planifiee_au")),
                nom_technicien=h.get("nom_technicien") or h.get("nom"),
                prenom_technicien=h.get("prenom_technicien") or h.get("prenom"),
                equipiers=h.get("equipiers"),
                nd=h.get("nd"),
                act_prod=h.get("act_prod") or h.get("activite_produit") or h.get("act_prod_code"),
                code_intervenant=h.get("code_intervenant"),
                cp=h.get("cp"),
                ville_site=h.get("ville_site") or h.get("ville"),
                imported_at=now,
            )

            if not obj.numero:
                continue

            db.merge(obj)  # upsert simple
            rows += 1

        db.commit()
        return {"ok": True, "rows": rows}
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
        text = TextIOWrapper(file.file, encoding="utf-8", errors="ignore")
        reader = csv.DictReader(text, delimiter=delimiter)

        rows = 0
        now = datetime.utcnow()

        for r in reader:
            h = { _norm(k): (v.strip() if isinstance(v, str) else v) for k, v in (r or {}).items() }

            obj = RawPidi(
                numero_flux_pidi=h.get("numero_flux_pidi") or h.get("id_flux") or f"flux_{rows}_{int(now.timestamp())}",
                contrat=h.get("contrat"),
                type_pidi=h.get("type_pidi"),
                statut=h.get("statut"),
                nd=h.get("nd"),
                code_secteur=h.get("code_secteur"),
                numero_ot=h.get("numero_ot") or h.get("ot") or h.get("ot_key"),
                numero_att=h.get("numero_att"),
                oeie=h.get("oeie") or h.get("code_cible"),
                agence=h.get("agence"),
                code_gestion_chantier=h.get("code_gestion_chantier"),
                liste_articles=h.get("liste_articles"),
                imported_at=now,
            )

            db.merge(obj)
            rows += 1

        db.commit()
        return {"ok": True, "rows": rows}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
