# Backend/routes/praxedo_scraper.py
from __future__ import annotations

import os
import re
import time
import json
import random
import platform
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

class MissingPidiItem(BaseModel):
    n_cac: str
    releve: str
    numero_ppd_orange: str | None = None


class ScrapeRequest(BaseModel):
    items: List[MissingPidiItem]


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


def _normalize_releve_key(v: str | None) -> Optional[str]:
    if not v:
        return None
    s = str(v).strip()
    s = s.lstrip("0")
    s = re.sub(r"[^0-9A-Za-z]", "", s)
    s = s.upper()
    return s or None


def _choose_best_candidate(
    candidates: List[Dict[str, str]],
    expected_cac: str | None,
    expected_releve: str | None,
) -> Optional[Dict[str, str]]:
    expected_cac = _normalize_cac(expected_cac)
    expected_releve_key = _normalize_releve_key(expected_releve)

    # 1) priorité absolue : CAC exact
    if expected_cac:
        exact_cac = [
            c for c in candidates
            if _normalize_cac(c.get("NUM_CAC")) == expected_cac
        ]
        if exact_cac:
            return exact_cac[0]

    # 2) sinon match sur relevé normalisé
    if expected_releve_key:
        exact_releve = [
            c for c in candidates
            if _normalize_releve_key(
                c.get("COMMENT_ACQUI_REJET") or c.get("RELEVE_INPUT")
            ) == expected_releve_key
        ]
        if exact_releve:
            return exact_releve[0]

    # 3) fallback : ligne la plus riche
    scored = sorted(
        candidates,
        key=lambda c: (
            1 if c.get("N_FLUX_PIDI") else 0,
            1 if c.get("NUM_CAC") else 0,
            1 if c.get("HT") else 0,
            1 if c.get("BORDEREAU") else 0,
        ),
        reverse=True,
    )
    return scored[0] if scored else None


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
    Extraction robuste depuis le texte brut de la page détail Praxedo.
    Basée sur les libellés exacts visibles dans le détail.
    """
    out: Dict[str, str] = {}
    txt = (detail_text or "").replace("\u00a0", " ")

    def pick(pattern: str) -> Optional[str]:
        m = re.search(pattern, txt, flags=re.IGNORECASE | re.MULTILINE)
        if not m:
            return None
        v = (m.group(1) or "").strip()
        return v or None

    # Champs principaux détail
    contrat = pick(r"Contrat\s+(.+)")
    statut = pick(r"Statut attachement\s+(.+)")
    type_att = pick(r"Type attachement\s+(.+)")
    nd = pick(r"\bND\s+([0-9A-Za-z]+)")
    secteur = pick(r"Code secteur\s+([0-9A-Za-z]+)")
    code_chantier = pick(r"Code chantier de gestion\s+(.+)")
    agence = pick(r"Agence\s+(.+)")
    num_ppd = pick(r"N[°º]\s*PPD\s+(.+)")
    flux_pidi = pick(r"N[°º]\s*de flux PIDI\s+([0-9A-Za-z]+)")
    num_ot = pick(r"N[°º]\s*OT\s+([0-9A-Za-z]+)")
    num_cac = pick(r"N[°º]\s*CAC\s+([A-Z0-9]+)")
    comment_rejet = pick(r"Comment\.\s*acq\./rejet\s+([0-9A-Za-z]+)")
    cause_rejet = pick(r"Cause acq\./rejet\s+(.+)")
    num_as = pick(r"N[°º]\s*AS\s+(.+)")
    code_oeie = pick(r"Code OEIE\s+(.+)")
    code_insee = pick(r"Code INSEE\s+([0-9A-Za-z]+)")
    code_postal = pick(r"Code Postal\s+([0-9A-Za-z]+)")

    # Totaux de fin de page
    total_ht = pick(r"Total HT\s+([0-9][0-9\s,\.€]+)")
    total_ttc = pick(r"Total TTC\s+([0-9][0-9\s,\.€]+)")

    if contrat:
        out["CONTRAT"] = contrat
    if statut:
        out["STATUT_ATTACHEMENT"] = statut
    if type_att:
        out["TYPE_D_ATTACHEMENT"] = type_att
    if nd:
        out["ND"] = nd
    if secteur:
        out["CODE_SECTEUR"] = secteur
    if code_chantier:
        out["CODES_CHANTIER_DE_GESTION"] = code_chantier
    if agence:
        out["AGENCE"] = agence
    if num_ppd:
        out["NUM_PPD"] = num_ppd
    if flux_pidi:
        out["N_FLUX_PIDI"] = flux_pidi
    if num_ot:
        out["N_OT"] = num_ot
    if num_cac:
        out["NUM_CAC"] = re.sub(r"[^A-Z0-9]", "", num_cac.upper())
    if comment_rejet:
        out["COMMENT_ACQUI_REJET"] = comment_rejet
    if cause_rejet:
        out["CAUSE_REJET"] = cause_rejet
    if num_as and num_as != "":
        out["NUM_AS"] = num_as
    if code_oeie and code_oeie != "":
        out["CODE_OEIE"] = code_oeie
    if code_insee:
        out["CODE_INSEE"] = code_insee
    if code_postal:
        out["CODE_POSTAL"] = code_postal
    if total_ht:
        out["HT"] = total_ht
    if total_ttc:
        out["BORDEREAU"] = total_ttc
        out["PRIX_MAJORE"] = total_ttc

    return out


def _open_row_detail(driver, row) -> bool:
    """
    Ouvre strictement le détail de la première vraie ligne résultat.
    """
    before_url = driver.current_url
    before_handles = set(driver.window_handles)

    clickable = None

    try:
        links = row.find_elements(By.CSS_SELECTOR, "a")
        for a in links:
            href = (a.get_attribute("href") or "").lower()
            txt = (a.text or "").strip()
            if href or txt:
                clickable = a
                break
    except Exception:
        pass

    try:
        if clickable is not None:
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", clickable)
            time.sleep(0.2)
            driver.execute_script("arguments[0].click();", clickable)
        else:
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", row)
            time.sleep(0.2)
            driver.execute_script("arguments[0].click();", row)
    except Exception:
        return False

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

            body = (driver.find_element(By.TAG_NAME, "body").text or "").strip()
            if "Détail de l'attachement" in body or "N° de flux PIDI" in body or "N° CAC" in body:
                return True
        except Exception:
            pass
        time.sleep(0.3)

    return False


def _close_detail_and_back(driver, base_handle):
    """
    Ferme la fenêtre de détail et revient à la vue principale.
    """
    if driver.current_window_handle != base_handle:
        driver.close()
        driver.switch_to.window(base_handle)
        return
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
            loaders = driver.find_elements(By.CSS_SELECTOR, ".loading, .spinner, .ui-loader, .blockUI, .datatable-loading")
            visible = any(l.is_displayed() for l in loaders)
            if visible:
                time.sleep(0.4)
                continue

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
    Retourne les vraies lignes de résultats visibles.
    """
    selectors = [
        "tbody.pure-datatable-data tr",
        "table tbody tr",
        "div.pure-datatable table tbody tr",
        "table tr",
    ]

    for sel in selectors:
        try:
            rows = driver.find_elements(By.CSS_SELECTOR, sel)
        except Exception:
            rows = []

        clean_rows = []
        for r in rows:
            try:
                txt = (r.text or "").strip()
                tds = r.find_elements(By.TAG_NAME, "td")
                if not txt:
                    continue
                if len(tds) < 4:
                    continue
                clean_rows.append(r)
            except Exception:
                continue

        if clean_rows:
            return clean_rows, sel

    return [], ""


