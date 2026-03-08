"""
Meal Plan Predictor Service

This module handles the generation of personalized meal plans based on
daily calorie goals and meal frequency preferences.
Dataset is loaded once and cached in memory for fast subsequent requests.

At runtime only dish_metadata (parquet or pkl) is used; dish_images.pkl is never loaded.
Create metadata and per-dish images by running: python scripts/split_dish_images.py
Then the cache loads dish_metadata and reads images on demand per request.
"""

import pickle
import pandas as pd
from pathlib import Path
import logging
import numpy as np

from datetime import datetime
from db import get_database
from database_models import MEAL_PLANS

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# In-memory cache: loaded once, reused for all suggest-meals requests
_dataset_cache = None

# Column name for image bytes in the original pickle (dropped when using metadata-only)
IMAGE_COLUMN = 'rgb_image'


def _image_to_bytes(val):
    """Convert image value (bytes or numpy array) to bytes for API response."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return b''
    if isinstance(val, bytes):
        return val
    if hasattr(val, 'tobytes'):
        return val.tobytes()
    return b''


def _load_image_for_dish(dish_id, images_dir: Path) -> bytes:
    """Load image bytes for a single dish from dataset/images/<dish_id>.pkl. Used when dish_metadata.pkl is in use."""
    path = images_dir / f"{dish_id}.pkl"
    if not path.exists():
        return b''
    try:
        with open(path, 'rb') as f:
            val = pickle.load(f)
        return _image_to_bytes(val)
    except Exception as e:
        logger.warning("Could not load image for dish %s: %s", dish_id, e)
        return b''


def _load_dataset_cache():
    """Load dataset from disk. Uses only dish_metadata (parquet or pkl) + dataset/images/; dish_images.pkl is never loaded."""
    global _dataset_cache
    base_path = Path(__file__).parent.parent
    save_path = base_path / 'dataset'
    if not save_path.exists():
        raise FileNotFoundError(f"Dataset directory not found at: {save_path}")

    metadata_parquet = save_path / 'dish_metadata.parquet'
    metadata_pkl = save_path / 'dish_metadata.pkl'
    image_df = None
    images_dir = save_path / 'images'

    if metadata_parquet.exists():
        try:
            logger.info("Loading meal plan dataset from dish_metadata.parquet (images on demand)...")
            image_df = pd.read_parquet(metadata_parquet)
        except Exception as e:
            logger.warning("Could not load dish_metadata.parquet (%s), trying .pkl", e)
    if image_df is None and metadata_pkl.exists():
        logger.info("Loading meal plan dataset from dish_metadata.pkl (images on demand)...")
        image_df = pd.read_pickle(metadata_pkl)
    if image_df is None:
        raise FileNotFoundError(
            "Meal plan metadata not found. Create it by running: python scripts/split_dish_images.py "
            "(requires dataset/dish_images.pkl). Do not use dish_images.pkl at runtime."
        )

    dishes = pd.read_excel(save_path / 'dishes.xlsx')
    dish_ingredients = pd.read_excel(save_path / 'dish_ingredients.xlsx')
    ingredients = pd.read_excel(save_path / 'ingredients.xlsx')

    image_df = pd.merge(image_df, dishes, left_on='dish', right_on='dish_id', how='left').drop('dish_id', axis=1)
    image_df['calories_from_fat'] = image_df['total_fat'] * 9
    image_df['calories_from_carb'] = image_df['total_carb'] * 4
    image_df['calories_from_protein'] = image_df['total_protein'] * 4
    image_df['fat_pc'] = (image_df['calories_from_fat'] / image_df['total_calories']).fillna(0) * 100
    image_df['carb_pc'] = (image_df['calories_from_carb'] / image_df['total_calories']).fillna(0) * 100
    image_df['protein_pc'] = (image_df['calories_from_protein'] / image_df['total_calories']).fillna(0) * 100
    image_df.replace([float('inf'), -float('inf')], 0, inplace=True)
    available_dishes = image_df[image_df['total_calories'] > 0].copy()
    dish_ingr_names = _get_ingredient_names_for_dishes(dish_ingredients, ingredients)

    _dataset_cache = {
        'available_dishes': available_dishes,
        'dish_ingredients': dish_ingredients,
        'ingredients': ingredients,
        'dish_ingr_names': dish_ingr_names,
    }
    if images_dir is not None and images_dir.exists():
        _dataset_cache['_images_dir'] = images_dir
    logger.info("Meal plan dataset cached in memory.")
    return _dataset_cache


def get_dataset_cache():
    """Return cached dataset; load from disk on first call."""
    global _dataset_cache
    if _dataset_cache is None:
        _load_dataset_cache()
    return _dataset_cache


def get_dish_image_bytes(dish_id: str) -> bytes:
    """Load image bytes for a dish from the dataset (dataset/images/<dish_id>.pkl). Returns empty bytes if not found."""
    cache = get_dataset_cache()
    images_dir = cache.get("_images_dir")
    if images_dir is None:
        return b""
    return _load_image_for_dish(dish_id, images_dir)


def data_preparation(daily_calorie_target, num_meals, calorie_distribution_ratios, target_macro_ratios):
    """Build request data: use cached dataset and only compute meal_calorie_targets per request."""
    try:
        cache = get_dataset_cache()
    except FileNotFoundError:
        cache = None

    if cache is not None:
        meal_calorie_targets = [ratio * daily_calorie_target for ratio in calorie_distribution_ratios]
        return {**cache, 'meal_calorie_targets': meal_calorie_targets}

    # Fallback: load from disk (e.g. if cache was not loaded at startup)
    base_path = Path(__file__).parent.parent
    save_path = base_path / 'dataset'
    if not save_path.exists():
        raise FileNotFoundError(f"Dataset directory not found at: {save_path}")

    metadata_parquet = save_path / 'dish_metadata.parquet'
    metadata_pkl = save_path / 'dish_metadata.pkl'
    if metadata_parquet.exists():
        try:
            image_df = pd.read_parquet(metadata_parquet)
        except Exception:
            image_df = pd.read_pickle(metadata_pkl) if metadata_pkl.exists() else None
    else:
        image_df = pd.read_pickle(metadata_pkl) if metadata_pkl.exists() else None
    if image_df is None:
        raise FileNotFoundError(
            "Meal plan metadata not found. Run: python scripts/split_dish_images.py"
        )

    dishes = pd.read_excel(save_path / 'dishes.xlsx')
    dish_ingredients = pd.read_excel(save_path / 'dish_ingredients.xlsx')
    ingredients = pd.read_excel(save_path / 'ingredients.xlsx')
    image_df = pd.merge(image_df, dishes, left_on='dish', right_on='dish_id', how='left').drop('dish_id', axis=1)
    meal_calorie_targets = [ratio * daily_calorie_target for ratio in calorie_distribution_ratios]
    image_df['calories_from_fat'] = image_df['total_fat'] * 9
    image_df['calories_from_carb'] = image_df['total_carb'] * 4
    image_df['calories_from_protein'] = image_df['total_protein'] * 4
    image_df['fat_pc'] = (image_df['calories_from_fat'] / image_df['total_calories']).fillna(0) * 100
    image_df['carb_pc'] = (image_df['calories_from_carb'] / image_df['total_calories']).fillna(0) * 100
    image_df['protein_pc'] = (image_df['calories_from_protein'] / image_df['total_calories']).fillna(0) * 100
    image_df.replace([float('inf'), -float('inf')], 0, inplace=True)
    available_dishes = image_df[image_df['total_calories'] > 0].copy()
    dish_ingr_names = _get_ingredient_names_for_dishes(dish_ingredients, ingredients)
    result = {
        'available_dishes': available_dishes,
        'dish_ingredients': dish_ingredients,
        'ingredients': ingredients,
        'dish_ingr_names': dish_ingr_names,
        'meal_calorie_targets': meal_calorie_targets,
    }
    if (save_path / 'images').exists():
        result['_images_dir'] = save_path / 'images'
    return result

def _get_ingredient_names_for_dishes(dish_ingredients, ingredients_df=None):
    """
    Resolve ingredient names per dish from dish_ingredients.
    Supports dish_ingredients with 'ingr_name' or 'ingr' (name), or 'ingr' as id resolved via ingredients_df.
    Returns dict: dish_id -> list of lowercase ingredient name strings.
    """
    if dish_ingredients is None or dish_ingredients.empty:
        return {}
    di = dish_ingredients.copy()
    # Require a column that identifies the dish (dish_id or dish)
    dish_col = 'dish_id' if 'dish_id' in di.columns else 'dish' if 'dish' in di.columns else None
    if dish_col is None:
        return {}
    # Prefer ingr_name column; else try ingr (might be name or id)
    if 'ingr_name' in di.columns:
        di['_ingr_name'] = di['ingr_name'].dropna().astype(str).str.strip().str.lower()
    elif 'ingr' in di.columns:
        sample = di['ingr'].dropna().head(50)
        try:
            numeric = pd.to_numeric(sample, errors='coerce')
            mostly_numeric = numeric.notna().sum() >= min(20, len(sample))
        except Exception:
            mostly_numeric = False
        if mostly_numeric and ingredients_df is not None and not ingredients_df.empty and 'ingr' in ingredients_df.columns:
            # Build id -> name lookup from ingredients
            if 'id' in ingredients_df.columns:
                ing_lookup = ingredients_df.set_index('id')['ingr'].dropna().astype(str).str.strip().str.lower().to_dict()
            else:
                ing_lookup = dict(zip(range(len(ingredients_df)), ingredients_df['ingr'].dropna().astype(str).str.strip().str.lower()))
            def resolve(v):
                try:
                    key = int(float(v)) if isinstance(v, (int, float)) else v
                    return ing_lookup.get(key, str(v).strip().lower())
                except (ValueError, TypeError):
                    return str(v).strip().lower()
            di['_ingr_name'] = di['ingr'].map(resolve)
        else:
            di['_ingr_name'] = di['ingr'].dropna().astype(str).str.strip().str.lower()
    else:
        return {}
    out = {}
    for did in di[dish_col].dropna().unique():
        names = di[di[dish_col] == did]['_ingr_name'].dropna().tolist()
        out[did] = [n for n in names if n]
    return out


def select_dish_for_meal(target_calories, available_dishes, target_macro_profile,
                         dish_ingredients=None, preferred_ingredients=None, ingredients_df=None, dish_ingr_names=None):
    """
    Selects a dish that best matches the target calorie count and macronutrient profile.
    Optionally favors dishes that contain any of the preferred ingredients.

    Args:
        target_calories (float): The desired calorie count for the meal.
        available_dishes (pd.DataFrame): DataFrame containing dish information.
        target_macro_profile (dict): Dictionary with target ratios for 'fat', 'carb', 'protein'.
        dish_ingredients (pd.DataFrame, optional): DataFrame with dish_id and ingr_name or ingr.
        preferred_ingredients (list, optional): List of ingredient names to favor (any case).
        ingredients_df (pd.DataFrame, optional): Ingredients table to resolve ingr id -> name if needed.
        dish_ingr_names (dict, optional): Precomputed dish_id -> list of ingredient names; used when provided.

    Returns:
        tuple: (selected_dish_row, selected_dish_id).
    """
    if dish_ingr_names is None and dish_ingredients is not None:
        dish_ingr_names = _get_ingredient_names_for_dishes(dish_ingredients, ingredients_df)

    # 2. Calculate the absolute difference between each dish's total_calories and the target_calories
    available_dishes = available_dishes.copy()
    available_dishes['calorie_deviation'] = abs(available_dishes['total_calories'] - target_calories)

    # 3. Calculate a 'macronutrient deviation score' for each dish
    available_dishes['macro_deviation'] = 0.0
    for macro, target_ratio in target_macro_profile.items():
        target_percentage = target_ratio * 100
        available_dishes['macro_deviation'] += abs(available_dishes[f'{macro}_pc'] - target_percentage)

    # 4. Preferred ingredients: when set, prefer (or restrict to) dishes that contain at least one
    preferred_set = None
    if preferred_ingredients and dish_ingr_names is not None and len(preferred_ingredients) > 0:
        preferred_set = {str(s).strip().lower() for s in preferred_ingredients if s}
        bonus_map = {}
        for did in available_dishes['dish'].unique():
            ingr_names = dish_ingr_names.get(did, [])
            has_match = any(ing in preferred_set for ing in ingr_names) or any(
                any(pref in ing for ing in ingr_names) for pref in preferred_set
            )
            # Strong bonus so preferred-ingredient dishes win unless calorie/macro fit is very bad
            bonus_map[did] = -400.0 if has_match else 0.0
        available_dishes['preferred_bonus'] = available_dishes['dish'].map(bonus_map).fillna(0)
    else:
        available_dishes['preferred_bonus'] = 0.0

    # 4b. When preferred_ingredients is set: if any dishes contain at least one, restrict to those
    #     so we guarantee using preferred ingredients (e.g. 2 meals both can use carrot/chicken)
    if preferred_set is not None:
        matching_mask = available_dishes['preferred_bonus'] < 0
        if matching_mask.any():
            available_dishes = available_dishes[matching_mask].copy()

    # 5. Combined score: lower is better
    available_dishes['combined_score'] = (
        available_dishes['calorie_deviation'] + available_dishes['macro_deviation'] + available_dishes['preferred_bonus']
    )

    # 6. Select dish with lowest combined score
    selected_dish_row = available_dishes.loc[available_dishes['combined_score'].idxmin()]
    selected_dish_id = selected_dish_row['dish']
    # Which preferred ingredients (if any) matched this dish (for response/logging)
    matched_preferred = []
    if preferred_ingredients and dish_ingr_names is not None and len(preferred_ingredients) > 0:
        preferred_set = {str(s).strip().lower() for s in preferred_ingredients if s}
        ingr_names = dish_ingr_names.get(selected_dish_id, [])
        for pref in preferred_ingredients:
            p = str(pref).strip().lower()
            if not p:
                continue
            if p in ingr_names or any(p in ing for ing in ingr_names) or any(ing in p for ing in ingr_names):
                matched_preferred.append(pref)
        if matched_preferred:
            logger.info(f"  [Preferred] Dish {selected_dish_id} matched: {matched_preferred}")
    return selected_dish_row, selected_dish_id, matched_preferred


def save_meal_plan_to_db(
    full_meal_plan_details: list,
    daily_calorie_target: float,
    num_meals: int,
    calorie_distribution_ratios: list,
    target_macro_ratios: dict,
    user_id: str = None,
):
    """
    Save a meal plan to MongoDB. Returns the meal_plan document _id (as string).
    """
    db = get_database()
    coll = db[MEAL_PLANS]
    meals = []
    for i, meal in enumerate(full_meal_plan_details):
        ingredients_list = meal.get("ingredients_list", [])
        ingredients_str = ", ".join(str(x) for x in ingredients_list) if ingredients_list else None
        meals.append({
            "meal_order": i + 1,
            "dish_id": str(meal.get("dish", "")),
            "total_calories": float(meal.get("total_calories", 0)),
            "total_fat": float(meal.get("total_fat", 0)),
            "total_carb": float(meal.get("total_carb", 0)),
            "total_protein": float(meal.get("total_protein", 0)),
            "total_mass": float(meal["total_mass"]) if meal.get("total_mass") is not None else None,
            "ingredients": ingredients_str,
        })
    doc = {
        "user_id": user_id,
        "daily_calorie_target": daily_calorie_target,
        "num_meals": num_meals,
        "calorie_distribution_ratios": calorie_distribution_ratios,
        "target_macro_ratios": target_macro_ratios,
        "meals": meals,
        "created_at": datetime.utcnow(),
    }
    try:
        ins = coll.insert_one(doc)
        plan_id = str(ins.inserted_id)
        logger.info(f"Meal plan saved to database (id={plan_id})")
        return plan_id
    except Exception as e:
        logger.error(f"Failed to save meal plan: {e}")
        raise


def generate_meal_plan(total_calories: float, meals_per_day: int, calorie_distribution_ratios=None, target_macro_ratios=None, preferred_ingredients=None, save_to_db: bool = True, user_id: str = None) -> list:
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
    if preferred_ingredients:
        logger.info(f"Meal plan requested with preferred_ingredients: {preferred_ingredients}")
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

        selected_dish_row, selected_dish_id, matched_preferred = select_dish_for_meal(
            target_calorie,
            available_dishes,
            target_macro_ratios,
            dish_ingredients=dish_ingredients,
            preferred_ingredients=preferred_ingredients,
            ingredients_df=data['ingredients'],
            dish_ingr_names=data.get('dish_ingr_names'),
        )

        # Store the selected dish details and whether it came from preferred list
        meal_dict = selected_dish_row.to_dict()
        meal_dict['matched_preferred_ingredients'] = matched_preferred
        meal_plan.append(meal_dict)

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

    # Build full meal plan details with ingredients (use cached map when available)
    dish_ingr_names = data.get('dish_ingr_names')
    if dish_ingr_names is None:
        dish_ingr_names = _get_ingredient_names_for_dishes(dish_ingredients, data['ingredients'])
    full_meal_plan_details = []

    for meal in meal_plan:
        dish_id = meal['dish']
        # Get names (title case for display); fallback to raw column if helper returned empty
        raw_names = dish_ingr_names.get(dish_id, [])
        if not raw_names and not dish_ingredients.empty:
            dish_col = 'dish_id' if 'dish_id' in dish_ingredients.columns else 'dish'
            subset = dish_ingredients[dish_ingredients[dish_col] == dish_id]
            if 'ingr_name' in subset.columns:
                raw_names = subset['ingr_name'].dropna().astype(str).str.strip().tolist()
            elif 'ingr' in subset.columns:
                raw_names = subset['ingr'].dropna().astype(str).str.strip().tolist()
        meal['ingredients_list'] = [n.title() for n in raw_names] if raw_names else []
        full_meal_plan_details.append(meal)

    # Attach image bytes: on-demand from dataset/images/ when using dish_metadata.pkl, else already in meal dict
    images_dir = data.get('_images_dir')
    for meal in full_meal_plan_details:
        if images_dir is not None:
            meal['rgb_image'] = _load_image_for_dish(meal['dish'], images_dir)
        else:
            meal['rgb_image'] = _image_to_bytes(meal.get(IMAGE_COLUMN))

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

    if save_to_db:
        try:
            meal_plan_id = save_meal_plan_to_db(
                full_meal_plan_details=full_meal_plan_details,
                daily_calorie_target=daily_calorie_target,
                num_meals=num_meals,
                calorie_distribution_ratios=calorie_distribution_ratios,
                target_macro_ratios=target_macro_ratios,
                user_id=user_id,
            )
            print(f"\n✅ Meal plan saved to database (id={meal_plan_id})")
        except Exception as e:
            logger.warning(f"Could not save meal plan to database: {e}")

    return full_meal_plan_details
