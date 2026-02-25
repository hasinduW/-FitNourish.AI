from datetime import datetime, date
from sqlalchemy.orm import Session
from models.healthinfo import HealthAssessment
import traceback


def store_health_assessment(db: Session, user_data, risk_result, diet_result):
    """
    Store or update health assessment data in PostgreSQL
    """
    try:
        today = date.today()

        # Calculate BMI
        bmi = round(user_data['weight'] / ((user_data['height'] / 100) ** 2), 1)

        # Check if record exists for this user and date
        existing = db.query(HealthAssessment).filter_by(
            user_id=int(user_data.get('userId')),
            date=today
        ).first()

        if existing:
            # Update existing record
            existing.timestamp        = datetime.now()
            existing.blood_pressure   = user_data.get('blood_pressure')
            existing.glucose          = user_data.get('glucose')
            existing.cholesterol      = user_data.get('cholesterol')
            existing.exercise_hours   = user_data.get('exercise_hours', 0)
            existing.daily_calories   = user_data.get('daily_caloric_intake')
            existing.sleep_hours      = user_data.get('sleep', 0)
            existing.weight           = user_data['weight']
            existing.height           = user_data['height']
            existing.bmi              = bmi
            existing.risk_level       = risk_result.get('risk_level', 'Unknown')
            existing.risk_score       = risk_result.get('risk_score')
            existing.recommended_diet = diet_result.get('recommended_diet', 'Unknown')
            existing.diet_confidence  = diet_result.get('confidence')

            db.commit()
            print(f"✓ Assessment UPDATED for user {existing.user_id}")

        else:
            # Create new record
            new_assessment = HealthAssessment(
                user_id         = user_data.get('userId', 0),
                date            = today,
                timestamp       = datetime.now(),
                blood_pressure  = user_data.get('blood_pressure'),
                glucose         = user_data.get('glucose'),
                cholesterol     = user_data.get('cholesterol'),
                exercise_hours  = user_data.get('exercise_hours', 0),
                daily_calories  = user_data.get('daily_caloric_intake'),
                sleep_hours     = user_data.get('sleep', 0),
                weight          = user_data['weight'],
                height          = user_data['height'],
                bmi             = bmi,
                risk_level      = risk_result.get('risk_level', 'Unknown'),
                risk_score      = risk_result.get('risk_score'),
                recommended_diet= diet_result.get('recommended_diet', 'Unknown'),
                diet_confidence = diet_result.get('confidence'),
            )

            db.add(new_assessment)
            db.commit()
            print(f"✓ New assessment CREATED for user {new_assessment.user_id}")

        return True

    except Exception as e:
        db.rollback()
        print(f"PostgreSQL Error: {str(e)}")
        traceback.print_exc()
        return False