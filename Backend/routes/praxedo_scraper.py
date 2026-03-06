# Backend/routes/praxedo_scraper.py
from __future__ import annotations

import os
import re
import time
import json
import random
import platform
import logging
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, StaleElementReferenceException, WebDriverException

from core.config import get_settings
from database.connection import get_db

from models.raw_praxedo_cr10 import RawPraxedoCr10
from models.raw_pidi import RawPidi
from models.raw_pidi_scrape_full import RawPidiScrapeFull
from routes.imports import _extract_palier_from_evenements

from routes.auth import get_current_user
from models.user import User


router = APIRouter(prefix="/api/scraper", tags=["scraper"])


# ───────────────────────────────────────────────────────────────────────────────
# Pydantic
# ───────────────────────────────────────────────────────────────────────────────

class ScrapeRequest(BaseModel):
    releves: List[str]

class ScrapedItem(BaseModel):
    ot: str
    nd: str | None = None
    compte_rendu: str | None = None
    evenements: str | None = None

class ScrapedPidiRow(BaseModel):
    data: Dict[str, Any]


# ───────────────────────────────────────────────────────────────────────────────
# Helpers
# ───────────────────────────────────────────────────────────────────────────────

def _norm_key(s: str) -> str:
    s = (s or "").strip().upper()
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^A-Z0-9_]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s

def _clean(v: Any) -> str:
    if v is None:
        return ""
    return str(v).replace("\u00a0", " ").strip()

def _first(d: Dict[str, str], *keys: str) -> Optional[str]:
    for k in keys:
        v = d.get(k)
        if v is None:
            continue
        vv = _clean(v)
        if vv and vv not in ("—", "-", "NULL", "NONE", "null", "None"):
            return vv
    return None

def _to_decimal(v: str | None) -> Optional[Decimal]:
    if not v:
        return None
    s = _clean(v)
    s = re.sub(r"[^0-9,.\-]", "", s)
    s = s.replace(",", ".")
    if not s:
        return None
    try:
        return Decimal(s)
    except InvalidOperation:
        return None

def _normalize_cac(v: str | None) -> Optional[str]:
    if not v:
        return None
    s = _clean(v).upper()
    s = re.sub(r"\s+", "", s)
    s = re.sub(r"[^A-Z0-9]", "", s)
    return s or None

def _td_text_smart(td) -> str:
    """
    td.text parfois vide (icône/lien). On tente aussi textContent/title.
    """
    try:
        t = (td.text or "").strip()
        if t:
            return t.replace("\n", " ")
        t = (td.get_attribute("textContent") or "").strip()
        if t:
            return t.replace("\n", " ")
        t = (td.get_attribute("title") or "").strip()
        if t:
            return t.replace("\n", " ")
    except Exception:
        pass
    return ""

def _extract_from_detail_text(detail_text: str) -> Dict[str, str]:
    """
    Extraction améliorée depuis le texte brut de la page détail.
    Gère différents formats de CAC/Commande.
    """
    out: Dict[str, str] = {}
    txt = detail_text or ""

    # CAC/Commande (large) - accepte "N° CAC", "N° de CAC", "N° commande", etc.
    m = re.search(
        r"(N[°º]?\s*(DE\s*)?CAC|NUM[ÉE]RO\s*CAC|CAC|N[°º]?\s*COMMANDE|NUM[ÉE]RO\s*COMMANDE|COMMANDE)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\s\-]{4,})",
        txt,
        re.IGNORECASE
    )
    if m:
        out["NUM_CAC"] = re.sub(r"[^A-Z0-9]", "", m.group(3).upper())

    # HT
    m = re.search(r"\bHT\b\s*[:\-]?\s*([0-9][0-9\s.,]*)", txt, re.IGNORECASE)
    if m:
        out["HT"] = m.group(1).strip()

    # Bordereau / TTC / majoré
    m = re.search(r"(BORDEREAU|TTC|MAJOR[ÉE])\s*[:\-]?\s*([0-9][0-9\s.,]*)", txt, re.IGNORECASE)
    if m:
        out["BORDEREAU"] = m.group(2).strip()

    return out

