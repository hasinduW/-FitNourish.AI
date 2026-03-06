from flask import Blueprint, request, jsonify
from src.api.db import get_conn

bp = Blueprint("snapshots", __name__)

@bp.get("/snapshots")
def snapshots():
    outlet = request.args.get("outlet", "SCDR")
    limit = int(request.args.get("limit", 20))

    sql = """
    SELECT scraped_at_utc, COUNT(*) 
    FROM raw_products
    WHERE outlet_code = %s
    GROUP BY scraped_at_utc
    ORDER BY scraped_at_utc DESC
    LIMIT %s;
    """

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (outlet, limit))
        rows = cur.fetchall()

    return jsonify([
        {
            "scraped_at_utc": r[0].isoformat(),
            "row_count": r[1]
        }
        for r in rows
    ])
