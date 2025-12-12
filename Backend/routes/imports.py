# Backend/routes/imports.py

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from io import TextIOWrapper, StringIO  # ✅ AJOUT DE L'IMPORT
import csv

from database.connection import get_db
from models.raw import RawPraxedo, RawPidi

router = APIRouter(prefix="/api/import", tags=["imports"])


# --------------------- UTILS ---------------------

def _decode_file(file: UploadFile) -> StringIO:
    """
    Convertit le UploadFile en flux texte UTF-8 pour csv.reader
    """
    content = file.file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")
    return StringIO(text)


# --------------------- IMPORT PRAXEDO ---------------------
@router.post("/praxedo")
async def import_praxedo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Import d'un CSV Praxedo dans raw.praxedo"""
    
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Le fichier doit être un CSV")

    buffer = _decode_file(file)
    reader = csv.DictReader(buffer, delimiter=";")

    # ⚠️ NE PAS VIDER LA TABLE si 'numero' est la clé primaire
    # db.query(RawPraxedo).delete()  # ❌ Commenté

    count = 0
    errors = 0
    now = datetime.utcnow()

    for row in reader:
        try:
            # ✅ Utiliser merge() au lieu de add() pour éviter les doublons
            obj = RawPraxedo(
                numero=row.get("numero") or row.get("numero_ot") or "",
                statut=row.get("statut") or "",
                planifiee=row.get("planifiee") or None,
                nom_technicien=row.get("nom_technicien") or "",
                prenom_technicien=row.get("prenom_technicien") or "",
                equipiers=row.get("equipiers") or "",
                nd=row.get("nd") or "",
                act_prod=row.get("act_prod") or "",
                code_intervenant=row.get("code_intervenant") or "",
                cp=row.get("cp") or "",
                ville_site=row.get("ville_site") or "",
                imported_at=now,
            )
            db.merge(obj)  # ✅ merge au lieu de add
            count += 1
        except Exception as e:
            errors += 1
            print(f"Error importing row: {e}")

    db.commit()
    return {"status": "ok", "rows_inserted": count, "errors": errors}

# --------------------- IMPORT PIDI ---------------------

@router.post("/pidi")
async def import_pidi(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Import d'un CSV PIDI dans raw.pidi
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Le fichier doit être un CSV")

    buffer = _decode_file(file)
    reader = csv.DictReader(buffer, delimiter=";")

    # Vider la table
    db.query(RawPidi).delete()

    count = 0
    now = datetime.utcnow()

    for row in reader:
        obj = RawPidi(
            contrat=row.get("contrat") or row.get("CONTRAT"),
            numero_flux_pidi=row.get("numero_flux_pidi") or row.get("NUMERO_FLUX_PIDI"),
            type_pidi=row.get("type_pidi") or row.get("TYPE_PIDI"),
            statut=row.get("statut") or row.get("STATUT"),
            nd=row.get("nd") or row.get("ND"),
            code_secteur=row.get("code_secteur") or row.get("CODE_SECTEUR"),
            numero_ot=row.get("numero_ot") or row.get("NUMERO_OT"),
            numero_att=row.get("numero_att") or row.get("NUMERO_ATT"),
            oeie=row.get("oeie") or row.get("OEIE"),
            code_gestion_chantier=row.get("code_gestion_chantier") or row.get("CODE_GESTION_CHANTIER"),
            agence=row.get("agence") or row.get("AGENCE"),
            liste_articles=row.get("liste_articles") or row.get("LISTE_ARTICLES"),
            imported_at=now,
        )
        db.add(obj)
        count += 1

    db.commit()
    return {"status": "ok", "rows_inserted": count}