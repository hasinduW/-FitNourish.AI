from sqlalchemy import Column, Integer, Float, String, Date, DateTime, UniqueConstraint
from sqlalchemy.orm import declarative_base
from datetime import datetime, date

Base = declarative_base()


class HealthAssessment(Base):
    __tablename__ = 'health_assessments'

    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # User & Date Info
    user_id = Column(Integer, nullable=False)
    date = Column(Date, nullable=False, default=date.today)
    timestamp = Column(DateTime, default=datetime.now)

    # Health Metrics
    blood_pressure = Column(String(20))
    glucose = Column(Float)
    cholesterol = Column(Float)

    # Lifestyle Data
    exercise_hours = Column(Float)
    daily_calories = Column(Float)
    sleep_hours = Column(Float)
    weight = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    bmi = Column(Float)

    # Assessment Results
    risk_level = Column(String(50))
    risk_score = Column(Float)
    recommended_diet = Column(String(100))
    diet_confidence = Column(Float)

    # Unique constraint: one record per user per day
    __table_args__ = (
        UniqueConstraint('user_id', 'date', name='unique_user_date'),
    )

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'userId': self.user_id,
            'date': self.date.isoformat() if self.date else None,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'bloodPressure': self.blood_pressure,
            'glucose': self.glucose,
            'cholesterol': self.cholesterol,
            'exerciseHours': self.exercise_hours,
            'dailyCalories': self.daily_calories,
            'sleepHours': self.sleep_hours,
            'weight': self.weight,
            'height': self.height,
            'bmi': self.bmi,
            'riskLevel': self.risk_level,
            'riskScore': self.risk_score,
            'recommendedDiet': self.recommended_diet,
            'dietConfidence': self.diet_confidence,
        }