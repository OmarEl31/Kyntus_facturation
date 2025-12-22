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

# Codes "clôture" qu’on voit typiquement (ajoute si besoin)
CLOTURE_CODES = {
    "DMS", "DEF", "RRC", "TSO", "PDC",
    "DMP", "DMA", "DMC", "DME", "DMI", "DMR", "DMT", "DMX",
    "TVC",  # ✅ vu dans ton PRAX
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

def _val(h: dict, *keys: str):
    for k in keys:
        v = h.get(k)
        if v is not None and str(v).strip() != "":
            return str(v).strip()
    return None

def _guess_cloture(h: dict) -> str | None:
    """
    Essaie de retrouver le code clôture (DMS/DEF/...) même si le header change.
    """
    # 1) mapping direct (les noms les plus fréquents)
    direct = _val(
        h,
        "code_cloture_code",
        "code_cloture",
        "cloture",
        "etat_cloture",
        "code_intervention",
        "code_intervenant",
        "code_interven",
        "code_interv",
    )

    if direct:
        d = direct.strip().upper()
        if d in CLOTURE_CODES:
            return d
        m = re.search(r"\b([A-Z]{3})\b", d)
        if m and m.group(1) in CLOTURE_CODES:
            return m.group(1)

    # 2) fuzzy sur les headers (contient clotur/interven)
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

    # 3) scan des valeurs : si une cellule vaut DMS/DEF/... on la prend
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

def _detect_delimiter(file: UploadFile, requested: str) -> str:
    """
    Auto-détecte le delimiter si le paramètre envoyé par le front est faux.
    Ça évite le cas classique : fichier en ';' mais import envoyé en ',' => tout se retrouve dans une seule colonne.
    """
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

        # Heuristique simple sur la 1ère ligne
        if requested == "," and first.count(";") > first.count(","):
            return ";"
        if requested == ";" and first.count(",") > first.count(";"):
            return ","

        # Sniffer (fallback)
        try:
            sniffed = csv.Sniffer().sniff(txt, delimiters=[",", ";", "\t", "|"])
            return sniffed.delimiter
        except Exception:
            return requested
    except Exception:
        # En cas d'erreur, on garde le delimiter demandé
        return requested

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

        # utf-8-sig => gère BOM proprement
        text = TextIOWrapper(file.file, encoding="utf-8-sig", errors="ignore")
        reader = csv.DictReader(text, delimiter=eff_delim)

        # ✅ Debug utile (à laisser le temps de valider puis tu peux enlever)
        # print("PRAX delimiter demandé:", delimiter, "| utilisé:", eff_delim)
        # print("PRAX headers:", reader.fieldnames)

        rows = 0
        now = datetime.utcnow()

        for r in reader:
            h = {_norm(k): (v.strip() if isinstance(v, str) else v) for k, v in (r or {}).items()}

            numero = _val(h, "numero", "n", "ot", "numero_ot", "ot_key")
            if not numero:
                continue

            # clôture robuste (fallback)
            cloture = _guess_cloture(h)

            obj = RawPraxedo(
                numero=numero,
                statut=_val(h, "statut"),
                planifiee=_val(h, "planifiee", "planifiee_au", "date_planifiee"),
                nom_technicien=_val(h, "nom_technicien", "nom"),
                prenom_technicien=_val(h, "prenom_technicien", "prenom"),
                equipiers=_val(h, "equipiers"),
                nd=_val(h, "nd"),
                act_prod=_val(h, "act_prod", "act_prod_", "activite_produit", "act_prod_code"),

                # ✅ colonne Excel "Code intervention" => _norm = code_intervention
                # On met d'abord la valeur directe, sinon fallback sur guess
                code_intervenant=_val(h, "code_intervention", "code_intervenant", "code_interven", "code_interv") or cloture,

                cp=_val(h, "cp"),
                ville_site=_val(h, "ville_site", "ville"),
                imported_at=now,
            )

            db.merge(obj)
            rows += 1

        db.commit()
        return {"ok": True, "rows": rows, "delimiter_used": eff_delim}
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

        text = TextIOWrapper(file.file, encoding="utf-8-sig", errors="ignore")
        reader = csv.DictReader(text, delimiter=eff_delim)

        # print("PIDI delimiter demandé:", delimiter, "| utilisé:", eff_delim)
        # print("PIDI headers:", reader.fieldnames)

        rows = 0
        now = datetime.utcnow()

        for r in reader:
            h = {_norm(k): (v.strip() if isinstance(v, str) else v) for k, v in (r or {}).items()}

            # PK stable (vient du fichier : "N° de flux PIDI")
            flux = _val(h, "numero_flux_pidi", "n_de_flux_pidi", "n_de_flux_pid", "id_flux")
            if not flux:
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
        return {"ok": True, "rows": rows, "delimiter_used": eff_delim}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
