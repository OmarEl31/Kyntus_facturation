# Backend/routes/imports.py
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from core.database import get_async_session
import csv, io, json, logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/import", tags=["Imports"])


# ---------------------------------------------------------
# Utilitaires lecture CSV
# ---------------------------------------------------------
async def _read_csv(file: UploadFile, delimiter: str) -> list[dict]:
    """Lit un fichier CSV et renvoie une liste de dictionnaires."""
    content = await file.read()
    decoded = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(decoded), delimiter=delimiter)
    rows = [
        {(k or "").strip(): (v.strip() if v is not None else None) for k, v in row.items()}
        for row in reader
    ]
    if not rows:
        raise HTTPException(status_code=400, detail="Fichier vide ou mal formaté")
    return rows


# ---------------------------------------------------------
# A/ Étape RAW (stockage brut JSONB + log batch)
# ---------------------------------------------------------
async def _stage_raw(session: AsyncSession, source: str, filename: str, rows: list[dict]) -> int:
    """
    1) Crée un log d'import dans norm.import_log
    2) Vide la table raw.<source>_raw
    3) Insert les lignes au format JSONB
    """
    try:
        res = await session.execute(
            text("""
                INSERT INTO norm.import_log (source_type, filename, nb_lignes_ok, import_date)
                VALUES (CAST(:source AS public.source_type), :filename, :rows, NOW())
                RETURNING id
            """),
            {"source": source, "filename": filename, "rows": len(rows)},
        )
        batch_id = res.scalar_one()

        table_raw = f"raw.{source.lower()}_raw"
        await session.execute(text(f"TRUNCATE TABLE {table_raw} RESTART IDENTITY"))

        insert_sql = text(f"""
            INSERT INTO {table_raw} (payload, batch_id, src_line, imported_at)
            VALUES (:payload, :batch_id, :src_line, NOW())
        """)

        to_insert = [
            {"payload": json.dumps(r, ensure_ascii=False), "batch_id": batch_id, "src_line": i}
            for i, r in enumerate(rows, start=2)
        ]

        if to_insert:
            await session.execute(insert_sql, to_insert)

        await session.commit()
        return batch_id

    except Exception as e:
        await session.rollback()
        logger.exception("Erreur étape RAW")
        raise HTTPException(status_code=500, detail=f"Erreur étape RAW: {e}")


# ---------------------------------------------------------
# B/ Étape NORM (parse JSONB → colonnes utiles)
# ---------------------------------------------------------
async def _stage_norm(session: AsyncSession, source: str, batch_id: int):
    """Alimente norm.<source>_norm à partir de raw.<source>_raw."""
    try:
        if source == "PRAXEDO":
            await session.execute(
                text("""
                INSERT INTO norm.praxedo_norm (
                    batch_id, nd, numero_ot, activite_code, produit_code,
                    code_cloture_code, statut_praxedo, commentaire,
                    date_planifiee, date_cloture, imported_at
                )
                SELECT
                    r.batch_id,
                    NULLIF(TRIM(COALESCE(r.payload->>'ND', r.payload->>'nd')), '') AS nd,
                    NULLIF(TRIM(
                        COALESCE(
                            r.payload->>'numero_ot',
                            r.payload->>'N° OT', r.payload->>'N OT',
                            r.payload->>'N°OT', r.payload->>'N'
                        )
                    ), '') AS numero_ot,
                    NULLIF(TRIM(
                        COALESCE(r.payload->>'Code intervention', r.payload->>'code_intervention', r.payload->>'activite_code')
                    ), '') AS activite_code,
                    NULLIF(TRIM(COALESCE(r.payload->>'Act/Prod', r.payload->>'produit_code')), '') AS produit_code,
                    NULLIF(TRIM(COALESCE(r.payload->>'Code clôture', r.payload->>'code_cloture_code')), '') AS code_cloture_code,
                    lower(NULLIF(TRIM(COALESCE(r.payload->>'Statut', r.payload->>'statut', r.payload->>'statut_praxedo')), '')) AS statut_praxedo,
                    NULLIF(TRIM(COALESCE(r.payload->>'Commentaire', r.payload->>'commentaire')), '') AS commentaire,
                    CASE WHEN COALESCE(r.payload->>'Planifiée', r.payload->>'date_planifiee') ~ '^[0-9]{4}-'
                        THEN (COALESCE(r.payload->>'Planifiée', r.payload->>'date_planifiee'))::timestamp
                        ELSE NULL END AS date_planifiee,
                    CASE WHEN r.payload->>'date_cloture' ~ '^[0-9]{4}-'
                        THEN (r.payload->>'date_cloture')::timestamp
                        ELSE NULL END AS date_cloture,
                    NOW()
                FROM raw.praxedo_raw r
                WHERE r.batch_id = :b
                """),
                {"b": batch_id},
            )

        elif source == "PIDI":
            await session.execute(
                text("""
                INSERT INTO norm.pidi_norm (
                    batch_id, nd, numero_ot, statut_pidi, commentaire, agence, imported_at
                )
                SELECT
                    r.batch_id,
                    NULLIF(TRIM(COALESCE(r.payload->>'ND', r.payload->>'nd')), '') AS nd,
                    NULLIF(TRIM(COALESCE(
                        r.payload->>'numero_ot', r.payload->>'N° OT', r.payload->>'N OT', r.payload->>'N°OT', r.payload->>'N'
                    )), '') AS numero_ot,
                    lower(NULLIF(TRIM(
                        COALESCE(
                            r.payload->>'Statut attachement', r.payload->>'Statut att.', r.payload->>'statut_pidi', r.payload->>'Statut'
                        )
                    ), '')) AS statut_pidi,
                    NULLIF(TRIM(COALESCE(r.payload->>'Commentaire', r.payload->>'commentaire')), '') AS commentaire,
                    NULLIF(TRIM(COALESCE(r.payload->>'Agence', r.payload->>'agence')), '') AS agence,
                    NOW()
                FROM raw.pidi_raw r
                WHERE r.batch_id = :b
                """),
                {"b": batch_id},
            )
        else:
            raise HTTPException(status_code=400, detail=f"Source non gérée: {source}")

        await session.commit()

    except Exception as e:
        await session.rollback()
        logger.exception("Erreur étape NORM")
        raise HTTPException(status_code=500, detail=f"Erreur étape NORM: {e}")


