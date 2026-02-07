import { Settings } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Fonts } from "@/constants/theme";
import { suggestMeals } from "@/src/api/client";

// Sage green theme (align with app primary)
const SAGE_GREEN = "#2EA37A";
const GRAY_BORDER = "#E0E0E0";
const GRAY_TEXT = "#6B6B6B";

const MAX_WIDTH_WEB = 520;
const DEFAULT_DAILY_CALORIE_TARGET = 2500;
const DEFAULT_MEALS_PER_DAY = 3;

// Placeholder when API returns no image
const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80";

const isWeb = Platform.OS === "web";

export type MealPlanItem = {
  mealName: string;
  imageUri: string;
  ingredients: string[];
  nutrients: { fat: number; protein: number; carbs: number };
  totalCalories: number;
};

function mapApiMealToItem(api: {
  meal_name: string;
  calories: number;
  image: string;
  ingredients: string[];
  nutrients: { name: string; amount: number; unit: string }[];
}): MealPlanItem {
  const fat = api.nutrients.find((n) => n.name === "Fat")?.amount ?? 0;
  const protein = api.nutrients.find((n) => n.name === "Protein")?.amount ?? 0;
  const carbs =
    api.nutrients.find((n) => n.name === "Carbohydrates")?.amount ?? 0;
  return {
    mealName: api.meal_name,
    imageUri: api.image && api.image.startsWith("data:") ? api.image : PLACEHOLDER_IMAGE,
    ingredients: api.ingredients ?? [],
    nutrients: { fat, protein, carbs },
    totalCalories: api.calories ?? 0,
  };
}

type Props = {
  onSettingsPress?: () => void;
  dailyCalorieTarget?: number;
  mealsPerDay?: number;
  calorieDistributionRatios?: number[];
  targetMacroRatios?: { fat: number; carb: number; protein: number };
};

