"""
Nutrients Predictor Service

This module handles the prediction of nutrients, ingredients, and calories
from meal images using ML models.
"""

import os
import numpy as np
from pathlib import Path
import tempfile

# TensorFlow env before import (CPU only, reduce log noise on Windows/Mac)
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
import tensorflow as tf
tf.config.set_visible_devices([], "GPU")
try:
    tf.config.threading.set_intra_op_parallelism_threads(1)
    tf.config.threading.set_inter_op_parallelism_threads(1)
except Exception:
    pass

from PIL import Image
import io

def calories_from_macro(protein, carbs, fat):
    """Calculate calories from macronutrients."""
    return protein * 4 + carbs * 4 + fat * 9

def make_portion_independent_prediction(img, model, total_mass):
    """
    Make portion-independent prediction using the loaded model.
    
    Args:
        img: Preprocessed image array ready for model input
        model: Loaded Keras model
        total_mass: Total mass in grams for scaling predictions
        
    Returns:
        dict: Dictionary containing predictions and calculated values
    """
    predictions = model.predict(img, verbose=0)
    
    # Handle different model output structures
    # Model might return dict with named outputs or list/tuple
    if isinstance(predictions, dict):
        # If it's a dictionary with named outputs
        if 'protein' in predictions:
            protein = float(predictions['protein'][0][0]) * total_mass
            fat = float(predictions['fat'][0][0]) * total_mass
            carbs = float(predictions['carbs'][0][0]) * total_mass
        else:
            # Try accessing by key order if keys are different
            keys = list(predictions.keys())
            if len(keys) >= 3:
                protein = float(predictions[keys[0]][0][0]) * total_mass
                fat = float(predictions[keys[1]][0][0]) * total_mass
                carbs = float(predictions[keys[2]][0][0]) * total_mass
            else:
                raise ValueError(f"Unexpected model output structure: {predictions.keys()}")
    elif isinstance(predictions, (list, tuple)):
        # If it's a list/tuple, assume order: [protein, fat, carbs]
        if len(predictions) >= 3:
            protein = float(predictions[0][0][0]) * total_mass
            fat = float(predictions[1][0][0]) * total_mass
            carbs = float(predictions[2][0][0]) * total_mass
        else:
            raise ValueError(f"Unexpected model output structure: list/tuple with {len(predictions)} elements")
    elif isinstance(predictions, np.ndarray):
        # If it's a numpy array, might be a single output or multi-output
        if len(predictions.shape) == 3 and predictions.shape[0] == 1:
            # Single array output, might be concatenated
            if predictions.shape[2] >= 3:
                protein = float(predictions[0][0][0]) * total_mass
                fat = float(predictions[0][0][1]) * total_mass
                carbs = float(predictions[0][0][2]) * total_mass
            else:
                raise ValueError(f"Unexpected array shape: {predictions.shape}")
        else:
            raise ValueError(f"Unexpected array structure: {predictions.shape}")
    else:
        raise ValueError(f"Unexpected model output type: {type(predictions)}, value: {predictions}")
    
    calories = calories_from_macro(
        protein=protein,
        carbs=carbs,
        fat=fat,
    )
    return {
        'predictions': predictions,
        'protein': protein,
        'fat': fat,
        'carbs': carbs,
        'calories': calories,
        'mass': total_mass,
    }


def _get_model_path(model_path=None):
    if model_path is not None:
        return Path(model_path)
    base_path = Path(__file__).parent.parent
    for folder in ('ml-models', 'model', 'models'):
        p = base_path / folder / 'nutrient_model_portion_independent.keras'
        if p.exists():
            return p
    return Path('/models/nutrient_model_portion_independent.keras')


def predict_nutrients_from_image_bytes(image_bytes: bytes, model_path=None) -> dict:
    """
    Predict nutrients from raw image bytes. Safe to call from a subprocess (ProcessPoolExecutor).
    Avoids TF model.predict() hanging when run in the main process.
    """
    model_path = _get_model_path(model_path)
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at: {model_path}")
    import warnings
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=UserWarning, message=".*optimizer.*")
        portion_independent = tf.keras.models.load_model(str(model_path), compile=False)
    temp_file_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            temp_file.write(image_bytes)
            temp_file_path = temp_file.name
        user_img = tf.keras.utils.load_img(temp_file_path, target_size=(320, 320))
        img_320 = user_img.resize((320, 320))
        x_image_model = np.array(img_320)
        x_image_model = np.expand_dims(x_image_model, axis=0)
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
    return make_portion_independent_prediction(x_image_model, portion_independent, 100)


def predict_nutrients_from_image(image_file, model_path: str = None) -> dict:
    """
    Predict nutrients from an uploaded meal image.
    """
    try:
        image_bytes = image_file.file.read()
        image_file.file.seek(0)
        return predict_nutrients_from_image_bytes(image_bytes, model_path)
    except FileNotFoundError as e:
        raise FileNotFoundError(f"Model file not found: {e}") from e
    except Exception as e:
        raise ValueError(f"Error processing image: {str(e)}") from e


