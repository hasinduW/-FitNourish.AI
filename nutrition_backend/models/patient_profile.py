"""Patient profile: MongoDB document shape and response helper."""

from datetime import datetime


def doc_to_dict(doc: dict) -> dict:
    """Convert a MongoDB patient_profiles document to API response shape."""
    if not doc:
        return None
    return {
        "id": str(doc.get("_id")),
        "userId": doc.get("user_id"),
        "age": doc.get("age"),
        "gender": doc.get("gender"),
        "married": doc.get("married"),
        "profession": doc.get("profession"),
        "smoking": doc.get("smoking"),
        "alcohol": doc.get("alcohol"),
        "createdAt": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "updatedAt": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
    }