export function MealPlanGeneratorScreen({
  onSettingsPress,
  dailyCalorieTarget = DEFAULT_DAILY_CALORIE_TARGET,
  mealsPerDay = DEFAULT_MEALS_PER_DAY,
  calorieDistributionRatios,
  targetMacroRatios,
}: Props) {
  const [mealPlan, setMealPlan] = useState<MealPlanItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMealPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const suggestions = await suggestMeals(dailyCalorieTarget, mealsPerDay, {
        calorie_distribution_ratios: calorieDistributionRatios,
        target_macro_ratios: targetMacroRatios,
      });
      setMealPlan(suggestions.map(mapApiMealToItem));
    } catch (e) {
      setError((e as Error).message || "Failed to load meal plan");
      setMealPlan([]);
    } finally {
      setLoading(false);
    }
  }, [dailyCalorieTarget, mealsPerDay, calorieDistributionRatios, targetMacroRatios]);

  useEffect(() => {
    fetchMealPlan();
  }, [fetchMealPlan]);

  const { width } = Dimensions.get("window");
  const contentMaxWidth = isWeb ? Math.min(width, MAX_WIDTH_WEB) : width;

  if (loading) {
    return (
      <View style={[styles.scrollView, styles.centered]}>
        <ActivityIndicator size="large" color={SAGE_GREEN} />
        <Text style={[styles.loadingText, { color: SAGE_GREEN }]}>
          Generating your meal plan...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        { maxWidth: contentMaxWidth },
        !isWeb && styles.scrollContentMobile,
      ]}
      showsVerticalScrollIndicator={!isWeb}
      centerContent={isWeb}
    >
      {/* Header: Title + Settings icon */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { fontFamily: Fonts.serif }]}>
          Meal Plan Generator
        </Text>
        <Pressable
          onPress={onSettingsPress}
          style={({ pressed }) => [
            styles.settingsBtn,
            pressed && styles.settingsBtnPressed,
          ]}
          hitSlop={12}
        >
          <Settings size={24} color={SAGE_GREEN} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Daily Target banner */}
      <View style={styles.dailyBanner}>
        <Text style={styles.dailyBannerText}>
          Daily Calorie Target – {dailyCalorieTarget}
        </Text>
      </View>

      {/* Section title + divider */}
      <Text style={[styles.sectionTitle, { fontFamily: Fonts.serif }]}>
        Suggested meal plan
      </Text>
      <View style={styles.divider} />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={fetchMealPlan} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Meal cards */}
      {(mealPlan ?? []).map((meal, index) => (
        <View key={index} style={styles.card}>
          {/* Card header: background image + meal name overlay */}
          <View style={styles.cardImageWrapper}>
            <ImageBackground
              source={{ uri: meal.imageUri }}
              style={styles.cardImage}
              resizeMode="cover"
            >
              <View style={styles.cardImageOverlay} />
              <Text style={[styles.cardMealName, { zIndex: 1 }]}>{meal.mealName}</Text>
            </ImageBackground>
          </View>

          {/* Ingredients list */}
          <View style={styles.ingredientsSection}>
            <Text style={styles.ingredientsLabel}>Ingredients</Text>
            {meal.ingredients.map((ing, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{ing}</Text>
              </View>
            ))}
          </View>

          {/* Nutrients grid: Fat, Protein, Carbs */}
          <View style={styles.nutrientsGrid}>
            <View style={styles.nutrientBox}>
              <Text style={styles.nutrientLabel}>Fat</Text>
              <Text style={styles.nutrientValue}>{meal.nutrients.fat}g</Text>
            </View>
            <View style={styles.nutrientBox}>
              <Text style={styles.nutrientLabel}>Protein</Text>
              <Text style={styles.nutrientValue}>{meal.nutrients.protein}g</Text>
            </View>
            <View style={styles.nutrientBox}>
              <Text style={styles.nutrientLabel}>Carbs</Text>
              <Text style={styles.nutrientValue}>{meal.nutrients.carbs}g</Text>
            </View>
          </View>

          {/* Footer: Total Calories */}
          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterLabel}>Total Calories</Text>
            <Text style={styles.cardFooterValue}>{meal.totalCalories} kcal</Text>
          </View>
        </View>
      ))}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  errorBox: {
    padding: 20,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    marginBottom: 24,
    alignItems: "center",
  },
  errorText: {
    fontSize: 15,
    color: "#991B1B",
    textAlign: "center",
    marginBottom: 12,
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: SAGE_GREEN,
    borderRadius: 10,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignSelf: "center",
    width: "100%",
  },
  scrollContentMobile: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "600",
    color: SAGE_GREEN,
  },
  settingsBtn: {
    padding: 8,
    borderRadius: 20,
  },
  settingsBtnPressed: {
    backgroundColor: "rgba(46, 163, 122, 0.12)",
  },
  dailyBanner: {
    width: "100%",
    backgroundColor: SAGE_GREEN,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 28,
    alignItems: "center",
  },
  dailyBannerText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 10,
    textAlign: "left",
  },
  divider: {
    height: 1,
    backgroundColor: GRAY_BORDER,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImageWrapper: {
    width: "100%",
    height: 160,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
    padding: 16,
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  cardMealName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ingredientsSection: {
    padding: 18,
    paddingBottom: 12,
  },
  ingredientsLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  bullet: {
    fontSize: 16,
    color: SAGE_GREEN,
    marginRight: 8,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
  },
  nutrientsGrid: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 12,
  },
  nutrientBox: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: GRAY_BORDER,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  nutrientLabel: {
    fontSize: 13,
    color: GRAY_TEXT,
    marginBottom: 4,
    fontWeight: "500",
  },
  nutrientValue: {
    fontSize: 17,
    fontWeight: "700",
    color: SAGE_GREEN,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: GRAY_BORDER,
  },
  cardFooterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  cardFooterValue: {
    fontSize: 18,
    fontWeight: "700",
    color: SAGE_GREEN,
  },
  bottomSpacer: {
    height: 24,
  },
});
