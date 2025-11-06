# Backend/routes/imports.py
# Backend/routes/imports.py
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from core.database import get_async_session
import csv, io, json, logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/import", tags=["Imports"])

async def _read_csv(file: UploadFile, delimiter: str) -> list[dict]:
    content = await file.read()
    decoded = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(decoded), delimiter=delimiter)
    rows = [{(k or "").strip(): (v.strip() if v is not None else None) for k, v in row.items()} for row in reader]
    if not rows:
        raise HTTPException(status_code=400, detail="Fichier vide ou mal formaté")
    return rows

async def _stage_raw(session: AsyncSession, source: str, filename: str, rows: list[dict]) -> int:
    """
    Transaction A : créer un log + vider/injecter RAW.<source>
    Retourne log_id (batch_id).
    """
    try:
        # 1) Insert log  (!!! CAST explicite, pas ::)
        res = await session.execute(
    text("""
        INSERT INTO norm.import_log (source_type, filename, nb_lignes_ok, import_date)
        VALUES (CAST(:source AS public.source_type), :filename, :rows, NOW())
        RETURNING id
    """),
    {"source": source, "filename": filename, "rows": len(rows)},
)

        log_id = res.scalar_one()

        # 2) TRUNCATE RAW.<source>
        table_raw = f'raw.{source.lower()}'
        await session.execute(text(f'TRUNCATE TABLE {table_raw} RESTART IDENTITY;'))

        # 3) Insert JSONB lignes (json.dumps au lieu du replace())
        insert_sql = text(f"""
            INSERT INTO {table_raw} (payload, batch_id, src_line, imported_at)
            VALUES (:payload, :batch_id, :src_line, NOW())
        """)
        
        # Préparation des données pour l'insertion en masse (executemany)
        data_to_insert = [
            {
                "payload": json.dumps(r, ensure_ascii=False),
                "batch_id": log_id,
                "src_line": idx,
            }
            for idx, r in enumerate(rows, start=2)  # header = ligne 1
        ]
        
        # Exécution en masse
        if data_to_insert:
            await session.execute(insert_sql, data_to_insert)

        await session.commit()
        return log_id

    except Exception as e:
        await session.rollback()
        logger.exception("Erreur étape RAW")
        raise HTTPException(status_code=500, detail=f"Erreur étape RAW: {e}")


async def _stage_norm(session: AsyncSession, source: str, batch_id: int):
    """
    Transaction B : RAW -> NORM (par INSERT SELECT)
    """
    try:
        if source == "PRAXEDO":
            # mappe les champs à ta structure norm.praxedo_norm
            await session.execute(text("""
                INSERT INTO norm.praxedo_norm (
                    batch_id, nd, numero_ot, activite_code, produit_code,
                    code_cloture_code, statut_praxedo, commentaire, date_planifiee,
                    date_cloture, imported_at
                )
                SELECT
                    r.batch_id,
                    COALESCE(NULLIF(TRIM(r.payload->>'nd'), ''), '')                         AS nd,
                    COALESCE(NULLIF(TRIM(r.payload->>'numero_ot'), ''), '')                  AS numero_ot,
                    COALESCE(NULLIF(TRIM(r.payload->>'activite_code'), ''), '')              AS activite_code,
                    COALESCE(NULLIF(TRIM(r.payload->>'produit_code'), ''), '')               AS produit_code,
                    COALESCE(NULLIF(TRIM(r.payload->>'code_cloture_code'), ''), '')          AS code_cloture_code,
                    COALESCE(NULLIF(TRIM(r.payload->>'statut_praxedo'), ''), '')             AS statut_praxedo,
                    COALESCE(NULLIF(TRIM(r.payload->>'commentaire'), ''), '')                AS commentaire,
                    CASE
                        WHEN (r.payload->>'date_planifiee') ~ '^[0-9]{4}-'
                            THEN (r.payload->>'date_planifiee')::timestamp
                        ELSE NULL
                    END AS date_planifiee,
                    CASE
                        WHEN (r.payload->>'date_cloture') ~ '^[0-9]{4}-'
                            THEN (r.payload->>'date_cloture')::timestamp
                        ELSE NULL
                    END AS date_cloture,
                    NOW()
                FROM raw.praxedo r
                WHERE r.batch_id = :batch_id
            """), {"batch_id": batch_id})

        elif source == "PIDI":
            await session.execute(text("""
                INSERT INTO norm.pidi_norm (
                    batch_id, nd, numero_ot, statut_pidi, commentaire, imported_at
                )
                SELECT
                    r.batch_id,
                    COALESCE(NULLIF(TRIM(r.payload->>'nd'), ''), '')            AS nd,
                    COALESCE(NULLIF(TRIM(r.payload->>'numero_ot'), ''), '')     AS numero_ot,
                    COALESCE(NULLIF(TRIM(r.payload->>'statut_pidi'), ''), '')   AS statut_pidi,
                    COALESCE(NULLIF(TRIM(r.payload->>'commentaire'), ''), '')   AS commentaire,
                    NOW()
                FROM raw.pidi r
                WHERE r.batch_id = :batch_id
            """), {"batch_id": batch_id})
        else:
            raise HTTPException(400, f"Source non gérée: {source}")

        await session.commit()

    except Exception as e:
        await session.rollback()
        logger.exception("Erreur étape NORM")
        raise HTTPException(status_code=500, detail=f"Erreur étape NORM: {e}")


