from datetime import datetime, date

from database_models import HEALTH_ASSESSMENTS


def store_health_assessment(db, user_data, risk_result, diet_result):
    """
    Store or update health assessment data in MongoDB.
    db: pymongo Database (from get_db).
    """
    try:
        today = date.today()
        bmi = round(user_data["weight"] / ((user_data["height"] / 100) ** 2), 1)
        user_id = int(user_data.get("userId", 0))
        coll = db[HEALTH_ASSESSMENTS]

        existing = coll.find_one({"user_id": user_id, "date": today})

        if existing:
            coll.update_one(
                {"user_id": user_id, "date": today},
                {"$set": {
                    "timestamp": datetime.utcnow(),
                    "blood_pressure": user_data.get("blood_pressure"),
                    "glucose": user_data.get("glucose"),
                    "cholesterol": user_data.get("cholesterol"),
                    "exercise_hours": user_data.get("exercise_hours", 0),
                    "daily_calories": user_data.get("daily_caloric_intake"),
                    "sleep_hours": user_data.get("sleep", 0),
                    "weight": user_data["weight"],
                    "height": user_data["height"],
                    "bmi": bmi,
                    "risk_level": risk_result.get("risk_level", "Unknown"),
                    "risk_score": risk_result.get("risk_score"),
                    "recommended_diet": diet_result.get("recommended_diet", "Unknown"),
                    "diet_confidence": diet_result.get("confidence"),
                }},
            )
            print(f"✓ Assessment UPDATED for user {user_id}")
        else:
            doc = {
                "user_id": user_id,
                "date": today,
                "timestamp": datetime.utcnow(),
                "blood_pressure": user_data.get("blood_pressure"),
                "glucose": user_data.get("glucose"),
                "cholesterol": user_data.get("cholesterol"),
                "exercise_hours": user_data.get("exercise_hours", 0),
                "daily_calories": user_data.get("daily_caloric_intake"),
                "sleep_hours": user_data.get("sleep", 0),
                "weight": user_data["weight"],
                "height": user_data["height"],
                "bmi": bmi,
                "risk_level": risk_result.get("risk_level", "Unknown"),
                "risk_score": risk_result.get("risk_score"),
                "recommended_diet": diet_result.get("recommended_diet", "Unknown"),
                "diet_confidence": diet_result.get("confidence"),
            }
            coll.insert_one(doc)
            print(f"✓ New assessment CREATED for user {user_id}")
        return True
    except Exception as e:
        print(f"MongoDB Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
