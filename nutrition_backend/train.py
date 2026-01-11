import os
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.multioutput import MultiOutputRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# ✅ 1) Load clean dataset
DATA_PATH = "sri_lanka_dataset_1000_inputs_outputs_only.csv"
df = pd.read_csv(DATA_PATH)

# ✅ 2) Inputs (X) and Outputs (y)
feature_cols = [
    "age", "gender", "height_cm", "weight_kg", "goal",
    "has_diabetes", "has_hypertension",
    "steps_per_day", "active_minutes", "calories_burned_active",
    "resting_heart_rate", "avg_heart_rate", "stress_score"
]

target_cols = [
    "daily_kcal_need",
    "protein_g_per_day",
    "carbs_g_per_day",
    "fat_g_per_day"
]

# ✅ 3) Handle missing values (safe)
df["stress_score"] = df["stress_score"].fillna(df["stress_score"].median())
df["active_minutes"] = df["active_minutes"].fillna(df["active_minutes"].median())
df["has_diabetes"] = df["has_diabetes"].fillna(0).astype(int)
df["has_hypertension"] = df["has_hypertension"].fillna(0).astype(int)

# Ensure targets exist
df = df.dropna(subset=target_cols).reset_index(drop=True)

X = df[feature_cols]
y = df[target_cols]

# ✅ 4) Split train/test
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ✅ 5) Preprocess
numeric_features = [
    "age", "height_cm", "weight_kg",
    "has_diabetes", "has_hypertension",
    "steps_per_day", "active_minutes", "calories_burned_active",
    "resting_heart_rate", "avg_heart_rate", "stress_score"
]
categorical_features = ["gender", "goal"]

preprocess = ColumnTransformer(
    transformers=[
        ("num", StandardScaler(), numeric_features),
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
    ]
)

# ✅ 6) Model (baseline, strong for PP1)
rf = RandomForestRegressor(
    n_estimators=400,
    random_state=42,
    n_jobs=-1
)

model = Pipeline(steps=[
    ("preprocess", preprocess),
    ("regressor", MultiOutputRegressor(rf))
])

# ✅ 7) Train
model.fit(X_train, y_train)

# ✅ 8) Evaluate (Regression metrics: MAE, RMSE, R²)
pred = model.predict(X_test)

print("\n=== Model Evaluation (Regression) ===")
for i, col in enumerate(target_cols):
    y_true = y_test[col].values
    y_pred = pred[:, i]

    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)

    print(f"{col}: MAE={mae:.2f} | RMSE={rmse:.2f} | R2={r2:.3f}")

# Optional: one overall score across all outputs (avg)
overall_r2 = r2_score(y_test.values, pred, multioutput="uniform_average")
print(f"\nOverall R2 (average across outputs): {overall_r2:.3f}")

# ✅ 9) Save trained model
os.makedirs("artifacts", exist_ok=True)
joblib.dump(model, "artifacts/nutrition_model.pkl")

print("\n✅ Model saved to: artifacts/nutrition_model.pkl")
