from __future__ import annotations

import os
import argparse
import psycopg
from dotenv import load_dotenv
from typing import Callable, Dict, Any, List

from src.cleaning.core import (
    UPSERT_CLEAN_PRODUCT_SQL,
    INSERT_PRICE_FACT_SQL,
    build_clean_and_fact_rows,
)

from src.cleaning.adapters.keells import adapt_keells_raw
from src.cleaning.adapters.cargills import adapt_cargills_raw

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL_PG")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL_PG not set in .env")


RAW_SELECT_SQL = """
SELECT
  store,
  outlet_code,
  scraped_at_utc,
  item_code,
  name,
  price,
  final_price,
  is_promo
FROM raw_products
WHERE store = %s AND outlet_code = %s
ORDER BY scraped_at_utc ASC;
"""

OUTLETS_FOR_STORE_SQL = """
SELECT DISTINCT outlet_code
FROM raw_products
WHERE store = %s
ORDER BY outlet_code;
"""


ADAPTERS: Dict[str, Callable[[Dict[str, Any]], Dict[str, Any]]] = {
    "keells": adapt_keells_raw,
    "cargills": adapt_cargills_raw,
}


def run_for_store_outlet(conn: psycopg.Connection, store: str, outlet_code: str) -> Dict[str, int]:
    if store not in ADAPTERS:
        raise RuntimeError(f"No adapter registered for store='{store}'")

    adapt = ADAPTERS[store]
    ensured_products = 0
    inserted_facts = 0

    with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        cur.execute(RAW_SELECT_SQL, (store, outlet_code))
        raw_rows = cur.fetchall()

        for raw in raw_rows:
            if not raw.get("name"):
                continue

            adapter_row = adapt(raw)
            clean_row, fact_row = build_clean_and_fact_rows(adapter_row)

            cur.execute(UPSERT_CLEAN_PRODUCT_SQL, clean_row)
            clean_product_id = cur.fetchone()["clean_product_id"]
            ensured_products += 1

            fact_row["clean_product_id"] = clean_product_id
            cur.execute(INSERT_PRICE_FACT_SQL, fact_row)
            inserted_facts += cur.rowcount

    return {
        "ensured_products": ensured_products,
        "inserted_facts": inserted_facts,
    }


def list_outlets(conn: psycopg.Connection, store: str) -> List[str]:
    with conn.cursor() as cur:
        cur.execute(OUTLETS_FOR_STORE_SQL, (store,))
        return [r[0] for r in cur.fetchall()]


def main():
    parser = argparse.ArgumentParser(description="Build clean_products and product_price_facts from raw_products.")
    parser.add_argument("--store", choices=list(ADAPTERS.keys()), help="Store name (overrides CLEAN_STORE)")
    parser.add_argument("--outlet", help="Outlet code (overrides CLEAN_OUTLET). For cargills this might be 'Colombo' or '1851' depending on how you stored it.")
    parser.add_argument("--all-outlets", action="store_true", help="Process all outlets for the given store.")
    args = parser.parse_args()

    # Defaults remain keells/SCDR unless overridden by env or CLI
    store = args.store or os.getenv("CLEAN_STORE", "keells")
    outlet_code = args.outlet or os.getenv("CLEAN_OUTLET", "SCDR")

    if store not in ADAPTERS:
        raise RuntimeError(f"No adapter registered for store='{store}'")

    with psycopg.connect(DATABASE_URL) as conn:
        total_ensured = 0
        total_inserted = 0

        if args.all_outlets:
            outlets = list_outlets(conn, store)
            if not outlets:
                print(f"No outlets found for store='{store}' in raw_products.")
                return

            for oc in outlets:
                stats = run_for_store_outlet(conn, store, oc)
                conn.commit()

                print(f"\nDone for Store: {store}, Outlet: {oc}")
                print(f"Ensured clean_products (upsert attempts): {stats['ensured_products']}")
                print(f"Inserted product_price_facts (new only): {stats['inserted_facts']}")

                total_ensured += stats["ensured_products"]
                total_inserted += stats["inserted_facts"]

            print("\n=== TOTAL ===")
            print(f"Store: {store}, Outlets processed: {len(outlets)}")
            print(f"Total ensured clean_products: {total_ensured}")
            print(f"Total inserted product_price_facts: {total_inserted}")

        else:
            stats = run_for_store_outlet(conn, store, outlet_code)
            conn.commit()

            print("Done.")
            print(f"Store: {store}, Outlet: {outlet_code}")
            print(f"Ensured clean_products (upsert attempts): {stats['ensured_products']}")
            print(f"Inserted product_price_facts (new only): {stats['inserted_facts']}")


if __name__ == "__main__":
    main()
