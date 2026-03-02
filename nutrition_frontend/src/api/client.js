import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "@fitnourish_token";

// Use EXPO_PUBLIC_API_URL for physical device (your laptop's LAN IP, e.g. http://192.168.1.5:8000)
export const BASE_URL =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL) ||
  "http://127.0.0.1:8000";

/** Get auth headers (Bearer token) for authenticated requests. Call before each API request. */
export async function getAuthHeaders() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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

  const auth = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/api/analyze-meal`, {
    method: "POST",
    headers: { ...auth },
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
 * @param {{ calorie_distribution_ratios?: number[], target_macro_ratios?: { fat?: number, carb?: number, protein?: number }, preferred_ingredients?: string[] }} options - Optional
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
    ...(options.preferred_ingredients && options.preferred_ingredients.length > 0 && {
      preferred_ingredients: options.preferred_ingredients.map((s) => String(s).toLowerCase()),
    }),
  };
  const auth = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/api/suggest-meals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Suggest meals failed: ${res.status}`);
  }
  return res.json();
}

export async function predictAndSave(payload) {
  const auth = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/predict-and-save`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getHistory(userId) {
  const auth = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/history/${userId}`, { headers: { ...auth } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/**
 * Get list of ingredients from GET /api/get-ingredients (for meal plan preferences).
 * @returns {Promise<{ ingredients: string[] }>}
 */
export async function getIngredients() {
  const auth = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/api/get-ingredients`, { headers: { ...auth } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// --- Auth (JWT) ---

/**
 * Login with username and password.
 * @returns {Promise<{ access_token, token_type, user_id, username }>}
 */
export async function login(username, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Login failed");
  }
  return res.json();
}

/**
 * Sign up with first name, last name, username and password.
 * @returns {Promise<{ access_token, token_type, user_id, username, first_name?, last_name? }>}
 */
export async function signup(firstName, lastName, username, password) {
  const res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      username,
      password,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Signup failed");
  }
  return res.json();
}

/** Get Authorization header value when you already have the token (e.g. from context). */
export function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Get current user from GET /api/auth/me (requires JWT).
 * @returns {Promise<{ id, username, first_name?, last_name? }>}
 */
export async function getMe() {
  const auth = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/api/auth/me`, { headers: { ...auth } });
  if (!res.ok) throw new Error(res.status === 401 ? "Not authenticated" : (await res.text()));
  return res.json();
}
