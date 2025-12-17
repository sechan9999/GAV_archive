
export const PYTHON_CODE = `"""
gva_scraper_pro.py - Advanced Gun Violence Archive Data Extractor
Refactored for robustness, validation, and extended field support.
"""

import time
import json
import logging
import re
from typing import List, Dict, Optional, Any
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class GvaScraperError(Exception):
    """Base class for scraper exceptions."""
    pass

class GvaValidationError(GvaScraperError):
    """Raised when scraped data fails validation."""
    pass

class GvaScraper:
    TARGET_URL = "https://www.gunviolencearchive.org/last-72-hours"

    def __init__(self, headless: bool = True):
        self.driver = self._setup_driver(headless)
        self.data: List[Dict[str, Any]] = []

    def _setup_driver(self, headless: bool) -> webdriver.Chrome:
        """Initializes a hardened Chrome driver with anti-detection headers."""
        options = Options()
        if headless:
            options.add_argument("--headless")
        
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")
        # Residential User-Agent spoofing
        options.add_argument(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        service = Service(ChromeDriverManager().install())
        try:
            return webdriver.Chrome(service=service, options=options)
        except WebDriverException as e:
            logger.error(f"Failed to initialize WebDriver: {e}")
            raise GvaScraperError("WebDriver initialization failed.")

    def validate_incident(self, incident: Dict[str, Any]) -> bool:
        """Validates the integrity of a scraped incident record."""
        try:
            # Ensure killed/injured are integers and >= 0
            for field in ["killed", "injured"]:
                val = incident.get(field)
                if not isinstance(val, int) or val < 0:
                    raise GvaValidationError(f"Invalid count for {field}: {val}")
            
            # Check for required strings
            if not incident.get("state") or not incident.get("city_county"):
                raise GvaValidationError("Missing core geographical data.")
                
            return True
        except GvaValidationError as e:
            logger.warning(f"Validation failed for record: {e}")
            return False

    def extract_incident_id(self, url: Optional[str]) -> Optional[str]:
        """Parses the unique Incident ID from the GVA URL."""
        if not url:
            return None
        match = re.search(r'/incident/(\\d+)', url)
        return match.group(1) if match else None

    def run(self, max_pages: int = 5):
        """Executes the scraping pipeline across multiple pages."""
        logger.info(f"Navigating to {self.TARGET_URL}...")
        
        try:
            self.driver.get(self.TARGET_URL)
            
            for page in range(1, max_pages + 1):
                logger.info(f"Processing Page {page}...")
                
                # Wait for table to manifest
                try:
                    WebDriverWait(self.driver, 15).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, "table.sticky-enabled"))
                    )
                except TimeoutException:
                    logger.error("Timed out waiting for data table.")
                    break

                self._parse_current_page()

                # Handle Pagination
                if not self._go_to_next_page():
                    logger.info("No more pages found.")
                    break
                    
        except Exception as e:
            logger.error(f"A critical error occurred during scraping: {e}")
        finally:
            self.driver.quit()
            logger.info(f"Scraper finished. Total records collected: {len(self.data)}")

    def _parse_current_page(self):
        """Parses all rows in the current table view."""
        soup = BeautifulSoup(self.driver.page_source, "html.parser")
        table = soup.select_one("table.sticky-enabled")
        
        if not table:
            return

        rows = table.select("tbody tr")
        for row in rows:
            cols = row.find_all("td")
            if len(cols) >= 7:
                # Basic Extraction
                raw_incident = {
                    "date": cols[0].get_text(strip=True),
                    "state": cols[1].get_text(strip=True),
                    "city_county": cols[2].get_text(strip=True),
                    "address": cols[3].get_text(strip=True),
                    "killed": self._to_int(cols[4].get_text(strip=True)),
                    "injured": self._to_int(cols[5].get_text(strip=True)),
                }

                # Link Extraction & Incident ID
                links = cols[6].find_all("a")
                incident_url = None
                source_url = None
                
                for link in links:
                    href = link.get("href", "")
                    if "incident" in href:
                        incident_url = f"https://www.gunviolencearchive.org{href}"
                    elif "source" in href or "http" in href:
                        source_url = href

                raw_incident["incident_id"] = self.extract_incident_id(incident_url)
                raw_incident["incident_url"] = incident_url
                raw_incident["source_url"] = source_url

                if self.validate_incident(raw_incident):
                    self.data.append(raw_incident)

    def _to_int(self, value: str) -> int:
        """Safe conversion to integer."""
        try:
            return int(value)
        except ValueError:
            return 0

    def _go_to_next_page(self) -> bool:
        """Attempts to click the 'next' button and waits for refresh."""
        try:
            next_link = self.driver.find_element(By.LINK_TEXT, "next ›")
            self.driver.execute_script("arguments[0].click();", next_link)
            time.sleep(2) # Politeness delay
            return True
        except:
            return False

    def export_json(self, filename: str = "gva_data.json"):
        """Exports the collected data to a JSON file."""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=4, ensure_ascii=False)
        logger.info(f"Data exported to {filename}")

if __name__ == "__main__":
    scraper = GvaScraper(headless=True)
    scraper.run(max_pages=3)
    scraper.export_json()
`;

