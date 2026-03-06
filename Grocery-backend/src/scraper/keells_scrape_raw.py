from __future__ import annotations

import time
import json
import csv
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from src.common.paths import RAW_DIR
from pathlib import Path

import requests


API_URL = "https://zebraliveback.keellssuper.com/1.0/Showcase/GetItemDetailsForCampaign"

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
    "Origin": "https://www.keellssuper.com",
    "Referer": "https://www.keellssuper.com/",
}

DEFAULT_PARAMS = {
    "campaignKeyWord": "keells_products",  # your curl uses this
    "locationCode": "SCDR",
    "brandId": "",
    "sortBy": "price_ASC",
    "departmentId": "",
    "subDepartmentId": "",
    "categoryId": "",
    "itemCode": "",
    "campaignGroupID": "",
}


@dataclass
class RawProductRow:
    # --- context / keys ---
    store: str
    outlet_code: str
    scraped_at_utc: str

    # --- product identity ---
    item_id: Optional[int]
    item_code: Optional[str]
    name: Optional[str]
    long_description: Optional[str]
    uom: Optional[str]

    # --- pricing ---
    price: Optional[float]
    is_promo: Optional[bool]
    promo_percent: Optional[float]
    promo_type_id: Optional[int]
    promo_header_id: Optional[int]
    final_price: Optional[float]  # computed best-effort

    # --- availability ---
    stock_in_hand: Optional[float]
    is_available: Optional[bool]
    is_selling_today: Optional[bool]
    min_qty: Optional[float]
    max_qty: Optional[float]

    # --- categorisation signals ---
    department_code: Optional[str]
    sub_department_code: Optional[str]
    category_code: Optional[str]

    # --- media / misc (optional but useful) ---
    image_url: Optional[str]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def safe_float(x) -> Optional[float]:
    if x is None:
        return None
    try:
        return float(x)
    except Exception:
        return None


def build_promo_map(payload: Dict[str, Any]) -> Dict[int, Dict[str, Any]]:
    """
    itemID -> promotion detail object (if exists)
    """
    result = payload.get("result") or {}
    promos = result.get("promotionItemDetailsList") or []
    promo_map: Dict[int, Dict[str, Any]] = {}
    for p in promos:
        item_id = p.get("itemID")
        if item_id is None:
            continue
        try:
            promo_map[int(item_id)] = p
        except Exception:
            continue
    return promo_map


def compute_final_price(amount: Optional[float], promo: Optional[Dict[str, Any]]) -> Optional[float]:
    if amount is None:
        return None
    if not promo:
        return amount

    # % promo (most common in your response)
    pct = promo.get("discountPercentage")
    if pct is not None:
        try:
            pctf = float(pct)
            return round(amount * (1.0 - pctf / 100.0), 2)
        except Exception:
            pass

    # value promo (fallback)
    dv = promo.get("discountValue")
    if dv is not None:
        try:
            dvf = float(dv)
            return round(max(amount - dvf, 0.0), 2)
        except Exception:
            pass

    return amount


def fetch_page(
    session: requests.Session,
    from_count: int,
    to_count: int,
    params_override: Optional[Dict[str, str]] = None,
    timeout_s: int = 30,
) -> Dict[str, Any]:
    params = dict(DEFAULT_PARAMS)
    params["fromCount"] = str(from_count)
    params["toCount"] = str(to_count)
    if params_override:
        params.update({k: str(v) for k, v in params_override.items()})

    r = session.get(API_URL, params=params, headers=DEFAULT_HEADERS, timeout=timeout_s)
    r.raise_for_status()
    return r.json()


