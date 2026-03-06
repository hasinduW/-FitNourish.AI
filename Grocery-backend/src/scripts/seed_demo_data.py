"""Seed realistic Sri Lankan *food* demo data (safe-by-default).

This script is designed for your research demo so you can generate richer
scenarios for:
  - /recommend/store
  - /recommend/multistore

Key design choice (matches current backend logic):
  - SAME price across outlets *within the same store*.
    (Outlets affect travel; prices vary by store.)

By default this script:
  - does NOT delete anything
  - inserts only missing demo rows

Requirements:
  - DATABASE_URL_PG set (same as backend uses)
  - Postgres tables already migrated

Run:
  python -m src.scripts.seed_demo_data --safe

Optional:
  python -m src.scripts.seed_demo_data --reset   # wipes only the 4 core tables
"""

from __future__ import annotations

import argparse
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, Iterable, List, Optional, Tuple

from dotenv import load_dotenv
import psycopg


# ---------------------------
# Demo catalog (food-only)
# ---------------------------


@dataclass(frozen=True)
class DemoItem:
    canonical_label: str
    # human facing names per store (can be same)
    keells_name: str
    cargills_name: str
    # optional brand per store
    keells_brand: Optional[str]
    cargills_brand: Optional[str]
    # sizing used by clean_products identity
    size_value: Optional[Decimal]
    size_unit: Optional[str]
    # lightweight categories (optional)
    category_l1: Optional[str]
    category_l2: Optional[str]
    # store-level prices (LKR)
    keells_price: Decimal
    cargills_price: Decimal
    # optional promo price
    keells_final_price: Optional[Decimal] = None
    cargills_final_price: Optional[Decimal] = None
    # optional per-unit
    keells_price_per_unit: Optional[Decimal] = None
    cargills_price_per_unit: Optional[Decimal] = None


def _d(x: Optional[str | int | float | Decimal]) -> Optional[Decimal]:
    if x is None:
        return None
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


