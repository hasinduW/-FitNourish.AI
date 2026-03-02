"""Health assessment: MongoDB document shape and response helper."""

from datetime import datetime, date


def doc_to_dict(doc: dict) -> dict:
    """Convert a MongoDB health_assessments document to API response shape."""
    if not doc:
        return None
    d = doc.get("date")
    ts = doc.get("timestamp")
    return {
        "id": str(doc.get("_id")),
        "userId": doc.get("user_id"),
        "date": d.isoformat() if hasattr(d, "isoformat") else str(d),
        "timestamp": ts.isoformat() if ts and hasattr(ts, "isoformat") else None,
        "bloodPressure": doc.get("blood_pressure"),
        "glucose": doc.get("glucose"),
        "cholesterol": doc.get("cholesterol"),
        "exerciseHours": doc.get("exercise_hours"),
        "dailyCalories": doc.get("daily_calories"),
        "sleepHours": doc.get("sleep_hours"),
        "weight": doc.get("weight"),
        "height": doc.get("height"),
        "bmi": doc.get("bmi"),
        "riskLevel": doc.get("risk_level"),
        "riskScore": doc.get("risk_score"),
        "recommendedDiet": doc.get("recommended_diet"),
        "dietConfidence": doc.get("diet_confidence"),
    }
