from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List
import joblib
import pandas as pd
import uvicorn
from io import BytesIO
import base64

from db import SessionLocal
from database_models import Prediction  # SQLAlchemy model
from sqlalchemy import desc, func
from services.nutrients_predictor import predict_nutrients_from_image
from services.ingredient_predictor import predict_ingredients_from_image
from services.meal_plan_predictor import generate_meal_plan
from models import (  # Pydantic models
    UserInput,
    MealSuggestionRequest,
    Nutrient,
    Ingredient,
    MealAnalysisResponse,
    MealNutrient,
    MealSuggestion,
)

app = FastAPI(title="Nutrition & Meal Prediction API")

# CORS Middleware - Combined origins from both files
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:5173",  # Vite default port
        "http://localhost:3000",  # React default port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load nutrition model once when server starts (if exists)
try:
    model = joblib.load("artifacts/nutrition_model.pkl")
except FileNotFoundError:
    model = None
    print("Warning: nutrition_model.pkl not found. Nutrition prediction endpoints will not work.")


# ✅ Home route (so / doesn't show 404)
@app.get("/")
def home():
    return {"status": "OK", "message": "Nutrition Model API running. Visit /docs"}


@app.post("/predict")
def predict(data: UserInput):
    if model is None:
        raise HTTPException(status_code=503, detail="Nutrition model not available")
    
    X = pd.DataFrame([data.model_dump()])
    pred = model.predict(X)[0]

    return {
        "daily_kcal_need": int(round(pred[0])),
        "protein_g_per_day": float(round(pred[1], 1)),
        "carbs_g_per_day": float(round(pred[2], 1)),
        "fat_g_per_day": float(round(pred[3], 1)),
    }


@app.post("/predict-and-save")
def predict_and_save(data: UserInput):
    if model is None:
        raise HTTPException(status_code=503, detail="Nutrition model not available")
    
    X = pd.DataFrame([data.model_dump()])
    pred = model.predict(X)[0]

    result = {
        "daily_kcal_need": int(round(pred[0])),
        "protein_g_per_day": float(round(pred[1], 1)),
        "carbs_g_per_day": float(round(pred[2], 1)),
        "fat_g_per_day": float(round(pred[3], 1)),
    }

    db = SessionLocal()
    try:
        # ✅ AUTO user_id generation (user_000001, user_000002...)
        last_id = db.query(func.max(Prediction.id)).scalar()
        next_num = (last_id or 0) + 1
        auto_user_id = f"user_{next_num:06d}"

        row = Prediction(
            user_id=auto_user_id,   # ✅ now automatic
            **data.model_dump(),
            **result
        )

        db.add(row)
        db.commit()
        db.refresh(row)

        return {"saved_id": row.id, "user_id": row.user_id, **result}  # ✅ return user_id too
    finally:
        db.close()


@app.get("/history/{user_id}")
def get_history(user_id: str):
    db = SessionLocal()
    try:
        rows = (
            db.query(Prediction)
            .filter(Prediction.user_id == user_id)
            .order_by(desc(Prediction.created_at))
            .limit(20)
            .all()
        )

        return [
            {
                "id": r.id,
                "user_id": r.user_id,
                "created_at": r.created_at,
                "daily_kcal_need": r.daily_kcal_need,
                "protein_g_per_day": r.protein_g_per_day,
                "carbs_g_per_day": r.carbs_g_per_day,
                "fat_g_per_day": r.fat_g_per_day,
            }
            for r in rows
        ]
    finally:
        db.close()


# ============================================================================
# Meal Analysis Endpoints
# ============================================================================

