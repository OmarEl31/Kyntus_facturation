from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database.connection import get_db
from models.regle_facturation import RegleFacturation
from schemas.regle_facturation import (
    RegleFacturationOut,
    RegleFacturationCreate,
    RegleFacturationUpdate,
)

router = APIRouter(prefix="/api/regles", tags=["regles"])


def _get_or_404(db: Session, regle_id: int) -> RegleFacturation:
    r = db.query(RegleFacturation).filter(RegleFacturation.id == regle_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Règle introuvable")
    return r


@router.get("/count")
def count_regles(
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
):
    q = db.query(RegleFacturation)
    if not include_inactive:
        q = q.filter(RegleFacturation.is_active.is_(True))
    return {"count": int(q.count())}


@router.get("", response_model=list[RegleFacturationOut])
def list_regles(
    q: str | None = Query(None, description="Recherche sur code/libelle/condition_sql"),
    action: str | None = Query(None, description="Filtre statut_facturation"),
    include_inactive: bool = Query(False, description="Inclure règles désactivées"),
    limit: int = Query(1000, ge=1, le=5000),   # ✅ important pour ton 280 vs 200
    offset: int = Query(0, ge=0),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    query = db.query(RegleFacturation)

    if not include_inactive:
        query = query.filter(RegleFacturation.is_active.is_(True))

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                RegleFacturation.code.ilike(like),
                RegleFacturation.libelle.ilike(like),
                RegleFacturation.condition_sql.ilike(like),
            )
        )

    if action:
        query = query.filter(RegleFacturation.statut_facturation == action)

    if order == "asc":
        query = query.order_by(RegleFacturation.id.asc())
    else:
        query = query.order_by(RegleFacturation.id.desc())

    return query.offset(offset).limit(limit).all()


@router.get("/{regle_id}", response_model=RegleFacturationOut)
def get_regle(regle_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, regle_id)


@router.post("", response_model=RegleFacturationOut, status_code=status.HTTP_201_CREATED)
def create_regle(payload: RegleFacturationCreate, db: Session = Depends(get_db)):
    try:
        r = RegleFacturation(**payload.model_dump())
        r.is_active = True
        r.deleted_at = None
        db.add(r)
        db.commit()
        db.refresh(r)
        return r
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erreur création règle: {e}")


@router.patch("/{regle_id}", response_model=RegleFacturationOut)
def patch_regle(regle_id: int, payload: RegleFacturationUpdate, db: Session = Depends(get_db)):
    r = _get_or_404(db, regle_id)

    data = payload.model_dump(exclude_unset=True)
    if not data:
        return r

    try:
        # si on active/désactive via PATCH
        if "is_active" in data:
            val = bool(data["is_active"])
            r.is_active = val
            r.deleted_at = None if val else datetime.utcnow()
            data.pop("is_active", None)

        for k, v in data.items():
            setattr(r, k, v)

        db.commit()
        db.refresh(r)
        return r
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erreur mise à jour règle: {e}")


@router.delete("/{regle_id}", status_code=status.HTTP_200_OK)
def soft_delete_regle(regle_id: int, db: Session = Depends(get_db)):
    r = _get_or_404(db, regle_id)

    try:
        r.is_active = False
        r.deleted_at = datetime.utcnow()
        db.commit()
        return {"ok": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erreur désactivation règle: {e}")


@router.post("/{regle_id}/restore", response_model=RegleFacturationOut)
def restore_regle(regle_id: int, db: Session = Depends(get_db)):
    r = _get_or_404(db, regle_id)
    try:
        r.is_active = True
        r.deleted_at = None
        db.commit()
        db.refresh(r)
        return r
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Erreur restauration règle: {e}")