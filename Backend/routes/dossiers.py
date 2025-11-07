# Backend/routes/dossiers.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from core.database import get_async_session
from typing import Optional, Literal
import logging

from fastapi.responses import StreamingResponse
import io
import csv

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dossiers", tags=["Dossiers"])

# --------------------------------------------------------------------
# Liste Dossiers = lecture de canonique.v_croisement (croisement Praxedo ⟷ PIDI)
# --------------------------------------------------------------------
@router.get("/")
async def list_dossiers(
    q: Optional[str] = Query(
        None,
        description="Recherche dans OT (ot_key) / ND Praxedo / ND PIDI",
    ),
    statut: Optional[
        Literal["OK", "ABSENT_PIDI", "ABSENT_PIDI_>48H", "ABSENT_PRAXEDO", "ND_DIFF"]
    ] = Query(None, description="Filtrer par statut_croisement"),
    attachement: Optional[str] = Query(
        None, description="Filtrer par statut_pidi (PIDI) - texte libre"
    ),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Retourne le croisement PRAXEDO ↔ PIDI.
    Source: canonique.v_croisement
    Colonnes clés: ot_key, nd_praxedo, nd_pidi, statut_praxedo, statut_pidi, date_planifiee, statut_croisement.
    """
    try:
        where = []
        params = {}

        # Recherche globale (OT / ND)
        if q:
            where.append(
                """(
                    ot_key ILIKE '%' || :q || '%'
                 OR nd_praxedo ILIKE '%' || :q || '%'
                 OR nd_pidi ILIKE '%' || :q || '%'
                )"""
            )
            params["q"] = q

        # Filtre par statut de croisement
        if statut:
            where.append("statut_croisement = :statut")
            params["statut"] = statut

        # Filtre par statut PIDI
        if attachement:
            where.append("statut_pidi ILIKE '%' || :att || '%'")
            params["att"] = attachement

        where_clause = f"WHERE {' AND '.join(where)}" if where else ""

        # ⚙️ Requête principale
        query = text(f"""
            SELECT
                ot_key,
                nd_praxedo,
                nd_pidi,
                statut_praxedo,
                statut_pidi,
                date_planifiee,
                statut_croisement
            FROM canonique.v_croisement
            {where_clause}
            ORDER BY
                -- priorité aux dossiers en anomalie, puis récents
                CASE
                    WHEN statut_croisement = 'OK' THEN 2 ELSE 1
                END,
                date_planifiee DESC NULLS LAST,
                ot_key
        """)
        rows = (await session.execute(query, params)).mappings().all()
        return [dict(r) for r in rows]
    except Exception as e:
        logger.exception("Erreur list_dossiers")
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------------------------------------------------
# Détail d'un dossier = en clé OT
# --------------------------------------------------------------------
@router.get("/{ot_key}")
async def get_dossier(
    ot_key: str,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Détail d'un croisement à partir de l'OT (ot_key).
    """
    try:
        query = text("""
            SELECT
                ot_key,
                nd_praxedo,
                nd_pidi,
                statut_praxedo,
                statut_pidi,
                date_planifiee,
                statut_croisement
            FROM canonique.v_croisement
            WHERE ot_key = :ot
            LIMIT 1
        """)
        row = (await session.execute(query, {"ot": ot_key})).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Dossier introuvable")
        return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erreur get_dossier")
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------------------------------------------------
# Petites stats utiles (pour des widgets frontend)
# --------------------------------------------------------------------
@router.get("/_stats/repartition")
async def stats_repartition(session: AsyncSession = Depends(get_async_session)):
    """
    Donne la répartition par statut_croisement.
    """
    try:
        query = text("""
            SELECT statut_croisement, COUNT(*) as count
            FROM canonique.v_croisement
            GROUP BY 1
            ORDER BY 2 DESC
        """)
        rows = (await session.execute(query)).mappings().all()
        return [dict(r) for r in rows]
    except Exception as e:
        logger.exception("Erreur stats_repartition")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export")
async def export_dossiers(
    q: Optional[str] = Query(None, description="Recherche dans OT / ND Praxedo / ND PIDI"),
    statut: Optional[str] = Query(None, description="Filtrer par statut_croisement"),
    attachement: Optional[str] = Query(None, description="Filtrer par statut_pidi (PIDI)"),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Exporte le croisement PRAXEDO ↔ PIDI en CSV.
    Colonnes : ot_key, nd_praxedo, nd_pidi, statut_praxedo, statut_pidi, date_planifiee, statut_croisement.
    Les filtres `q`, `statut`, et `attachement` sont optionnels.
    """
    try:
        where = []
        params = {}

        # 🔍 Recherche texte libre
        if q:
            where.append("""
                (
                    ot_key ILIKE '%' || :q || '%'
                 OR nd_praxedo ILIKE '%' || :q || '%'
                 OR nd_pidi ILIKE '%' || :q || '%'
                )
            """)
            params["q"] = q

        # 🔖 Filtre par statut croisement
        if statut:
            where.append("statut_croisement = :statut")
            params["statut"] = statut

        # 📎 Filtre par statut PIDI (attachement)
        if attachement:
            where.append("statut_pidi ILIKE '%' || :att || '%'")
            params["att"] = attachement

        where_clause = f"WHERE {' AND '.join(where)}" if where else ""

        # ✅ Requête principale
        query = text(f"""
            SELECT
                ot_key,
                nd_praxedo,
                nd_pidi,
                statut_praxedo,
                statut_pidi,
                date_planifiee,
                statut_croisement
            FROM canonique.v_croisement
            {where_clause}
            ORDER BY date_planifiee DESC NULLS LAST
        """)

        rows = (await session.execute(query, params)).mappings().all()

        if not rows:
            raise HTTPException(status_code=404, detail="Aucun dossier trouvé à exporter")

        # 🧾 Génération CSV en mémoire
        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "ot_key",
                "nd_praxedo",
                "nd_pidi",
                "statut_praxedo",
                "statut_pidi",
                "date_planifiee",
                "statut_croisement",
            ],
            delimiter=";",
        )
        writer.writeheader()
        for row in rows:
            writer.writerow({k: (v if v is not None else "") for k, v in dict(row).items()})

        output.seek(0)
        filename = f"dossiers_export_{statut or 'tous'}.csv"

        # 📤 Retour en flux CSV
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8-sig")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erreur export_dossiers")
        raise HTTPException(status_code=500, detail=str(e))
