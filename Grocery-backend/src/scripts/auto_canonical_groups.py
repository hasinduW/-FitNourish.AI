import argparse
import os
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional

import psycopg
from rapidfuzz import fuzz


@dataclass
class ProductRow:
    clean_product_id: int
    store: str
    brand: Optional[str]
    canonical_name: str
    normalized_name: str


def norm(s: Optional[str]) -> str:
    return (s or "").strip().lower()

def is_reasonable_pair(a: ProductRow, b: ProductRow) -> bool:
    na, nb = a.normalized_name, b.normalized_name
    if not na or not nb:
        return False

    ta = set(na.split())
    tb = set(nb.split())
    if not ta or not tb:
        return False

    # overlap ratio based on smaller token set
    overlap_ratio = len(ta & tb) / min(len(ta), len(tb))

    # also reject if one has many extra tokens (like "beans", "heinz", etc.)
    extra_ratio = abs(len(ta) - len(tb)) / max(len(ta), len(tb))

    return overlap_ratio >= 0.8 and extra_ratio <= 0.5

def score(a: ProductRow, b: ProductRow) -> int:
    """
    Weighted similarity score in [0..100].
    Uses both normalized_name and canonical_name.
    """
    n1, n2 = a.normalized_name, b.normalized_name
    c1, c2 = a.canonical_name, b.canonical_name

    # token-based works well for reordered words
    s_norm = fuzz.token_set_ratio(n1, n2)
    s_can = fuzz.token_set_ratio(c1, c2)

    # small extra boost if brand matches (if present)
    brand_boost = 5 if a.brand and b.brand and norm(a.brand) == norm(b.brand) else 0

    # Weighted blend (tune if needed)
    blended = int(0.7 * s_norm + 0.3 * s_can) + brand_boost
    return min(100, blended)


def fetch_products(conn, stores: List[str]) -> List[ProductRow]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT clean_product_id, store, brand, canonical_name, normalized_name
            FROM public.clean_products
            WHERE store = ANY(%(stores)s)
            """,
            {"stores": stores},
        )
        rows = cur.fetchall()

    out: List[ProductRow] = []
    for r in rows:
        out.append(
            ProductRow(
                clean_product_id=int(r["clean_product_id"]),
                store=norm(r["store"]),
                brand=r.get("brand"),
                canonical_name=norm(r.get("canonical_name")),
                normalized_name=norm(r.get("normalized_name")),
            )
        )
    return out


def best_matches(
    a_list: List[ProductRow],
    b_list: List[ProductRow],
    threshold: int,
    require_same_brand: bool,
    max_per_a: int,
) -> List[Tuple[ProductRow, ProductRow, int]]:
    """
    For each item in a_list, find best match in b_list (or top N).
    This is O(n*m) so keep demo-sized, or add blocking rules.
    """
    matches: List[Tuple[ProductRow, ProductRow, int]] = []

    # Simple blocking to speed up:
    # group by first token of normalized_name
    buckets: Dict[str, List[ProductRow]] = {}
    for b in b_list:
        key = b.normalized_name.split(" ", 1)[0] if b.normalized_name else ""
        buckets.setdefault(key, []).append(b)

    for a in a_list:
        key = a.normalized_name.split(" ", 1)[0] if a.normalized_name else ""
        candidates = buckets.get(key, b_list)  # fallback if bucket empty

        scored: List[Tuple[int, ProductRow]] = []
        for b in candidates:
            if require_same_brand and a.brand and b.brand and norm(a.brand) != norm(b.brand):
                continue

            if not is_reasonable_pair(a, b):
                continue

            s = score(a, b)
            if s >= threshold:
                scored.append((s, b))

        scored.sort(key=lambda x: x[0], reverse=True)
        for s, b in scored[:max_per_a]:
            matches.append((a, b, s))

    # Deduplicate: keep only best match for each (a_id, b_id)
    # Keep best unique matches (one-to-one)
    used_a = set()
    used_b = set()
    unique = []

    for a, b, s in sorted(matches, key=lambda x: x[2], reverse=True):
        if a.clean_product_id in used_a:
            continue
        if b.clean_product_id in used_b:
            continue
        used_a.add(a.clean_product_id)
        used_b.add(b.clean_product_id)
        unique.append((a, b, s))

    return unique


def create_group(conn, label: str) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO public.canonical_groups (canonical_label)
            VALUES (%(label)s)
            ON CONFLICT (canonical_label) DO UPDATE SET canonical_label = EXCLUDED.canonical_label
            RETURNING canonical_group_id;
            """,
            {"label": label},
        )
        gid = cur.fetchone()["canonical_group_id"]
    return int(gid)


def set_group_for_products(conn, canonical_group_id: int, product_ids: List[int]) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE public.clean_products
            SET canonical_group_id = %(gid)s
            WHERE clean_product_id = ANY(%(ids)s);
            """,
            {"gid": canonical_group_id, "ids": product_ids},
        )


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", default=os.getenv("DATABASE_URL_PG"), help="Postgres DSN (or set DATABASE_URL_PG)")
    p.add_argument("--store-a", default="keells")
    p.add_argument("--store-b", default="cargills")
    p.add_argument("--threshold", type=int, default=92, help="match threshold 0-100 (start with 92-96)")
    p.add_argument("--require-same-brand", action="store_true", help="only match if brand matches (when both present)")
    p.add_argument("--max-per-a", type=int, default=1, help="how many matches to keep per item in store A")
    p.add_argument("--limit-a", type=int, default=400, help="limit rows from store A (demo speed)")
    p.add_argument("--limit-b", type=int, default=400, help="limit rows from store B (demo speed)")
    p.add_argument("--dry-run", action="store_true", help="print matches but do not write DB")
    args = p.parse_args()

    if not args.db:
        raise SystemExit("Missing DB DSN. Pass --db or set DATABASE_URL_PG.")

    with psycopg.connect(args.db, row_factory=psycopg.rows.dict_row) as conn:
        products = fetch_products(conn, [args.store_a, args.store_b])
        a_list = [x for x in products if x.store == norm(args.store_a)][: args.limit_a]
        b_list = [x for x in products if x.store == norm(args.store_b)][: args.limit_b]

        matches = best_matches(
            a_list=a_list,
            b_list=b_list,
            threshold=args.threshold,
            require_same_brand=args.require_same_brand,
            max_per_a=args.max_per_a,
        )

        print(f"Found {len(matches)} matches with threshold >= {args.threshold}")
        for a, b, s in matches[:50]:
            print(f"[{s}] A({a.clean_product_id}) {a.canonical_name}  <->  B({b.clean_product_id}) {b.canonical_name}")

        if args.dry_run:
            print("Dry run enabled: no DB writes.")
            return

        # Write: create one group per pair (simple)
        # (Later you can cluster/union-find to group many-to-one.)
        for a, b, s in matches:
            label = a.normalized_name or a.canonical_name or f"group_{a.clean_product_id}_{b.clean_product_id}"
            gid = create_group(conn, label=label)
            set_group_for_products(conn, canonical_group_id=gid, product_ids=[a.clean_product_id, b.clean_product_id])

        conn.commit()
        print("Done. canonical_groups inserted and clean_products updated.")


if __name__ == "__main__":
    main()