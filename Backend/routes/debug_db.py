# Backend/routes/debug_db.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.encoders import jsonable_encoder
import inspect
import traceback

from database.connection import get_db
from models.regle_facturation import RegleFacturation
from schemas.regle_facturation import RegleFacturationOut

router = APIRouter(prefix="/api/_debug", tags=["debug"])

def _dump_pydantic(obj) -> dict:
    # Pydantic v2
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    # Pydantic v1
    return obj.dict()

@router.get("/regle/{code}")
def debug_regle(code: str, db: Session = Depends(get_db)):
    step = "start"
    try:
        step = "raw_sql"
        raw = db.execute(
            text("""
                select id, code, condition_json
                from referentiels.regle_facturation
                where code = :code
                limit 1
            """),
            {"code": code},
        ).mappings().first()

        step = "orm_query"
        orm = db.query(RegleFacturation).filter(RegleFacturation.code == code).first()

        step = "pydantic_serialize"
        pyd = None
        pyd_error = None
        if orm:
            try:
                # Pydantic v2
                if hasattr(RegleFacturationOut, "model_validate"):
                    pyd_obj = RegleFacturationOut.model_validate(orm)
                else:
                    # Pydantic v1
                    pyd_obj = RegleFacturationOut.from_orm(orm)
                pyd = _dump_pydantic(pyd_obj)
            except Exception as e:
                pyd_error = repr(e)

        step = "return"
        payload = {
            "step": step,
            "raw_condition_json": (raw["condition_json"] if raw else None),
            "orm_condition_json": (orm.condition_json if orm else None),
            "pydantic_condition_json": (pyd["condition_json"] if pyd else None),
            "pydantic_error": pyd_error,
            "paths": {
                "model_file": inspect.getfile(RegleFacturation),
                "schema_file": inspect.getfile(RegleFacturationOut),
            },
        }
        return jsonable_encoder(payload)

    except Exception as e:
        # IMPORTANT: on renvoie l’erreur au lieu de faire 500
        return jsonable_encoder({
            "step": step,
            "error": repr(e),
            "traceback": traceback.format_exc(),
        })
