import { FoodDatabase } from '../types';

export const FOOD_DATABASE: FoodDatabase[] = [
  { name: 'Apple', category: 'Fruits', serving_g: 182, cal_per_100g: 52, sugar_per_100g: 10.4 },
  { name: 'Banana', category: 'Fruits', serving_g: 118, cal_per_100g: 89, sugar_per_100g: 12.2 },
  { name: 'Orange', category: 'Fruits', serving_g: 131, cal_per_100g: 47, sugar_per_100g: 9.4 },
  { name: 'Strawberry', category: 'Fruits', serving_g: 150, cal_per_100g: 32, sugar_per_100g: 4.9 },
  { name: 'Grapes', category: 'Fruits', serving_g: 150, cal_per_100g: 69, sugar_per_100g: 15.5 },
  { name: 'Broccoli', category: 'Vegetables', serving_g: 91, cal_per_100g: 34, sugar_per_100g: 1.7 },
  { name: 'Carrot', category: 'Vegetables', serving_g: 61, cal_per_100g: 41, sugar_per_100g: 4.7 },
  { name: 'Spinach', category: 'Vegetables', serving_g: 30, cal_per_100g: 23, sugar_per_100g: 0.4 },
  { name: 'Tomato', category: 'Vegetables', serving_g: 123, cal_per_100g: 18, sugar_per_100g: 2.6 },
  { name: 'Potato', category: 'Vegetables', serving_g: 173, cal_per_100g: 77, sugar_per_100g: 0.8 },
  { name: 'Chicken Breast', category: 'Meat', serving_g: 170, cal_per_100g: 165, sugar_per_100g: 0 },
  { name: 'Beef Steak', category: 'Meat', serving_g: 225, cal_per_100g: 271, sugar_per_100g: 0 },
  { name: 'Salmon', category: 'Meat', serving_g: 178, cal_per_100g: 208, sugar_per_100g: 0 },
  { name: 'Pork Chop', category: 'Meat', serving_g: 150, cal_per_100g: 242, sugar_per_100g: 0 },
  { name: 'Eggs', category: 'Meat', serving_g: 50, cal_per_100g: 155, sugar_per_100g: 1.1 },
  { name: 'Rice', category: 'Grains', serving_g: 158, cal_per_100g: 130, sugar_per_100g: 0.1 },
  { name: 'Pasta', category: 'Grains', serving_g: 140, cal_per_100g: 131, sugar_per_100g: 0.6 },
  { name: 'Oats', category: 'Grains', serving_g: 40, cal_per_100g: 389, sugar_per_100g: 0.99 },
  { name: 'Quinoa', category: 'Grains', serving_g: 185, cal_per_100g: 120, sugar_per_100g: 0.9 },
  { name: 'Milk', category: 'Dairy', serving_g: 244, cal_per_100g: 61, sugar_per_100g: 5.1 },
  { name: 'Yogurt', category: 'Dairy', serving_g: 200, cal_per_100g: 59, sugar_per_100g: 3.2 },
  { name: 'Cheese', category: 'Dairy', serving_g: 28, cal_per_100g: 402, sugar_per_100g: 0.5 },
  { name: 'Butter', category: 'Dairy', serving_g: 14, cal_per_100g: 717, sugar_per_100g: 0.1 },
  { name: 'Nuts', category: 'Snacks', serving_g: 28, cal_per_100g: 607, sugar_per_100g: 5 },
  { name: 'Cookies', category: 'Snacks', serving_g: 30, cal_per_100g: 502, sugar_per_100g: 35 },
  { name: 'Coffee', category: 'Beverages', serving_g: 240, cal_per_100g: 2, sugar_per_100g: 0 },
  { name: 'Orange Juice', category: 'Beverages', serving_g: 240, cal_per_100g: 45, sugar_per_100g: 8.4 },
];

export const API_URL = 'http://192.168.8.107:8000'; 

export const MEAL_ICONS: Record<string, string> = {
  breakfast: '☕',
  lunch: '🍽️',
  dinner: '🌙',
  snacks: '🍪',
};

export const PROFESSIONS = [
  'office_worker', 'teacher', 'artist', 'farmer',
  'driver', 'engineer', 'student', 'doctor', 'other',
];

export const DISEASE_TYPES = ['None', 'Diabetes', 'Hypertension', 'Obesity'];
export const SEVERITIES = ['Mild', 'Moderate', 'Severe'];