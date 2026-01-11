import joblib
import pandas as pd

# Load trained model
model = joblib.load("artifacts/nutrition_model.pkl")

# Example new user (change values as you want)
new_user = {
    "age": 24,
    "gender": "Female",
    "height_cm": 158,
    "weight_kg": 55,
    "goal": "Maintain",
    "has_diabetes": 0,
    "has_hypertension": 1,
    "steps_per_day": 8500,
    "active_minutes": 55,
    "calories_burned_active": 380,
    "resting_heart_rate": 70,
    "avg_heart_rate": 95,
    "stress_score": 50
}

X = pd.DataFrame([new_user])
pred = model.predict(X)[0]

print("\n✅ Predicted outputs:")
print("daily_kcal_need:", round(pred[0]))
print("protein_g_per_day:", round(pred[1], 1))
print("carbs_g_per_day:", round(pred[2], 1))
print("fat_g_per_day:", round(pred[3], 1))
