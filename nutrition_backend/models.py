from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from db import Base

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)

    age = Column(Integer)
    gender = Column(String)
    height_cm = Column(Float)
    weight_kg = Column(Float)
    goal = Column(String)

    has_diabetes = Column(Integer)
    has_hypertension = Column(Integer)

    steps_per_day = Column(Integer)
    active_minutes = Column(Integer)
    calories_burned_active = Column(Float)

    resting_heart_rate = Column(Float)
    avg_heart_rate = Column(Float)
    stress_score = Column(Float)

    daily_kcal_need = Column(Integer)
    protein_g_per_day = Column(Float)
    carbs_g_per_day = Column(Float)
    fat_g_per_day = Column(Float)

    created_at = Column(DateTime, default=datetime.utcnow)
