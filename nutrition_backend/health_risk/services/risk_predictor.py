import pandas as pd

from health_risk.core import model_loader
from health_risk.core.input_mapper import map_inputs_for_risk_model
from health_risk.store.explanation import RISK_EXPLANATIONS


def predict_health_risk(user_data):
    """Run health risk assessment using the trained model."""
    if model_loader.risk_model is None or model_loader.risk_encoders is None:
        return None

    try:
        mapped_data = map_inputs_for_risk_model(user_data)
        input_df = pd.DataFrame([mapped_data])

        categorical_cols = ['exercise', 'sugar_intake', 'smoking', 'alcohol', 'married', 'profession']

        for col in categorical_cols:
            if col in input_df.columns and col in model_loader.risk_encoders:
                value = str(input_df[col].iloc[0])
                if value not in model_loader.risk_encoders[col].classes_:
                    print(f"Warning: '{value}' not in training data for {col}. Using default.")
                    input_df[col] = model_loader.risk_encoders[col].classes_[0]
                input_df[col] = model_loader.risk_encoders[col].transform(input_df[col].astype(str))

        input_scaled = model_loader.scaler.transform(input_df)

        prediction = model_loader.risk_model.predict(input_scaled)
        prediction_proba = model_loader.risk_model.predict_proba(input_scaled)

        risk_level = model_loader.target_encoder.inverse_transform(prediction)[0]

        proba_dict = {
            class_name: prediction_proba[0][i]
            for i, class_name in enumerate(model_loader.target_encoder.classes_)
        }

        return {
            'risk_level': risk_level,
            'probabilities': proba_dict,
            'confidence': max(proba_dict.values()) * 100,
            'risk_info': RISK_EXPLANATIONS.get(risk_level, RISK_EXPLANATIONS['medium']),
        }

    except Exception as e:
        print(f"Risk prediction error: {e}")
        return None