# Backend/routes/dossiers.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from core.database import get_async_session
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dossiers", tags=["Dossiers"])

@router.get("/")
async def list_dossiers(
    nd: Optional[str] = Query(None, description="Recherche ND (global/praxedo/pidi) ou N° OT"),
    statut: Optional[str] = Query(None, description="Filtrer par statut de facturation"),
    code_cible: Optional[str] = Query(None, description="Filtrer par code cible"),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Liste *complète* des dossiers facturables (sans pagination).
    Renvoie les colonnes enrichies issues de canonique.dossier.
    """
    try:
        where = []
        params = {}

        # --- filtres optionnels
        if nd:
            where.append(
                """(
                    f.nd_global ILIKE '%' || :nd || '%'
                 OR f.nd_praxedo ILIKE '%' || :nd || '%'
                 OR f.nd_pidi ILIKE '%' || :nd || '%'
                 OR d.nd::text ILIKE '%' || :nd || '%'
                 OR d.numero_ot::text ILIKE '%' || :nd || '%'
                )"""
            )
            params["nd"] = nd

        if statut:
            where.append("f.statut_facturation = :statut")
            params["statut"] = statut

        if code_cible:
            where.append("f.code_cible = :code_cible")
            params["code_cible"] = code_cible

        where_clause = f"WHERE {' AND '.join(where)}" if where else ""

        # --- jointure "robuste" sur ND (global/praxedo/pidi) et N° OT
        query = text(f"""
            SELECT
                f.id,
                f.nd_global                                               AS nd_global,
                f.code_cible                                              AS code_cible,
                COALESCE(r.libelle, f.regle_facturable)                   AS regle_facturable,
                f.statut_facturation                                      AS statut_facturation,
                f.montant                                                 AS montant,
                f.created_at                                              AS created_at,

                d.nd                                                      AS nd,
                d.numero_ot                                               AS numero_ot,
                d.activite_code                                           AS activite,
                d.produit_code                                            AS produit,
                d.code_cloture_code                                       AS code_cloture,
                d.statut_praxedo                                          AS statut_praxedo,
                d.statut_pidi                                             AS statut_pidi,
                d.commentaire                                             AS commentaire_source,
                d.date_planifiee                                          AS date_planifiee,
                d.date_cloture                                            AS date_cloture

            FROM canonique.dossier_facturable f
            LEFT JOIN canonique.dossier d
                   ON d.nd::text = COALESCE(f.nd_global, f.nd_praxedo, f.nd_pidi)
                   OR d.numero_ot::text = COALESCE(f.nd_global, f.nd_praxedo, f.nd_pidi)
            LEFT JOIN referentiels.regle_facturation r
                   ON r.id::text = f.regle_code     -- cast pour éviter bigint=text

            {where_clause}
            ORDER BY f.created_at DESC
        """)
        res = await session.execute(query, params)
        rows = [dict(r) for r in res.mappings().all()]

        return rows

    except Exception as e:
        logger.error(f"Erreur dossiers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{dossier_id}")
async def get_dossier(
    dossier_id: int,
    session: AsyncSession = Depends(get_async_session),
):
    try:
        query = text("""
            SELECT
                f.id, f.nd_global, f.code_cible,
                COALESCE(r.libelle, f.regle_facturable) AS regle_facturable,
                f.statut_facturation, f.montant, f.created_at,
                d.nd, d.numero_ot, d.activite_code AS activite, d.produit_code AS produit,
                d.code_cloture_code AS code_cloture, d.statut_praxedo, d.statut_pidi,
                d.commentaire AS commentaire_source, d.date_planifiee, d.date_cloture
            FROM canonique.dossier_facturable f
            LEFT JOIN canonique.dossier d
                   ON d.nd::text = COALESCE(f.nd_global, f.nd_praxedo, f.nd_pidi)
                   OR d.numero_ot::text = COALESCE(f.nd_global, f.nd_praxedo, f.nd_pidi)
            LEFT JOIN referentiels.regle_facturation r
                   ON r.id::text = f.regle_code
            WHERE f.id = :id
        """)
        row = (await session.execute(query, {"id": dossier_id})).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Dossier non trouvé")
        return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
