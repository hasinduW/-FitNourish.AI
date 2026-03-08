import { mapApiMealToItem } from "@/components/MealPlanGeneratorScreen";
import { MealPlanSettingsScreen } from "@/components/MealPlanSettingsScreen";
import { suggestMeals } from "@/src/api/client";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useMealPlanSettings } from "./_layout";

export default function MealPlanSettingsRoute() {
  const router = useRouter();
  const { settings, setSettings, setMealPlan } = useMealPlanSettings();
  const [saving, setSaving] = useState(false);

  async function handleSave(payload: {
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

    setSaving(true);
    try {
      const suggestions = await suggestMeals(
        payload.dailyCalorieTarget,
        payload.mealsPerDay,
        {
          calorie_distribution_ratios: payload.calorieDistributionRatios,
          target_macro_ratios: payload.targetMacroRatios,
          preferred_ingredients:
            payload.preferredIngredients.length > 0
              ? payload.preferredIngredients
              : undefined,
        }
      );
      setMealPlan(suggestions.map(mapApiMealToItem));
      router.back();
    } catch (e) {
      Alert.alert(
        "Could not generate plan",
        (e as Error).message || "Suggest meals failed. Check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
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
        saving={saving}
      />
    </SafeAreaView>
  );
}
