from flask import Blueprint, request, jsonify
from src.api.db import get_conn

bp = Blueprint("products", __name__)

@bp.get("/products/latest")
def latest_products():
    outlet = request.args.get("outlet", "SCDR")

    sql = """
    SELECT DISTINCT ON (item_code)
      item_code, name, final_price, price, is_promo, scraped_at_utc, image_url
    FROM raw_products
    WHERE outlet_code = %s
    ORDER BY item_code, scraped_at_utc DESC;
    """

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (outlet,))
        rows = cur.fetchall()

    return jsonify([
        {
            "item_code": r[0],
            "name": r[1],
            "final_price": float(r[2]) if r[2] is not None else None,
            "price": float(r[3]) if r[3] is not None else None,
            "is_promo": r[4],
            "scraped_at_utc": r[5].isoformat() if r[5] else None,
            "image_url": r[6],
        }
        for r in rows
    ])


# ✅ LIVE SEARCH (for EnterItemsScreen)
@bp.get("/products/search")
def search_products():
    q = (request.args.get("q") or "").strip()
    try:
        limit = int(request.args.get("limit") or 20)
    except ValueError:
        limit = 20

    # safety clamp
    if limit < 1:
        limit = 1
    if limit > 50:
        limit = 50

    if not q:
        return jsonify({"items": []})

    # ✅ IMPORTANT: requires clean_products table
    sql = """
    SELECT clean_product_id, canonical_name, brand, store, size_value, size_unit, category_l1, category_l2
    FROM clean_products
    WHERE canonical_name ILIKE %s
       OR brand ILIKE %s
    ORDER BY canonical_name
    LIMIT %s;
    """

    like = f"%{q}%"

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (like, like, limit))
        rows = cur.fetchall()

    items = []
    for r in rows:
        items.append({
            "clean_product_id": int(r[0]) if r[0] is not None else None,
            "canonical_name": r[1],
            "brand": r[2],
            "store": r[3],
            "size_value": float(r[4]) if r[4] is not None else None,
            "size_unit": r[5],
            "category_l1": r[6],
            "category_l2": r[7],
        })

    return jsonify({"items": items})


    @bp.get("/products/search_groups")
    def search_product_groups():
        q = (request.args.get("q") or "").strip()
        try:
            limit = int(request.args.get("limit") or 20)
        except ValueError:
            limit = 20

        if limit < 1:
            limit = 1
        if limit > 50:
            limit = 50

        if not q:
            return jsonify({"items": []})

        like = f"%{q}%"

        # Pull matching products + their group label
        sql = """
        SELECT
        cp.canonical_group_id,
        COALESCE(cg.canonical_label, cp.canonical_name) AS group_label,

        cp.clean_product_id,
        cp.store,
        cp.brand,
        cp.canonical_name,
        cp.size_value,
        cp.size_unit,
        cp.category_l1,
        cp.category_l2
        FROM clean_products cp
        LEFT JOIN canonical_groups cg
        ON cg.canonical_group_id = cp.canonical_group_id
        WHERE cp.canonical_name ILIKE %s
        OR cp.brand ILIKE %s
        ORDER BY group_label, cp.store, cp.brand NULLS LAST
        LIMIT %s;
        """

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(sql, (like, like, limit * 6))  # grab more rows, we'll group in python
            rows = cur.fetchall()

        # Group into canonical-group results
        grouped = {}
        for r in rows:
            group_id = int(r[0]) if r[0] is not None else None
            if group_id is None:
                # If any rows have NULL canonical_group_id, you can either skip or treat each as unique group.
                continue

            group_label = r[1]
            if group_id not in grouped:
                grouped[group_id] = {
                    "canonical_group_id": group_id,
                    "label": group_label,
                    "variants": []
                }

            grouped[group_id]["variants"].append({
                "clean_product_id": int(r[2]) if r[2] is not None else None,
                "store": r[3],
                "brand": r[4],
                "canonical_name": r[5],
                "size_value": float(r[6]) if r[6] is not None else None,
                "size_unit": r[7],
                "category_l1": r[8],
                "category_l2": r[9],
            })

        # Return only up to limit groups
        items = list(grouped.values())[:limit]
        return jsonify({"items": items})