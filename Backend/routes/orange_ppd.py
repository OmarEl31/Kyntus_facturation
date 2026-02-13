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
from models.raw_orange_ppd_pivot_row import RawOrangePpdPivotRow

router = APIRouter(prefix="/api/orange-ppd", tags=["orange-ppd"])


# --------------------
# Normalisation helpers
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


def _parse_decimal(v: str | None) -> Decimal | None:
    if not v:
        return None
    raw = str(v).replace(" ", "").replace("\u00a0", "").replace("€", "").replace(",", ".").strip()
    try:
        return Decimal(raw)
    except InvalidOperation:
        return None


def _norm_ot(v: str | None) -> str | None:
    if not v:
        return None
    s = re.sub(r"\s+", "", str(v).strip())
    if not s:
        return None
    if s.isdigit():
        s2 = s.lstrip("0")
        return s2 if s2 != "" else "0"
    return s


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

        imp = RawOrangePpdImport(
            import_id=new_import_id,
            filename=file.filename,
            imported_by=imported_by,
            row_count=0,
        )
        db.add(imp)
        db.flush()

        rows: list[RawOrangePpdRow] = []
        pivots: list[RawOrangePpdPivotRow] = []

        for idx, raw in enumerate(reader, start=1):
            h = _normalize_row(raw)

            # -------- pivot detection (lignes totaux / étiquettes) --------
            etiquette = _pick(h, "etiquettes_de_lignes", "etiquettes_de_ligne", "etiquettes", "etiquette_lignes")
            somme_kyntus = _parse_decimal(_pick(h, "somme_de_kyntus", "somme_kyntus", "total_kyntus"))

            # OT normal
            numero_ot_raw = _pick(h, "n_ot", "numero_ot", "num_ot", "ot", "ot_key", "num_ot_orange", "num_ot")
            numero_ot = _norm_ot(numero_ot_raw)

            row_id = f"{new_import_id}:{idx}"

            # pivot row = pas d'OT mais a une étiquette / somme
            if not numero_ot and (etiquette or somme_kyntus is not None):
                pivots.append(
                    RawOrangePpdPivotRow(
                        row_id=row_id,
                        import_id=new_import_id,
                        etiquette_lignes=etiquette,
                        somme_kyntus=somme_kyntus,
                    )
                )
                continue

            # ignore lignes vides inutiles
            if not numero_ot:
                continue

            # PPD (ajout de variantes réalistes)
            numero_ppd = _pick(
                h,
                "n_ppd",
                "numero_ppd",
                "ppd",
                "ppd_orange",
                "ppd_orange_",
                "ppd_orange_num",
                "ppd_orange_libelle",
            )

            rows.append(
                RawOrangePpdRow(
                    row_id=row_id,
                    import_id=new_import_id,

                    contrat=_pick(h, "contrat"),
                    numero_flux_pidi=_pick(h, "n_de_flux_pidi", "numero_flux_pidi", "flux_pidi"),
                    type_pidi=_pick(h, "type"),
                    statut=_pick(h, "statut"),
                    nd=_pick(h, "nd"),
                    code_secteur=_pick(h, "code_secteur"),

                    numero_ot=numero_ot,
                    numero_att=_pick(h, "n_att", "numero_att", "n_att_"),
                    oeie=_pick(h, "oeie"),
                    code_gestion_chantier=_pick(h, "code_gestion_chantier"),
                    agence=_pick(h, "agence"),
                    code_postal=_pick(h, "code_postal"),
                    code_insee=_pick(h, "code_insee"),
                    entreprise=_pick(h, "entreprise"),
                    code_gpc=_pick(h, "code_gpc"),
                    code_etr=_pick(h, "code_etr"),
                    chef_equipe=_pick(h, "chef_d_equipe", "chef_dequipe", "chef_d_equipe_"),
                    ui=_pick(h, "ui"),

                    numero_ppd=numero_ppd,
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
                    cause_acqui_rejet=_pick(h, "cause_acqui_rejet", "cause_acqui_rejet_"),
                    commentaire_acqui_rejet=_pick(h, "comment_acqui_rejet", "commentaire_acqui_rejet"),

                    attachement_cree=_pick(h, "attachement_cree"),
                    derniere_saisie=_pick(h, "derniere_saisie"),
                    attachement_definitif=_pick(h, "attachement_definitif"),
                    attachement_valide=_pick(h, "attachement_valide"),

                    pointe_ppd=_pick(h, "pointe_ppd"),
                    planification_ot=_pick(h, "planification_ot"),
                    validation_interventions=_pick(h, "validation_des_interventions", "validation_interventions"),
                    bordereau=_pick(h, "bordereau"),

                    ht=_parse_decimal(_pick(h, "ht", "total_ht")),
                    bordereau_sst=_pick(h, "bordereau_sst"),
                    ht_sst=_parse_decimal(_pick(h, "ht_sst")),

                    marge=_pick(h, "marge"),
                    coeff=_pick(h, "coeff"),
                    kyntus=_pick(h, "kyntus"),
                    liste_articles=_pick(h, "liste_des_articles", "liste_articles"),
                    encours=_pick(h, "encours"),
                )
            )

        if not rows and not pivots:
            raise HTTPException(status_code=400, detail="Aucune ligne exploitable")

        imp.row_count = len(rows)

        if rows:
            db.bulk_save_objects(rows)
        if pivots:
            db.bulk_save_objects(pivots)

        db.commit()

        return {
            "ok": True,
            "rows": len(rows),
            "pivots": len(pivots),
            "count": len(rows),
            "message": "Import Orange PPD terminé",
            "importId": new_import_id,
            "import_id": new_import_id,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/imports")
def list_imports(limit: int = Query(20, ge=1, le=200), db: Session = Depends(get_db)):
    q = (
        db.query(RawOrangePpdImport)
        .order_by(RawOrangePpdImport.imported_at.desc(), RawOrangePpdImport.import_id.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "import_id": it.import_id,
            "filename": it.filename,
            "row_count": it.row_count,
            "imported_by": it.imported_by,
            "imported_at": it.imported_at.isoformat() if it.imported_at else None,
        }
        for it in q
    ]


@router.get("/ppd-options")
def ppd_options(import_id: str | None = Query(None), db: Session = Depends(get_db)):
    import_id = _resolve_import_id(db, import_id)
    if not import_id:
        return []
    sql = """
    SELECT DISTINCT NULLIF(BTRIM(numero_ppd),'') AS ppd
    FROM canonique.orange_ppd_rows
    WHERE import_id = :import_id
      AND NULLIF(BTRIM(numero_ppd),'') IS NOT NULL
    ORDER BY 1;
    """
    rows = db.execute(text(sql), {"import_id": import_id}).all()
    return [r[0] for r in rows if r and r[0]]


@router.get("/compare")
def compare_orange_ppd(
    import_id: str | None = Query(default=None),
    ppd: str | None = Query(default=None),
    only_mismatch: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    sql = """
    SELECT
      import_id,
      num_ot,
      numero_ppd_orange,
      facturation_orange_ht,
      facturation_orange_ttc,
      facturation_kyntus_ht,
      facturation_kyntus_ttc,
      diff_ht,
      diff_ttc,
      a_verifier,

      ot_existant,
      statut_croisement,
      croisement_complet,
      reason

    FROM canonique.v_orange_ppd_compare
    WHERE (:import_id IS NULL OR import_id = :import_id)
      AND (:ppd IS NULL OR numero_ppd_orange = :ppd)
      AND (:only_mismatch = FALSE OR a_verifier = TRUE)
    ORDER BY num_ot
    """
    rows = db.execute(
        text(sql),
        {"import_id": import_id, "ppd": ppd, "only_mismatch": only_mismatch},
    ).mappings().all()

    return [dict(r) for r in rows]



@router.get("/compare-summary")
def compare_orange_ppd_summary(
    import_id: str | None = Query(default=None),
    ppd: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    sql = """
    SELECT
      COALESCE(SUM(facturation_orange_ht), 0)::numeric(12,2)  AS orange_total_ht,
      COALESCE(SUM(facturation_orange_ttc), 0)::numeric(12,2) AS orange_total_ttc,
      COALESCE(SUM(facturation_kyntus_ht), 0)::numeric(12,2)  AS kyntus_total_ht,
      COALESCE(SUM(facturation_kyntus_ttc), 0)::numeric(12,2) AS kyntus_total_ttc,
      (COALESCE(SUM(facturation_orange_ht), 0) - COALESCE(SUM(facturation_kyntus_ht), 0))::numeric(12,2)  AS ecart_ht,
      (COALESCE(SUM(facturation_orange_ttc), 0) - COALESCE(SUM(facturation_kyntus_ttc), 0))::numeric(12,2) AS ecart_ttc
    FROM canonique.v_orange_ppd_compare
    WHERE (:import_id IS NULL OR import_id = :import_id)
      AND (:ppd IS NULL OR numero_ppd_orange = :ppd)
    """
    row = db.execute(text(sql), {"import_id": import_id, "ppd": ppd}).mappings().first()
    return dict(row) if row else {
        "orange_total_ht": 0, "orange_total_ttc": 0,
        "kyntus_total_ht": 0, "kyntus_total_ttc": 0,
        "ecart_ht": 0, "ecart_ttc": 0
    }