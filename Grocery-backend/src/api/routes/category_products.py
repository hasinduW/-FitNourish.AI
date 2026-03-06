from flask import Blueprint, request, jsonify
from src.api.db import get_conn

bp = Blueprint("category_products", __name__)

@bp.get("/categories/products")
def products_by_l2():
    l2 = request.args.get("l2")
    store = request.args.get("store", "all").lower()
    model_version = request.args.get("model_version", "rules_v1")

    if not l2:
        return jsonify({"error": "l2 is required"}), 400

    store_sql = ""
    params = [l2, model_version]

    if store != "all":
        store_sql = "AND cp.store = %s"
        params.append(store)

    sql = f"""
    SELECT
      cp.clean_product_id,
      cp.store,
      cp.brand,
      cp.canonical_name,
      cp.size_value,
      cp.size_unit,
      pc.category_l1,
      pc.category_l2
    FROM product_categories pc
    JOIN clean_products cp
      ON cp.clean_product_id = pc.clean_product_id
    WHERE pc.is_active = TRUE
      AND pc.category_l2 = %s
      AND pc.model_version = %s
      {store_sql}
    ORDER BY cp.canonical_name ASC
    LIMIT 500;
    """

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()

    return jsonify([
        {
            "clean_product_id": r[0],
            "store": r[1],
            "brand": r[2],
            "canonical_name": r[3],
            "size_value": float(r[4]) if r[4] is not None else None,
            "size_unit": r[5],
            "category_l1": r[6],
            "category_l2": r[7],
        }
        for r in rows
    ])
