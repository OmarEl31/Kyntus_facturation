# Backend/routes/imports.py
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from datetime import datetime
from io import TextIOWrapper
import csv, re, unicodedata

from database.connection import get_db
from models.raw_praxedo import RawPraxedo
from models.raw_pidi import RawPidi

router = APIRouter(prefix="/api/import", tags=["imports"])

def _norm(s: str) -> str:
    s = (s or "").replace("\ufeff", "").strip().lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.replace("°", "").replace("’", "'")
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^a-z0-9_]+", "_", s)
    return s.strip("_")

def _val(h: dict, *keys: str):
    for k in keys:
        v = h.get(k)
        if v is not None and str(v).strip() != "":
            return str(v).strip()
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

        for r in reader:
            h = {_norm(k): (v.strip() if isinstance(v, str) else v) for k, v in (r or {}).items()}

            numero = _val(h, "numero", "n", "ot", "numero_ot", "ot_key")
            if not numero:
                continue  # sans PK => on skip

            obj = RawPraxedo(
                numero=numero,
                statut=_val(h, "statut"),
                planifiee=_val(h, "planifiee", "planifiee_au", "date_planifiee"),
                nom_technicien=_val(h, "nom_technicien", "nom"),
                prenom_technicien=_val(h, "prenom_technicien", "prenom"),
                equipiers=_val(h, "equipiers"),
                nd=_val(h, "nd"),
                act_prod=_val(h, "act_prod", "act_prod_", "activite_produit"),
                code_intervenant=_val(h, "code_intervenant", "code_interven", "code_intervenant_"),
                cp=_val(h, "cp"),
                ville_site=_val(h, "ville_site", "ville"),
                imported_at=now,
            )

            db.merge(obj)
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
            h = {_norm(k): (v.strip() if isinstance(v, str) else v) for k, v in (r or {}).items()}

            flux = _val(h, "numero_flux_pidi", "n_de_flux_pidi", "n_de_flux_pid", "id_flux")
            if not flux:
                # si vraiment absent, on fabrique un id unique
                flux = f"flux_{rows}_{int(now.timestamp())}"

            obj = RawPidi(
                numero_flux_pidi=flux,
                contrat=_val(h, "contrat"),
                type_pidi=_val(h, "type", "type_pidi"),
                statut=_val(h, "statut"),
                nd=_val(h, "nd"),
                code_secteur=_val(h, "code_secteur"),
                numero_ot=_val(h, "numero_ot", "n_ot", "ot", "ot_key"),
                numero_att=_val(h, "numero_att", "n_att", "n_att_"),
                oeie=_val(h, "oeie"),
                code_gestion_chantier=_val(h, "code_gestion", "code_gestion_chantier"),
                agence=_val(h, "agence"),
                liste_articles=_val(h, "liste_des_articles", "liste_articles", "liste_d_articles"),
                imported_at=now,
            )

            db.merge(obj)
            rows += 1

        db.commit()
        return {"ok": True, "rows": rows}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
