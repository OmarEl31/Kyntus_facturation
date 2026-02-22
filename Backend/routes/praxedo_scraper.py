# Backend/routes/praxedo_scraper.py
import time
import json
import platform
import random
from typing import List
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import TimeoutException, StaleElementReferenceException

from core.config import get_settings

router = APIRouter(prefix="/api/scraper", tags=["scraper"])

class ScrapeRequest(BaseModel):
    releves: List[str]

def human_typing(element, text):
    # Ktba zrebna fiha chwiya (bhal copy-paste rapide awla wahed kaykteb bzerba)
    for char in text:
        element.send_keys(char)
        time.sleep(random.uniform(0.01, 0.04))

def scrape_generator(releves: List[str], user: str, password: str):
    LOGIN_URL = "https://auth.praxedo.com/oauth2/default/v1/authorize?response_type=code&client_id=0oa81c5o3hBGZtAPF417&scope=openid%20profile%20etech&state=Y04QT2yAPF9AUn3hmp2a-EioA_Ddw-WYupohnb2vsxQ%3D&redirect_uri=https://eu5.praxedo.com/eTech/login/oauth2/code/okta&nonce=Ae4aI3FPlBAE0MiCYIQKreokC6z01IxrKPvW3istXr4"

    is_mac = platform.system() == 'Darwin'
    cmd_ctrl = Keys.COMMAND if is_mac else Keys.CONTROL

    chrome_options = Options()
    # chrome_options.add_argument("--headless") 
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    # Anti-detection flags
    chrome_options.add_argument("--disable-blink-features=AutomationControlled") 
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"]) 
    chrome_options.add_experimental_option('useAutomationExtension', False)
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
    
    driver = webdriver.Chrome(options=chrome_options)
    
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    })

    driver.maximize_window()
    # Nqesna mn 40s l 15s hit wifi mzyan
    wait = WebDriverWait(driver, 15)
    action = ActionChains(driver)

    try:
        yield json.dumps({"status": "info", "message": "Demarrage du navigateur Chrome (Rapide)..."}) + "\n"
        
        driver.get(LOGIN_URL)
        time.sleep(random.uniform(0.5, 1.0))
        
        user_input = wait.until(EC.visibility_of_element_located((By.NAME, "identifier")))
        human_typing(user_input, user)
        user_input.send_keys(Keys.RETURN)
        
        time.sleep(random.uniform(1.0, 1.5))
        
        pwd_input = wait.until(EC.visibility_of_element_located((By.NAME, "credentials.passcode")))
        human_typing(pwd_input, password)
        pwd_input.send_keys(Keys.RETURN)
        
        yield json.dumps({"status": "info", "message": "Login en cours... attente redirection."}) + "\n"
        
        # HNA ZREBNAH: F blast 8 secondes, kantsennaw l'menu yban (Smart Wait)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='AdvancedSearchWorkOrder.do']")))
        time.sleep(0.5)

        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "a[href*='AdvancedSearchWorkOrder.do']"))).click()
        time.sleep(0.5)
        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "a[href*='displayInvoiceSearch.do']"))).click()

        yield json.dumps({"status": "info", "message": "Debut du traitement..."}) + "\n"

        for i, releve in enumerate(releves):
            if not releve.strip():
                continue
                
            yield json.dumps({"status": "progress", "releve": releve, "message": f"[{i+1}/{len(releves)}] Traitement: {releve} ..."}) + "\n"
            
            try:
                # 1. NAVIGATION RESET (Zerbana)
                try:
                    submenu_btn = WebDriverWait(driver, 2).until(EC.element_to_be_clickable((By.CSS_SELECTOR, "a[href*='displayInvoiceSearch.do']")))
                    submenu_btn.click()
                except:
                    menu_btn = driver.find_element(By.CSS_SELECTOR, "a[href*='AdvancedSearchWorkOrder.do']")
                    menu_btn.click()
                    time.sleep(0.5)
                    submenu_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "a[href*='displayInvoiceSearch.do']")))
                    submenu_btn.click()
                
                time.sleep(0.5) 

                # 2. INPUTS
                date_input = wait.until(EC.visibility_of_element_located((By.NAME, "minCreationDateStr")))
                driver.execute_script("arguments[0].value = '';", date_input)
                date_input.click()
                date_input.send_keys(cmd_ctrl + "a") 
                date_input.send_keys(Keys.BACK_SPACE)
                date_input.send_keys(Keys.TAB)

                textarea = wait.until(EC.visibility_of_element_located((By.NAME, "commentaireNotification")))
                textarea.clear()
                textarea.send_keys(releve) 
                
                # 3. RECHERCHE
                time.sleep(random.uniform(0.2, 0.5))
                driver.find_element(By.ID, "searchBottom").click()
                
                # Attente 1.5s max l'tableau yrepondi
                time.sleep(1.5) 

                # VERIFICATION RAPIDE (Fast-Fail)
                empty_rows = driver.find_elements(By.CSS_SELECTOR, "tbody.pure-datatable-data tr")
                if empty_rows and "Aucune facture" in empty_rows[0].text:
                    yield json.dumps({"status": "error", "releve": releve, "message": "Walou (Aucune facture). Suivant !"}) + "\n"
                    continue 
                elif not empty_rows:
                    yield json.dumps({"status": "error", "releve": releve, "message": "Tableau vide. Suivant !"}) + "\n"
                    continue

                yield json.dumps({"status": "info", "message": "Facture trouvee ! Filtre rapide..."}) + "\n"

                # 4. FILTRER (Zerbana)
                try:
                    filter_btn = WebDriverWait(driver, 2).until(EC.element_to_be_clickable((By.ID, "filterColumns")))
                    filter_btn.click()
                    time.sleep(0.5)
                    
                    select_box = wait.until(EC.visibility_of_element_located((By.NAME, "invoice_list_columns")))
                    action.move_to_element(select_box).click().key_down(cmd_ctrl).send_keys('a').key_up(cmd_ctrl).perform()
                    time.sleep(0.2)
                    
                    move_right_btn = driver.find_element(By.XPATH, "//button[descendant::i[contains(@class,'icon-caret-right')]]")
                    move_right_btn.click()
                    time.sleep(0.2)
                    
                    apply_btn = driver.find_element(By.ID, "applyColumnFilter")
                    apply_btn.click()
                    
                    # 2s kafiin bach y-chargi 46 colonne f la connexion saro5
                    time.sleep(2) 
                except Exception:
                    pass

                # 5. SCRAPING
                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "tbody.pure-datatable-data tr")))
                rows = driver.find_elements(By.CSS_SELECTOR, "tbody.pure-datatable-data tr")
                found = False
                
                if rows:
                    if "Aucune facture" in rows[0].text:
                        yield json.dumps({"status": "error", "releve": releve, "message": "Aucun resultat."}) + "\n"
                    else:
                        count = 0
                        for row in rows:
                            try:
                                cells = row.find_elements(By.TAG_NAME, "td")
                                if len(cells) > 5: 
                                    row_data = [cell.text.strip().replace("\n", " ") for cell in cells[1:]]
                                    yield json.dumps({"status": "result", "releve": releve, "data": row_data}) + "\n"
                                    count += 1
                                    found = True
                            except StaleElementReferenceException:
                                continue
                            except Exception:
                                continue
                        
                        if found:
                            yield json.dumps({"status": "info", "message": f"Trouve ({count} lignes)."}) + "\n"
                        else:
                            yield json.dumps({"status": "error", "releve": releve, "message": "Tableau vide."}) + "\n"
                else:
                    yield json.dumps({"status": "error", "releve": releve, "message": "Aucun resultat."}) + "\n"

            except TimeoutException:
                yield json.dumps({"status": "error", "releve": releve, "message": "Timeout."}) + "\n"
            except Exception as e:
                yield json.dumps({"status": "error", "releve": releve, "message": str(e)}) + "\n"
                
            # Repos sghir bin relevé w relevé (0.3 a 0.8s c'est suffisant pour le stealth f l'action repetée)
            time.sleep(random.uniform(0.3, 0.8))

    except TimeoutException:
        yield json.dumps({"status": "fatal", "message": "La page a pris trop de temps a charger."}) + "\n"
    except Exception as global_e:
        yield json.dumps({"status": "fatal", "message": f"Erreur critique: {str(global_e)}"}) + "\n"
    finally:
        yield json.dumps({"status": "done", "message": "Scraping termine ! Navigateur ferme."}) + "\n"
        driver.quit()

@router.post("")
def run_scraper(req: ScrapeRequest):
    settings = get_settings()
    user = getattr(settings, "PRAXEDO_USER", None)
    pwd = getattr(settings, "PRAXEDO_PASSWORD", None)
    
    if not user or not pwd:
        raise HTTPException(status_code=500, detail="Identifiants Praxedo non configures")
    
    return StreamingResponse(
        scrape_generator(req.releves, user, pwd),
        media_type="application/x-ndjson"
    )