# ---------------------------------------------------------
# C/ Étape CANONIQUE (fusion Praxedo + PIDI, sans FULL JOIN, sans doublons)
# ---------------------------------------------------------
async def _stage_canonique(session: AsyncSession, batch_id: int):
    """
    Fusionne Praxedo et PIDI dans canonique.dossier sans FULL JOIN,
    et supprime les doublons avant INSERT (DISTINCT ON).
    """
    try:
        await session.execute(text("""
            WITH merged AS (
                SELECT DISTINCT ON (COALESCE(p.nd, i.nd), COALESCE(p.numero_ot, i.numero_ot))
                    COALESCE(p.nd, i.nd) AS nd,
                    COALESCE(p.numero_ot, i.numero_ot) AS numero_ot,
                    COALESCE(p.activite_code, NULL) AS activite_code,
                    COALESCE(p.produit_code, NULL) AS produit_code,
                    COALESCE(p.code_cloture_code, NULL) AS code_cloture_code,
                    p.statut_praxedo,
                    i.statut_pidi,
                    COALESCE(i.commentaire, p.commentaire) AS commentaire,
                    p.date_planifiee,
                    p.date_cloture,
                    NOW() AS updated_at
                FROM (
                    SELECT * FROM norm.praxedo_norm WHERE batch_id = :b
                ) p
                LEFT JOIN (
                    SELECT * FROM norm.pidi_norm WHERE batch_id = :b
                ) i
                ON (p.nd = i.nd OR p.numero_ot = i.numero_ot)

                UNION ALL

                SELECT DISTINCT ON (COALESCE(p.nd, i.nd), COALESCE(p.numero_ot, i.numero_ot))
                    COALESCE(p.nd, i.nd) AS nd,
                    COALESCE(p.numero_ot, i.numero_ot) AS numero_ot,
                    COALESCE(p.activite_code, NULL) AS activite_code,
                    COALESCE(p.produit_code, NULL) AS produit_code,
                    COALESCE(p.code_cloture_code, NULL) AS code_cloture_code,
                    p.statut_praxedo,
                    i.statut_pidi,
                    COALESCE(i.commentaire, p.commentaire) AS commentaire,
                    p.date_planifiee,
                    p.date_cloture,
                    NOW() AS updated_at
                FROM (
                    SELECT * FROM norm.pidi_norm WHERE batch_id = :b
                ) i
                LEFT JOIN (
                    SELECT * FROM norm.praxedo_norm WHERE batch_id = :b
                ) p
                ON (p.nd = i.nd OR p.numero_ot = i.numero_ot)
            )
            INSERT INTO canonique.dossier (
                nd, numero_ot, activite_code, produit_code, code_cloture_code,
                statut_praxedo, statut_pidi, commentaire, date_planifiee, date_cloture, updated_at
            )
            SELECT * FROM merged
            ON CONFLICT (nd, numero_ot)
            DO UPDATE SET
              activite_code     = EXCLUDED.activite_code,
              produit_code      = EXCLUDED.produit_code,
              code_cloture_code = EXCLUDED.code_cloture_code,
              statut_praxedo    = EXCLUDED.statut_praxedo,
              statut_pidi       = EXCLUDED.statut_pidi,
              commentaire       = EXCLUDED.commentaire,
              date_planifiee    = EXCLUDED.date_planifiee,
              date_cloture      = EXCLUDED.date_cloture,
              updated_at        = NOW();
        """), {"b": batch_id})

        await session.commit()

    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur étape CANONIQUE: {e}")


# ---------------------------------------------------------
# Endpoints REST
# ---------------------------------------------------------
@router.post("/praxedo")
async def import_praxedo(
    file: UploadFile = File(...),
    delimiter: str = Form(";"),
    session: AsyncSession = Depends(get_async_session),
):
    try:
        rows = await _read_csv(file, delimiter)
        batch_id = await _stage_raw(session, "PRAXEDO", file.filename, rows)
        await _stage_norm(session, "PRAXEDO", batch_id)
        await _stage_canonique(session, batch_id)
        return {"ok": True, "rows": len(rows), "batch_id": batch_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pidi")
async def import_pidi(
    file: UploadFile = File(...),
    delimiter: str = Form(";"),
    session: AsyncSession = Depends(get_async_session),
):
    try:
        rows = await _read_csv(file, delimiter)
        batch_id = await _stage_raw(session, "PIDI", file.filename, rows)
        await _stage_norm(session, "PIDI", batch_id)
        await _stage_canonique(session, batch_id)
        return {"ok": True, "rows": len(rows), "batch_id": batch_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