def _open_row_detail(driver, row) -> bool:
    """
    Ouvre le détail d'une ligne avec gestion des nouvelles fenêtres/modals.
    """
    before_url = driver.current_url
    before_handles = set(driver.window_handles)

    # 1) tenter un lien "détail"
    candidates = []
    try:
        candidates += row.find_elements(By.CSS_SELECTOR, "a")
    except Exception:
        pass
    try:
        candidates += row.find_elements(By.CSS_SELECTOR, "td")
    except Exception:
        pass

    clicked = False
    for el in candidates:
        try:
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
            time.sleep(0.1)
            driver.execute_script("arguments[0].click();", el)
            clicked = True
            break
        except Exception:
            continue

    if not clicked:
        try:
            driver.execute_script("arguments[0].click();", row)
            clicked = True
        except Exception:
            return False

    # 2) attendre soit nouvelle fenêtre, soit url change, soit modal
    end = time.time() + 20
    while time.time() < end:
        try:
            now_handles = set(driver.window_handles)
            if len(now_handles) > len(before_handles):
                new_handle = list(now_handles - before_handles)[0]
                driver.switch_to.window(new_handle)
                return True

            if driver.current_url != before_url:
                return True

            # modal possible
            modals = driver.find_elements(By.CSS_SELECTOR, ".modal.show, .ui-dialog, .praxedo-modal, .modal-dialog")
            if any(m.is_displayed() for m in modals):
                return True
        except Exception:
            pass
        time.sleep(0.3)

    return False

def _close_detail_and_back(driver, base_handle):
    """
    Ferme la fenêtre de détail et revient à la vue principale.
    """
    # si on est sur nouvelle fenêtre
    if driver.current_window_handle != base_handle:
        driver.close()
        driver.switch_to.window(base_handle)
        return
    # sinon back
    try:
        driver.back()
    except Exception:
        pass

def _wait_ajax_done(driver, timeout=45):
    """
    Attend la fin des chargements AJAX (loaders + DOM stable).
    """
    end = time.time() + timeout
    while time.time() < end:
        try:
            # 1) loaders courants
            loaders = driver.find_elements(By.CSS_SELECTOR, ".loading, .spinner, .ui-loader, .blockUI, .datatable-loading")
            visible = any(l.is_displayed() for l in loaders)
            if visible:
                time.sleep(0.4)
                continue

            # 2) document ready
            ready = driver.execute_script("return document.readyState")
            if ready != "complete":
                time.sleep(0.4)
                continue

            return True
        except Exception:
            time.sleep(0.4)
    return False

def _find_result_rows(driver):
    """
    Trouve les lignes de résultat avec plusieurs sélecteurs possibles.
    Retourne (liste_rows, sélecteur_utilisé)
    """
    selectors = [
        "tbody.pure-datatable-data tr",
        "table tbody tr",
        "div.pure-datatable table tbody tr",
    ]
    for sel in selectors:
        rows = driver.find_elements(By.CSS_SELECTOR, sel)
        # ignorer lignes vides
        rows = [r for r in rows if (r.text or "").strip()]
        if rows:
            return rows, sel
    return [], ""


# ───────────────────────────────────────────────────────────────────────────────
# Selenium
# ───────────────────────────────────────────────────────────────────────────────

def human_typing(element, text: str):
    for char in (text or ""):
        element.send_keys(char)
        time.sleep(random.uniform(0.01, 0.04))

def _build_driver() -> webdriver.Remote:
    settings = get_settings()
    remote_url = (
        getattr(settings, "SELENIUM_REMOTE_URL", None)
        or os.getenv("SELENIUM_REMOTE_URL")
        or "http://selenium:4444/wd/hub"
    )

    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option("useAutomationExtension", False)

    try:
        return webdriver.Remote(command_executor=remote_url, options=chrome_options)
    except Exception as e:
        raise WebDriverException(f"Impossible de se connecter à Selenium Remote: {remote_url} | {e}")


# ───────────────────────────────────────────────────────────────────────────────
# Stream Scraper
# ───────────────────────────────────────────────────────────────────────────────

