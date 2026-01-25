"""
Pydantic models for nutrition prediction endpoints.
"""
from pydantic import BaseModel


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
