from fastapi import APIRouter, Query, Depends
from fastapi.responses import JSONResponse
from datetime import datetime, date, timedelta
import traceback

from db import get_db
from database_models import HEALTH_ASSESSMENTS
from health_risk.services.calculateHealthStatus import get_bp_status, get_cholesterol_status, get_glucose_status

router = APIRouter(prefix="/api/analytics")


def to_datetime(d: date) -> datetime:
    """Convert a date to a midnight datetime for MongoDB queries."""
    return datetime(d.year, d.month, d.day, 0, 0, 0)


@router.get("/{user_id}")
def get_health_analytics(user_id: str, period: str = Query(default="month"), db=Depends(get_db)):
    try:
        end_date = to_datetime(date.today())
        period_map = {
            "week": timedelta(days=7), "month": timedelta(days=30),
            "3months": timedelta(days=90), "6months": timedelta(days=180),
            "year": timedelta(days=365),
        }
        start_date = (
            to_datetime(date.today() - period_map.get(period, timedelta(days=30)))
            if period in period_map
            else to_datetime(date(2000, 1, 1))
        )

        coll = db[HEALTH_ASSESSMENTS]
        assessments = list(coll.find({
            "user_id": user_id,
            "date": {"$gte": start_date, "$lte": end_date},
        }).sort("date", 1))

        if not assessments:
            return JSONResponse(status_code=404, content={"success": False, "error": "No data found"})

        weight_data, bp_data, calories_data, glucose_data, cholesterol_data, risk_data = [], [], [], [], [], []

        for a in assessments:
            d = a.get("date")
            date_str = d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d)
            if a.get("weight") is not None:
                weight_data.append({"date": date_str, "value": a["weight"], "bmi": a.get("bmi")})
            if a.get("blood_pressure") is not None:
                bp_data.append({"date": date_str, "value": a["blood_pressure"]})
            if a.get("daily_calories") is not None:
                calories_data.append({"date": date_str, "value": a["daily_calories"]})
            if a.get("glucose") is not None:
                glucose_data.append({"date": date_str, "value": a["glucose"]})
            if a.get("cholesterol") is not None:
                cholesterol_data.append({"date": date_str, "value": a["cholesterol"]})
            if a.get("risk_level"):
                risk_data.append({"date": date_str, "level": a["risk_level"], "score": a.get("risk_score") or 0})

        latest, first = assessments[-1], assessments[0]

        return {
            "success": True, "period": period, "userId": user_id,
            "dateRange": {"start": start_date.strftime("%Y-%m-%d"), "end": end_date.strftime("%Y-%m-%d")},
            "statistics": {
                "weight_change": round(latest.get("weight", 0) - first.get("weight", 0), 1) if latest.get("weight") and first.get("weight") else 0,
                "avg_glucose": round(sum(a["glucose"] for a in assessments if a.get("glucose")) / len([a for a in assessments if a.get("glucose")]), 1) if any(a.get("glucose") for a in assessments) else 0,
                "avg_cholesterol": round(sum(a["cholesterol"] for a in assessments if a.get("cholesterol")) / len([a for a in assessments if a.get("cholesterol")]), 1) if any(a.get("cholesterol") for a in assessments) else 0,
                "current_risk": latest.get("risk_level") or "Unknown",
                "total_records": len(assessments),
            },
            "graphs": {
                "weight": weight_data, "bloodPressure": bp_data,
                "calories": calories_data, "glucose": glucose_data,
                "cholesterol": cholesterol_data, "riskLevel": risk_data,
            }
        }
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@router.get("/{user_id}/summary")
def get_health_summary(user_id: str, db=Depends(get_db)):
    try:
        thirty_days_ago = to_datetime(date.today() - timedelta(days=30))
        coll = db[HEALTH_ASSESSMENTS]

        recent = list(coll.find({
            "user_id": user_id,
            "date": {"$gte": thirty_days_ago},
        }).sort("date", -1))

        if not recent:
            return JSONResponse(status_code=404, content={"success": False, "error": "No recent data found"})

        latest = recent[0]
        week_ago = to_datetime(date.today() - timedelta(days=7))
        week_old = coll.find_one({
            "user_id": user_id,
            "date": {"$lte": week_ago},
        }, sort=[("date", -1)])

        latest_date = latest.get("date")
        latest_date_str = latest_date.strftime("%Y-%m-%d") if latest_date else None

        return {
            "success": True,
            "summary": {
                "latest_date": latest_date_str,
                "weight": {"current": latest.get("weight"), "bmi": latest.get("bmi"), "trend": round(latest.get("weight", 0) - (week_old.get("weight") or 0), 1) if week_old and week_old.get("weight") else 0},
                "blood_pressure": {"current": latest.get("blood_pressure"), "status": get_bp_status(latest.get("blood_pressure")) if latest.get("blood_pressure") else "Unknown"},
                "glucose": {"current": latest.get("glucose"), "trend": round((latest.get("glucose") or 0) - (week_old.get("glucose") or 0), 1) if week_old and latest.get("glucose") else 0, "status": get_glucose_status(latest.get("glucose")) if latest.get("glucose") else "Unknown"},
                "cholesterol": {"current": latest.get("cholesterol"), "trend": round((latest.get("cholesterol") or 0) - (week_old.get("cholesterol") or 0), 1) if week_old and latest.get("cholesterol") else 0, "status": get_cholesterol_status(latest.get("cholesterol")) if latest.get("cholesterol") else "Unknown"},
                "risk_level": {"current": latest.get("risk_level"), "recommended_diet": latest.get("recommended_diet")},
                "lifestyle": {"exercise_hours": latest.get("exercise_hours"), "sleep_hours": latest.get("sleep_hours"), "daily_calories": latest.get("daily_calories")},
            }
        }
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})