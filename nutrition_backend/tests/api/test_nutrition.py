"""
Tests for nutrition prediction API endpoints.
"""
import pytest
from unittest.mock import patch, MagicMock
import pandas as pd

from database_models import Prediction

# Client fixture is defined in conftest.py


class TestHealthEndpoint:
    """Tests for health check endpoint."""
    
    @pytest.mark.asyncio
    async def test_home_endpoint(self, client):
        """Test the home/root endpoint."""
        response = await client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "OK"
        assert "message" in response.json()
    
    @pytest.mark.asyncio
    async def test_health_endpoint(self, client):
        """Test the health check endpoint."""
        response = await client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestNutritionPrediction:
    """Tests for nutrition prediction endpoints."""
    
    @pytest.mark.asyncio
    async def test_predict_endpoint_success(self, client, sample_user_input, mock_nutrition_model):
        """Test successful nutrition prediction."""
        with patch('app.model', mock_nutrition_model):
            response = await client.post("/predict", json=sample_user_input)
            
            assert response.status_code == 200
            data = response.json()
            assert "daily_kcal_need" in data
            assert "protein_g_per_day" in data
            assert "carbs_g_per_day" in data
            assert "fat_g_per_day" in data
            assert isinstance(data["daily_kcal_need"], int)
            assert isinstance(data["protein_g_per_day"], float)
    
    @pytest.mark.asyncio
    async def test_predict_endpoint_model_not_available(self, client, sample_user_input):
        """Test prediction when model is not available."""
        with patch('app.model', None):
            response = await client.post("/predict", json=sample_user_input)
            
            assert response.status_code == 503
            assert "not available" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_predict_endpoint_invalid_input(self, client):
        """Test prediction with invalid input data."""
        invalid_input = {
            "age": "not_a_number",  # Invalid type
            "gender": "male",
            # Missing required fields
        }
        response = await client.post("/predict", json=invalid_input)
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_predict_endpoint_missing_fields(self, client):
        """Test prediction with missing required fields."""
        incomplete_input = {
            "age": 30,
            "gender": "male"
            # Missing other required fields
        }
        response = await client.post("/predict", json=incomplete_input)
        assert response.status_code == 422  # Validation error


class TestPredictAndSave:
    """Tests for predict-and-save endpoint."""
    
    @pytest.mark.asyncio
    async def test_predict_and_save_success(self, client, sample_user_input, test_db, mock_nutrition_model):
        """Test successful prediction and save to database."""
        with patch('app.model', mock_nutrition_model):
            with patch('app.SessionLocal', return_value=test_db):
                response = await client.post("/predict-and-save", json=sample_user_input)
                
                assert response.status_code == 200
                data = response.json()
                assert "saved_id" in data
                assert "user_id" in data
                assert "daily_kcal_need" in data
                assert data["user_id"].startswith("user_")
                
                # Verify data was saved to database
                saved_prediction = test_db.query(Prediction).filter(
                    Prediction.user_id == data["user_id"]
                ).first()
                assert saved_prediction is not None
                assert saved_prediction.age == sample_user_input["age"]
    
    @pytest.mark.asyncio
    async def test_predict_and_save_model_not_available(self, client, sample_user_input):
        """Test predict-and-save when model is not available."""
        with patch('app.model', None):
            response = await client.post("/predict-and-save", json=sample_user_input)
            assert response.status_code == 503


class TestHistoryEndpoint:
    """Tests for prediction history endpoint."""
    
    @pytest.mark.asyncio
    async def test_get_history_empty(self, client, test_db):
        """Test getting history for user with no predictions."""
        with patch('app.SessionLocal', return_value=test_db):
            response = await client.get("/history/user_000001")
            assert response.status_code == 200
            assert response.json() == []
    
    @pytest.mark.asyncio
    async def test_get_history_with_data(self, client, sample_user_input, test_db, mock_nutrition_model):
        """Test getting history for user with predictions."""
        with patch('app.model', mock_nutrition_model):
            with patch('app.SessionLocal', return_value=test_db):
                # Create a prediction first
                pred_response = await client.post("/predict-and-save", json=sample_user_input)
                user_id = pred_response.json()["user_id"]
                
                # Get history
                response = await client.get(f"/history/{user_id}")
                assert response.status_code == 200
                data = response.json()
                assert len(data) > 0
                assert "id" in data[0]
                assert "user_id" in data[0]
                assert "created_at" in data[0]
                assert data[0]["user_id"] == user_id
    
    @pytest.mark.asyncio
    async def test_get_history_limit(self, client, sample_user_input, test_db, mock_nutrition_model):
        """Test that history endpoint limits results to 20."""
        with patch('app.model', mock_nutrition_model):
            with patch('app.SessionLocal', return_value=test_db):
                # Create multiple predictions
                user_id = None
                for _ in range(25):
                    pred_response = await client.post("/predict-and-save", json=sample_user_input)
                    user_id = pred_response.json()["user_id"]
                
                # Get history - should be limited to 20
                response = await client.get(f"/history/{user_id}")
                assert response.status_code == 200
                assert len(response.json()) <= 20
