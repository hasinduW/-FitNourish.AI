import { MealPlanGeneratorScreen } from "@/components/MealPlanGeneratorScreen";
import { useMealPlanSettings } from "./_layout";
import { useRouter } from "expo-router";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MealPlanGeneratorTab() {
  const router = useRouter();
  const { settings } = useMealPlanSettings();

  function handleSettingsPress() {
    router.push("/(tabs)/meal-plan-generator/settings");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <MealPlanGeneratorScreen
        onSettingsPress={handleSettingsPress}
        dailyCalorieTarget={settings.dailyCalorieTarget}
        mealsPerDay={settings.mealsPerDay}
        calorieDistributionRatios={settings.calorieDistributionRatios}
        targetMacroRatios={settings.targetMacroRatios}
        preferredIngredients={settings.preferredIngredients}
      />
    </SafeAreaView>
  );
}
