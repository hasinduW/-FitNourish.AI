from fastapi import APIRouter, Query, Depends
from fastapi.responses import JSONResponse
from datetime import date, timedelta
from sqlalchemy.orm import Session
import traceback

from db import get_db
from models.healthinfo import HealthAssessment
from health_risk.services.calculateHealthStatus import get_bp_status, get_cholesterol_status, get_glucose_status

router = APIRouter(prefix="/api/analytics")


@router.get("/{user_id}")
def get_health_analytics(user_id: int, period: str = Query(default="month"), db: Session = Depends(get_db)):
    try:
        end_date = date.today()
        period_map = {
            "week": timedelta(days=7), "month": timedelta(days=30),
            "3months": timedelta(days=90), "6months": timedelta(days=180),
            "year": timedelta(days=365),
        }
        start_date = end_date - period_map.get(period, timedelta(days=30)) if period in period_map else date(2000, 1, 1)

        # FastAPI style 
        assessments = db.query(HealthAssessment).filter(
            HealthAssessment.user_id == user_id,
            HealthAssessment.date >= start_date,
            HealthAssessment.date <= end_date,
        ).order_by(HealthAssessment.date.asc()).all()

        if not assessments:
            return JSONResponse(status_code=404, content={"success": False, "error": "No data found"})

        weight_data, bp_data, calories_data, glucose_data, cholesterol_data, risk_data = [], [], [], [], [], []

        for a in assessments:
            date_str = a.date.strftime("%Y-%m-%d")
            if a.weight:         weight_data.append({"date": date_str, "value": a.weight, "bmi": a.bmi})
            if a.blood_pressure: bp_data.append({"date": date_str, "value": a.blood_pressure})
            if a.daily_calories: calories_data.append({"date": date_str, "value": a.daily_calories})
            if a.glucose:        glucose_data.append({"date": date_str, "value": a.glucose})
            if a.cholesterol:    cholesterol_data.append({"date": date_str, "value": a.cholesterol})
            if a.risk_level:     risk_data.append({"date": date_str, "level": a.risk_level, "score": a.risk_score or 0})

        latest, first = assessments[-1], assessments[0]

        return {
            "success": True, "period": period, "userId": user_id,
            "dateRange": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "statistics": {
                "weight_change": round(latest.weight - first.weight, 1) if latest.weight and first.weight else 0,
                "avg_glucose": round(sum(a.glucose for a in assessments if a.glucose) / len([a for a in assessments if a.glucose]), 1) if any(a.glucose for a in assessments) else 0,
                "avg_cholesterol": round(sum(a.cholesterol for a in assessments if a.cholesterol) / len([a for a in assessments if a.cholesterol]), 1) if any(a.cholesterol for a in assessments) else 0,
                "current_risk": latest.risk_level or "Unknown",
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
def get_health_summary(user_id: int, db: Session = Depends(get_db)):
    try:
        thirty_days_ago = date.today() - timedelta(days=30)

        # apply fast api :(
        recent = db.query(HealthAssessment).filter(
            HealthAssessment.user_id == user_id,
            HealthAssessment.date >= thirty_days_ago,
        ).order_by(HealthAssessment.date.desc()).all()

        if not recent:
            return JSONResponse(status_code=404, content={"success": False, "error": "No recent data found"})

        latest = recent[0]

        week_old = db.query(HealthAssessment).filter(
            HealthAssessment.user_id == user_id,
            HealthAssessment.date <= date.today() - timedelta(days=7),
        ).order_by(HealthAssessment.date.desc()).first()

        return {
            "success": True,
            "summary": {
                "latest_date": latest.date.isoformat(),
                "weight": {"current": latest.weight, "bmi": latest.bmi, "trend": round(latest.weight - week_old.weight, 1) if week_old and week_old.weight else 0},
                "blood_pressure": {"current": latest.blood_pressure, "status": get_bp_status(latest.blood_pressure) if latest.blood_pressure else "Unknown"},
                "glucose": {"current": latest.glucose, "trend": round(latest.glucose - week_old.glucose, 1) if week_old and week_old.glucose and latest.glucose else 0, "status": get_glucose_status(latest.glucose) if latest.glucose else "Unknown"},
                "cholesterol": {"current": latest.cholesterol, "trend": round(latest.cholesterol - week_old.cholesterol, 1) if week_old and week_old.cholesterol and latest.cholesterol else 0, "status": get_cholesterol_status(latest.cholesterol) if latest.cholesterol else "Unknown"},
                "risk_level": {"current": latest.risk_level, "recommended_diet": latest.recommended_diet},
                "lifestyle": {"exercise_hours": latest.exercise_hours, "sleep_hours": latest.sleep_hours, "daily_calories": latest.daily_calories},
            }
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})