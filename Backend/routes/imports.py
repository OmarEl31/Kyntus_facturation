# Backend/routes/imports.py
from fastapi import APIRouter, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse
import csv, io, uuid
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session  # كنستعمل sync session هنا
from database.connection import get_db

router = APIRouter(prefix="/api/import", tags=["import"])

async def insert_csv_into_raw(table_name: str, file: UploadFile, delimiter: str, session: Session, batch_id: str) -> tuple[int, int]:
    content = await file.read()
    decoded = content.decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(decoded), delimiter=delimiter)
    rows = list(reader)
    if not rows:
        return (0, 0)

    # جيب أعمدة الجدول الفعلية
    cols_query = text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema='raw' AND table_name=:table_name
    """)
    valid_cols = [r[0] for r in session.execute(cols_query, {"table_name": table_name}).fetchall()]

    ok, ko = 0, 0
    for row in rows:
        data = {k: v for k, v in row.items() if k in valid_cols}
        data["batch_id"] = batch_id
        # إذا عندك أعمدة NOT NULL خاصها قيم، حط defaults هنا إلا ما كانوش فـ CSV
        # مثال: data.setdefault("created_at", datetime.utcnow())

        cols = ", ".join(f'"{c}"' for c in data.keys())
        vals = ", ".join(f":{c}" for c in data.keys())
        stmt = text(f'INSERT INTO raw.{table_name} ({cols}) VALUES ({vals})')
        try:
            session.execute(stmt, data)
            ok += 1
        except Exception as e:
            # مهم جداً: rollback باش نخرجو من حالة aborted ونكملو
            session.rollback()
            ko += 1
            print(f"❌ Erreur d'insertion dans {table_name} :", e)

    session.commit()
    return (ok, ko)

@router.post("/praxedo")
async def import_praxedo(
    file: UploadFile = File(...),
    delimiter: str = Form(";"),
    db: Session = Depends(get_db),
):
    batch_id = str(uuid.uuid4())[:8]
    ok, ko = await insert_csv_into_raw("praxedo", file, delimiter, db, batch_id)
    return JSONResponse({
        "status": "success",
        "source": "PRAXEDO",
        "rows_ok": ok, "rows_failed": ko,
        "batch_id": batch_id,
        "imported_at": datetime.now().isoformat()
    })

@router.post("/pidi")
async def import_pidi(
    file: UploadFile = File(...),
    delimiter: str = Form(";"),
    db: Session = Depends(get_db),
):
    batch_id = str(uuid.uuid4())[:8]
    ok, ko = await insert_csv_into_raw("pidi", file, delimiter, db, batch_id)
    return JSONResponse({
        "status": "success",
        "source": "PIDI",
        "rows_ok": ok, "rows_failed": ko,
        "batch_id": batch_id,
        "imported_at": datetime.now().isoformat()
    })