def scrape_generator(releves: List[str], user: str, password: str):
    LOGIN_URL = (
        "https://auth.praxedo.com/oauth2/default/v1/authorize?"
        "response_type=code&client_id=0oa81c5o3hBGZtAPF417"
        "&scope=openid%20profile%20etech&state=Y04QT2yAPF9AUn3hmp2a-EioA_Ddw-WYupohnb2vsxQ%3D"
        "&redirect_uri=https://eu5.praxedo.com/eTech/login/oauth2/code/okta"
        "&nonce=Ae4aI3FPlBAE0MiCYIQKreokC6z01IxrKPvW3istXr4"
    )

    is_mac = platform.system() == "Darwin"
    cmd_ctrl = Keys.COMMAND if is_mac else Keys.CONTROL

    driver = None
    try:
        yield json.dumps({"status": "info", "message": "Connexion à Selenium (Remote Chrome)..."}) + "\n"
        driver = _build_driver()
        wait = WebDriverWait(driver, 45)  # Remote = lent

        yield json.dumps({"status": "info", "message": "Ouverture de la page login..."}) + "\n"
        driver.get(LOGIN_URL)
        time.sleep(1)

        user_input = wait.until(EC.visibility_of_element_located((By.NAME, "identifier")))
        human_typing(user_input, user)
        user_input.send_keys(Keys.RETURN)
        time.sleep(1)

        pwd_input = wait.until(EC.visibility_of_element_located((By.NAME, "credentials.passcode")))
        human_typing(pwd_input, password)
        pwd_input.send_keys(Keys.RETURN)

        yield json.dumps({"status": "info", "message": "Login en cours... attente redirection."}) + "\n"
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='AdvancedSearchWorkOrder.do']")))
        time.sleep(0.5)

        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "a[href*='AdvancedSearchWorkOrder.do']"))).click()
        time.sleep(0.5)
        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "a[href*='displayInvoiceSearch.do']"))).click()
        time.sleep(0.5)

        yield json.dumps({"status": "info", "message": "Début du traitement..."}) + "\n"

        for i, releve in enumerate(releves):
            releve = (releve or "").strip()
            if not releve:
                continue

            yield json.dumps({"status": "progress", "releve": releve, "message": f"[{i+1}/{len(releves)}] Traitement: {releve} ..."}) + "\n"

            max_attempts = 2
            for attempt in range(1, max_attempts + 1):
                try:
                    # reset
                    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "a[href*='displayInvoiceSearch.do']"))).click()
                    time.sleep(0.5)

                    # inputs
                    date_input = wait.until(EC.visibility_of_element_located((By.NAME, "minCreationDateStr")))
                    driver.execute_script("arguments[0].value = '';", date_input)
                    date_input.click()
                    date_input.send_keys(cmd_ctrl + "a")
                    date_input.send_keys(Keys.BACK_SPACE)
                    date_input.send_keys(Keys.TAB)

                    textarea = wait.until(EC.visibility_of_element_located((By.NAME, "commentaireNotification")))
                    textarea.clear()
                    textarea.send_keys(releve)

                    # --- Recherche avec gestion AJAX ---
                    driver.find_element(By.ID, "searchBottom").click()

                    if not _wait_ajax_done(driver, timeout=60):
                        yield json.dumps({
                            "status": "error",
                            "releve": releve,
                            "message": f"Timeout AJAX après Search (tentative {attempt}/{max_attempts}). URL={driver.current_url}"
                        }) + "\n"
                        if attempt < max_attempts:
                            # petit refresh soft et on réessaie
                            try:
                                driver.refresh()
                                time.sleep(2)
                                wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "a[href*='displayInvoiceSearch.do']"))).click()
                                time.sleep(1)
                            except Exception:
                                pass
                            continue
                        else:
                            break

                    rows_check, used_sel = _find_result_rows(driver)

                    if not rows_check:
                        # essayer de détecter "Aucune facture" n'importe où
                        body_text = ""
                        try:
                            body_text = driver.find_element(By.TAG_NAME, "body").text or ""
                        except Exception:
                            pass
                        
                        if "Aucune facture" in body_text:
                            yield json.dumps({"status": "error", "releve": releve, "message": "Aucune facture."}) + "\n"
                            break
                        
                        yield json.dumps({
                            "status": "error", 
                            "releve": releve, 
                            "message": f"Aucun tableau détecté. sel={used_sel} URL={driver.current_url}"
                        }) + "\n"
                        break

                    tbody = driver.find_element(By.CSS_SELECTOR, "tbody.pure-datatable-data")
                    rows = rows_check
                    base_handle = driver.current_window_handle

                    count = 0
                    for row in rows:
                        try:
                            tds = row.find_elements(By.TAG_NAME, "td")
                            if not tds:
                                continue

                            # headers best-effort (si dispo)
                            headers = []
                            try:
                                table = driver.execute_script("return arguments[0].closest('table')", tbody)
                                ths = table.find_elements(By.CSS_SELECTOR, "thead th") if table else []
                                headers = [(_norm_key(th.text) or f"COL_{idx}") for idx, th in enumerate(ths)]
                            except Exception:
                                headers = []

                            # row map depuis la liste
                            row_map: Dict[str, str] = {"RELEVE_INPUT": releve}
                            for idx, td in enumerate(tds):
                                val = _td_text_smart(td)
                                key = headers[idx] if idx < len(headers) and headers else f"COL_{idx}"
                                if val:
                                    row_map[key] = val

                            # ouvrir détail et extraire CAC/HT/BORDEREAU…
                            opened = _open_row_detail(driver, row)
                            if opened:
                                time.sleep(1.0)
                                _wait_ajax_done(driver, timeout=20)
                                
                                body_text = ""
                                try:
                                    body_text = driver.find_element(By.TAG_NAME, "body").text
                                except Exception:
                                    pass

                                detail = _extract_from_detail_text(body_text)

                                # merge detail
                                for k, v in detail.items():
                                    if v and k not in row_map:
                                        row_map[k] = v

                                # revenir à la vue principale
                                _close_detail_and_back(driver, base_handle)
                                _wait_ajax_done(driver, timeout=20)
                                
                                # rafraîchir la référence au tbody/rows
                                try:
                                    tbody = driver.find_element(By.CSS_SELECTOR, "tbody.pure-datatable-data")
                                    rows = tbody.find_elements(By.CSS_SELECTOR, "tr")
                                except Exception:
                                    pass

                            # log CAC
                            cac = _normalize_cac(_first(row_map, "NUM_CAC", "N_CAC", "CAC", "COMMANDE", "COL_0"))
                            if cac:
                                row_map["NUM_CAC"] = cac

                            yield json.dumps({"status": "result", "releve": releve, "row": row_map}) + "\n"
                            count += 1
                        except StaleElementReferenceException:
                            continue
                        except Exception:
                            continue

                    yield json.dumps({"status": "info", "message": f"Trouvé ({count} lignes)."}) + "\n"
                    break  # Sortir de la boucle des tentatives si succès

                except TimeoutException as e:
                    yield json.dumps({
                        "status": "error",
                        "releve": releve,
                        "message": f"Timeout (tentative {attempt}/{max_attempts}). URL={driver.current_url}"
                    }) + "\n"
                    if attempt < max_attempts:
                        # petit refresh soft et on réessaie
                        try:
                            driver.refresh()
                            time.sleep(2)
                            wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "a[href*='displayInvoiceSearch.do']"))).click()
                            time.sleep(1)
                        except Exception:
                            pass
                        continue
                except Exception as e:
                    yield json.dumps({"status": "error", "releve": releve, "message": str(e)}) + "\n"
                    break

            time.sleep(random.uniform(0.3, 0.8))

    except Exception as e:
        yield json.dumps({"status": "fatal", "message": f"Erreur critique: {str(e)}"}) + "\n"
    finally:
        yield json.dumps({"status": "done", "message": "Scraping terminé ! Navigateur fermé."}) + "\n"
        try:
            if driver:
                driver.quit()
        except Exception:
            pass