@app.post("/api/analyze-meal", response_model=MealAnalysisResponse)
async def analyze_meal(image: UploadFile = File(...)):
    """
    Analyze uploaded meal image and return ingredients, nutrients, and calories.
    Uses ML models to predict both ingredients and nutrients from the image.
    """
    try:
        # Read image bytes once
        image_bytes = await image.read()
        
        # Reset file pointer for future reads if needed
        await image.seek(0)
        
        # Create mock UploadFile-like objects for the predictors
        # The predictors read from image_file.file.read()
        class MockUploadFile:
            def __init__(self, image_bytes):
                self.file = BytesIO(image_bytes)
        
        nutrients_upload = MockUploadFile(image_bytes)
        ingredients_upload = MockUploadFile(image_bytes)
        
        # Use ML prediction service to get nutrients from image
        nutrients_output = predict_nutrients_from_image(nutrients_upload)
        
        # Use ML prediction service to get ingredients from image
        ingredients_output = predict_ingredients_from_image(ingredients_upload)
        
        # Extract values from nutrients ML prediction (per 100g)
        protein = nutrients_output.get('protein', 0)
        fat = nutrients_output.get('fat', 0)
        carbs = nutrients_output.get('carbs', 0)
        calories_per_100g = nutrients_output.get('calories', 0)
        
        # Extract ingredient predictions
        ingredient_names = ingredients_output.get('predictions', [])
        ingredient_probabilities = ingredients_output.get('probabilities', [])
        
        # Calculate total macronutrients for percentage calculations
        total_macros = protein + carbs + fat
        total_calories = protein * 4 + carbs * 4 + fat * 9
        
        # Calculate percentages (based on typical daily values)
        # Daily reference values: Protein ~50g, Carbs ~300g, Fat ~65g
        protein_percentage = (protein / 50) * 100 if protein > 0 else 0
        carbs_percentage = (carbs / 300) * 100 if carbs > 0 else 0
        fat_percentage = (fat / 65) * 100 if fat > 0 else 0
        
        # Build ingredients list from ML predictions
        # Since we don't have exact amounts, we'll estimate based on probabilities
        # and distribute 100g across detected ingredients proportionally
        ingredients = []
        total_probability = sum(ingredient_probabilities) if ingredient_probabilities else 1
        
        for i, (ingredient_name, probability) in enumerate(zip(ingredient_names, ingredient_probabilities)):
            # Calculate estimated amount based on probability (proportional to confidence)
            # Distribute 100g total across ingredients weighted by their probabilities
            if total_probability > 0:
                estimated_amount = (probability / total_probability) * 100
            else:
                estimated_amount = 100 / len(ingredient_names) if ingredient_names else 100
            
            # Only include ingredients with reasonable confidence (>10%)
            if probability >= 5.0:
                ingredients.append({
                    "name": ingredient_name.title(),  # Capitalize ingredient names
                    "amount": round(estimated_amount, 1),
                    "unit": "g",
                    "possibility": round(probability, 1)
                })
        
        # If no ingredients meet the threshold, include top prediction anyway
        if not ingredients and ingredient_names:
            ingredients.append({
                "name": ingredient_names[0].title(),
                "amount": 100.0,
                "unit": "g",
                "possibility": round(ingredient_probabilities[0], 1) if ingredient_probabilities else 50.0
            })
        
        # Build nutrients list from ML predictions
        nutrients = []
        
        if protein > 0:
            nutrients.append({
                "name": "Protein",
                "amount": round(protein, 2),
                "unit": "g",
                "percentage": round(protein_percentage, 1)
            })
        
        if carbs > 0:
            nutrients.append({
                "name": "Carbohydrates",
                "amount": round(carbs, 2),
                "unit": "g",
                "percentage": round(carbs_percentage, 1)
            })
        
        if fat > 0:
            nutrients.append({
                "name": "Fat",
                "amount": round(fat, 2),
                "unit": "g",
                "percentage": round(fat_percentage, 1)
            })
        
        # Build response in expected format
        response = {
            "ingredients": ingredients,
            "nutrients": nutrients,
            "calories_per_100g": round(calories_per_100g, 2)
        }
        
        return response
        
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=f"ML model not available: {str(e)}. Please ensure the model file is in the correct location."
        )
    except ValueError as e:
        import traceback
        error_detail = f"Error processing image: {str(e)}"
        print(f"ValueError in analyze_meal: {error_detail}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=400,
            detail=error_detail
        )
    except Exception as e:
        import traceback
        error_detail = f"Internal server error: {str(e)}"
        print(f"Exception in analyze_meal: {error_detail}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=error_detail
        )


