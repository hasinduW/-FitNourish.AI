"""Diet principles: MongoDB document shape and response helper."""

from datetime import datetime, date


def doc_to_dict(doc: dict) -> dict:
    """Convert a MongoDB diet_principles document to API response shape."""
    if not doc:
        return None
    principles = [
        doc.get("principle_1"),
        doc.get("principle_2"),
        doc.get("principle_3"),
        doc.get("principle_4"),
    ]
    principles = [p for p in principles if p is not None]
    d = doc.get("date")
    return {
        "id": str(doc.get("_id")),
        "userId": doc.get("user_id"),
        "date": d.isoformat() if hasattr(d, "isoformat") else str(d),
        "updatedAt": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
        "dietName": doc.get("diet_name"),
        "principles": principles,
    }
