from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime
import traceback
from typing import Optional, Dict, List

from db import get_db
from fastapi import Depends

from health_risk.core import model_loader
from health_risk.core.utils import make_json_safe
from health_risk.services.diet_predictor import predict_diet
from health_risk.services.risk_predictor import predict_health_risk
from health_risk.services.assessment import generate_overall_assessment
from health_risk.services.dataSave import store_health_assessment

router = APIRouter()

class FoodItem(BaseModel):
    food: str
    grams: float
    
# Request body schema
class AssessRequest(BaseModel):
    # User info
    userId: Optional[int] = None
    age: int
    gender: str
    weight: float
    height: float

    # Lifestyle
    exercise: str
    sleep: float
    sugar_intake: str
    smoking: str
    alcohol: str
    married: str
    profession: str

    # Health
    disease_type: str = "None"
    severity: str = "Mild"
    cholesterol: float = 180
    blood_pressure: float = 120
    glucose: float = 100
    dietary_restrictions: str = "None"
    allergies: str = "None"
    exercise_hours: float = 3
    adherence: float = 70
    bmi: Optional[float] = None

    daily_caloric_intake: Optional[float] = 2200
    meals: Optional[Dict[str, List[FoodItem]]] = {}

@router.get("/risk")
def home():
    return {
        "status": "online",
        "message": "Unified Health Assessment API",
        "version": "3.0",
        "models": {
            "diet_model": model_loader.diet_model is not None,
            "risk_model": model_loader.risk_model is not None,
        }
    }

@router.post("/api/assess")
def assess_health(body: AssessRequest, db=Depends(get_db)):
    try:
        user_data = body.dict()

        print("user data--------",user_data)

        diet_result = predict_diet(user_data)
        risk_result = predict_health_risk(user_data)

        if not diet_result or not risk_result:
            return JSONResponse(status_code=500, content={"success": False, "error": "Model prediction failed"})

        store_health_assessment(db, user_data, risk_result, diet_result)

        response = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "user_profile": {
                "age": user_data["age"],
                "gender": user_data["gender"],
                "bmi": round(user_data["weight"] / ((user_data["height"] / 100) ** 2), 1),
                "activity_level": user_data["exercise"],
            },
            "health_risk": risk_result,
            "diet_recommendation": diet_result,
            "overall_assessment": generate_overall_assessment(risk_result, diet_result, user_data),
        }

        return make_json_safe(response)

    except Exception as e:
        return JSONResponse(status_code=500, content={
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        })

@router.get("/api/test")
def test():
    try:
        sample = {
            "age": 55, "gender": "Male", "weight": 90, "height": 175,
            "exercise": "low", "sleep": 6.5, "sugar_intake": "high",
            "smoking": "no", "alcohol": "yes", "married": "yes",
            "profession": "office_worker", "disease_type": "Diabetes",
            "severity": "Moderate", "cholesterol": 220,
            "blood_pressure": 145, "glucose": 160,
        }
        diet_result = predict_diet(sample)
        risk_result = predict_health_risk(sample)
        return {"success": True, "message": "Both models working!", "diet": diet_result["recommended_diet"], "risk": risk_result["risk_level"]}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@router.get("/api/init-db")
def init_database():
    try:
        from models.healthinfo import db
        db.create_all()
        return {"success": True, "message": "Database tables created successfully!"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})