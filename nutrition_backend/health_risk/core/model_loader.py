import joblib

# Global model references
diet_model = None
diet_encoders = None
feature_names = []

risk_model = None
risk_encoders = None
scaler = None
target_encoder = None


class DietModelWrapper:
    """Wrapper to handle string labels for backend compatibility."""

    def __init__(self, model, label_encoder):
        self.model = model
        self.label_encoder = label_encoder

    def predict(self, X):
        predictions = self.model.predict(X)
        return self.label_encoder.inverse_transform(predictions)

    def predict_proba(self, X):
        return self.model.predict_proba(X)

    @property
    def classes_(self):
        return self.label_encoder.classes_


def load_models():
    global diet_model, diet_encoders, feature_names
    global risk_model, risk_encoders, scaler, target_encoder

    # Diet Recommendation Model
    try:
        diet_model = joblib.load('risk_models/diet_recommendation_model_v3.pkl')
        diet_encoders = joblib.load('risk_models/label_encoders_v3.pkl')
        feature_names = joblib.load('risk_models/feature_names_v3.pkl')
        print("✓ Diet Recommendation Model loaded!")
    except Exception as e:
        print(f"❌ Error loading diet model: {e}")

    # Health Risk Model
    try:
        risk_model = joblib.load('risk_models/health_risk_model.pkl')
        risk_encoders = joblib.load('risk_models/label_encoders.pkl')
        scaler = joblib.load('risk_models/scaler.pkl')
        target_encoder = joblib.load('risk_models/target_encoder.pkl')
        print("✓ Health Risk Model loaded!")
        print("✓ All preprocessing objects loaded!")
    except Exception as e:
        print(f"❌ Error loading risk model: {e}")