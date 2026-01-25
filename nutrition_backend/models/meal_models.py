"""
Pydantic models for meal analysis and suggestion endpoints.
"""
from pydantic import BaseModel, Field, field_validator, ValidationInfo
from typing import List, Dict, Optional


class MealSuggestionRequest(BaseModel):
    total_calories: float = Field(gt=0, description="Total daily calories must be greater than 0")
    meals_per_day: int = Field(gt=0, le=10, description="Number of meals per day must be between 1 and 10")
    calorie_distribution_ratios: Optional[List[float]] = Field(
        default=None,
        description="Optional list of calorie distribution ratios for each meal"
    )
    target_macro_ratios: Optional[Dict[str, float]] = Field(
        default=None,
        description="Optional target macronutrient ratios"
    )
    
    @field_validator('calorie_distribution_ratios')
    @classmethod
    def validate_calorie_ratios(cls, v: Optional[List[float]], info: ValidationInfo) -> Optional[List[float]]:
        """Validate calorie distribution ratios if provided."""
        if v is not None:
            if not all(0 < ratio <= 1 for ratio in v):
                raise ValueError("All calorie distribution ratios must be between 0 and 1")
            meals_per_day = info.data.get('meals_per_day')
            if meals_per_day and len(v) != meals_per_day:
                raise ValueError(f"Number of calorie distribution ratios ({len(v)}) must match meals_per_day ({meals_per_day})")
        return v
    
    @field_validator('target_macro_ratios')
    @classmethod
    def validate_macro_ratios(cls, v):
        """Validate target macro ratios if provided."""
        if v is not None:
            valid_keys = {'protein', 'carbs', 'fat', 'carb'}  # Support both 'carbs' and 'carb'
            if not all(key in valid_keys for key in v.keys()):
                raise ValueError("target_macro_ratios must only contain 'protein', 'carbs'/'carb', and 'fat'")
            if not all(0 <= ratio <= 1 for ratio in v.values()):
                raise ValueError("All macro ratios must be between 0 and 1")
        return v


class Nutrient(BaseModel):
    name: str
    amount: float
    unit: str
    percentage: float


class Ingredient(BaseModel):
    name: str
    amount: float
    unit: str
    possibility: float  # ML prediction confidence/possibility percentage (0-100)


class MealAnalysisResponse(BaseModel):
    ingredients: List[Ingredient]
    nutrients: List[Nutrient]
    calories_per_100g: float


class MealNutrient(BaseModel):
    name: str
    amount: float
    unit: str


class MealSuggestion(BaseModel):
    meal_name: str
    calories: float
    time: str
    description: str
    image: str  # Base64 encoded image
    ingredients: List[str]
    nutrients: List[MealNutrient]
    mass: float  # Total mass in grams