async def _stage_canonique(session: AsyncSession, batch_id: int):
    """
    Transaction C : NORM -> CANONIQUE (exemple d’upsert)
    """
    try:
        await session.execute(text("""
            INSERT INTO canonique.dossier (
                nd, numero_ot, activite_code, produit_code, code_cloture_code,
                statut_praxedo, statut_pidi, commentaire, date_planifiee, date_cloture, updated_at
            )
            SELECT DISTINCT -- CORRECTION FINALE : Ajout de DISTINCT pour éviter les doublons dans l'upsert
                COALESCE(p.nd, i.nd)                       AS nd,
                COALESCE(p.numero_ot, i.numero_ot)         AS numero_ot,
                p.activite_code,
                p.produit_code,
                p.code_cloture_code,
                p.statut_praxedo,
                NULL AS statut_pidi,
                COALESCE(i.commentaire, p.commentaire)     AS commentaire,
                p.date_planifiee,
                p.date_cloture,
                NOW()
            FROM norm.praxedo_norm p
            FULL JOIN norm.pidi_norm i
              ON (p.batch_id = :b)
             AND (p.nd = i.nd OR p.numero_ot = i.numero_ot)
            WHERE (p.batch_id = :b)
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

        # éventuel refresh des facturables
        await session.execute(text("""
            UPDATE canonique.dossier_facturable
               SET updated_at = NOW()
             WHERE nd_global IN (
                   SELECT nd FROM norm.praxedo_norm WHERE batch_id = :b
                   UNION
                   SELECT nd FROM norm.pidi_norm    WHERE batch_id = :b
             );
        """), {"b": batch_id})

        await session.commit()

    except Exception as e:
        await session.rollback()
        logger.exception("Erreur étape CANONIQUE")
        raise HTTPException(status_code=500, detail=f"Erreur étape CANONIQUE: {e}")


@router.post("/praxedo")
async def import_praxedo(
    file: UploadFile = File(...),
    delimiter: str = Form(";"),
    session: AsyncSession = Depends(get_async_session),
):
    rows = await _read_csv(file, delimiter)
    # A — RAW
    batch_id = await _stage_raw(session, "PRAXEDO", file.filename, rows)
    # B — NORM
    await _stage_norm(session, "PRAXEDO", batch_id)
    # C — CANONIQUE
    await _stage_canonique(session, batch_id)
    return {"ok": True, "rows": len(rows), "batch_id": batch_id}


@router.post("/pidi")
async def import_pidi(
    file: UploadFile = File(...),
    delimiter: str = Form(";"),
    session: AsyncSession = Depends(get_async_session),
):
    rows = await _read_csv(file, delimiter)
    batch_id = await _stage_raw(session, "PIDI", file.filename, rows)
    await _stage_norm(session, "PIDI", batch_id)
    await _stage_canonique(session, batch_id)
    return {"ok": True, "rows": len(rows), "batch_id": batch_id}
