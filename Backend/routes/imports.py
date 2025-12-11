# Backend/routes/imports.py

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from io import StringIO

from database.connection import get_db

router = APIRouter(prefix="/api/import", tags=["import"])


async def _copy_csv_to_table(
    db: Session,
    file: UploadFile,
    table_name: str,
    delimiter: str,
) -> int:
    """
    Charge le contenu du CSV dans la table PostgreSQL `table_name`
    via COPY FROM STDIN.

    Hypothèse : la structure de la table RAW correspond déjà au CSV.
    """

    # 1) Lecture du fichier envoyé
    try:
        raw_bytes = await file.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Erreur de lecture du fichier : {exc}")

    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Fichier vide ou non lisible.")

    # 2) Décodage en texte
    text_data = raw_bytes.decode("utf-8", errors="ignore")
    f = StringIO(text_data)

    # 3) On vide la table RAW avant de recharger
    try:
        db.execute(text(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE;"))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du TRUNCATE de {table_name} : {exc}",
        )

    # 4) COPY via connexion psycopg2
    try:
        # Récupération de la connexion 'brute'
        conn = db.connection().connection  # SQLAlchemy -> psycopg2

        with conn.cursor() as cur:
            copy_sql = (
                f"COPY {table_name} FROM STDIN "
                f"WITH (FORMAT csv, HEADER true, DELIMITER '{delimiter}')"
            )
            cur.copy_expert(copy_sql, f)

        conn.commit()
        db.commit()
    except Exception as exc:
        # Très important : rollback si erreur
        try:
            conn.rollback()
        except Exception:
            pass
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'import dans {table_name} : {exc}",
        )

    # 5) On renvoie le nombre de lignes insérées
    try:
        result = db.execute(text(f"SELECT COUNT(*) FROM {table_name};"))
        count = result.scalar_one()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du COUNT sur {table_name} : {exc}",
        )

    return int(count)


@router.post("/praxedo")
async def import_praxedo(
    file: UploadFile = File(...),
    delimiter: str = Form(";"),   # <── aligné avec le front
    db: Session = Depends(get_db),
):
    """
    Import Praxedo :
    - Remplit raw.praxedo
    - Rafraîchit norm.praxedo_norm et les vues canonique
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Aucun fichier envoyé")

    # 1) COPY vers la table RAW
    rows = await _copy_csv_to_table(
        db=db,
        file=file,
        table_name="raw.praxedo",
        delimiter=delimiter or ";",
    )

    # 2) Rafraîchir la couche NORM via ta fonction SQL
    try:
        db.execute(text("SELECT norm.refresh_praxedo_norm();"))
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'appel à norm.refresh_praxedo_norm() : {exc}",
        )

    return {
        "status": "ok",
        "source": "praxedo",
        "rows_raw": rows,
        "message": f"{rows} lignes Praxedo importées",
    }


@router.post("/pidi")
async def import_pidi(
    file: UploadFile = File(...),
    delimiter: str = Form(";"),   # <── aligné avec le front
    db: Session = Depends(get_db),
):
    """
    Import PIDI :
    - Remplit raw.pidi
    - Rafraîchit norm.pidi_norm et les vues canonique
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Aucun fichier envoyé")

    # 1) COPY vers la table RAW
    rows = await _copy_csv_to_table(
        db=db,
        file=file,
        table_name="raw.pidi",
        delimiter=delimiter or ";",
    )

    # 2) Rafraîchir la couche NORM via ta fonction SQL
    try:
        db.execute(text("SELECT norm.refresh_pidi_norm();"))
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'appel à norm.refresh_pidi_norm() : {exc}",
        )

    return {
        "status": "ok",
        "source": "pidi",
        "rows_raw": rows,
        "message": f"{rows} lignes PIDI importées",
    }
