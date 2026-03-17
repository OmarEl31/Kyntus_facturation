#Backend/routes/admin.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Dict, Any

from database.connection import get_db
from routes.auth import get_current_user, require_admin
from models.user import User
from schemas.user import UserOut, UserCreateByAdmin, UserUpdateByAdmin
from core.security import get_password_hash

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user_by_admin(
    payload: UserCreateByAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")

    new_user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user_by_admin(
    user_id: int,
    payload: UserUpdateByAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    if payload.role is not None:
        user.role = payload.role

    if payload.is_active is not None:
        user.is_active = payload.is_active

    if payload.password is not None and payload.password.strip():
        user.hashed_password = get_password_hash(payload.password)

    db.commit()
    db.refresh(user)
    return user


@router.post("/truncate-all")
async def truncate_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        user_id = current_user.id
        user_id_text = str(user_id)

        db.execute(text("""
            DELETE FROM canonique.orange_ppd_rows
            WHERE import_id IN (
                SELECT import_id
                FROM canonique.orange_ppd_imports
                WHERE imported_by = :user_id_text
            )
        """), {"user_id_text": user_id_text})

        db.execute(text("""
            DELETE FROM canonique.orange_ppd_excel_rows
            WHERE import_id IN (
                SELECT import_id
                FROM canonique.orange_ppd_excel_imports
                WHERE imported_by = :user_id_text
            )
        """), {"user_id_text": user_id_text})

        db.execute(text("""
            DELETE FROM canonique.orange_ppd_imports
            WHERE imported_by = :user_id_text
        """), {"user_id_text": user_id_text})

        db.execute(text("""
            DELETE FROM canonique.orange_ppd_excel_imports
            WHERE imported_by = :user_id_text
        """), {"user_id_text": user_id_text})

        db.execute(text("DELETE FROM raw.praxedo WHERE user_id = :user_id"), {"user_id": user_id})
        db.execute(text("DELETE FROM raw.pidi WHERE user_id = :user_id"), {"user_id": user_id})
        db.execute(text("DELETE FROM raw.praxedo_cr10 WHERE user_id = :user_id"), {"user_id": user_id})
        db.execute(text("DELETE FROM raw.pidi_scrape_full WHERE user_id = :user_id"), {"user_id": user_id})

        db.commit()

        return {
            "success": True,
            "message": "Toutes les données de votre session ont été vidées avec succès"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du vidage des tables: {str(e)}"
        )