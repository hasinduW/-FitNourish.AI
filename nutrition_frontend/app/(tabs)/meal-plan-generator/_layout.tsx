import { Stack } from "expo-router";
import React, { createContext, SetStateAction, useContext, useState } from "react";

export type MealPlanSettings = {
  dailyCalorieTarget: number;
  mealsPerDay: number;
  calorieDistributionRatios: number[];
  targetMacroRatios: { fat: number; carb: number; protein: number };
  preferredIngredients: string[];
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
}>({
  settings: DEFAULT_SETTINGS,
  setSettings: () => {},
});

export function useMealPlanSettings() {
  return useContext(MealPlanSettingsContext);
}

export default function MealPlanGeneratorLayout() {
  const [settings, setSettings] = useState<MealPlanSettings>(DEFAULT_SETTINGS);

  return (
    <MealPlanSettingsContext.Provider value={{ settings, setSettings }}>
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
