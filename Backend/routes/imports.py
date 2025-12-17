from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone
import csv, io, uuid, re, unicodedata
from io import TextIOWrapper


from database.connection import get_db
from models.raw_praxedo import RawPraxedo
from models.raw_pidi import RawPidi

router = APIRouter(prefix="/api/import", tags=["import"])


def norm_header(s: str) -> str:
    s = (s or "").replace("\ufeff", "").strip().lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.replace("’", "'")
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^a-z0-9_]+", "_", s)
    return s.strip("_")


# Mapping “headers CSV normalisés” -> “colonne DB”
PRAXEDO_MAP = {
    "numero": "numero",
    "ot": "numero",
    "numero_ot": "numero",
    "nd": "nd",
    "nd_global": "nd",
    "act_prod": "act_prod",
    "activite": "act_prod",
    "activite_code": "act_prod",
    "code_intervenant": "code_intervenant",
    "cp": "cp",
    "code_postal": "cp",
    "ville_site": "ville_site",
    "ville": "ville_site",
    "statut": "statut",
    "planifiee": "planifiee",
    "date_planifiee": "planifiee",
    "nom_technicien": "nom_technicien",
    "prenom_technicien": "prenom_technicien",
    "equipiers": "equipiers",
}

PIDI_MAP = {
    "numero_flux_pidi": "numero_flux_pidi",
    "flux_pidi": "numero_flux_pidi",
    "contrat": "contrat",
    "type_pidi": "type_pidi",
    "statut": "statut",
    "nd": "nd",
    "code_secteur": "code_secteur",
    "numero_ot": "numero_ot",
    "numero_att": "numero_att",
    "oeie": "oeie",
    "code_gestion_chantier": "code_gestion_chantier",
    "agence": "agence",
    "liste_articles": "liste_articles",
}


def map_row(row: dict, table_name: str, valid_cols: set[str]) -> dict:
    mapping = PRAXEDO_MAP if table_name == "praxedo" else PIDI_MAP
    out = {}
    for k, v in row.items():
        nk = norm_header(k)
        col = mapping.get(nk, nk)  # si header == colonne DB, ça passe direct
        if col in valid_cols:
            out[col] = v
    return out


def sniff_delimiter(sample: str) -> str:
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=";,|\t")
        return dialect.delimiter
    except Exception:
        return ";"  # fallback FR


async def insert_csv_into_raw(
    table_name: str,
    file: UploadFile,
    delimiter: str,
    session: Session,
) -> tuple[int, int]:
    content = await file.read()
    decoded = content.decode("utf-8-sig", errors="ignore")  # utf-8-sig gère BOM

    if delimiter == "auto":
        delimiter = sniff_delimiter(decoded[:5000])

    reader = csv.DictReader(io.StringIO(decoded), delimiter=delimiter)
    if not reader.fieldnames:
        return (0, 0)

    # Colonnes réelles de la table
    cols_query = text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema='raw' AND table_name=:table_name
    """)
    valid_cols = set(
        r[0] for r in session.execute(cols_query, {"table_name": table_name}).fetchall()
    )

    ok, ko = 0, 0
    now_utc = datetime.now(timezone.utc)

    for row in reader:
        data = map_row(row, table_name, valid_cols)

        # Skip lignes réellement vides
        if not any((str(v).strip() if v is not None else "") for v in data.values()):
            continue

        if "imported_at" in valid_cols:
            data["imported_at"] = now_utc

        if not data:
            continue

        cols = ", ".join(f'"{c}"' for c in data.keys())
        vals = ", ".join(f":{c}" for c in data.keys())

        # Evite crash si doublon de PK
        stmt = text(f'INSERT INTO raw.{table_name} ({cols}) VALUES ({vals}) ON CONFLICT DO NOTHING')

        try:
            # savepoint par ligne
            with session.begin_nested():
                session.execute(stmt, data)
            ok += 1
        except Exception as e:
            ko += 1
            print(f"❌ Insert KO {table_name}: {e} | DATA={data}")

    session.commit()
    return ok, ko


@router.post("/praxedo")
def import_praxedo(
    file: UploadFile = File(...),
    delimiter: str = Query(";", pattern="^[,;]$"),
    db: Session = Depends(get_db),
):
    try:
        wrapper = TextIOWrapper(file.file, encoding="utf-8", errors="replace")
        reader = csv.DictReader(wrapper, delimiter=delimiter)

        rows = 0
        for r in reader:
            rows += 1
            obj = RawPraxedo(
                numero=(r.get("numero") or r.get("Numéro") or r.get("NUMERO") or "").strip() or None,
                statut=(r.get("statut") or "").strip() or None,
                planifiee=None,
                nom_technicien=(r.get("nom_technicien") or "").strip() or None,
                prenom_technicien=(r.get("prenom_technicien") or "").strip() or None,
                equipiers=(r.get("equipiers") or "").strip() or None,
                nd=(r.get("nd") or "").strip() or None,
                act_prod=(r.get("act_prod") or "").strip() or None,
                code_intervenant=(r.get("code_intervenant") or "").strip() or None,
                cp=(r.get("cp") or "").strip() or None,
                ville_site=(r.get("ville_site") or "").strip() or None,
                imported_at=datetime.utcnow(),
            )
            db.merge(obj)

        db.commit()
        return {"rows": rows}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/pidi")
def import_pidi(
    file: UploadFile = File(...),
    delimiter: str = Query(";", pattern="^[,;]$"),
    db: Session = Depends(get_db),
):
    try:
        wrapper = TextIOWrapper(file.file, encoding="utf-8", errors="replace")
        reader = csv.DictReader(wrapper, delimiter=delimiter)

        rows = 0
        for r in reader:
            rows += 1
            obj = RawPidi(
                numero_ot=(r.get("numero_ot") or r.get("ot_key") or "").strip() or None,
                nd=(r.get("nd") or "").strip() or None,
                statut=(r.get("statut") or "").strip() or None,
                numero_att=(r.get("numero_att") or "").strip() or None,
                liste_articles=(r.get("liste_articles") or "").strip() or None,
                imported_at=datetime.utcnow(),
            )
            db.merge(obj)

        db.commit()
        return {"rows": rows}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
