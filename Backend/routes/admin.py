# backend/src/routes/admin.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Dict, Any

from database.connection import get_db

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/truncate-all")
async def truncate_all(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Vide toutes les tables de données brutes et canoniques
    Commande: TRUNCATE TABLE ... RESTART IDENTITY CASCADE;
    """
    try:
        # Désactiver les contraintes temporairement
        db.execute(text("SET session_replication_role = 'replica';"))
        
        # Exécuter les TRUNCATE dans l'ordre
        queries = [
            "TRUNCATE TABLE raw.praxedo RESTART IDENTITY CASCADE;",
            "TRUNCATE TABLE raw.pidi RESTART IDENTITY CASCADE;",
            "TRUNCATE TABLE norm.praxedo_norm RESTART IDENTITY CASCADE;",
            "TRUNCATE TABLE canonique.orange_ppd_imports RESTART IDENTITY CASCADE;",
            "TRUNCATE TABLE canonique.orange_ppd_rows RESTART IDENTITY CASCADE;",
            "TRUNCATE TABLE canonique.orange_ppd_excel_imports RESTART IDENTITY CASCADE;",
            "TRUNCATE TABLE canonique.orange_ppd_excel_rows RESTART IDENTITY CASCADE;"
        ]
        
        for query in queries:
            db.execute(text(query))
        
        # Réactiver les contraintes
        db.execute(text("SET session_replication_role = 'origin';"))
        
        db.commit()
        
        return {
            "success": True,
            "message": "Toutes les tables ont été vidées avec succès"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du vidage des tables: {str(e)}"
        )