def _wait_results_or_empty(driver, releve: str, timeout: int = 30) -> tuple[list, str | None]:
    """
    Attend soit :
    - une ligne de résultat contenant le relevé
    - une table de résultats
    - ou le message 'Aucune facture'
    Retourne (rows, error_message_or_none)
    """
    end = time.time() + timeout
    releve = (releve or "").strip()

    while time.time() < end:
        try:
            _wait_ajax_done(driver, timeout=3)

            body_text = ""
            try:
                body_text = driver.find_element(By.TAG_NAME, "body").text or ""
            except Exception:
                pass

            if "Aucune facture" in body_text:
                return [], "Aucune facture."

            # 1) priorité: ligne contenant explicitement le relevé
            if releve:
                xpath_rows = driver.find_elements(
                    By.XPATH,
                    f"//tr[td[contains(normalize-space(.), '{releve}')]]"
                )
                xpath_rows = [r for r in xpath_rows if (r.text or "").strip()]
                if xpath_rows:
                    return xpath_rows, None

            # 2) fallback: toute vraie ligne de tableau
            rows, _ = _find_result_rows(driver)
            if rows:
                return rows, None

        except Exception:
            pass

        time.sleep(0.5)

    return [], "Aucun tableau détecté."


# ───────────────────────────────────────────────────────────────────────────────
# Selenium Helpers
# ───────────────────────────────────────────────────────────────────────────────

