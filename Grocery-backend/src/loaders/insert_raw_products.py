import os
import json
import argparse
from pathlib import Path
from typing import Dict, Any, Iterable, Optional

from dotenv import load_dotenv
import psycopg

from src.common.paths import RAW_DIR

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL_PG")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG not set in .env")

INSERT_SQL = """
INSERT INTO raw_products (
  store, outlet_code, scraped_at_utc,
  item_id, item_code, name, long_description, uom,
  price, is_promo, promo_percent, promo_type_id, promo_header_id, final_price,
  stock_in_hand, is_available, is_selling_today, min_qty, max_qty,
  department_code, sub_department_code, category_code, image_url
)
VALUES (
  %(store)s, %(outlet_code)s, %(scraped_at_utc)s,
  %(item_id)s, %(item_code)s, %(name)s, %(long_description)s, %(uom)s,
  %(price)s, %(is_promo)s, %(promo_percent)s, %(promo_type_id)s, %(promo_header_id)s, %(final_price)s,
  %(stock_in_hand)s, %(is_available)s, %(is_selling_today)s, %(min_qty)s, %(max_qty)s,
  %(department_code)s, %(sub_department_code)s, %(category_code)s, %(image_url)s
)
ON CONFLICT (store, outlet_code, item_code, scraped_at_utc) DO NOTHING;
"""


def read_jsonl(path: Path) -> Iterable[Dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)


def find_latest_jsonl(store: str) -> Path:
    base = RAW_DIR / store
    candidates = sorted(base.rglob("*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not candidates:
        raise FileNotFoundError(f"No .jsonl files found under {base}")
    return candidates[0]


def _to_float(x) -> Optional[float]:
    if x is None or x == "":
        return None
    try:
        return float(x)
    except Exception:
        return None


def _to_int(x) -> Optional[int]:
    if x is None or x == "":
        return None
    try:
        return int(x)
    except Exception:
        return None


def normalize_row(row: Dict[str, Any], store: str) -> Dict[str, Any]:
    """
    Convert a source row (keells/cargills) into the raw_products insert shape.
    Keells rows are already in the correct shape.
    Cargills rows need mapping.
    """
    if store == "keells":
        # Already matches INSERT_SQL keys
        return row

    if store == "cargills":
        # Your scraper added these context fields
        scraped_at = row.get("scraped_at_utc") or row.get("scraped_at")  # fallback
        outlet_code = row.get("pincode") or str(row.get("webstore_id") or "")

        item_id = _to_int(row.get("Id") or row.get("ItemId") or row.get("ProductId"))
        item_code = (
            row.get("SKUCODE")
            or row.get("MasterSKUCODE")
            or (str(item_id) if item_id is not None else None)
        )

        # pricing
        price = _to_float(row.get("Price"))
        mrp = _to_float(row.get("Mrp"))
        final_price = price if price is not None else mrp

        # uom
        uom = row.get("UOM") or row.get("UnitSize")

        image_url = row.get("WebImage") or row.get("ItemImage")

        return {
            "store": "cargills",
            "outlet_code": outlet_code or "unknown",
            "scraped_at_utc": scraped_at,

            "item_id": item_id,
            "item_code": item_code,
            "name": row.get("ItemName"),
            "long_description": row.get("Description") or row.get("ShortDescription"),
            "uom": uom,

            "price": price,
            "is_promo": None,
            "promo_percent": None,
            "promo_type_id": None,
            "promo_header_id": None,
            "final_price": final_price,

            "stock_in_hand": _to_float(row.get("Inventory")),
            "is_available": None,
            "is_selling_today": None,
            "min_qty": None,
            "max_qty": _to_float(row.get("MaxOrderQuantity")),

            "department_code": None,
            "sub_department_code": None,
            "category_code": row.get("CategoryCode"),
            "image_url": image_url,
        }

    raise ValueError(f"Unsupported store: {store}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--store",
        choices=["keells", "cargills"],
        default="keells",
        help="Which store's raw JSONL to load (default: keells)",
    )
    parser.add_argument(
        "--file",
        default=None,
        help="Path to a JSONL file to insert. If omitted, inserts the latest file under data/raw/<store>/.",
    )
    args = parser.parse_args()

    store = args.store
    jsonl_path = Path(args.file) if args.file else find_latest_jsonl(store)

    if not jsonl_path.exists():
        raise FileNotFoundError(jsonl_path)

    batch_size = 1000
    batch = []
    attempted = 0

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            for raw_row in read_jsonl(jsonl_path):
                row = normalize_row(raw_row, store=store)

                # Basic validation to avoid inserting junk rows
                if not row.get("item_code") or not row.get("scraped_at_utc"):
                    continue

                batch.append(row)
                if len(batch) >= batch_size:
                    cur.executemany(INSERT_SQL, batch)
                    conn.commit()
                    attempted += len(batch)
                    batch.clear()

            if batch:
                cur.executemany(INSERT_SQL, batch)
                conn.commit()
                attempted += len(batch)

    print(f"Inserted from: {jsonl_path}")
    print(f"Store: {store}")
    print(f"Done. Attempted insert rows: {attempted}")
    print("Duplicates are skipped by ON CONFLICT DO NOTHING.")


if __name__ == "__main__":
    main()
