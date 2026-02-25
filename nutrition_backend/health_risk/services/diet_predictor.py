import pandas as pd
import traceback

from health_risk.core import model_loader
from health_risk.core.input_mapper import map_inputs_for_diet_model
from health_risk.core.feature_engineering import engineer_features_v3
from health_risk.store.explanation import DIET_INFO


def predict_diet(user_data):
    """Get diet recommendation using the V3 model."""
    try:
        diet_input = map_inputs_for_diet_model(user_data)

        df = pd.DataFrame([diet_input])
        df = engineer_features_v3(df)

        categorical_columns = [
            'Gender', 'Disease_Type', 'Severity',
            'Physical_Activity_Level', 'Dietary_Restrictions',
            'Allergies', 'Disease_Severity_Combo',
        ]

        for col in categorical_columns:
            if col in df.columns and col in model_loader.diet_encoders:
                value = str(df[col].iloc[0])
                if value not in model_loader.diet_encoders[col].classes_:
                    value = model_loader.diet_encoders[col].classes_[0]
                df[col] = model_loader.diet_encoders[col].transform([value])

        for feature in model_loader.feature_names:
            if feature not in df.columns:
                df[feature] = 0

        df = df[model_loader.feature_names]

        prediction = model_loader.diet_model.predict(df)[0]
        probabilities = model_loader.diet_model.predict_proba(df)[0]
        all_probs = {
            diet: float(prob)
            for diet, prob in zip(model_loader.diet_model.classes_, probabilities)
        }

        return {
            'recommended_diet': prediction,
            'confidence': float(max(probabilities) * 100),
            'all_probabilities': all_probs,
            'diet_info': DIET_INFO.get(prediction, {}),
        }

    except Exception as e:
        print(f"Diet prediction error: {e}")
        traceback.print_exc()
        return None