DEMO_ITEMS: List[DemoItem] = [
    # Rice & grains
    DemoItem("white rice 5kg", "White Rice 5kg", "White Rice 5kg", None, None, _d(5), "kg", "Food", "Rice & Grains", _d(1490), _d(1450)),
    DemoItem("samba rice 5kg", "Samba Rice 5kg", "Samba Rice 5kg", None, None, _d(5), "kg", "Food", "Rice & Grains", _d(1890), _d(1820)),
    DemoItem("red rice 5kg", "Red Rice 5kg", "Red Rice 5kg", None, None, _d(5), "kg", "Food", "Rice & Grains", _d(2150), _d(2090)),
    DemoItem("basmati rice 1kg", "Basmati Rice 1kg", "Basmati Rice 1kg", None, None, _d(1), "kg", "Food", "Rice & Grains", _d(980), _d(1020)),
    DemoItem("wheat flour 1kg", "Wheat Flour 1kg", "Wheat Flour 1kg", "Prima", "Prima", _d(1), "kg", "Food", "Baking", _d(690), _d(670)),
    DemoItem("atta flour 1kg", "Atta Flour 1kg", "Atta Flour 1kg", "Prima", "Prima", _d(1), "kg", "Food", "Baking", _d(720), _d(735)),

    # Dhal / pulses
    DemoItem("red dhal 1kg", "Red Dhal 1kg", "Red Dhal 1kg", None, None, _d(1), "kg", "Food", "Pulses", _d(760), _d(730)),
    DemoItem("green gram 500g", "Green Gram 500g", "Green Gram 500g", None, None, _d(500), "g", "Food", "Pulses", _d(520), _d(545)),
    DemoItem("chickpeas 500g", "Chickpeas 500g", "Chickpeas 500g", None, None, _d(500), "g", "Food", "Pulses", _d(640), _d(615)),
    DemoItem("kidney beans 400g", "Kidney Beans 400g", "Kidney Beans 400g", None, None, _d(400), "g", "Food", "Pulses", _d(490), _d(470)),
    DemoItem("cowpea 400g", "Cowpea 400g", "Cowpea 400g", None, None, _d(400), "g", "Food", "Pulses", _d(410), _d(420)),

    # Cooking essentials
    DemoItem("coconut oil 1l", "Coconut Oil 1L", "Coconut Oil 1L", "Miyuru", "Miyuru", _d(1), "l", "Food", "Cooking", _d(1490), _d(1520)),
    DemoItem("vegetable oil 1l", "Vegetable Oil 1L", "Vegetable Oil 1L", "Fortune", "Fortune", _d(1), "l", "Food", "Cooking", _d(1280), _d(1250)),
    DemoItem("salt 400g", "Salt 400g", "Salt 400g", "Anchor", "Anchor", _d(400), "g", "Food", "Cooking", _d(180), _d(170)),
    DemoItem("sugar 1kg", "Sugar 1kg", "Sugar 1kg", None, None, _d(1), "kg", "Food", "Cooking", _d(520), _d(510)),
    DemoItem("chilli powder 100g", "Chilli Powder 100g", "Chilli Powder 100g", "MD", "MD", _d(100), "g", "Food", "Spices", _d(320), _d(340)),
    DemoItem("curry powder 100g", "Curry Powder 100g", "Curry Powder 100g", "MD", "MD", _d(100), "g", "Food", "Spices", _d(310), _d(295)),
    DemoItem("turmeric powder 50g", "Turmeric Powder 50g", "Turmeric Powder 50g", "MD", "MD", _d(50), "g", "Food", "Spices", _d(260), _d(245)),

    # Breakfast
    DemoItem("milk powder 400g", "Milk Powder 400g", "Milk Powder 400g", "Anchor", "Anchor", _d(400), "g", "Food", "Breakfast", _d(1890), _d(1990)),
    DemoItem("tea bags 100", "Tea Bags 100s", "Tea Bags 100s", "Dilmah", "Dilmah", _d(100), "bags", "Food", "Breakfast", _d(1350), _d(1320)),
    DemoItem("coffee 100g", "Coffee 100g", "Coffee 100g", "Nescafe", "Nescafe", _d(100), "g", "Food", "Breakfast", _d(980), _d(1020)),
    DemoItem("oats 1kg", "Oats 1kg", "Oats 1kg", "Oatsy", "Oatsy", _d(1), "kg", "Food", "Breakfast", _d(1580), _d(1490)),
    DemoItem("cornflakes 500g", "Cornflakes 500g", "Cornflakes 500g", "Kellogg's", "Kellogg's", _d(500), "g", "Food", "Breakfast", _d(1450), _d(1520)),

    # Fresh everyday items (Option A = treat as normal products)
    DemoItem("eggs 10 pack", "Eggs 10 Pack", "Eggs 10 Pack", None, None, _d(10), "pack", "Food", "Fresh", _d(620), _d(590)),
    DemoItem("white bread 450g", "White Bread 450g", "White Bread 450g", None, None, _d(450), "g", "Food", "Fresh", _d(240), _d(230)),
    DemoItem("brown bread 450g", "Brown Bread 450g", "Brown Bread 450g", None, None, _d(450), "g", "Food", "Fresh", _d(260), _d(270)),
    DemoItem("fresh milk 1l", "Fresh Milk 1L", "Fresh Milk 1L", "Highland", "Highland", _d(1), "l", "Food", "Fresh", _d(560), _d(580)),
    DemoItem("yoghurt 500g", "Yoghurt 500g", "Yoghurt 500g", "Highland", "Highland", _d(500), "g", "Food", "Fresh", _d(640), _d(620)),

    # Vegetables (Option A)
    DemoItem("onions 1kg", "Onions 1kg", "Onions 1kg", None, None, _d(1), "kg", "Food", "Vegetables", _d(890), _d(860)),
    DemoItem("potatoes 1kg", "Potatoes 1kg", "Potatoes 1kg", None, None, _d(1), "kg", "Food", "Vegetables", _d(980), _d(1010)),
    DemoItem("carrots 500g", "Carrots 500g", "Carrots 500g", None, None, _d(500), "g", "Food", "Vegetables", _d(520), _d(540)),
    DemoItem("tomatoes 500g", "Tomatoes 500g", "Tomatoes 500g", None, None, _d(500), "g", "Food", "Vegetables", _d(460), _d(430)),
    DemoItem("cabbage 1", "Cabbage 1pc", "Cabbage 1pc", None, None, _d(1), "pc", "Food", "Vegetables", _d(390), _d(410)),
    DemoItem("leeks 250g", "Leeks 250g", "Leeks 250g", None, None, _d(250), "g", "Food", "Vegetables", _d(420), _d(400)),

    # Snacks & quick foods
    DemoItem("cream crackers 125g", "Cream Crackers 125g", "Cream Crackers 125g", "Munchee", "Maliban", _d(125), "g", "Food", "Snacks", _d(210), _d(195)),
    DemoItem("chocolate biscuits 200g", "Chocolate Biscuits 200g", "Chocolate Biscuits 200g", "Maliban", "Maliban", _d(200), "g", "Food", "Snacks", _d(380), _d(360)),
    DemoItem("instant noodles 5 pack", "Instant Noodles 5 Pack", "Instant Noodles 5 Pack", "Maggi", "Prima", _d(5), "pack", "Food", "Quick Meals", _d(520), _d(490)),
    DemoItem("pasta 400g", "Pasta 400g", "Pasta 400g", "Prima", "Prima", _d(400), "g", "Food", "Quick Meals", _d(590), _d(610)),
    DemoItem("spaghetti 400g", "Spaghetti 400g", "Spaghetti 400g", "Prima", "Prima", _d(400), "g", "Food", "Quick Meals", _d(640), _d(630)),
]


