# Test Suite Documentation

## Overview

This directory contains the test suite for the Nutrition & Meal Prediction API.

## Structure

```
tests/
├── __init__.py
├── conftest.py              # Pytest fixtures and configuration
├── api/
│   ├── __init__.py
│   ├── test_nutrition.py    # Tests for nutrition prediction endpoints
│   └── test_meal_analysis.py # Tests for meal analysis endpoints
└── services/
    ├── __init__.py
    └── test_predictors.py   # Tests for prediction services
```

## Running Tests

### Run all tests
```bash
pytest
```

### Run with coverage
```bash
pytest --cov=. --cov-report=html
```

### Run specific test file
```bash
pytest tests/api/test_nutrition.py
```

### Run specific test class
```bash
pytest tests/api/test_nutrition.py::TestNutritionPrediction
```

### Run specific test
```bash
pytest tests/api/test_nutrition.py::TestNutritionPrediction::test_predict_endpoint_success
```

### Run with verbose output
```bash
pytest -v
```

### Run only fast tests (skip slow ones)
```bash
pytest -m "not slow"
```

## Test Categories

### Unit Tests
- Test individual functions and methods in isolation
- Use mocks for external dependencies
- Fast execution

### Integration Tests
- Test API endpoints with test database
- Test service interactions
- May require more setup

## Fixtures

### Available Fixtures (in conftest.py)

- `test_db`: In-memory SQLite database session
- `client`: FastAPI test client
- `sample_user_input`: Sample user input data
- `sample_meal_request`: Sample meal suggestion request
- `sample_image_bytes`: Sample image bytes for testing
- `mock_nutrition_model`: Mock nutrition prediction model

## Writing New Tests

1. Import necessary fixtures from conftest.py
2. Use descriptive test names starting with `test_`
3. Use pytest fixtures for setup/teardown
4. Mock external dependencies (models, file system, etc.)
5. Assert expected behavior and edge cases

## Example Test

```python
def test_predict_endpoint_success(client, sample_user_input, mock_nutrition_model):
    """Test successful nutrition prediction."""
    with patch('app.model', mock_nutrition_model):
        response = client.post("/predict", json=sample_user_input)
        
        assert response.status_code == 200
        data = response.json()
        assert "daily_kcal_need" in data
```

## Notes

- Tests use an in-memory SQLite database for speed
- ML models are mocked to avoid loading large files
- Some tests are skipped if they require complex setup or actual model files
- Coverage reports are generated in `htmlcov/` directory
