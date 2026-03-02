# Nutrition Backend API

FastAPI backend for nutrition prediction and meal planning.

## Prerequisites

- Python 3.9+
- **MongoDB Atlas** (database; connection string is configured in `db.py`)
- Model file: `artifacts/nutrition_model.pkl`

## Quick Start

### 1. Setup Environment

```bash
# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Database (MongoDB Atlas)

The backend uses **MongoDB Atlas**. The connection string and database name are set in `db.py` (no `.env` file is required for basic setup).

- **Database name**: `fitnourish-ai`
- **Collections**: `predictions`, `meal_plans`, `patient_profiles`, `diet_principles`, `health_assessments` (created on first use)

For production, move the connection string to an environment variable and load it in `db.py`.

### 3. Initialize Database (Indexes)

```bash
python init_db.py
```

This creates the recommended indexes on the MongoDB collections. Collections themselves are created when the app first writes data.

### 4. Setup Model

Place trained model at `artifacts/nutrition_model.pkl` or train using:
```bash
python train.py
```

### 5. Run Server

```bash
source venv/bin/activate
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

## Running Tests

### Run all tests
```bash
pytest
```

### Run with coverage report
```bash
pytest --cov=. --cov-report=html
```

### Run specific test file
```bash
pytest tests/api/test_nutrition.py
```

### Run only fast tests (skip slow ones)
```bash
pytest -m "not slow"
```

**Note**: Some tests were written for the previous PostgreSQL/SQLAlchemy setup and may need to be updated for MongoDB (e.g. use a test database or mongomock). Coverage reports are generated in `htmlcov/`. See `tests/README.md` for detailed testing documentation.

## API Access

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **API Root**: http://localhost:8000/

## API Endpoints

- `GET /` - Health check
- `POST /predict` - Get nutrition predictions (doesn't save to DB)
- `POST /predict-and-save` - Get predictions and save to database
- `GET /history/{user_id}` - Get prediction history for a user
- Meal analysis, meal plan, health risk, patient profile, diet principles, and analytics endpoints as configured in the app.

## Example Request

```bash
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "age": 30,
    "gender": "male",
    "height_cm": 175.0,
    "weight_kg": 75.0,
    "goal": "weight_loss",
    "has_diabetes": 0,
    "has_hypertension": 0,
    "steps_per_day": 8000,
    "active_minutes": 30,
    "calories_burned_active": 200.0,
    "resting_heart_rate": 65.0,
    "avg_heart_rate": 75.0,
    "stress_score": 3.0
  }'
```

## Troubleshooting

**Model file not found**: Ensure `artifacts/nutrition_model.pkl` exists or run `python train.py`

**Database connection error**: Check your MongoDB Atlas connection string in `db.py`, network access (IP allowlist), and that the cluster is running.

**Port already in use**: Use a different port: `uvicorn app:app --reload --port 8001`
