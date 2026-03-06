from flask import Blueprint, request, jsonify
import os
from dotenv import load_dotenv
import psycopg
from psycopg.rows import dict_row

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL_PG")

bp = Blueprint("prices", __name__)

SQL_BY_IDS = """
WITH latest_prices AS (
  SELECT DISTINCT ON (ppf.clean_product_id, ppf.outlet_code)
    ppf.clean_product_id,
    ppf.outlet_code,
    ppf.price,
    ppf.final_price,
    ppf.price_per_unit,
    ppf.is_promo,
    ppf.scraped_at_utc,
    cp.store,
    cp.canonical_name
  FROM public.product_price_facts ppf
  JOIN public.clean_products cp
    ON cp.clean_product_id = ppf.clean_product_id
  ORDER BY ppf.clean_product_id, ppf.outlet_code, ppf.scraped_at_utc DESC
)
SELECT *
FROM latest_prices
WHERE clean_product_id = ANY(%(ids)s);
"""

SQL_BY_NAMES = """
WITH latest_prices AS (
  SELECT DISTINCT ON (ppf.clean_product_id, ppf.outlet_code)
    ppf.clean_product_id,
    ppf.outlet_code,
    ppf.price,
    ppf.final_price,
    ppf.price_per_unit,
    ppf.is_promo,
    ppf.scraped_at_utc,
    cp.store,
    cp.canonical_name,
    cp.normalized_name
  FROM public.product_price_facts ppf
  JOIN public.clean_products cp
    ON cp.clean_product_id = ppf.clean_product_id
  ORDER BY ppf.clean_product_id, ppf.outlet_code, ppf.scraped_at_utc DESC
)
SELECT *
FROM latest_prices
WHERE canonical_name ILIKE ANY(%(names)s)
   OR normalized_name ILIKE ANY(%(names)s);
"""

def _connect():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL_PG is missing in .env")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

@bp.route("/prices", methods=["POST"])
def get_prices():
    """
    Accepts:
    {
      "items": [
        {"clean_product_id": 162, "qty": 1},
        {"item_name": "Soy Milk Powder", "qty": 1}
      ],
      "outlets": {"keells":"SCDR","cargills":"Colombo","spar":"XYZ"}   // optional
    }
    """
    data = request.get_json(silent=True) or {}
    items = data.get("items", [])
    outlets = data.get("outlets", {}) or {}

    # split ids vs names
    ids = []
    name_patterns = []
    normalized_items = []  # keep original list with qty etc.

    for it in items:
        if isinstance(it, dict):
            cid = it.get("clean_product_id")
            nm = it.get("item_name")
            qty = it.get("qty", 1)
        else:
            # if frontend sends plain string
            cid = None
            nm = str(it)
            qty = 1

        if cid is not None:
            try:
                ids.append(int(cid))
                normalized_items.append({"clean_product_id": int(cid), "item_name": None, "qty": qty})
            except:
                pass
        elif nm:
            name_patterns.append(f"%{nm}%")
            normalized_items.append({"clean_product_id": None, "item_name": nm, "qty": qty})

    rows = []
    with _connect() as conn:
        with conn.cursor() as cur:
            if ids:
                cur.execute(SQL_BY_IDS, {"ids": ids})
                rows.extend(cur.fetchall())

            if name_patterns:
                cur.execute(SQL_BY_NAMES, {"names": name_patterns})
                rows.extend(cur.fetchall())

    # Build response grouped by clean_product_id
    grouped = {}
    for r in rows:
        pid = r["clean_product_id"]
        if pid not in grouped:
            grouped[pid] = {
                "clean_product_id": pid,
                "item_name": r.get("canonical_name"),
                "stores": []
            }

        # optional outlet filter
        store = (r.get("store") or "").lower()
        outlet_code = r.get("outlet_code")
        if store in outlets and outlets[store]:
            if outlet_code != outlets[store]:
                continue

        grouped[pid]["stores"].append({
            "store": store,
            "outlet_code": outlet_code,
            "price": float(r["price"]) if r["price"] is not None else None,
            "final_price": float(r["final_price"]) if r["final_price"] is not None else None,
            "price_per_unit": float(r["price_per_unit"]) if r["price_per_unit"] is not None else None,
            "is_promo": bool(r["is_promo"]) if r["is_promo"] is not None else None,
            "scraped_at_utc": r["scraped_at_utc"].isoformat() if r.get("scraped_at_utc") else None,
        })

    # Make UI-friendly store-price map (keells/cargills/spar)
    def store_price_map(stores):
        m = {}
        for s in stores:
            st = s["store"]
            # prefer final_price, else price
            val = s["final_price"] if s["final_price"] is not None else s["price"]
            if val is None:
                continue
            # if multiple outlets, keep the cheapest
            if st not in m or val < m[st]:
                m[st] = val
        return m

    response_items = []
    for pid, payload in grouped.items():
        payload["store_prices"] = store_price_map(payload["stores"])
        response_items.append(payload)

    return jsonify({"items": response_items})