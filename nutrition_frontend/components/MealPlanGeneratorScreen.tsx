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
  TextStyle,
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
const MAX_INGREDIENTS = 10;
const INGREDIENTS_PER_COLUMN = 5;

/** Order ingredients so preferred ones come first, then take max 10. Case-insensitive + substring match. */
function orderIngredientsWithPreferredFirst(
  ingredients: string[],
  preferred: string[] | undefined
): string[] {
  if (!preferred?.length) return ingredients.slice(0, MAX_INGREDIENTS);
  const preferredSet = new Set(preferred.map((p) => p.trim().toLowerCase()));
  const isPreferred = (ing: string) => {
    const lower = ing.trim().toLowerCase();
    if (preferredSet.has(lower)) return true;
    return [...preferredSet].some((p) => lower.includes(p) || p.includes(lower));
  };
  const preferredFirst = [...ingredients].sort((a, b) => {
    const aPref = isPreferred(a) ? 1 : 0;
    const bPref = isPreferred(b) ? 1 : 0;
    return bPref - aPref; // preferred (1) before non-preferred (0)
  });
  return preferredFirst.slice(0, MAX_INGREDIENTS);
}

// Placeholder when API returns no image
const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80";
// Hero image for the generate state (appetizing meal / meal plan vibe)
const GENERATE_HERO_IMAGE =
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=85";

const isWeb = Platform.OS === "web";

export type MealPlanItem = {
  mealName: string;
  imageUri: string;
  ingredients: string[];
  nutrients: { fat: number; protein: number; carbs: number };
  totalCalories: number;
};

