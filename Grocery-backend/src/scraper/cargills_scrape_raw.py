from __future__ import annotations

import time
import json
import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests
from playwright.sync_api import sync_playwright

from src.common.paths import RAW_DIR


# -----------------------
# Config
# -----------------------
BASE = "https://cargillsonline.com"
API_PATH = "/Web/GetMenuCategoryItemsPagingV3/"
API_URL = f"{BASE}{API_PATH}"

# Your category page
CATEGORY_URL = f"{BASE}/Product/Food-Cupboard?IC=Nw==&NC=Rm9vZCBDdXBib2FyZA=="

# Store context (from your devtools cookies)
PINCODE = "Colombo"
WEBSTORE_TYPE = "1"
WEBSTORE_ID = "1851"

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0"

DEFAULT_DELAY_S = 0.8


# -----------------------
# Helpers (same style as Keells)
# -----------------------
def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def run_id_utc() -> str:
    # e.g. 20251227_134530
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_jsonl(rows: List[Dict[str, Any]], path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def write_csv(rows: List[Dict[str, Any]], path: str) -> None:
    if not rows:
        return
    keys = list(rows[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=keys)
        w.writeheader()
        w.writerows(rows)


# -----------------------
# Playwright: capture exact POST payload + cookies
# -----------------------
def capture_payload_and_cookies(
    category_url: str,
    pincode: str,
    webstore_type: str,
    webstore_id: str,
    headless: bool = True,
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Opens the category page in a real browser and captures:
      - the exact POST payload sent to GetMenuCategoryItemsPagingV3
      - the cookies for that working session
    """
    captured_payload: Optional[Dict[str, Any]] = None

    with sync_playwright() as p:
        browser = p.firefox.launch(headless=headless)
        context = browser.new_context(user_agent=UA)

        # Pre-set store context cookies
        context.add_cookies([
            {"name": "ASP.NET_Pincode", "value": pincode, "domain": "cargillsonline.com", "path": "/"},
            {"name": "ASP.NET_WebStoreType", "value": webstore_type, "domain": "cargillsonline.com", "path": "/"},
            {"name": "Asp.Net_WebStoreId", "value": webstore_id, "domain": "cargillsonline.com", "path": "/"},
        ])

        page = context.new_page()

        def on_request(req):
            nonlocal captured_payload
            if API_PATH in req.url and req.method == "POST":
                post_data = req.post_data or ""
                try:
                    captured_payload = json.loads(post_data)
                except Exception:
                    captured_payload = {"_raw": post_data}

        page.on("request", on_request)

        # Warm up then load category
        page.goto(f"{BASE}/Index", wait_until="networkidle", timeout=60000)
        page.goto(category_url, wait_until="networkidle", timeout=60000)

        # Some pages fire the request after a moment / after initial scripts
        page.wait_for_timeout(2500)

        # If nothing captured, try a small scroll to trigger lazy load
        if not captured_payload:
            page.mouse.wheel(0, 1400)
            page.wait_for_timeout(1500)

        if not captured_payload:
            cookies = context.cookies()
            browser.close()
            raise RuntimeError(
                "Could not capture GetMenuCategoryItemsPagingV3 POST request. "
                "Try headless=False or check if the site shows a modal/pincode prompt."
            )

        cookies = context.cookies()
        browser.close()
        return captured_payload, cookies


def requests_session_from_cookies(cookies: List[Dict[str, Any]]) -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.5",
        # avoid Brotli decode issues
        "Accept-Encoding": "gzip, deflate",
    })

    for c in cookies:
        s.cookies.set(
            c["name"],
            c["value"],
            domain=c.get("domain"),
            path=c.get("path", "/"),
        )
    return s


def fetch_page(session: requests.Session, category_url: str, payload: Dict[str, Any], timeout_s: int = 60) -> Any:
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json;charset=utf-8",
        "Origin": BASE,
        "Referer": category_url,
    }
    r = session.post(API_URL, headers=headers, json=payload, timeout=timeout_s)
    r.raise_for_status()
    return r.json()


# -----------------------
# Main scrape
# -----------------------
def scrape_cargills_raw(
    category_url: str = CATEGORY_URL,
    pincode: str = PINCODE,
    webstore_type: str = WEBSTORE_TYPE,
    webstore_id: str = WEBSTORE_ID,
    page_size: int = 200,
    max_pages: int = 50,
    delay_s: float = DEFAULT_DELAY_S,
    headless: bool = True,
) -> List[Dict[str, Any]]:
    """
    Returns list[dict] (raw items).
    """
    scraped_at = utc_now_iso()
    store = "cargills"

    # 1) capture the working request payload + cookies
    payload, cookies = capture_payload_and_cookies(
        category_url=category_url,
        pincode=pincode,
        webstore_type=webstore_type,
        webstore_id=webstore_id,
        headless=headless,
    )

    # Ensure paging params exist / override
    payload["PageSize"] = page_size

    # 2) requests session with the same cookies
    session = requests_session_from_cookies(cookies)

    all_items: List[Dict[str, Any]] = []

    for page in range(1, max_pages + 1):
        payload["PageIndex"] = page

        resp = fetch_page(session, category_url=category_url, payload=payload)

        # Response is typically a list
        if isinstance(resp, list) and resp and resp[0].get("ItemName") == "No Products Found":
            break

        if not isinstance(resp, list) or not resp:
            break

        # add context fields like Keells does
        for it in resp:
            it["store"] = store
            it["pincode"] = pincode
            it["webstore_id"] = webstore_id
            it["scraped_at_utc"] = scraped_at
            it["source_category_url"] = category_url

        all_items.extend(resp)

        if len(resp) < page_size:
            break

        time.sleep(delay_s)

    return all_items


# -----------------------
# Save like Keells
# -----------------------
def parse_category_bits(url: str) -> Dict[str, str]:
    """
    Extract IC and NC from the URL for filenames.
    """
    ic = ""
    nc = ""
    if "IC=" in url:
        ic = url.split("IC=")[1].split("&")[0]
    if "NC=" in url:
        nc = url.split("NC=")[1].split("&")[0]
    return {"IC": ic or "unknownIC", "NC": nc or "unknownNC"}


if __name__ == "__main__":
    rows = scrape_cargills_raw(
        category_url=CATEGORY_URL,
        pincode=PINCODE,
        webstore_type=WEBSTORE_TYPE,
        webstore_id=WEBSTORE_ID,
        page_size=200,
        max_pages=60,
        delay_s=0.8,
        headless=True,  # set False if you want to watch it
    )

    rid = run_id_utc()
    day = rid.split("_")[0]  # YYYYMMDD

    # data/raw/cargills/YYYYMMDD/
    base_dir = ensure_dir(RAW_DIR / "cargills" / day)

    bits = parse_category_bits(CATEGORY_URL)
    ic = bits["IC"]
    nc = bits["NC"]

    # Similar naming style to Keells: store + context + run id
    jsonl_path = base_dir / f"cargills_{PINCODE}_{WEBSTORE_ID}_{ic}_{nc}_{rid}.jsonl"
    csv_path   = base_dir / f"cargills_{PINCODE}_{WEBSTORE_ID}_{ic}_{nc}_{rid}.csv"

    write_jsonl(rows, str(jsonl_path))
    write_csv(rows, str(csv_path))

    print(f"Saved JSONL: {jsonl_path}")
    print(f"Saved CSV : {csv_path}")
    print(f"Rows: {len(rows)}")
