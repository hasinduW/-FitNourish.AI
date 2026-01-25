"""
Ingredient Predictor Service

This module handles the prediction of ingredients from meal images using ML models.
"""

import os
import json
import numpy as np
import tensorflow as tf
from PIL import Image
import io
import tempfile
from pathlib import Path


def load_class_map(json_path: str = None) -> dict:
    """
    Load class mapping from JSON file.
    
    Args:
        json_path: Path to the class_encoding.json file. If None, uses default path.
        
    Returns:
        dict: Dictionary mapping class indices (int) to ingredient names (str)
    """
    if json_path is None:
        # Use relative path from project root
        base_path = Path(__file__).parent.parent
        # Try 'ml-models' first, then 'model' (singular), then 'models' (plural)
        json_path = base_path / 'ml-models' / 'class_encoding.json'
        
        # Fallback to 'model' (singular) if 'ml-models' doesn't exist
        if not json_path.exists():
            json_path = base_path / 'model' / 'class_encoding.json'
        
        # Fallback to 'models' (plural) if 'model' doesn't exist
        if not json_path.exists():
            json_path = base_path / 'models' / 'class_encoding.json'
        
        # Final fallback to absolute path
        if not json_path.exists():
            json_path = Path('/model/class_encoding.json')
    
    try:
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        # Extract ingredient mapping from "ingr" key
        # JSON has string keys "0", "1", etc., convert to integers
        class_map = {int(k): v for k, v in data['ingr'].items()}
        
        return class_map
    except FileNotFoundError:
        raise FileNotFoundError(f"Class encoding file not found at: {json_path}")
    except KeyError:
        raise ValueError(f"Invalid class encoding format in {json_path}. Expected 'ingr' key.")
    except Exception as e:
        raise ValueError(f"Error loading class encoding: {str(e)}")


# Load class map from JSON file (lazy loading - will try to load when needed)
CLASS_MAP = None

def get_class_map() -> dict:
    """Get the class map, loading it if necessary."""
    global CLASS_MAP
    if CLASS_MAP is None:
        CLASS_MAP = load_class_map()
    return CLASS_MAP

# Try to load class map at module import time
try:
    CLASS_MAP = load_class_map()
except (FileNotFoundError, ValueError) as e:
    # If file not found at import time, will be loaded when needed
    CLASS_MAP = None


def make_ingredient_prediction(img, model, class_map=None):
    """
    Make ingredient prediction using the loaded model.
    
    Args:
        img: Preprocessed image array ready for model input
        model: Loaded Keras model for ingredient prediction
        class_map: Dictionary mapping class indices to ingredient names.
                   If None, uses default CLASS_MAP.
        
    Returns:
        tuple: (predicted_labels, probabilities) - top 5 predictions with probabilities
    """
    if class_map is None:
        class_map = get_class_map()
    
    predictions = model.predict(img, verbose=0)[0]
    
    # Get top predictions (get more than 5 to account for filtering)
    indices = np.argsort(predictions)[::-1]
    
    # Filter to only include indices that are in class_map
    valid_indices = [i for i in indices if i in class_map]
    
    # Take top 5 valid predictions
    valid_indices = valid_indices[:5]
    
    # Get labels and probabilities for valid indices only
    predicted_labels = [class_map[i] for i in valid_indices]
    probs = [float(predictions[i]) * 100 for i in valid_indices]  # Convert to percentages
    return predicted_labels, probs


def predict_ingredients_from_image(image_file, model_path: str = None, class_map: dict = None, class_map_path: str = None) -> dict:
    """
    Predict ingredients from an uploaded meal image.
    
    Args:
        image_file: FastAPI UploadFile object containing the image
        model_path: Path to the model file. If None, uses default path.
        class_map: Dictionary mapping class indices to ingredient names.
                   If None, uses default CLASS_MAP or loads from class_map_path.
        class_map_path: Path to class encoding JSON file. Only used if class_map is None.
        
    Returns:
        dict: Dictionary containing:
            - predictions: List of top 5 predicted ingredient names
            - probabilities: List of corresponding probabilities (0-100)
            
    Raises:
        FileNotFoundError: If the model file or class encoding file is not found
        ValueError: If the image cannot be processed
    """
    if class_map is None:
        if class_map_path is not None:
            class_map = load_class_map(class_map_path)
        else:
            class_map = get_class_map()
        
    try:
        # Set default model path if not provided
        if model_path is None:
            # Use relative path from project root
            base_path = Path(__file__).parent.parent
            # Try 'ml-models' first, then 'model' (singular), then 'models' (plural)
            model_path = base_path / 'ml-models' / 'ingredient_model_EfficientNetV2B0.keras'
            
            # Fallback to 'model' (singular) if 'ml-models' doesn't exist
            if not model_path.exists():
                model_path = base_path / 'model' / 'ingredient_model_EfficientNetV2B0.keras'
            
            # Fallback to 'models' (plural) if 'model' doesn't exist
            if not model_path.exists():
                model_path = base_path / 'models' / 'ingredient_model_EfficientNetV2B0.keras'
            
            # Final fallback to absolute path
            if not model_path.exists():
                model_path = Path('/models/ingredient_model_EfficientNetV2B0.keras')
        
        # Load the model
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at: {model_path}")
        
        # Suppress optimizer warnings since we're only using the model for inference
        import warnings
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=UserWarning, message=".*optimizer.*")
            image_model = tf.keras.models.load_model(str(model_path), compile=False)
        
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
        preds, probs = make_ingredient_prediction(x_image_model, image_model, class_map)
        
        return {
            'predictions': preds,
            'probabilities': probs
        }
        
    except FileNotFoundError as e:
        raise FileNotFoundError(f"Model file not found: {e}")
    except Exception as e:
        raise ValueError(f"Error processing image: {str(e)}")
