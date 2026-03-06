from flask import Blueprint, jsonify
from datetime import datetime, timezone

bp = Blueprint("health", __name__)

@bp.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "time_utc": datetime.now(timezone.utc).isoformat()
    })
