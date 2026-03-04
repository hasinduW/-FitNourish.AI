export interface FoodItem {
  id: number;
  food: string;
  grams: number;
  calories: number;
  sugar: number;
}

export interface FoodDatabase {
  name: string;
  category: string;
  serving_g: number;
  cal_per_100g: number;
  sugar_per_100g: number;
}

export interface Meals {
  breakfast: FoodItem[];
  lunch: FoodItem[];
  dinner: FoodItem[];
  snacks: FoodItem[];
}

export interface UserData {
  userId: string | undefined;
  age: string;
  gender: string;
  weight: string;
  height: string;
  exercise: string;
  sleep: string;
  sugar_intake: string;
  smoking: string;
  alcohol: string;
  married: string;
  profession: string;
  disease_type: string;
  severity: string;
  cholesterol: string;
  blood_pressure: string;
  glucose: string;
  dietary_restrictions: string;
  allergies: string;
  exercise_hours: string;
  adherence: string;
  daily_caloric_intake: string;
  meals: Meals;
}

export interface AssessmentResults {
  success: boolean;
  timestamp: string;
  user_profile: {
    age: number;
    gender: string;
    bmi: number;
    activity_level: string;
  };
  health_risk: {
    risk_level: string;
    confidence: number;
    risk_info: {
      level: string;
      message: string;
      color: string;
      icon: string;
      urgency: string;
      actions: string[];
    };
  };
  diet_recommendation: {
    recommended_diet: string;
    confidence: number;
    diet_info: {
      description: string;
      principles: string[];
      benefits: string[];
    };
  };
  overall_assessment: {
    summary: string;
    priority: string;
    timeline: string;
    key_actions: string[];
    critical_alerts: Alert[];
  };
}

export interface Alert {
  level: string;
  type: string;
  icon: string;
  message: string;
  action: string;
}

export type MealType = keyof Meals;