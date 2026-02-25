import os
import pandas as pd
from datetime import datetime

# FOOD_DB = pd.read_csv('./food_reference_database.csv')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(BASE_DIR, "food_reference_database.csv")

FOOD_DB = pd.read_csv(file_path)

def calculate_nutrition(food_item, amount_grams):
    """Calculate nutrition for given food and amount"""
    food_data = FOOD_DB[FOOD_DB['Food_Item'] == food_item]
    
    if food_data.empty:
        return None
    
    food_data = food_data.iloc[0]
    multiplier = amount_grams / 100.0
    
    return {
        'food_item': food_item,
        'amount_g': amount_grams,
        'calories': round(food_data['Calories_per_100g'] * multiplier, 1),
        'protein': round(food_data['Protein_per_100g'] * multiplier, 1),
        'carbohydrates': round(food_data['Carbohydrates_per_100g'] * multiplier, 1),
        'fat': round(food_data['Fat_per_100g'] * multiplier, 1),
        'fiber': round(food_data['Fiber_per_100g'] * multiplier, 1),
        'sugars': round(food_data['Sugars_per_100g'] * multiplier, 1),
        'sodium': round(food_data['Sodium_per_100g'] * multiplier, 1),
        'cholesterol': round(food_data['Cholesterol_per_100g'] * multiplier, 1)
    }

def calculate_meal(data):
    """
    Calculate nutrition for a single meal
    
    Request body:
    {
        "food_items": [
            {"food": "Chicken Breast", "grams": 170},
            {"food": "Rice", "grams": 158}
        ]
    }
    """
    
    food_items = data.get('food_items', [])
    
    if not food_items:
        return {
            'success': False,
            'error': 'No food items provided'
        }
    
    results = []
    totals = {
        'calories': 0,
        'protein': 0,
        'carbohydrates': 0,
        'fat': 0,
        'fiber': 0,
        'sugars': 0,
        'sodium': 0,
        'cholesterol': 0
    }
    
    for item in food_items:
        food = item.get('food')
        grams = item.get('grams', 0)
        
        nutrition = calculate_nutrition(food, grams)
        if nutrition:
            results.append(nutrition)
            totals['calories'] += nutrition['calories']
            totals['protein'] += nutrition['protein']
            totals['carbohydrates'] += nutrition['carbohydrates']
            totals['fat'] += nutrition['fat']
            totals['fiber'] += nutrition['fiber']
            totals['sugars'] += nutrition['sugars']
            totals['sodium'] += nutrition['sodium']
            totals['cholesterol'] += nutrition['cholesterol']
        else:
            return ({
                'success': False,
                'error': f'Food item "{food}" not found'
            }), 404
    
    return ({
        'success': True,
        'items': results,
        'totals': {k: round(v, 1) for k, v in totals.items()}
    })


def calculate_daily(data):
    
    # user_id = data.get('user_id')
    meals = data.get('meals', {})
    # age = data.get('age', 30)
    # activity_level = data.get('activity_level', 'moderate')
    print("2222--meals--2222",meals)
    if not meals:
        return {
            'success': False,
            'error': 'No meals provided'
        }
    
    daily_totals = {
        'calories': 0,
        'protein': 0,
        'carbohydrates': 0,
        'fat': 0,
        'fiber': 0,
        'sugars': 0,
        'sodium': 0,
        'cholesterol': 0
    }
    
    meal_breakdown = {}
    
    # Process each meal type
    for meal_type, food_items in meals.items():
        meal_totals = {
            'calories': 0,
            'protein': 0,
            'carbohydrates': 0,
            'fat': 0,
            'fiber': 0,
            'sugars': 0,
            'sodium': 0,
            'cholesterol': 0,
            'items': []
        }
        
        for item in food_items:
            food = item.get('food')
            grams = item.get('grams', 0)
            
            nutrition = calculate_nutrition(food, grams)
            if nutrition:
                meal_totals['items'].append(nutrition)
                for key in daily_totals.keys():
                    meal_totals[key] += nutrition[key]
                    daily_totals[key] += nutrition[key]
        
        meal_breakdown[meal_type] = meal_totals
    
    total_sugar = daily_totals['sugars']

    if total_sugar <= 25:
        sugar_level = 'low'
    elif total_sugar <= 50:
        sugar_level = 'medium'
    else:
        sugar_level = 'high'


    return {
        'date': data.get('date', datetime.now().strftime('%Y-%m-%d')),
        'daily_totals': {k: float(round(v, 1)) for k, v in daily_totals.items()},
        'sugar_level': sugar_level
    }