# ---------------------------
# Helpers
# ---------------------------


def normalize_name(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def money(x: Optional[Decimal]) -> Optional[Decimal]:
    if x is None:
        return None
    return x.quantize(Decimal("0.01"))


def per_unit(x: Optional[Decimal]) -> Optional[Decimal]:
    if x is None:
        return None
    return x.quantize(Decimal("0.0001"))


# ---------------------------
# DB operations
# ---------------------------


def connect() -> psycopg.Connection:
    load_dotenv()
    dsn = os.getenv("DATABASE_URL_PG")
    if not dsn:
        raise RuntimeError("DATABASE_URL_PG not set")
    return psycopg.connect(dsn)


def fetchone_int(conn: psycopg.Connection, sql: str) -> int:
    with conn.cursor() as cur:
        cur.execute(sql)
        row = cur.fetchone()
        return int(row[0] or 0)


def ensure_min_outlets(conn: psycopg.Connection) -> None:
    """Ensure we have a few outlets per store for meaningful nearest-store baselines."""
    seed_outlets = [
        # Colombo-ish area (demo-friendly)
        ("keells", "K-101", "Keells - Nugegoda", "Nugegoda", Decimal("6.8679000"), Decimal("79.8891000")),
        ("keells", "K-102", "Keells - Rajagiriya", "Rajagiriya", Decimal("6.9094000"), Decimal("79.9090000")),
        ("keells", "K-103", "Keells - Colombo 03", "Colombo 03", Decimal("6.9003000"), Decimal("79.8536000")),
        ("cargills", "C-101", "Cargills - Borella", "Borella", Decimal("6.9147000"), Decimal("79.8776000")),
        ("cargills", "C-102", "Cargills - Colombo 02", "Colombo 02", Decimal("6.9338000"), Decimal("79.8478000")),
        ("cargills", "C-103", "Cargills - Nugegoda", "Nugegoda", Decimal("6.8670000"), Decimal("79.8900000")),
    ]

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT store, COUNT(*)
            FROM public.store_outlets
            WHERE is_active = true
            GROUP BY store
            """
        )
        counts = {r[0]: int(r[1]) for r in cur.fetchall()}

        cur.execute("SELECT store, COALESCE(outlet_code, ''), name FROM public.store_outlets")
        existing = {(r[0], (r[1] or "").strip(), (r[2] or "").strip().lower()) for r in cur.fetchall()}

        now_utc = datetime.now(timezone.utc)
        to_insert = []
        for store, code, name, address, lat, lng in seed_outlets:
            if counts.get(store, 0) >= 3:
                continue
            key = (store, code.strip(), name.strip().lower())
            if key in existing:
                continue
            to_insert.append((store, code, name, address, lat, lng, True, now_utc))

        if to_insert:
            cur.executemany(
                """
                INSERT INTO public.store_outlets
                    (store, outlet_code, name, address, lat, lng, is_active, created_at_utc)
                VALUES
                    (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                to_insert,
            )


def upsert_canonical_groups(conn: psycopg.Connection, labels: Iterable[str]) -> Dict[str, int]:
    labels = [l.strip().lower() for l in labels if l and l.strip()]
    if not labels:
        return {}

    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO public.canonical_groups (canonical_label)
            VALUES (%s)
            ON CONFLICT (canonical_label) DO NOTHING
            """,
            [(l,) for l in sorted(set(labels))],
        )

        cur.execute(
            """
            SELECT canonical_group_id, canonical_label
            FROM public.canonical_groups
            WHERE canonical_label = ANY(%s)
            """,
            (labels,),
        )
        return {r[1]: int(r[0]) for r in cur.fetchall()}


def load_active_outlet_codes(conn: psycopg.Connection) -> Dict[str, List[str]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT store, outlet_code
            FROM public.store_outlets
            WHERE is_active = true
              AND outlet_code IS NOT NULL
              AND outlet_code <> ''
            ORDER BY store, outlet_code
            """
        )
        by_store: Dict[str, List[str]] = {}
        for store, code in cur.fetchall():
            by_store.setdefault(store, []).append(code)
        return by_store


