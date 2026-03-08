import { Stack } from "expo-router";
import React, { createContext, SetStateAction, useContext, useState } from "react";

export type MealPlanSettings = {
  dailyCalorieTarget: number;
  mealsPerDay: number;
  calorieDistributionRatios: number[];
  targetMacroRatios: { fat: number; carb: number; protein: number };
  preferredIngredients: string[];
};

/** Same shape as MealPlanGeneratorScreen.MealPlanItem – used so layout can hold generated plan from settings Save */
export type MealPlanContextItem = {
  mealName: string;
  imageUri: string;
  ingredients: string[];
  nutrients: { fat: number; protein: number; carbs: number };
  totalCalories: number;
};

export const DEFAULT_DAILY_CALORIE_TARGET = 2500;

const DEFAULT_SETTINGS: MealPlanSettings = {
  dailyCalorieTarget: DEFAULT_DAILY_CALORIE_TARGET,
  mealsPerDay: 3,
  calorieDistributionRatios: [0.25, 0.4, 0.35],
  targetMacroRatios: { fat: 0.3, carb: 0.45, protein: 0.25 },
  preferredIngredients: [],
};

const MealPlanSettingsContext = createContext<{
  settings: MealPlanSettings;
  setSettings: React.Dispatch<SetStateAction<MealPlanSettings>>;
  mealPlan: MealPlanContextItem[] | null;
  setMealPlan: React.Dispatch<SetStateAction<MealPlanContextItem[] | null>>;
}>({
  settings: DEFAULT_SETTINGS,
  setSettings: () => {},
  mealPlan: null,
  setMealPlan: () => {},
});

export function useMealPlanSettings() {
  return useContext(MealPlanSettingsContext);
}

export default function MealPlanGeneratorLayout() {
  const [settings, setSettings] = useState<MealPlanSettings>(DEFAULT_SETTINGS);
  const [mealPlan, setMealPlan] = useState<MealPlanContextItem[] | null>(null);

  return (
    <MealPlanSettingsContext.Provider value={{ settings, setSettings, mealPlan, setMealPlan }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="settings"
          options={{
            presentation: "modal",
            title: "Meal Plan Settings",
          }}
        />
      </Stack>
    </MealPlanSettingsContext.Provider>
  );
}
