from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Dict, Any

from database.connection import get_db
from routes.auth import get_current_user
from models.user import User

router = APIRouter(prefix="/api/admin", tags=["admin"])


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