"""
Pytest configuration and fixtures for testing.
"""
import pytest
import pytest_asyncio
import os
from httpx import AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Import app and database components
from app import app
from db import Base, SessionLocal
from database_models import Prediction


# Test database URL (in-memory SQLite for testing)
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def test_db():
    """Create a test database session."""
    # Create in-memory SQLite database
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    db = TestingSessionLocal()
    
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest_asyncio.fixture(scope="function")
async def client():
    """Create an async test client."""
    # Use httpx AsyncClient with ASGI transport
    from httpx import ASGITransport
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


@pytest.fixture
def sample_user_input():
    """Sample user input data for testing."""
    return {
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
    }


@pytest.fixture
def sample_meal_request():
    """Sample meal suggestion request data."""
    return {
        "total_calories": 2000.0,
        "meals_per_day": 3,
        "calorie_distribution_ratios": [0.3, 0.4, 0.3],
        "target_macro_ratios": {
            "protein": 0.3,
            "carbs": 0.4,
            "fat": 0.3
        }
    }


@pytest.fixture
def sample_image_bytes():
    """Create a sample image file for testing."""
    from PIL import Image
    import io
    
    # Create a simple test image
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return img_bytes.read()


@pytest.fixture
def mock_nutrition_model(monkeypatch):
    """Mock the nutrition model loading."""
    import joblib
    from unittest.mock import MagicMock
    
    # Create a mock model
    mock_model = MagicMock()
    mock_model.predict.return_value = [[2000, 150.0, 250.0, 65.0]]  # kcal, protein, carbs, fat
    
    # Mock joblib.load to return our mock model
    def mock_load(path):
        return mock_model
    
    monkeypatch.setattr(joblib, "load", mock_load)
    return mock_model