@app.post("/api/suggest-meals", response_model=List[MealSuggestion])
async def suggest_meals(request: MealSuggestionRequest):
    """
    Suggest meals based on total daily calories and number of meals per day.
    Uses ML model to generate personalized meal plans.
    """
    try:
        total_calories = request.total_calories
        meals_per_day = request.meals_per_day
        
        # Meal templates for meal names and times
        meal_templates = {
            2: [
                {"meal_name": "Breakfast", "time": "09:00 AM"},
                {"meal_name": "Dinner", "time": "07:00 PM"}
            ],
            3: [
                {"meal_name": "Breakfast", "time": "08:00 AM"},
                {"meal_name": "Lunch", "time": "12:30 PM"},
                {"meal_name": "Dinner", "time": "07:00 PM"}
            ],
            4: [
                {"meal_name": "Breakfast", "time": "08:00 AM"},
                {"meal_name": "Mid-Morning Snack", "time": "11:00 AM"},
                {"meal_name": "Lunch", "time": "01:00 PM"},
                {"meal_name": "Dinner", "time": "07:00 PM"}
            ]
        }
        
        # Use provided ratios or defaults
        calorie_distribution_ratios = request.calorie_distribution_ratios
        target_macro_ratios = request.target_macro_ratios
        
        # Get meal plan from ML model
        meal_plan_data = generate_meal_plan(total_calories, meals_per_day, calorie_distribution_ratios, target_macro_ratios)
        
        # Get meal names and times
        meal_info = meal_templates.get(meals_per_day, meal_templates[2])
        
        # Format meal plan for frontend
        suggestions = []
        for i, meal_detail in enumerate(meal_plan_data):
            # Convert RGB image bytes to base64
            rgb_bytes = meal_detail.get('rgb_image', b'')
            if rgb_bytes:
                image_base64 = base64.b64encode(rgb_bytes).decode('utf-8')
                image_data_url = f"data:image/jpeg;base64,{image_base64}"
            else:
                image_data_url = ""
            
            # Get meal name and time
            meal_template = meal_info[i] if i < len(meal_info) else {"meal_name": f"Meal {i+1}", "time": "12:00 PM"}
            
            # Format ingredients list
            ingredients_list = meal_detail.get('ingredients_list', [])
            
            # Format nutrients
            nutrients = [
                {
                    "name": "Fat",
                    "amount": round(meal_detail.get('total_fat', 0), 2),
                    "unit": "g"
                },
                {
                    "name": "Carbohydrates",
                    "amount": round(meal_detail.get('total_carb', 0), 2),
                    "unit": "g"
                },
                {
                    "name": "Protein",
                    "amount": round(meal_detail.get('total_protein', 0), 2),
                    "unit": "g"
                }
            ]
            
            # Create description from dish name and ingredients
            dish_name = meal_detail.get('dish', 'Meal')
            ingredients_str = ', '.join(ingredients_list[:5])  # First 5 ingredients
            description = f"Ingredients {ingredients_str}" if ingredients_str else dish_name
            
            suggestions.append({
                "meal_name": meal_template["meal_name"],
                "calories": round(meal_detail.get('total_calories', 0), 1),
                "time": meal_template["time"],
                "description": description,
                "image": image_data_url,
                "ingredients": ingredients_list,
                "nutrients": nutrients,
                "mass": round(meal_detail.get('total_mass', 0), 1)
            })
        
        return suggestions
        
    except Exception as e:
        import traceback
        error_detail = f"Error generating meal plan: {str(e)}"
        print(f"Exception in suggest_meals: {error_detail}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=error_detail
        )


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Nutrition & Meal Prediction API is running"}


# Allow running with uvicorn directly
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
