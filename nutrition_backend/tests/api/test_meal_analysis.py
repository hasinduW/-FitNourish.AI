"""
Tests for meal analysis API endpoints.
"""
import pytest
from unittest.mock import patch, MagicMock
import base64

# Client fixture is defined in conftest.py


@pytest.fixture
def sample_image_file():
    """Create a sample image file for testing."""
    from PIL import Image
    import io
    
    # Create a simple test image
    img = Image.new('RGB', (320, 320), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return ("test_image.jpg", img_bytes.read(), "image/jpeg")


class TestAnalyzeMeal:
    """Tests for meal analysis endpoint."""
    
    @pytest.mark.asyncio
    async def test_analyze_meal_success(self, client, sample_image_file):
        """Test successful meal analysis."""
        mock_nutrients = {
            'protein': 25.0,
            'fat': 10.0,
            'carbs': 30.0,
            'calories': 310.0
        }
        mock_ingredients = {
            'predictions': ['chicken', 'rice', 'vegetables'],
            'probabilities': [85.5, 70.2, 60.1]
        }
        
        with patch('app.predict_nutrients_from_image', return_value=mock_nutrients):
            with patch('app.predict_ingredients_from_image', return_value=mock_ingredients):
                files = {"image": sample_image_file}
                response = await client.post("/api/analyze-meal", files=files)
                
                assert response.status_code == 200
                data = response.json()
                assert "ingredients" in data
                assert "nutrients" in data
                assert "calories_per_100g" in data
                assert len(data["ingredients"]) > 0
                assert len(data["nutrients"]) > 0
                assert data["calories_per_100g"] > 0
    
    @pytest.mark.asyncio
    async def test_analyze_meal_no_image(self, client):
        """Test meal analysis without image."""
        response = await client.post("/api/analyze-meal")
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_analyze_meal_model_not_found(self, client, sample_image_file):
        """Test meal analysis when model is not found."""
        with patch('app.predict_nutrients_from_image', side_effect=FileNotFoundError("Model not found")):
            files = {"image": sample_image_file}
            response = await client.post("/api/analyze-meal", files=files)
            assert response.status_code == 503
            assert "not available" in response.json()["detail"].lower()
    
    @pytest.mark.asyncio
    async def test_analyze_meal_invalid_image(self, client):
        """Test meal analysis with invalid image."""
        files = {"image": ("test.txt", b"not an image", "text/plain")}
        response = await client.post("/api/analyze-meal", files=files)
        # Should handle gracefully or return error
        assert response.status_code in [400, 422, 500]


class TestSuggestMeals:
    """Tests for meal suggestion endpoint."""
    
    @pytest.mark.asyncio
    async def test_suggest_meals_success(self, client, sample_meal_request):
        """Test successful meal suggestion."""
        mock_meal_plan = [
            {
                'dish': 'Grilled Chicken',
                'total_calories': 600.0,
                'total_fat': 15.0,
                'total_carb': 45.0,
                'total_protein': 50.0,
                'total_mass': 200.0,
                'ingredients_list': ['chicken', 'rice', 'vegetables'],
                'rgb_image': base64.b64encode(b'fake_image_data').decode('utf-8').encode()
            },
            {
                'dish': 'Salmon Salad',
                'total_calories': 800.0,
                'total_fat': 20.0,
                'total_carb': 30.0,
                'total_protein': 60.0,
                'total_mass': 250.0,
                'ingredients_list': ['salmon', 'lettuce', 'tomato'],
                'rgb_image': base64.b64encode(b'fake_image_data').decode('utf-8').encode()
            },
            {
                'dish': 'Pasta',
                'total_calories': 600.0,
                'total_fat': 10.0,
                'total_carb': 80.0,
                'total_protein': 25.0,
                'total_mass': 300.0,
                'ingredients_list': ['pasta', 'sauce', 'cheese'],
                'rgb_image': base64.b64encode(b'fake_image_data').decode('utf-8').encode()
            }
        ]
        
        with patch('app.generate_meal_plan', return_value=mock_meal_plan):
            response = await client.post("/api/suggest-meals", json=sample_meal_request)
            
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 3  # 3 meals per day
            
            # Check meal structure
            meal = data[0]
            assert "meal_name" in meal
            assert "calories" in meal
            assert "time" in meal
            assert "description" in meal
            assert "image" in meal
            assert "ingredients" in meal
            assert "nutrients" in meal
            assert "mass" in meal
    
    @pytest.mark.asyncio
    async def test_suggest_meals_different_meal_counts(self, client):
        """Test meal suggestions for different meal counts."""
        mock_meal_plan = [
            {'dish': 'Meal 1', 'total_calories': 1000.0, 'total_fat': 20.0, 
             'total_carb': 100.0, 'total_protein': 50.0, 'total_mass': 300.0,
             'ingredients_list': ['item1'], 'rgb_image': b''},
            {'dish': 'Meal 2', 'total_calories': 1000.0, 'total_fat': 20.0,
             'total_carb': 100.0, 'total_protein': 50.0, 'total_mass': 300.0,
             'ingredients_list': ['item2'], 'rgb_image': b''}
        ]
        
        with patch('app.generate_meal_plan', return_value=mock_meal_plan):
            # Test with 2 meals
            request_2_meals = {
                "total_calories": 2000.0,
                "meals_per_day": 2
            }
            response = await client.post("/api/suggest-meals", json=request_2_meals)
            assert response.status_code == 200
            assert len(response.json()) == 2
    
    @pytest.mark.asyncio
    async def test_suggest_meals_invalid_request(self, client):
        """Test meal suggestion with invalid request."""
        # Test with negative calories
        invalid_request_1 = {
            "total_calories": -100,  # Invalid negative calories
            "meals_per_day": 3
        }
        response = await client.post("/api/suggest-meals", json=invalid_request_1)
        assert response.status_code == 422  # Validation error
        
        # Test with zero meals
        invalid_request_2 = {
            "total_calories": 2000.0,
            "meals_per_day": 0  # Invalid meal count
        }
        response = await client.post("/api/suggest-meals", json=invalid_request_2)
        assert response.status_code == 422  # Validation error
        
        # Test with too many meals
        invalid_request_3 = {
            "total_calories": 2000.0,
            "meals_per_day": 15  # Too many meals (max is 10)
        }
        response = await client.post("/api/suggest-meals", json=invalid_request_3)
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_suggest_meals_missing_fields(self, client):
        """Test meal suggestion with missing required fields."""
        incomplete_request = {
            "total_calories": 2000.0
            # Missing meals_per_day
        }
        response = await client.post("/api/suggest-meals", json=incomplete_request)
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_suggest_meals_service_error(self, client, sample_meal_request):
        """Test meal suggestion when service raises an error."""
        with patch('app.generate_meal_plan', side_effect=Exception("Service error")):
            response = await client.post("/api/suggest-meals", json=sample_meal_request)
            assert response.status_code == 500
            assert "error" in response.json()["detail"].lower()
