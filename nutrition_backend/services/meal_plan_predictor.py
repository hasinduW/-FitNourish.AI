"""
Meal Plan Predictor Service

This module handles the generation of personalized meal plans based on
daily calorie goals and meal frequency preferences.
"""

import pandas as pd
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def data_preparation(daily_calorie_target, num_meals, calorie_distribution_ratios, target_macro_ratios):

    # Use relative path from project root
    base_path = Path(__file__).parent.parent
    save_path = base_path / 'dataset'
    
    # Verify dataset directory exists
    if not save_path.exists():
        raise FileNotFoundError(f"Dataset directory not found at: {save_path}")
    
    image_df = pd.read_pickle(save_path / 'dish_images.pkl')
    dishes = pd.read_excel(save_path / 'dishes.xlsx')
    dish_ingredients = pd.read_excel(save_path / 'dish_ingredients.xlsx')
    ingredients = pd.read_excel(save_path / 'ingredients.xlsx')

    image_df = pd.merge(image_df, dishes, left_on='dish', right_on='dish_id', how='left').drop('dish_id', axis=1)

    # Calculate meal calorie targets based on distribution ratios
    meal_calorie_targets = []
    for ratio in calorie_distribution_ratios:
        meal_calories = ratio * daily_calorie_target
        meal_calorie_targets.append(meal_calories)
    image_df['calories_from_fat'] = image_df['total_fat'] * 9
    image_df['calories_from_carb'] = image_df['total_carb'] * 4
    image_df['calories_from_protein'] = image_df['total_protein'] * 4

    # Calculate percentage of calories from each macronutrient, handling division by zero
    image_df['fat_pc'] = (image_df['calories_from_fat'] / image_df['total_calories']).fillna(0) * 100
    image_df['carb_pc'] = (image_df['calories_from_carb'] / image_df['total_calories']).fillna(0) * 100
    image_df['protein_pc'] = (image_df['calories_from_protein'] / image_df['total_calories']).fillna(0) * 100

    # Replace any inf values (if total_calories was zero and macro calories were non-zero) with 0
    image_df.replace([float('inf'), -float('inf')], 0, inplace=True)

    available_dishes = image_df[image_df['total_calories'] > 0].copy()
    return {'available_dishes': available_dishes, 'dish_ingredients': dish_ingredients, 'ingredients': ingredients, 'meal_calorie_targets': meal_calorie_targets}

def select_dish_for_meal(target_calories, available_dishes, target_macro_profile):
    """
    Selects a dish that best matches the target calorie count and macronutrient profile.

    Args:
        target_calories (float): The desired calorie count for the meal.
        available_dishes (pd.DataFrame): DataFrame containing dish information,
                                       including 'total_calories', 'fat_pc', 'carb_pc', 'protein_pc'.
        target_macro_profile (dict): Dictionary with target ratios for 'fat', 'carb', 'protein'.

    Returns:
        tuple: A tuple containing:
               - pd.Series: The selected dish (full row from available_dishes).
               - str: The dish ID of the selected dish.
    """

    # 2. Calculate the absolute difference between each dish's total_calories and the target_calories
    available_dishes['calorie_deviation'] = abs(available_dishes['total_calories'] - target_calories)

    # 3. Calculate a 'macronutrient deviation score' for each dish
    # Initialize macro deviation score
    available_dishes['macro_deviation'] = 0.0

    # Calculate deviation for each macronutrient
    for macro, target_ratio in target_macro_profile.items():
        # Multiply target ratio by 100 to compare with percentage columns (e.g., fat_pc)
        target_percentage = target_ratio * 100
        available_dishes['macro_deviation'] += abs(available_dishes[f'{macro}_pc'] - target_percentage)

    # 4. Combine these two deviation measures into a single score
    # Using equal weights for now, can be adjusted if needed
    available_dishes['combined_score'] = available_dishes['calorie_deviation'] + available_dishes['macro_deviation']

    # 5. Identify the dish with the lowest combined score
    selected_dish_row = available_dishes.loc[available_dishes['combined_score'].idxmin()]
    selected_dish_id = selected_dish_row['dish']

    # 6. Return the selected dish as a pandas Series and its dish ID
    return selected_dish_row, selected_dish_id


