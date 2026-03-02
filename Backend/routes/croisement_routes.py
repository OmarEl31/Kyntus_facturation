#Backend/routes/croisement_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from database.connection import get_db

router = APIRouter(prefix="/api/croisement", tags=["croisement"])

@router.get("/count")
def croisement_count(db: Session = Depends(get_db)):
    n = db.execute(text("select count(*) from canonique.v_croisement")).scalar()
    return {"count": int(n or 0)}
