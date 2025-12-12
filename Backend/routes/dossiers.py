# Backend/routes/dossiers.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database.connection import get_db
from models.dossiers_facturable import VDossierFacturable

router = APIRouter(prefix="/api/dossiers", tags=["dossiers"])

@router.get("", response_model=list[dict])
def list_dossiers(
    q: str | None = Query(None),
    statut: str | None = Query(None),          # STATUT_FINAL
    croisement: str | None = Query(None),      # statut_croisement (OK / ABSENT_...)
    db: Session = Depends(get_db),
):
    query = db.query(VDossierFacturable)

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                VDossierFacturable.ot_key.ilike(like),
                VDossierFacturable.nd_global.ilike(like),
            )
        )

    if statut:
        query = query.filter(VDossierFacturable.statut_final == statut)

    if croisement:
        query = query.filter(VDossierFacturable.statut_croisement == croisement)

    rows = query.limit(5000).all()

    # on renvoie un dict simple pour le front
    out: list[dict] = []
    for r in rows:
        out.append(
            {
                "key_match": r.key_match,
                "ot_key": r.ot_key,
                "nd_global": r.nd_global,
                "statut_croisement": r.statut_croisement,
                "praxedo_ot_key": r.praxedo_ot_key,
                "praxedo_nd": r.praxedo_nd,
                "activite_code": r.activite_code,
                "produit_code": r.produit_code,
                "code_cloture_code": r.code_cloture_code,
                "statut_praxedo": r.statut_praxedo,
                "date_planifiee": r.date_planifiee.isoformat() if r.date_planifiee else None,
                "date_cloture": r.date_cloture.isoformat() if r.date_cloture else None,
                "technicien": r.technicien,
                "commentaire_praxedo": r.commentaire_praxedo,
                "statut_pidi": r.statut_pidi,
                "code_cible": r.code_cible,
                "pidi_date_creation": r.pidi_date_creation.isoformat()
                if r.pidi_date_creation
                else None,
                "numero_att": r.numero_att,
                "liste_articles": r.liste_articles,
                "commentaire_pidi": r.commentaire_pidi,
                "regle_code": r.regle_code,
                "libelle_regle": r.libelle_regle,
                "condition_sql": r.condition_sql,
                "statut_facturation": r.statut_facturation,
                "codes_cloture_facturables": r.codes_cloture_facturables,
                "type_branchement": r.type_branchement,
                "plp_applicable": r.plp_applicable,
                "services": r.services,
                "prix_degressifs": r.prix_degressifs,
                "articles_optionnels": r.articles_optionnels,
                "documents_attendus": r.documents_attendus,
                "pieces_facturation": r.pieces_facturation,
                "outils_depose": r.outils_depose,
                "justificatifs": r.justificatifs,
                "code_chantier_generique": r.code_chantier_generique,
                "categorie": r.categorie,
                "statut_articles": r.statut_articles,
                "statut_final": r.statut_final,
                "cloture_facturable": r.cloture_facturable,
                "generated_at": r.generated_at.isoformat() if r.generated_at else None,
            }
        )

    return out
