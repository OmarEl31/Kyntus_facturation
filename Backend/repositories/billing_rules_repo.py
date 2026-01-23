# Backend/repositories/billing_rules_repo.py

import re
from sqlalchemy.orm import Session
from sqlalchemy import and_
from backend.models.ref_factregle import RefFactRegle
from backend.models.ref_remu_codecloture import RefRemuCodeCloture

def _split_codes(text: str) -> set[str]:
    """
    'DMS MAJ TKO REA' -> {'DMS','MAJ','TKO','REA'}
    supporte aussi retours ligne et virgules.
    """
    if not text:
        return set()
    tokens = re.split(r"[\s,;]+", text.strip())
    return {t.strip().upper() for t in tokens if t.strip()}

def get_fact_rule(db: Session, code_activite: str, code_produit: str, is_plp: bool):
    q = db.query(RefFactRegle).filter(
        RefFactRegle.code_activite == code_activite,
        RefFactRegle.code_produit == code_produit,
    )

    # si PLP applicable, on filtre sur plp='PLP', sinon on accepte '-' ou null/empty
    if is_plp:
        q = q.filter(RefFactRegle.plp == "PLP")
    else:
        q = q.filter((RefFactRegle.plp == "-") | (RefFactRegle.plp.is_(None)) | (RefFactRegle.plp == ""))

    return q.first()

def is_code_cloture_facturable(db: Session, activite_remu: str, code_cloture: str) -> bool:
    row = db.query(RefRemuCodeCloture).filter(
        and_(
            RefRemuCodeCloture.activite == activite_remu,
            RefRemuCodeCloture.code_cloture == code_cloture,
        )
    ).first()
    if not row:
        return False
    return (row.remu_fournisseur or "").strip().upper() == "OUI"

def compute_facturation(db: Session, code_activite: str, code_produit: str, is_plp: bool, activite_remu: str, code_cloture: str):
    rule = get_fact_rule(db, code_activite, code_produit, is_plp)
    if not rule:
        return {
            "statut_final": "A_VERIFIER",
            "articles": [],
            "commentaire": "Aucune règle factregle trouvée",
        }

    # 1) check cloture dans la liste de la règle (ex: DMS MAJ TKO REA)
    allowed = _split_codes(rule.codes_cloture_facturable)
    if code_cloture.upper() not in allowed:
        return {
            "statut_final": "A_VERIFIER",
            "articles": [],
            "commentaire": f"Code clôture {code_cloture} non présent dans codes_cloture_facturable",
        }

    # 2) check remu code clôture
    if not is_code_cloture_facturable(db, activite_remu, code_cloture):
        return {
            "statut_final": "NON_FACTURABLE",
            "articles": [],
            "commentaire": f"Code clôture {code_cloture} remu_fournisseur != OUI",
        }

    # 3) build articles (ici on retourne les champs bruts, ton moteur actuel fera le mapping LSIMx -> LSIM1 etc)
    articles = []
    for s in [
        rule.branchement_immeuble,
        rule.branchement_souterrain,
        rule.branchement_facade_aerien,
        rule.plp_articles,
        rule.services,
        rule.article_etude_optionnel,
        rule.article_autre_optionnel,
    ]:
        if s and s.strip():
            articles.append(s.strip())

    return {
        "statut_final": "FACTURABLE",
        "articles": articles,
        "commentaire": rule.commentaires or "",
    }

