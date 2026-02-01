from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from db import Base


class MealPlan(Base):
    """Stores meal plan metadata (daily target, preferences)."""
    __tablename__ = "meal_plans"

    id = Column(Integer, primary_key=True, index=True)
    daily_calorie_target = Column(Float, nullable=False)
    num_meals = Column(Integer, nullable=False)
    calorie_distribution_ratios = Column(JSON, nullable=True)  # e.g. [0.25, 0.40, 0.35]
    target_macro_ratios = Column(JSON, nullable=True)  # e.g. {"fat": 0.30, "carb": 0.45, "protein": 0.25}
    created_at = Column(DateTime, default=datetime.utcnow)

    meals = relationship("MealPlanMeal", back_populates="meal_plan", cascade="all, delete-orphan")


class MealPlanMeal(Base):
    """Stores each meal in a meal plan."""
    __tablename__ = "meal_plan_meals"

    id = Column(Integer, primary_key=True, index=True)
    meal_plan_id = Column(Integer, ForeignKey("meal_plans.id", ondelete="CASCADE"), nullable=False)
    meal_order = Column(Integer, nullable=False)  # 1, 2, 3, 4...
    dish_id = Column(String, nullable=False)
    total_calories = Column(Float, nullable=False)
    total_fat = Column(Float, default=0)
    total_carb = Column(Float, default=0)
    total_protein = Column(Float, default=0)
    total_mass = Column(Float, nullable=True)
    ingredients = Column(String, nullable=True)  # Comma-separated string for display
    created_at = Column(DateTime, default=datetime.utcnow)

    meal_plan = relationship("MealPlan", back_populates="meals")


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