def generate_meal_plan(total_calories: float, meals_per_day: int, calorie_distribution_ratios=None, target_macro_ratios=None) -> list:
    daily_calorie_target = total_calories
    num_meals = meals_per_day
    
    # Use provided ratios or calculate defaults based on number of meals
    if calorie_distribution_ratios is None:
        # Calculate calorie distribution ratios based on number of meals
        if num_meals == 2:
            # Breakfast and Dinner - more calories for dinner
            calorie_distribution_ratios = [0.40, 0.60]
        elif num_meals == 3:
            # Breakfast, Lunch, Dinner
            calorie_distribution_ratios = [0.25, 0.40, 0.35]
        elif num_meals == 4:
            # Breakfast, Mid-Morning, Lunch, Dinner
            calorie_distribution_ratios = [0.20, 0.15, 0.35, 0.30]
        else:
            # Default: equal distribution
            calorie_distribution_ratios = [1.0 / num_meals] * num_meals
        
        # Ensure ratios sum to exactly 1.0 to prevent exceeding target
        ratio_sum = sum(calorie_distribution_ratios)
        if ratio_sum != 1.0:
            calorie_distribution_ratios = [r / ratio_sum for r in calorie_distribution_ratios]
    else:
        # Ensure provided ratios match number of meals
        if len(calorie_distribution_ratios) != num_meals:
            # If mismatch, use default for that number of meals
            if num_meals == 2:
                calorie_distribution_ratios = [0.40, 0.60]
            elif num_meals == 3:
                calorie_distribution_ratios = [0.25, 0.40, 0.35]
            elif num_meals == 4:
                calorie_distribution_ratios = [0.20, 0.15, 0.35, 0.30]
            else:
                calorie_distribution_ratios = [1.0 / num_meals] * num_meals
    
    # Use provided macro ratios or defaults
    if target_macro_ratios is None:
        target_macro_ratios = {'fat': 0.30, 'carb': 0.45, 'protein': 0.25}
    data = data_preparation(daily_calorie_target, num_meals, calorie_distribution_ratios, target_macro_ratios)
    available_dishes = data['available_dishes']
    dish_ingredients = data['dish_ingredients']
    ingredients = data['ingredients']
    meal_calorie_targets = data['meal_calorie_targets']
    
    # Ensure we only generate the requested number of meals
    if len(meal_calorie_targets) > num_meals:
        meal_calorie_targets = meal_calorie_targets[:num_meals]
    
    meal_plan = []

    for i, target_calorie in enumerate(meal_calorie_targets):
        print(f"\n--- Planning for Meal {i+1} with target calories: {target_calorie:.1f} kcal ---")

        selected_dish_row, selected_dish_id = select_dish_for_meal(
            target_calorie,
            available_dishes,
            target_macro_ratios
        )

        # Store the selected dish details
        meal_plan.append(selected_dish_row.to_dict())

        print(f"Selected dish for Meal {i+1}: {selected_dish_id} with {selected_dish_row['total_calories']:.1f} kcal")
        
        # Log macronutrient breakdown for this meal
        meal_fat = selected_dish_row.get('total_fat', 0)
        meal_protein = selected_dish_row.get('total_protein', 0)
        meal_carbs = selected_dish_row.get('total_carb', 0)
        meal_mass = selected_dish_row.get('total_mass', 0)
        
        logger.info(f"Meal {i+1} Macronutrients:")
        logger.info(f"  Fat: {meal_fat:.1f}g")
        logger.info(f"  Protein: {meal_protein:.1f}g")
        logger.info(f"  Carbohydrates: {meal_carbs:.1f}g")
        logger.info(f"  Mass: {meal_mass:.1f}g")
        logger.info(f"  Calories: {selected_dish_row['total_calories']:.1f} kcal")

        # Remove the selected dish from available_dishes for subsequent meals
        available_dishes = available_dishes[available_dishes['dish'] != selected_dish_id].copy()
        print(f"Remaining available dishes: {available_dishes.shape[0]}")

    # Build full meal plan details with ingredients
    full_meal_plan_details = []

    for meal in meal_plan:
        dish_id = meal['dish']

        # Filter dish_ingredients for the current dish_id
        ingredients_for_dish = dish_ingredients[dish_ingredients['dish_id'] == dish_id]['ingr_name'].tolist()

        # Add the list of ingredients to the meal dictionary
        meal['ingredients_list'] = ingredients_for_dish

        # Append the updated meal dictionary to the full_meal_plan_details list
        full_meal_plan_details.append(meal)

    # Calculate daily totals
    total_plan_calories = sum(meal['total_calories'] for meal in full_meal_plan_details)
    total_plan_fat = sum(meal['total_fat'] for meal in full_meal_plan_details)
    total_plan_carb = sum(meal['total_carb'] for meal in full_meal_plan_details)
    total_plan_protein = sum(meal['total_protein'] for meal in full_meal_plan_details)

    print("\n--- Daily Summary ---")
    print(f"Target Daily Calories: {daily_calorie_target:.1f} kcal")
    print(f"Actual Plan Calories:  {total_plan_calories:.1f} kcal\n")

    print("Macronutrient Breakdown:")

    # Calculate actual macronutrient percentages for the meal plan
    if total_plan_calories > 0:
        actual_fat_pc = (total_plan_fat * 9 / total_plan_calories) * 100
        actual_carb_pc = (total_plan_carb * 4 / total_plan_calories) * 100
        actual_protein_pc = (total_plan_protein * 4 / total_plan_calories) * 100
    else:
        actual_fat_pc = 0
        actual_carb_pc = 0
        actual_protein_pc = 0

    print(f"  Fat: Target {target_macro_ratios['fat']*100:.1f}% | Actual {actual_fat_pc:.1f}% ({total_plan_fat:.1f}g)")
    print(f"  Carbs: Target {target_macro_ratios['carb']*100:.1f}% | Actual {actual_carb_pc:.1f}% ({total_plan_carb:.1f}g)")
    print(f"  Protein: Target {target_macro_ratios['protein']*100:.1f}% | Actual {actual_protein_pc:.1f}% ({total_plan_protein:.1f}g)")

    return full_meal_plan_details