export const MOCK_DATA = [
  { "date": "Jan 8, 2025", "state": "Illinois", "city_county": "Chicago", "address": "1200 Block of S Western Ave", "killed": 1, "injured": 3, "source_link": "/incident/123456" },
  { "date": "Jan 8, 2025", "state": "Texas", "city_county": "Dallas", "address": "Ross Ave", "killed": 0, "injured": 4, "source_link": "/incident/123459" },
  { "date": "Jan 7, 2025", "state": "California", "city_county": "Los Angeles", "address": "Wilshire Blvd", "killed": 0, "injured": 1, "source_link": "/incident/123457" },
  { "date": "Jan 7, 2025", "state": "Texas", "city_county": "Houston", "address": "Main Street", "killed": 2, "injured": 0, "source_link": "/incident/123458" },
  { "date": "Jan 6, 2025", "state": "Florida", "city_county": "Miami", "address": "Brickell Ave", "killed": 1, "injured": 1, "source_link": "/incident/123460" },
  { "date": "Jan 6, 2025", "state": "Illinois", "city_county": "Rockford", "address": "State St", "killed": 0, "injured": 2, "source_link": "/incident/123461" },
  { "date": "Jan 5, 2025", "state": "California", "city_county": "Oakland", "address": "Broadway", "killed": 3, "injured": 0, "source_link": "/incident/123462" },
  { "date": "Jan 5, 2025", "state": "Georgia", "city_county": "Atlanta", "address": "Peachtree St", "killed": 1, "injured": 5, "source_link": "/incident/123463" },
  { "date": "Jan 4, 2025", "state": "Ohio", "city_county": "Cleveland", "address": "Euclid Ave", "killed": 0, "injured": 1, "source_link": "/incident/123464" },
  { "date": "Jan 4, 2025", "state": "Pennsylvania", "city_county": "Philadelphia", "address": "Broad St", "killed": 2, "injured": 2, "source_link": "/incident/123465" }
];

export const GVA_10_YEAR_REVIEW = {
  years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
  categories: {
    "Deaths (Willful/Accidental)": [13777, 15375, 15907, 15071, 15667, 19850, 21383, 20514, 19135, 16725],
    "Injuries (Willful/Accidental)": [26907, 30597, 31353, 28175, 30196, 39526, 40626, 38599, 36562, 31646],
    "Mass Shooting": [332, 383, 347, 335, 414, 611, 689, 644, 659, 503],
    "Mass Murder": [21, 25, 20, 19, 31, 21, 28, 36, 40, 30],
    "Children [0-11] Killed": [202, 231, 234, 198, 211, 303, 313, 314, 301, 250],
    "Children [0-11] Injured": [477, 434, 487, 464, 485, 701, 745, 679, 644, 547],
    "Teens [12-17] Killed": [626, 727, 823, 736, 795, 1105, 1278, 1392, 1407, 1171],
    "Teens [12-17] Injured": [2074, 2429, 2439, 2142, 2340, 3067, 3403, 3821, 3896, 3239],
    "OIS - Officer Killed": [40, 68, 49, 55, 69, 59, 68, 72, 53, 75],
    "OIS - Officer Injured": [275, 297, 286, 270, 295, 346, 370, 341, 369, 322],
    "OIS - Suspect Killed": [1007, 1152, 1232, 1273, 1290, 1299, 1326, 1397, 1444, 1445],
    "Defensive Gun Use": [1400, 1992, 2118, 1881, 1633, 1551, 1367, 1286, 1286, 1220],
    "Unintentional Shooting": [1995, 2236, 2070, 1693, 1906, 2328, 2022, 1648, 1611, 1436],
    "Suicide by Firearm (CDC)": [22018, 22938, 23854, 24432, 23941, 24292, 26328, 27038, 27310, "Pending"]
  }
};
