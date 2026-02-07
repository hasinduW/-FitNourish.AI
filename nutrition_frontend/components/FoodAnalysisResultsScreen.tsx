import { ChevronLeft } from "lucide-react-native";
import React from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Fonts } from "@/constants/theme";

// Green theme (#2EA37A)
const PRIMARY_GREEN = "#2EA37A";
const PRIMARY_GREEN_DARK = "#258C62";
const GRAY_CARD = "#F5F5F5";
const GRAY_BORDER = "#E0E0E0";

const MAX_WIDTH_WEB = 520;
const isWeb = Platform.OS === "web";

/** Dummy data - replace with API response */
export const DUMMY_FOOD_RESULT = {
  title: "Double Cheeseburger",
  ingredients: [
    "Beef Patty",
    "Cheese",
    "Bun",
    "Lettuce",
    "Tomato",
    "Onion",
    "Pickles",
    "Special Sauce",
  ],
  nutrition: {
    calories: 720,
    protein: 42,
    carbs: 45,
    fat: 38,
    fiber: 2,
  },
};

type FoodAnalysisResult = {
  title: string;
  ingredients: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
};

type Props = {
  imageUri: string;
  onBack: () => void;
  /** Pass API data or use dummy data */
  result?: FoodAnalysisResult;
};

export function FoodAnalysisResultsScreen({
  imageUri,
  onBack,
  result = DUMMY_FOOD_RESULT,
}: Props) {
  const { width, height } = Dimensions.get("window");
  const contentMaxWidth = isWeb ? Math.min(width, MAX_WIDTH_WEB) : width;
  const minContentHeight = isWeb ? undefined : height;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        { maxWidth: contentMaxWidth, minHeight: minContentHeight },
        !isWeb && styles.scrollContentMobile,
      ]}
      centerContent={isWeb}
      showsVerticalScrollIndicator={!isWeb}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { fontFamily: Fonts.serif }]}>
          Food Analyzer
        </Text>
      </View>

      <View style={styles.heroImageWrapper}>
        <Image
          source={{ uri: imageUri }}
          style={styles.heroImage}
          resizeMode="cover"
        />
      </View>

      <Text style={styles.foodTitle}>{result.title}</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Ingredients</Text>
        <View style={styles.pillsWrapper}>
          {result.ingredients.map((ing, i) => (
            <View key={i} style={styles.pill}>
              <Text style={styles.pillText}>{ing}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Nutritional Information</Text>
        <View style={styles.caloriesRow}>
          <Text style={styles.caloriesLabel}>Calories</Text>
          <Text style={styles.caloriesValue}>{result.nutrition.calories} kcal</Text>
        </View>
        <View style={styles.nutritionGrid}>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Protein</Text>
            <Text style={styles.nutritionValue}>{result.nutrition.protein}g</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Carbs</Text>
            <Text style={styles.nutritionValue}>{result.nutrition.carbs}g</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Fat</Text>
            <Text style={styles.nutritionValue}>{result.nutrition.fat}g</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Fiber</Text>
            <Text style={styles.nutritionValue}>{result.nutrition.fiber}g</Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={onBack}
        style={({ pressed }) => [
          styles.backBtn,
          pressed && styles.backBtnPressed,
        ]}
      >
        <ChevronLeft size={22} color="#fff" strokeWidth={2} />
        <Text style={styles.backBtnText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
    alignSelf: "center",
    width: "100%",
  },
  scrollContentMobile: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    color: PRIMARY_GREEN,
    fontWeight: "600",
    textAlign: "center",
  },
  heroImageWrapper: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  foodTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 20,
    textAlign: "center",
  },
  card: {
    backgroundColor: GRAY_CARD,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    width: "100%",
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
    marginBottom: 14,
  },
  pillsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pill: {
    backgroundColor: PRIMARY_GREEN,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  pillText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
  caloriesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  caloriesLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  caloriesValue: {
    fontSize: 20,
    fontWeight: "700",
    color: PRIMARY_GREEN,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  nutritionItem: {
    minWidth: 88,
  },
  nutritionLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY_GREEN,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    minHeight: 56,
  },
  backBtnPressed: {
    backgroundColor: PRIMARY_GREEN_DARK,
  },
  backBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});
