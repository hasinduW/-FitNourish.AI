import { MealPlanSettingsScreen } from "@/components/MealPlanSettingsScreen";
import { useMealPlanSettings } from "./_layout";
import { useRouter } from "expo-router";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MealPlanSettingsRoute() {
  const router = useRouter();
  const { settings, setSettings } = useMealPlanSettings();

  function handleSave(payload: {
    dailyCalorieTarget: number;
    mealsPerDay: number;
    calorieDistributionRatios: number[];
    targetMacroRatios: { fat: number; carb: number; protein: number };
    preferredIngredients: string[];
  }) {
    setSettings({
      dailyCalorieTarget: payload.dailyCalorieTarget,
      mealsPerDay: payload.mealsPerDay,
      calorieDistributionRatios: payload.calorieDistributionRatios,
      targetMacroRatios: payload.targetMacroRatios,
      preferredIngredients: payload.preferredIngredients,
    });
    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <MealPlanSettingsScreen
        initialDailyCalorieTarget={settings.dailyCalorieTarget}
        initialMealsPerDay={settings.mealsPerDay}
        initialCalorieRatios={settings.calorieDistributionRatios}
        initialMacroRatios={settings.targetMacroRatios}
        initialPreferredIngredients={settings.preferredIngredients}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}
