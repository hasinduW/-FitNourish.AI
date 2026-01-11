from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd

from db import SessionLocal
from models import Prediction

from sqlalchemy import desc, func   # ✅ added func

app = FastAPI(title="Nutrition Model API")

# ✅ CORS FIX (Allow Expo Web Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once when server starts
model = joblib.load("artifacts/nutrition_model.pkl")


# ✅ Home route (so / doesn't show 404)
@app.get("/")
def home():
    return {"status": "OK", "message": "Nutrition Model API running. Visit /docs"}


class UserInput(BaseModel):
    age: int
    gender: str
    height_cm: float
    weight_kg: float
    goal: str
    has_diabetes: int
    has_hypertension: int
    steps_per_day: int
    active_minutes: int
    calories_burned_active: float
    resting_heart_rate: float
    avg_heart_rate: float
    stress_score: float


@app.post("/predict")
def predict(data: UserInput):
    X = pd.DataFrame([data.model_dump()])
    pred = model.predict(X)[0]

    return {
        "daily_kcal_need": int(round(pred[0])),
        "protein_g_per_day": float(round(pred[1], 1)),
        "carbs_g_per_day": float(round(pred[2], 1)),
        "fat_g_per_day": float(round(pred[3], 1)),
    }


@app.post("/predict-and-save")
def predict_and_save(data: UserInput):
    X = pd.DataFrame([data.model_dump()])
    pred = model.predict(X)[0]

    result = {
        "daily_kcal_need": int(round(pred[0])),
        "protein_g_per_day": float(round(pred[1], 1)),
        "carbs_g_per_day": float(round(pred[2], 1)),
        "fat_g_per_day": float(round(pred[3], 1)),
    }

    db = SessionLocal()
    try:
        # ✅ AUTO user_id generation (user_000001, user_000002...)
        last_id = db.query(func.max(Prediction.id)).scalar()
        next_num = (last_id or 0) + 1
        auto_user_id = f"user_{next_num:06d}"

        row = Prediction(
            user_id=auto_user_id,   # ✅ now automatic
            **data.model_dump(),
            **result
        )

        db.add(row)
        db.commit()
        db.refresh(row)

        return {"saved_id": row.id, "user_id": row.user_id, **result}  # ✅ return user_id too
    finally:
        db.close()


@app.get("/history/{user_id}")
def get_history(user_id: str):
    db = SessionLocal()
    try:
        rows = (
            db.query(Prediction)
            .filter(Prediction.user_id == user_id)
            .order_by(desc(Prediction.created_at))
            .limit(20)
            .all()
        )

        return [
            {
                "id": r.id,
                "user_id": r.user_id,
                "created_at": r.created_at,
                "daily_kcal_need": r.daily_kcal_need,
                "protein_g_per_day": r.protein_g_per_day,
                "carbs_g_per_day": r.carbs_g_per_day,
                "fat_g_per_day": r.fat_g_per_day,
            }
            for r in rows
        ]
    finally:
        db.close()
