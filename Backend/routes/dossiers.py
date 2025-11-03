# Backend/routes/dossiers.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_async_session
from ..schemas.dossier import DossierOut, PageOut
from ..models import DossierFacturable  # SQLAlchemy model mappé à canonique.dossier_facturable

router = APIRouter(prefix="/api/dossiers", tags=["dossiers"])

@router.get("/", response_model=PageOut)
async def list_dossiers(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    nd_praxedo: str | None = None,
    nd_pidi: str | None = None,
    statut: str | None = None,  # FACTURABLE | CONDITIONNEL | NON_FACTURABLE
    date_from: str | None = None,
    date_to: str | None = None,
    session: AsyncSession = Depends(get_async_session),
):
    filters = []
    if nd_praxedo:
        filters.append(DossierFacturable.nd_praxedo.ilike(f"%{nd_praxedo}%"))
    if nd_pidi:
        filters.append(DossierFacturable.nd_pidi.ilike(f"%{nd_pidi}%"))
    if statut:
        filters.append(DossierFacturable.statut_facturation == statut)
    if date_from:
        filters.append(DossierFacturable.created_at >= date_from)
    if date_to:
        filters.append(DossierFacturable.created_at <= date_to)

    stmt = select(DossierFacturable).where(and_(*filters)) if filters else select(DossierFacturable)
    stmt = stmt.order_by(DossierFacturable.created_at.desc())

    total = (await session.execute(
        select(func.count()).select_from(stmt.subquery())
    )).scalar_one()

    offset = (page - 1) * page_size
    rows = (await session.execute(stmt.offset(offset).limit(page_size))).scalars().all()

    items = [
        DossierOut(
            nd_global=r.nd_global,
            nd_praxedo=r.nd_praxedo,
            nd_pidi=r.nd_pidi,
            code_cible=r.code_cible,
            regle_facturable=r.regle_facturable,
            statut_facturation=r.statut_facturation,
            montant=r.montant,
            client_id=r.client_id,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return PageOut(items=items, total=total, page=page, page_size=page_size)
