"""
Nutrients Predictor Service

This module handles the prediction of nutrients, ingredients, and calories
from meal images using ML models.
"""

import os
import numpy as np
import tensorflow as tf
from PIL import Image
import io
from pathlib import Path
import tempfile

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

def predict_nutrients_from_image(image_file, model_path: str = None) -> dict:
    """
    Predict nutrients from an uploaded meal image.
    
    Args:
        image_file: FastAPI UploadFile object containing the image
        model_path: Path to the model file. If None, uses default path.
        
    Returns:
        dict: Dictionary containing predictions with protein, fat, carbs, calories, and mass
        
    Raises:
        FileNotFoundError: If the model file is not found
        ValueError: If the image cannot be processed
    """
    try:
        # Set default model path if not provided
        if model_path is None:
            # Use relative path from project root
            base_path = Path(__file__).parent.parent
            # Try 'ml-models' first, then 'model' (singular), then 'models' (plural)
            model_path = base_path / 'ml-models' / 'nutrient_model_portion_independent.keras'
            
            # Fallback to 'model' (singular) if 'ml-models' doesn't exist
            if not model_path.exists():
                model_path = base_path / 'model' / 'nutrient_model_portion_independent.keras'
            
            # Fallback to 'models' (plural) if 'model' doesn't exist
            if not model_path.exists():
                model_path = base_path / 'models' / 'nutrient_model_portion_independent.keras'
            
            # Final fallback to absolute path
            if not model_path.exists():
                model_path = Path('/models/nutrient_model_portion_independent.keras')
        
        # Load the model
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at: {model_path}")
        
        # Suppress optimizer warnings since we're only using the model for inference
        import warnings
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=UserWarning, message=".*optimizer.*")
            portion_independent = tf.keras.models.load_model(str(model_path), compile=False)
        
        # Save uploaded file temporarily to disk so we can use tf.keras.utils.load_img
        # This function requires a file path, not an UploadFile object
        temp_file_path = None
        try:
            # Read the file content
            image_bytes = image_file.file.read()
            
            # Reset file pointer for potential future reads
            image_file.file.seek(0)
            
            # Create a temporary file to save the image
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                temp_file.write(image_bytes)
                temp_file_path = temp_file.name
            
            # Load image using TensorFlow's utility function
            # This automatically handles image decoding and resizing to target_size
            user_img = tf.keras.utils.load_img(temp_file_path, target_size=(320, 320))
            
            img_320 = user_img.resize((320, 320))
            x_image_model = np.array(img_320)
            x_image_model = np.expand_dims(x_image_model, axis=0)

            # The x_regression_models variable is already correctly sized for 320x320
            x_regression_models = x_image_model.copy() # Simply assign the same processed image for consistency

            print("Image processed for both models at 320x320.")
        finally:
            # Clean up temporary file
            if temp_file_path is not None and os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
        
        # Make prediction
        prediction_output = make_portion_independent_prediction(x_image_model, portion_independent, 100)
        
        # prediction_output is a dictionary with the following keys:
        # 'protein': the predicted protein in grams
        # 'fat': the predicted fat in grams
        # 'carbs': the predicted carbs in grams
        # 'calories': the predicted calories
        # 'mass': the mass of the item (100g in this case)
        return prediction_output
        
    except FileNotFoundError as e:
        raise FileNotFoundError(f"Model file not found: {e}")
    except Exception as e:
        raise ValueError(f"Error processing image: {str(e)}")