@router.post("")
def run_scraper(req: ScrapeRequest, current_user: User = Depends(get_current_user)):
    settings = get_settings()
    user = getattr(settings, "PRAXEDO_USER", None)
    pwd = getattr(settings, "PRAXEDO_PASSWORD", None)
    if not user or not pwd:
        raise HTTPException(status_code=500, detail="Identifiants Praxedo non configurés")
    return StreamingResponse(scrape_generator(req.releves, user, pwd), media_type="application/x-ndjson")


@router.post("/save")
def save_scraped_data(
    items: List[ScrapedItem],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sauvegarde Praxedo CR10 (endpoint existant)."""
    if not items:
        return {"ok": True, "saved": 0}

    now = datetime.utcnow()
    rows_list = []

    for item in items:
        if not item.ot:
            continue

        palier = _extract_palier_from_evenements(item.evenements) if item.evenements else None

        rows_list.append(
            {
                "id_externe": item.ot,
                "nom_site": item.nd,
                "compte_rendu": item.compte_rendu,
                "evenements": item.evenements,
                "palier": palier,
                "imported_at": now,
                "user_id": current_user.id,
            }
        )

    if not rows_list:
        return {"ok": True, "saved": 0}

    try:
        t = RawPraxedoCr10.__table__
        stmt = pg_insert(t).values(rows_list)
        stmt = stmt.on_conflict_do_update(
            index_elements=[t.c.id_externe],
            set_={
                "nom_site": stmt.excluded.nom_site,
                "compte_rendu": stmt.excluded.compte_rendu,
                "evenements": stmt.excluded.evenements,
                "palier": stmt.excluded.palier,
                "imported_at": stmt.excluded.imported_at,
                "user_id": stmt.excluded.user_id,
            },
        )
        db.execute(stmt)
        db.commit()
        return {"ok": True, "saved": len(rows_list)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde : {str(e)}")


@router.post("/save-pidi")
def save_scraped_pidi_rows(
    payload: List[ScrapedPidiRow],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    1) Archive complète : raw.pidi_scrape_full
    2) Matching Orange : raw.pidi (n_cac + comment_acqui_rejet + ht + bordereau)
    """
    if not payload:
        return {"ok": True, "saved_full": 0, "inserted_pidi": 0}

    now = datetime.utcnow()
    full_rows: List[RawPidiScrapeFull] = []
    pidi_rows: List[Dict[str, Any]] = []

    for item in payload:
        raw = item.data or {}
        r: Dict[str, str] = {_norm_key(str(k)): _clean(v) for k, v in raw.items()}

        flux = _first(r, "N_FLUX_PIDI", "FLUX_PIDI", "NUMERO_FLUX_PIDI", "N_DE_FLUX_PIDI")
        if not flux:
            continue

        releve_input = _first(r, "RELEVE_INPUT", "RELEVE")

        # ✅ CAC/Commande : clé critique
        cac = _normalize_cac(_first(r, "NUM_CAC", "N_CAC", "CAC", "COMMANDE", "N_COMMANDE", "NUM_COMMANDE"))
        # fallback si venu via COL_0
        if not cac:
            cac = _normalize_cac(_first(r, "COL_0", "COL_1"))

        contrat = _first(r, "CONTRAT")
        nd = _first(r, "ND")
        secteur = _first(r, "CODE_SECTEUR", "SECTEUR")
        num_ot = _first(r, "N_OT", "NUM_OT", "OT")
        agence = _first(r, "AGENCE")
        type_pidi = _first(r, "TYPE_D_ATTACHEMENT", "TYPE", "TYPE_PIDI")
        statut = _first(r, "STATUT_ATTACHEMENT", "STATUT")
        num_ppd = _first(r, "NUM_PPD", "N_PPD", "PPD")
        num_att = _first(r, "N_ATTACHEMENT", "NUM_ATTACHEMENT", "N_ATT")
        bordereau = _first(r, "BORDEREAU")
        ht = _to_decimal(_first(r, "HT", "MONTANT_BRUT", "MONTANT_HT"))
        prix_majore = _to_decimal(_first(r, "PRIX_MAJORE", "MONTANT_MAJORE", "TTC"))

        # archive (même si partielle)
        full_rows.append(RawPidiScrapeFull(
            flux_pidi=flux,
            releve_input=releve_input,
            contrat=contrat,
            type=type_pidi,
            statut=statut,
            nd=nd,
            secteur=secteur,
            num_ot=num_ot,
            agence=agence,
            num_attachement=num_att,
            num_ppd=num_ppd,
            num_cac=cac,
            bordereau=bordereau,
            ht=ht,
            prix_majore=prix_majore,
            imported_at=now,
            user_id=current_user.id,
        ))

        # raw.pidi (matching Orange)
        pidi_rows.append({
            "numero_flux_pidi": flux,
            "contrat": contrat,
            "type_pidi": type_pidi,
            "statut": statut,
            "nd": nd,
            "code_secteur": secteur,
            "numero_ot": num_ot,
            "numero_att": num_att,
            "agence": agence,
            "numero_ppd": num_ppd,
            "comment_acqui_rejet": releve_input,  # relevé Orange
            "n_cac": cac,                          # commande/CAC Orange
            "ht": ht,
            "bordereau": bordereau,
            "imported_at": now,
            "user_id": current_user.id,
        })

    # archive
    saved_full = 0
    for x in full_rows:
        db.merge(x)
        saved_full += 1

    inserted = 0
    if pidi_rows:
        t = RawPidi.__table__
        stmt = pg_insert(t).values(pidi_rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=[t.c.numero_flux_pidi],
            set_={
                "contrat": stmt.excluded.contrat,
                "type_pidi": stmt.excluded.type_pidi,
                "statut": stmt.excluded.statut,
                "nd": stmt.excluded.nd,
                "code_secteur": stmt.excluded.code_secteur,
                "numero_ot": stmt.excluded.numero_ot,
                "numero_att": stmt.excluded.numero_att,
                "agence": stmt.excluded.agence,
                "numero_ppd": stmt.excluded.numero_ppd,
                "comment_acqui_rejet": stmt.excluded.comment_acqui_rejet,
                "n_cac": stmt.excluded.n_cac,
                "ht": stmt.excluded.ht,
                "bordereau": stmt.excluded.bordereau,
                "imported_at": stmt.excluded.imported_at,
                "user_id": stmt.excluded.user_id,
            }
        )
        db.execute(stmt)
        inserted = len(pidi_rows)

    db.commit()
    return {"ok": True, "saved_full": saved_full, "inserted_pidi": inserted}