def payload_to_rows(payload: Dict[str, Any], store: str, outlet_code: str, scraped_at: str) -> List[RawProductRow]:
    result = payload.get("result") or {}
    items = result.get("itemDetailsList") or []
    promo_map = build_promo_map(payload)

    rows: List[RawProductRow] = []

    for it in items:
        item_id = it.get("itemID")
        item_id_int: Optional[int] = None
        try:
            item_id_int = int(item_id) if item_id is not None else None
        except Exception:
            item_id_int = None

        promo = promo_map.get(item_id_int) if item_id_int is not None else None

        amount = safe_float(it.get("amount"))
        is_promo = it.get("isPromotionApplied")

        promo_percent = safe_float(promo.get("discountPercentage")) if promo else None
        promo_type_id = promo.get("promotionTypeID") if promo else None
        promo_header_id = promo.get("promotionHeaderID") if promo else None

        final_price = compute_final_price(amount, promo) if is_promo else amount

        row = RawProductRow(
            store=store,
            outlet_code=outlet_code,
            scraped_at_utc=scraped_at,
            item_id=item_id_int,
            item_code=it.get("itemCode"),
            name=it.get("name"),
            long_description=it.get("longDescription"),
            uom=it.get("uom"),
            price=amount,
            is_promo=bool(is_promo) if is_promo is not None else None,
            promo_percent=promo_percent,
            promo_type_id=int(promo_type_id) if promo_type_id is not None else None,
            promo_header_id=int(promo_header_id) if promo_header_id is not None else None,
            final_price=final_price,
            stock_in_hand=safe_float(it.get("stockInHand")),
            is_available=bool(it.get("isAvailable")) if it.get("isAvailable") is not None else None,
            is_selling_today=bool(it.get("isSellingToday")) if it.get("isSellingToday") is not None else None,
            min_qty=safe_float(it.get("minQty")),
            max_qty=safe_float(it.get("maxQty")),
            department_code=it.get("departmentCode"),
            sub_department_code=it.get("subDepartmentCode"),
            category_code=it.get("categoryCode"),
            image_url=it.get("imageUrl"),
        )
        rows.append(row)

    return rows


def scrape_campaign_raw(
    outlet_code: str = "SCDR",
    campaign_keyword: str = "keells_products",
    page_size: int = 50,
    max_pages: int = 900,
    delay_s: float = 0.6,
    params_override: Optional[Dict[str, str]] = None,
) -> List[Dict[str, Any]]:
    """
    Returns list of dicts ready to insert into DB.
    """
    scraped_at = utc_now_iso()
    store = "keells"

    override = dict(params_override or {})
    override["locationCode"] = outlet_code
    override["campaignKeyWord"] = campaign_keyword

    all_rows: List[Dict[str, Any]] = []
    start = 0

    with requests.Session() as session:
        for _ in range(max_pages):
            payload = fetch_page(session, start, start + page_size, params_override=override)
            rows = payload_to_rows(payload, store=store, outlet_code=outlet_code, scraped_at=scraped_at)

            if not rows:
                break

            all_rows.extend([asdict(r) for r in rows])

            start += page_size
            time.sleep(delay_s)

    return all_rows


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

def run_id_utc() -> str:
    # e.g. 20251223_104530
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path



if __name__ == "__main__":
    # Example 1: scrape the first campaign (Keells Own Label) for outlet SCDR
    rows = scrape_campaign_raw(
        outlet_code="SCDR",
        campaign_keyword="keells_products",
        page_size=50,
        delay_s=0.7,
        params_override={
            "sortBy": "price_ASC",
            # Optional filters:
            # "categoryId": "1602",
            # "departmentId": "7",
            # "subDepartmentId": "319",
            # "brandId": "123",
        },
    )

    rid = run_id_utc()
    day = rid.split("_")[0]  # YYYYMMDD

    # data/raw/keells/YYYYMMDD/
    base_dir = ensure_dir(RAW_DIR / "keells" / day)

    jsonl_path = base_dir / f"keells_SCDR_keells_products_{rid}.jsonl"
    csv_path   = base_dir / f"keells_SCDR_keells_products_{rid}.csv"

    write_jsonl(rows, str(jsonl_path))
    write_csv(rows, str(csv_path))

    print(f"Saved JSONL: {jsonl_path}")
    print(f"Saved CSV : {csv_path}")
    print(f"Rows: {len(rows)}")