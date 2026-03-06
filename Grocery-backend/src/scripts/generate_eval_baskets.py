from __future__ import annotations

import argparse
import json
import os
import random
from typing import Any, Dict, List

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL_PG")

SQL_ACTIVE_OUTLETS = """
SELECT outlet_id, store, outlet_code, name, address, lat, lng
FROM public.store_outlets
WHERE is_active = true
ORDER BY store, outlet_id;
"""

SQL_GROUP_CANDIDATES = """
WITH latest_prices AS (
  SELECT DISTINCT ON (ppf.clean_product_id, ppf.outlet_code)
    ppf.clean_product_id,
    ppf.outlet_code,
    COALESCE(ppf.final_price, ppf.price) AS effective_price,
    ppf.scraped_at_utc
  FROM public.product_price_facts ppf
  ORDER BY ppf.clean_product_id, ppf.outlet_code, ppf.scraped_at_utc DESC
)
SELECT
  cp.canonical_group_id,
  COALESCE(cg.canonical_label, cp.canonical_name) AS group_name,
  cp.clean_product_id,
  lower(cp.store) AS store,
  cp.canonical_name,
  lp.effective_price
FROM public.clean_products cp
JOIN latest_prices lp
  ON lp.clean_product_id = cp.clean_product_id
LEFT JOIN public.canonical_groups cg
  ON cg.canonical_group_id = cp.canonical_group_id
WHERE cp.canonical_group_id IS NOT NULL
  AND lp.effective_price IS NOT NULL
ORDER BY cp.canonical_group_id, cp.store, cp.clean_product_id;
"""

def connect():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL_PG is missing in .env")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

def build_group_pool(rows: List[Dict[str, Any]], min_store_count: int = 2) -> List[Dict[str, Any]]:
    grouped: Dict[int, Dict[str, Any]] = {}

    for r in rows:
        gid = r.get("canonical_group_id")
        if gid is None:
            continue
        gid = int(gid)

        grouped.setdefault(
            gid,
            {
                "canonical_group_id": gid,
                "name": r.get("group_name") or r.get("canonical_name") or f"group_{gid}",
                "candidate_clean_product_ids": [],
                "stores": set(),
            },
        )

        grouped[gid]["candidate_clean_product_ids"].append(int(r["clean_product_id"]))
        if r.get("store"):
            grouped[gid]["stores"].add(str(r["store"]).lower().strip())

    pool = []
    for _, g in grouped.items():
        g["candidate_clean_product_ids"] = sorted(set(g["candidate_clean_product_ids"]))
        g["store_count"] = len(g["stores"])
        g["stores"] = sorted(g["stores"])

        # keep only groups that appear in enough stores and have at least 2 candidate products
        if g["store_count"] >= min_store_count and len(g["candidate_clean_product_ids"]) >= 2:
            pool.append(g)

    return pool

def choose_user_locations(outlets: List[Dict[str, Any]]) -> List[Dict[str, float]]:
    # Use active outlet coordinates as realistic origin points
    coords: List[Dict[str, float]] = []
    seen = set()

    for o in outlets:
        lat = o.get("lat")
        lng = o.get("lng")
        if lat is None or lng is None:
            continue
        key = (float(lat), float(lng))
        if key in seen:
            continue
        seen.add(key)
        coords.append({"lat": float(lat), "lng": float(lng)})

    return coords

def generate_baskets(
    group_pool: List[Dict[str, Any]],
    user_locations: List[Dict[str, float]],
    basket_count: int,
    min_items: int,
    max_items: int,
    seed: int,
) -> List[Dict[str, Any]]:
    if not group_pool:
        raise RuntimeError("No eligible canonical groups found for evaluation baskets.")
    if not user_locations:
        raise RuntimeError("No user locations available from active store outlets.")

    rng = random.Random(seed)
    baskets: List[Dict[str, Any]] = []

    # Bias toward groups with more store coverage
    weighted_pool: List[Dict[str, Any]] = []
    for g in group_pool:
        weight = max(1, g["store_count"])
        weighted_pool.extend([g] * weight)

    used_signatures = set()

    attempts = 0
    while len(baskets) < basket_count and attempts < basket_count * 20:
        attempts += 1
        size = rng.randint(min_items, max_items)

        chosen = []
        seen_gids = set()
        while len(chosen) < size:
            g = rng.choice(weighted_pool)
            gid = g["canonical_group_id"]
            if gid in seen_gids:
                continue
            seen_gids.add(gid)
            chosen.append(g)

        signature = tuple(sorted(x["canonical_group_id"] for x in chosen))
        if signature in used_signatures:
            continue
        used_signatures.add(signature)

        origin = rng.choice(user_locations)

        items = []
        for g in chosen:
            items.append(
                {
                    "canonical_group_id": int(g["canonical_group_id"]),
                    "candidate_clean_product_ids": [int(x) for x in g["candidate_clean_product_ids"]],
                    "name": g["name"],
                    "qty": 1,
                }
            )

        baskets.append(
            {
                "id": f"basket_{len(baskets)+1:03d}",
                "user_location": origin,
                "items": items,
            }
        )

    return baskets

def main():
    ap = argparse.ArgumentParser(description="Generate evaluation baskets from current DB")
    ap.add_argument("--out", default="src/scripts/baskets_eval.json", help="Output JSON path")
    ap.add_argument("--basket-count", type=int, default=30)
    ap.add_argument("--min-items", type=int, default=2)
    ap.add_argument("--max-items", type=int, default=5)
    ap.add_argument("--min-store-count", type=int, default=2, help="Minimum stores per canonical group")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(SQL_ACTIVE_OUTLETS)
            outlets = cur.fetchall()

            cur.execute(SQL_GROUP_CANDIDATES)
            rows = cur.fetchall()

    group_pool = build_group_pool(rows, min_store_count=args.min_store_count)
    user_locations = choose_user_locations(outlets)

    baskets = generate_baskets(
        group_pool=group_pool,
        user_locations=user_locations,
        basket_count=args.basket_count,
        min_items=args.min_items,
        max_items=args.max_items,
        seed=args.seed,
    )

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(baskets, f, ensure_ascii=False, indent=2)

    print(f"Generated {len(baskets)} baskets")
    print(f"Output: {args.out}")
    print(f"Eligible canonical groups: {len(group_pool)}")
    print(f"User locations available: {len(user_locations)}")

if __name__ == "__main__":
    main()