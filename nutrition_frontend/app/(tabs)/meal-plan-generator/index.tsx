import { MealPlanGeneratorScreen } from "@/components/MealPlanGeneratorScreen";
import { useAuth } from "@/contexts/AuthContext";
import { getHistory } from "@/src/api/client";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MealPlanSettings } from "./_layout";
import { useMealPlanSettings } from "./_layout";

export default function MealPlanGeneratorTab() {
  const router = useRouter();
  const { settings, setSettings } = useMealPlanSettings();
  const { user } = useAuth();

  // Every time user opens this tab, fetch latest daily_kcal_need from GET /history/{user_id}
  useFocusEffect(
    useCallback(() => {
      const userId = user?.user_id;
      if (!userId) return;

      getHistory(userId)
        .then((list) => {
          const latest = Array.isArray(list) && list.length > 0 ? list[0] : null;
          const kcal = latest?.daily_kcal_need;
          const value = typeof kcal === "number" && Number.isFinite(kcal) ? Math.round(kcal) : null;
          if (value != null && value >= 500 && value <= 5000) {
            setSettings((prev: MealPlanSettings) => ({ ...prev, dailyCalorieTarget: value }));
          }
        })
        .catch(() => {});
    }, [user?.user_id, setSettings])
  );

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