/** Map API suggestion to MealPlanItem. Exported so settings can use it after calling suggestMeals on Save. */
export function mapApiMealToItem(api: {
  meal_name: string;
  calories: number;
  image: string;
  image_url?: string | null;
  ingredients: string[];
  nutrients: { name: string; amount: number; unit: string }[];
}): MealPlanItem {
  const fat = api.nutrients.find((n) => n.name === "Fat")?.amount ?? 0;
  const protein = api.nutrients.find((n) => n.name === "Protein")?.amount ?? 0;
  const carbs =
    api.nutrients.find((n) => n.name === "Carbohydrates")?.amount ?? 0;
  // Prefer image_url (fetch from API/DB); else inline data URL; else placeholder
  const imageUri =
    api.image_url && api.image_url.trim() !== ""
      ? api.image_url
      : api.image && api.image.trim() !== ""
        ? api.image
        : PLACEHOLDER_IMAGE;
  return {
    mealName: api.meal_name,
    imageUri: imageUri ? imageUri : PLACEHOLDER_IMAGE,
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
  preferredIngredients?: string[];
  /** When provided (e.g. from layout context), use these instead of internal state – e.g. after Save in settings triggers suggestMeals */
  mealPlan?: MealPlanItem[] | null;
  setMealPlan?: React.Dispatch<React.SetStateAction<MealPlanItem[] | null>>;
};

export function MealPlanGeneratorScreen({
  onSettingsPress,
  dailyCalorieTarget = DEFAULT_DAILY_CALORIE_TARGET,
  mealsPerDay = DEFAULT_MEALS_PER_DAY,
  calorieDistributionRatios,
  targetMacroRatios,
  preferredIngredients,
  mealPlan: mealPlanProp,
  setMealPlan: setMealPlanProp,
}: Props) {
  const [mealPlanLocal, setMealPlanLocal] = useState<MealPlanItem[] | null>(null);
  const mealPlan = mealPlanProp !== undefined ? mealPlanProp : mealPlanLocal;
  const setMealPlan = setMealPlanProp ?? setMealPlanLocal;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Indices of meal cards whose image failed to load (404 etc.) – show placeholder for those */
  const [imageLoadFailedIndices, setImageLoadFailedIndices] = useState<Set<number>>(new Set());

  // When daily calorie target changes (e.g. fetched from API), clear the plan so user must regenerate
  useEffect(() => {
    setMealPlan(null);
    setError(null);
    setImageLoadFailedIndices(new Set());
  }, [dailyCalorieTarget, setMealPlan]);

  // Reset failed-image set when meal plan is replaced (e.g. after regenerate)
  useEffect(() => {
    setImageLoadFailedIndices(new Set());
  }, [mealPlan]);

  const fetchMealPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const suggestions = await suggestMeals(dailyCalorieTarget, mealsPerDay, {
        calorie_distribution_ratios: calorieDistributionRatios,
        target_macro_ratios: targetMacroRatios,
        preferred_ingredients: preferredIngredients?.length ? preferredIngredients : undefined,
      });
      setMealPlan(suggestions.map(mapApiMealToItem));
    } catch (e) {
      setError((e as Error).message || "Failed to load meal plan");
      setMealPlan([]);
    } finally {
      setLoading(false);
    }
  }, [dailyCalorieTarget, mealsPerDay, calorieDistributionRatios, targetMacroRatios, preferredIngredients, setMealPlan]);

  const { width } = Dimensions.get("window");
  const contentMaxWidth = isWeb ? Math.min(width, MAX_WIDTH_WEB) : width;

  const hasPlan = mealPlan != null && mealPlan.length > 0;
  const showGenerateState = !hasPlan && !loading;

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
          style={({ pressed }: { pressed: boolean }) => [
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

      {loading ? (
        <View style={[styles.generateSection, styles.centered]}>
          <ActivityIndicator size="large" color={SAGE_GREEN} />
          <Text style={[styles.loadingText, { color: SAGE_GREEN }]}>
            Generating your meal plan...
          </Text>
        </View>
      ) : showGenerateState ? (
        <>
          <View style={styles.generateHeroWrapper}>
            <ImageBackground
              source={{ uri: GENERATE_HERO_IMAGE }}
              style={styles.generateHeroImage}
              resizeMode="cover"
            >
              <View style={styles.generateHeroOverlay} />
              <Text style={styles.generateHeroTitle}>Your plan, your pace</Text>
              <Text style={styles.generateHeroSub}>
                We will suggest meals that match your calories and goals
              </Text>
            </ImageBackground>
          </View>
          <View style={styles.generateSection}>
            <Text style={styles.generatePrompt}>
              Get a personalized meal plan based on your daily target and preferences.
            </Text>
            <Pressable
              onPress={fetchMealPlan}
              style={({ pressed }) => [
                styles.generateBtn,
                pressed && styles.generateBtnPressed,
              ]}
            >
              <Text style={styles.generateBtnText}>Generate Meal Plan</Text>
            </Pressable>
          </View>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={fetchMealPlan} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.mealPlanResults}>
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
          {(mealPlan ?? []).map((meal: MealPlanItem, index: number) => {
            const imageUri =
              imageLoadFailedIndices.has(index) ? PLACEHOLDER_IMAGE : meal.imageUri;
            return (
            <View key={index} style={styles.card}>
              {/* Card header: background image + meal name overlay */}
              <View style={styles.cardImageWrapper}>
                <ImageBackground
                  source={{ uri: imageUri }}
                  style={styles.cardImage}
                  resizeMode="cover"
                  onError={() => {
                    setImageLoadFailedIndices((prev) => new Set(prev).add(index));
                  }}
                >
                  <View style={styles.cardImageOverlay} />
                  <Text style={[styles.cardMealName, { zIndex: 1 }]}>{meal.mealName}</Text>
                </ImageBackground>
              </View>

              {/* Ingredients list: max 10, preferred first, 2 columns of 5 */}
              <View style={styles.ingredientsSection}>
                <Text style={styles.ingredientsLabel}>Ingredients</Text>
                <View style={styles.ingredientsTwoCol}>
                  {(() => {
                    const displayed = orderIngredientsWithPreferredFirst(meal.ingredients, preferredIngredients);
                    const col1 = displayed.slice(0, INGREDIENTS_PER_COLUMN);
                    const col2 = displayed.slice(INGREDIENTS_PER_COLUMN, MAX_INGREDIENTS);
                    return (
                      <>
                        <View style={styles.ingredientsColumn}>
                          {col1.map((ing, i) => (
                            <View key={i} style={styles.bulletRow}>
                              <Text style={styles.bullet}>•</Text>
                              <Text style={styles.bulletText}>{ing}</Text>
                            </View>
                          ))}
                        </View>
                        <View style={styles.ingredientsColumn}>
                          {col2.map((ing, i) => (
                            <View key={INGREDIENTS_PER_COLUMN + i} style={styles.bulletRow}>
                              <Text style={styles.bullet}>•</Text>
                              <Text style={styles.bulletText}>{ing}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    );
                  })()}
                </View>
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
            );
          })}
        </View>
      )}

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
  generateHeroWrapper: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  generateHeroImage: {
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
    padding: 20,
  },
  generateHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  generateHeroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    zIndex: 1,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  generateHeroSub: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.95)",
    marginTop: 6,
    zIndex: 1,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  generateSection: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  generatePrompt: {
    fontSize: 16,
    color: GRAY_TEXT,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  generateBtn: {
    backgroundColor: SAGE_GREEN,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: "center",
    alignSelf: "center",
  },
  generateBtnPressed: {
    opacity: 0.9,
  },
  generateBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
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
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    backgroundColor: SAGE_GREEN,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 28,
  },
  dailyBannerText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  mealPlanResults: {},
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
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
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
    textShadow: "0 1px 3px rgba(0,0,0,0.5)",
  } as TextStyle,
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
  ingredientsTwoCol: {
    flexDirection: "row",
    gap: 16,
  },
  ingredientsColumn: {
    flex: 1,
    maxWidth: "50%",
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