def next_id(conn: psycopg.Connection, table: str, id_col: str) -> int:
    return fetchone_int(conn, f"SELECT COALESCE(MAX({id_col}), 0) FROM public.{table}") + 1


def insert_demo_products_and_prices(conn: psycopg.Connection, group_ids: Dict[str, int]) -> Tuple[int, int]:
    outlet_codes = load_active_outlet_codes(conn)
    if "keells" not in outlet_codes or "cargills" not in outlet_codes:
        raise RuntimeError("Need active outlets for both 'keells' and 'cargills'.")

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT store, normalized_name, COALESCE(size_value::text,''), COALESCE(size_unit,'')
            FROM public.clean_products
            """
        )
        existing_identity = {(r[0], r[1], r[2], r[3]) for r in cur.fetchall()}

    clean_id = next_id(conn, "clean_products", "clean_product_id")
    fact_id = next_id(conn, "product_price_facts", "price_fact_id")
    now_utc = datetime.now(timezone.utc)

    products_to_insert = []
    facts_to_insert = []

    for item in DEMO_ITEMS:
        label = item.canonical_label.strip().lower()
        gid = group_ids.get(label)
        if not gid:
            continue

        variants = [
            ("keells", item.keells_brand, item.keells_name, item.keells_price, item.keells_final_price, item.keells_price_per_unit),
            ("cargills", item.cargills_brand, item.cargills_name, item.cargills_price, item.cargills_final_price, item.cargills_price_per_unit),
        ]

        for store, brand, cname, price, final_price, ppu in variants:
            canonical_name = cname
            normalized = normalize_name(canonical_name)
            size_value = item.size_value
            size_unit = item.size_unit
            identity_key = (store, normalized, str(size_value or ""), str(size_unit or ""))
            if identity_key in existing_identity:
                continue

            products_to_insert.append(
                (
                    clean_id,
                    store,
                    brand,
                    canonical_name,
                    normalized,
                    size_value,
                    size_unit,
                    item.category_l1,
                    item.category_l2,
                    now_utc,
                    gid,
                )
            )

            for outlet_code in outlet_codes.get(store, []):
                facts_to_insert.append(
                    (
                        fact_id,
                        clean_id,
                        now_utc,
                        outlet_code,
                        money(price),
                        money(final_price) if final_price is not None else money(price),
                        per_unit(ppu),
                        False,
                    )
                )
                fact_id += 1

            existing_identity.add(identity_key)
            clean_id += 1

    with conn.cursor() as cur:
        if products_to_insert:
            cur.executemany(
                """
                INSERT INTO public.clean_products
                    (clean_product_id, store, brand, canonical_name, normalized_name,
                     size_value, size_unit, category_l1, category_l2, created_at_utc, canonical_group_id)
                VALUES
                    (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT DO NOTHING
                """,
                products_to_insert,
            )

        if facts_to_insert:
            cur.executemany(
                """
                INSERT INTO public.product_price_facts
                    (price_fact_id, clean_product_id, scraped_at_utc, outlet_code,
                     price, final_price, price_per_unit, is_promo)
                VALUES
                    (%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT DO NOTHING
                """,
                facts_to_insert,
            )

    return (len(products_to_insert), len(facts_to_insert))


def reset_core_tables(conn: psycopg.Connection) -> None:
    with conn.cursor() as cur:
        cur.execute("TRUNCATE TABLE public.product_price_facts RESTART IDENTITY CASCADE")
        cur.execute("TRUNCATE TABLE public.clean_products RESTART IDENTITY CASCADE")
        cur.execute("TRUNCATE TABLE public.store_outlets RESTART IDENTITY CASCADE")
        cur.execute("TRUNCATE TABLE public.canonical_groups RESTART IDENTITY CASCADE")


def print_summary(conn: psycopg.Connection) -> None:
    with conn.cursor() as cur:
        cur.execute("SELECT store, COUNT(*) FROM public.store_outlets WHERE is_active=true GROUP BY store ORDER BY store")
        outlets = cur.fetchall()
        cur.execute("SELECT store, COUNT(*) FROM public.clean_products GROUP BY store ORDER BY store")
        products = cur.fetchall()
        cur.execute("SELECT COUNT(*) FROM public.canonical_groups")
        groups = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM public.product_price_facts")
        facts = cur.fetchone()[0]
        cur.execute(
            """
            SELECT COUNT(*)
            FROM (
              SELECT canonical_group_id
              FROM public.clean_products
              WHERE canonical_group_id IS NOT NULL
              GROUP BY canonical_group_id
              HAVING COUNT(DISTINCT store) >= 2
            ) t
            """
        )
        overlap_groups = cur.fetchone()[0]

    print("\n--- Demo Seed Summary ---")
    print(f"canonical_groups: {int(groups)}")
    print(f"clean_products by store: {products}")
    print(f"store_outlets by store: {outlets}")
    print(f"product_price_facts: {int(facts)}")
    print(f"canonical groups with 2+ stores: {int(overlap_groups)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed demo food data (Sri Lanka) for optimisation demos")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--safe", action="store_true", help="Insert-only (default)")
    mode.add_argument("--reset", action="store_true", help="Wipe core tables then seed")
    args = parser.parse_args()

    with connect() as conn:
        conn.autocommit = False
        try:
            if args.reset:
                print("Reset mode: truncating core tables...")
                reset_core_tables(conn)

            print("Ensuring outlets...")
            ensure_min_outlets(conn)

            labels = [i.canonical_label for i in DEMO_ITEMS]
            print(f"Upserting {len(set([l.lower() for l in labels]))} canonical groups...")
            group_ids = upsert_canonical_groups(conn, labels)

            print("Inserting demo products and price facts (same price across outlets per store)...")
            p_ins, f_ins = insert_demo_products_and_prices(conn, group_ids)

            conn.commit()
            print(f"Inserted clean_products: {p_ins}")
            print(f"Inserted product_price_facts: {f_ins}")
            print_summary(conn)
        except Exception:
            conn.rollback()
            raise


if __name__ == "__main__":
    main()
