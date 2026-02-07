import { MealPlanSettingsScreen } from "@/components/MealPlanSettingsScreen";
import { useMealPlanSettings } from "./_layout";
import { useRouter } from "expo-router";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MealPlanSettingsRoute() {
  const router = useRouter();
  const { settings, setSettings } = useMealPlanSettings();

  function handleSave(payload: {
    mealsPerDay: number;
    calorieDistributionRatios: number[];
    targetMacroRatios: { fat: number; carb: number; protein: number };
  }) {
    setSettings({
      dailyCalorieTarget: settings.dailyCalorieTarget,
      mealsPerDay: payload.mealsPerDay,
      calorieDistributionRatios: payload.calorieDistributionRatios,
      targetMacroRatios: payload.targetMacroRatios,
    });
    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <MealPlanSettingsScreen
        initialMealsPerDay={settings.mealsPerDay}
        initialCalorieRatios={settings.calorieDistributionRatios}
        initialMacroRatios={settings.targetMacroRatios}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}
