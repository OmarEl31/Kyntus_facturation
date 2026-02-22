# Backend/routes/intervention_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.connection import get_db
from models import Ping

from schemas.intervention_schema import PingOut

router = APIRouter()

@router.post("/seed", response_model=PingOut)
def seed(db: Session = Depends(get_db)):
    row = Ping(label="pong")
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.get("/list", response_model=list[PingOut])
def list_rows(db: Session = Depends(get_db)):
    return db.query(Ping).all()