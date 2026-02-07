export const BASE_URL = "http://127.0.0.1:8000";

/**
 * Analyze meal image via POST /api/analyze-meal.
 * @param {string} imageUri - Local file URI (e.g. from ImagePicker), or data/blob URL on web
 * @returns {Promise<{ ingredients: Array<{name, amount, unit, possibility}>, nutrients: Array<{name, amount, unit, percentage}>, calories_per_100g: number }>}
 */
export async function analyzeMeal(imageUri) {
  const formData = new FormData();

  // On web, { uri, type, name } is not sent as a file; fetch the image and append as Blob/File.
  const isWeb =
    typeof window !== "undefined" &&
    (imageUri.startsWith("data:") ||
      imageUri.startsWith("blob:") ||
      imageUri.startsWith("http"));
  if (isWeb) {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    formData.append("image", blob, "meal.jpg");
  } else {
    // React Native: append file using platform-specific object
    formData.append("image", {
      uri: imageUri,
      type: "image/jpeg",
      name: "meal.jpg",
    });
  }

  const res = await fetch(`${BASE_URL}/api/analyze-meal`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Analyze meal failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Get meal suggestions from POST /api/suggest-meals.
 * @param {number} total_calories - Daily calorie target (default 2500)
 * @param {number} meals_per_day - Number of meals (default 3)
 * @param {{ calorie_distribution_ratios?: number[], target_macro_ratios?: { fat?: number, carb?: number, protein?: number } }} options - Optional
 * @returns {Promise<Array<{ meal_name, calories, time, description, image, ingredients, nutrients, mass }>>}
 */
export async function suggestMeals(total_calories = 2500, meals_per_day = 3, options = {}) {
  const body = {
    total_calories,
    meals_per_day,
    ...(options.calorie_distribution_ratios && {
      calorie_distribution_ratios: options.calorie_distribution_ratios,
    }),
    ...(options.target_macro_ratios && {
      target_macro_ratios: options.target_macro_ratios,
    }),
  };
  const res = await fetch(`${BASE_URL}/api/suggest-meals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Suggest meals failed: ${res.status}`);
  }
  return res.json();
}

export async function predictAndSave(payload) {
  const res = await fetch(`${BASE_URL}/predict-and-save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getHistory(userId) {
  const res = await fetch(`${BASE_URL}/history/${userId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