def _open_invoice_search_page(driver, wait):
    """
    Ouvre/revient sur l'écran de recherche facture et attend que le formulaire soit prêt.
    """
    try:
        link = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "a[href*='displayInvoiceSearch.do']"))
        )
        driver.execute_script("arguments[0].click();", link)
    except Exception:
        driver.get("https://eu5.praxedo.com/eTech/displayInvoiceSearch.do")

    _wait_ajax_done(driver, timeout=30)

    # attendre les champs clés
    wait.until(EC.presence_of_element_located((By.NAME, "commentaireNotification")))
    wait.until(EC.presence_of_element_located((By.NAME, "minCreationDateStr")))


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

def scrape_generator(items: List[Dict[str, str]], user: str, password: str):
    LOGIN_URL = (
        "https://auth.praxedo.com/oauth2/default/v1/authorize?"
        "response_type=code&client_id=0oa81c5o3hBGZtAPF417"
        "&scope=openid%20profile%20etech&state=Y04QT2yAPF9AUn3hmp2a-EioA_Ddw-WYupohnb2vsxQ%3D"
        "&redirect_uri=https://eu5.praxedo.com/eTech/login/oauth2/code/okta"
        "&nonce=Ae4aI3FPlBAE0MiCYIQKreokC6z01IxrKPvW3istXr4"
    )

    driver = None
    try:
        yield json.dumps({"status": "info", "message": "Connexion à Selenium (Remote Chrome)..."}) + "\n"
        driver = _build_driver()
        yield json.dumps({"status": "info", "message": "Session Selenium créée."}) + "\n"
        
        wait = WebDriverWait(driver, 25)
        yield json.dumps({"status": "info", "message": "Avant ouverture URL login..."}) + "\n"
        
        driver.get(LOGIN_URL)
        yield json.dumps({"status": "info", "message": f"URL login ouverte: {driver.current_url}"}) + "\n"

        yield json.dumps({"status": "info", "message": "Recherche champ identifiant..."}) + "\n"
        user_input = wait.until(EC.visibility_of_element_located((By.NAME, "identifier")))
        yield json.dumps({"status": "info", "message": "Champ identifiant trouvé."}) + "\n"
        
        human_typing(user_input, user)
        user_input.send_keys(Keys.RETURN)

        yield json.dumps({"status": "info", "message": "Recherche champ mot de passe..."}) + "\n"
        pwd_input = wait.until(EC.visibility_of_element_located((By.NAME, "credentials.passcode")))
        yield json.dumps({"status": "info", "message": "Champ mot de passe trouvé."}) + "\n"
        
        human_typing(pwd_input, password)
        pwd_input.send_keys(Keys.RETURN)

        yield json.dumps({"status": "info", "message": "Login en cours... attente redirection."}) + "\n"
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='AdvancedSearchWorkOrder.do']")))
        yield json.dumps({"status": "info", "message": "Redirection effectuée, lien AdvancedSearchWorkOrder trouvé."}) + "\n"

        yield json.dumps({"status": "info", "message": "Clic sur AdvancedSearchWorkOrder..."}) + "\n"
        wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "a[href*='AdvancedSearchWorkOrder.do']"))
        ).click()
        yield json.dumps({"status": "info", "message": "Clic effectué sur AdvancedSearchWorkOrder."}) + "\n"

        yield json.dumps({"status": "info", "message": "Ouverture page recherche facture..."}) + "\n"
        _open_invoice_search_page(driver, wait)
        yield json.dumps({"status": "info", "message": "Page recherche facture ouverte."}) + "\n"

        yield json.dumps({"status": "info", "message": "Début du traitement..."}) + "\n"

        for i, item in enumerate(items):
            releve = (item.get("releve") or "").strip()
            expected_cac = _normalize_cac(item.get("n_cac"))
            expected_ppd = (item.get("numero_ppd_orange") or "").strip() or None

            if not releve:
                continue

            yield json.dumps({
                "status": "progress",
                "releve": releve,
                "message": f"[{i+1}/{len(items)}] Traitement: relevé={releve} / CAC attendu={expected_cac or '—'} ..."
            }) + "\n"

            try:
                yield json.dumps({"status": "info", "message": f"Ouverture formulaire recherche pour {releve}..."}) + "\n"
                _open_invoice_search_page(driver, wait)

                # reset rapide des champs
                yield json.dumps({"status": "info", "message": "Reset champ date..."}) + "\n"
                date_input = wait.until(EC.presence_of_element_located((By.NAME, "minCreationDateStr")))
                driver.execute_script("arguments[0].value = '';", date_input)
                driver.execute_script("arguments[0].dispatchEvent(new Event('input', { bubbles: true }));", date_input)
                driver.execute_script("arguments[0].dispatchEvent(new Event('change', { bubbles: true }));", date_input)

                yield json.dumps({"status": "info", "message": "Reset champ commentaire..."}) + "\n"
                textarea = wait.until(EC.presence_of_element_located((By.NAME, "commentaireNotification")))
                driver.execute_script("arguments[0].value = '';", textarea)
                driver.execute_script("arguments[0].dispatchEvent(new Event('input', { bubbles: true }));", textarea)
                driver.execute_script("arguments[0].dispatchEvent(new Event('change', { bubbles: true }));", textarea)

                yield json.dumps({"status": "info", "message": f"Saisie relevé {releve}..."}) + "\n"
                driver.execute_script("arguments[0].value = arguments[1];", textarea, releve)
                driver.execute_script("arguments[0].dispatchEvent(new Event('input', { bubbles: true }));", textarea)
                driver.execute_script("arguments[0].dispatchEvent(new Event('change', { bubbles: true }));", textarea)

                # Vérification de la saisie
                saisie = driver.execute_script("return arguments[0].value;", textarea)
                if saisie != releve:
                    yield json.dumps({
                        "status": "warning", 
                        "releve": releve, 
                        "message": f"La saisie du relevé a échoué (attendu='{releve}', obtenu='{saisie}')"
                    }) + "\n"

                yield json.dumps({"status": "info", "message": f"Lancement recherche pour {releve}..."}) + "\n"
                yield json.dumps({"status": "info", "message": "Recherche bouton searchBottom..."}) + "\n"
                search_btn = wait.until(EC.element_to_be_clickable((By.ID, "searchBottom")))
                yield json.dumps({"status": "info", "message": "Bouton searchBottom trouvé, clic..."}) + "\n"
                driver.execute_script("arguments[0].click();", search_btn)

                yield json.dumps({"status": "info", "message": "Attente des résultats..."}) + "\n"
                rows_check, wait_error = _wait_results_or_empty(driver, releve=releve, timeout=20)

                if wait_error and not rows_check:
                    yield json.dumps({
                        "status": "error",
                        "releve": releve,
                        "message": f"{wait_error} URL={driver.current_url}"
                    }) + "\n"
                    continue

                yield json.dumps({"status": "info", "message": f"{len(rows_check)} ligne(s) trouvée(s)"}) + "\n"

                tbody = None
                try:
                    tbody = driver.find_element(By.CSS_SELECTOR, "tbody.pure-datatable-data")
                except Exception:
                    try:
                        tbody = driver.find_element(By.CSS_SELECTOR, "table tbody")
                    except Exception:
                        tbody = None

                rows = rows_check
                base_handle = driver.current_window_handle

                # Cas simple : une seule ligne -> comportement quasi inchangé
                if len(rows) == 1:
                    candidate_rows = [rows[0]]
                else:
                    # Cas multi-lignes : on analysera chaque détail pour choisir la bonne
                    candidate_rows = rows

                candidates: List[Dict[str, str]] = []

                for row_idx, candidate_row in enumerate(candidate_rows, start=1):
                    row_map: Dict[str, str] = {
                        "RELEVE_INPUT": releve,
                        "EXPECTED_RELEVE": releve,
                        "EXPECTED_CAC": expected_cac or "",
                    }
                    if expected_ppd:
                        row_map["EXPECTED_PPD"] = expected_ppd

                    # lecture rapide des cellules visibles de la ligne
                    try:
                        tds = candidate_row.find_elements(By.TAG_NAME, "td")
                        headers = []
                        try:
                            table = driver.execute_script(
                                "return arguments[0].closest('table')",
                                candidate_row
                            )
                            ths = table.find_elements(By.CSS_SELECTOR, "thead th") if table else []
                            headers = [(_norm_key(th.text) or f"COL_{idx}") for idx, th in enumerate(ths)]
                        except Exception:
                            headers = []

                        for idx, td in enumerate(tds):
                            val = _td_text_smart(td)
                            key = headers[idx] if idx < len(headers) and headers else f"COL_{idx}"
                            if val:
                                row_map[key] = val
                    except Exception:
                        pass

                    opened = _open_row_detail(driver, candidate_row)
                    if not opened:
                        continue

                    _wait_ajax_done(driver, timeout=10)

                    body_text = ""
                    try:
                        body_text = driver.find_element(By.TAG_NAME, "body").text or ""
                    except Exception:
                        pass

                    detail = _extract_from_detail_text(body_text)
                    for k, v in detail.items():
                        if v:
                            row_map[k] = v

                    _close_detail_and_back(driver, base_handle)
                    _wait_ajax_done(driver, timeout=8)

                    cac = _normalize_cac(_first(row_map, "NUM_CAC", "N_CAC", "CAC", "COMMANDE", "COL_0"))
                    if cac:
                        row_map["NUM_CAC"] = cac

                    candidates.append(row_map)

                    # si cas simple -> inutile d'aller plus loin
                    if len(rows) == 1:
                        break

                best = _choose_best_candidate(candidates, expected_cac, releve)

                if not best:
                    yield json.dumps({
                        "status": "error",
                        "releve": releve,
                        "message": "Aucune ligne exploitable après analyse des résultats."
                    }) + "\n"
                    continue

                yield json.dumps({
                    "status": "result",
                    "releve": releve,
                    "expected_cac": expected_cac,
                    "row": best
                }) + "\n"

                yield json.dumps({
                    "status": "info",
                    "message": f"Trouvé ({len(candidates)} ligne(s) analysée(s), 1 retenue)."
                }) + "\n"

            except TimeoutException:
                yield json.dumps({
                    "status": "error",
                    "releve": releve,
                    "message": f"Timeout. URL={driver.current_url}"
                }) + "\n"
                continue
            except Exception as e:
                import traceback
                yield json.dumps({
                    "status": "error",
                    "releve": releve,
                    "message": f"Erreur: {str(e)} | TRACE: {traceback.format_exc()}"
                }) + "\n"
                continue

    except Exception as e:
        import traceback
        yield json.dumps({
            "status": "fatal", 
            "message": f"Erreur critique: {str(e)} | TRACE: {traceback.format_exc()}"
        }) + "\n"
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

    items = [
        {
            "n_cac": (x.n_cac or "").strip(),
            "releve": (x.releve or "").strip(),
            "numero_ppd_orange": (x.numero_ppd_orange or "").strip() if x.numero_ppd_orange else None,
        }
        for x in req.items
        if (x.releve or "").strip()
    ]

    return StreamingResponse(
        scrape_generator(items, user, pwd),
        media_type="application/x-ndjson",
    )


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

        # Garde-fou : ne garder que les lignes vraiment exploitables
        cac = _normalize_cac(_first(r, "NUM_CAC", "N_CAC", "CAC", "COMMANDE", "N_COMMANDE", "NUM_COMMANDE"))
        if not cac:
            cac = _normalize_cac(_first(r, "COL_0", "COL_1"))
            if not cac:
                continue

        ht_str = _first(r, "HT", "MONTANT_BRUT", "MONTANT_HT")
        ht = _to_decimal(ht_str) if ht_str else None
        bordereau = _first(r, "BORDEREAU")

        if ht is None and not bordereau:
            continue

        releve_input = _first(r, "RELEVE_INPUT", "RELEVE")
        expected_releve = _first(r, "EXPECTED_RELEVE", "RELEVE_INPUT", "RELEVE")
        expected_cac = _normalize_cac(_first(r, "EXPECTED_CAC"))

        # Filtre strict : ne garder que les lignes du CAC attendu
        if expected_cac and cac and cac != expected_cac:
            continue

        if expected_cac and not cac:
            continue

        contrat = _first(r, "CONTRAT")
        nd = _first(r, "ND")
        secteur = _first(r, "CODE_SECTEUR", "SECTEUR")
        num_ot = _first(r, "N_OT", "NUM_OT", "OT")
        agence = _first(r, "AGENCE")
        type_pidi = _first(r, "TYPE_D_ATTACHEMENT", "TYPE", "TYPE_PIDI")
        statut = _first(r, "STATUT_ATTACHEMENT", "STATUT")
        num_ppd = _first(r, "NUM_PPD", "N_PPD", "PPD")
        num_att = _first(r, "N_ATTACHEMENT", "NUM_ATTACHEMENT", "N_ATT")
        prix_majore = _to_decimal(_first(r, "PRIX_MAJORE", "MONTANT_MAJORE", "TTC"))

        comment_scraped = _first(
            r,
            "COMMENT_ACQUI_REJET",
            "COMMENTAIRE_ACQUI_REJET",
            "COM_ACQUITTEMENT",
            "COM_ACQUI_REJET",
        )
        comment_for_match = comment_scraped or expected_releve or releve_input

        full_rows.append(
            RawPidiScrapeFull(
                flux_pidi=flux,
                releve_input=expected_releve or releve_input,
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
                raw_payload=json.dumps(raw, ensure_ascii=False),
                imported_at=now,
                user_id=current_user.id,
            )
        )

        pidi_rows.append(
            {
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
                "comment_acqui_rejet": comment_for_match,
                "n_cac": cac,
                "ht": ht,
                "bordereau": bordereau,
                "imported_at": now,
                "user_id": current_user.id,
            }
        )

    saved_full = 0
    for x in full_rows:
        db.merge(x)
        saved_full += 1

    # Traitement manuel de pidi_rows (remplace le on_conflict_do_update)
    inserted = 0
    updated = 0

    for row in pidi_rows:
        flux = (row.get("numero_flux_pidi") or "").strip()

        existing = None
        if flux and flux != "-1":
            existing = (
                db.query(RawPidi)
                .filter(RawPidi.numero_flux_pidi == flux)
                .first()
            )

        if existing:
            # Mise à jour de l'enregistrement existant
            existing.contrat = row.get("contrat")
            existing.type_pidi = row.get("type_pidi")
            existing.statut = row.get("statut")
            existing.nd = row.get("nd")
            existing.code_secteur = row.get("code_secteur")
            existing.numero_ot = row.get("numero_ot")
            existing.numero_att = row.get("numero_att")
            existing.agence = row.get("agence")
            existing.numero_ppd = row.get("numero_ppd")
            existing.comment_acqui_rejet = row.get("comment_acqui_rejet")
            existing.n_cac = row.get("n_cac")
            existing.ht = row.get("ht")
            existing.bordereau = row.get("bordereau")
            existing.imported_at = row.get("imported_at")
            existing.user_id = row.get("user_id")
            updated += 1
        else:
            # Nouvel enregistrement
            db.add(RawPidi(**row))
            inserted += 1

    db.commit()
    return {
        "ok": True,
        "saved_full": saved_full,
        "inserted_pidi": inserted,
        "updated_pidi": updated,
    }