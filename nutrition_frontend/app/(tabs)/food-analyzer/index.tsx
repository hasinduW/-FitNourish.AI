import { FoodAnalyzerScreen } from "@/components/FoodAnalyzerScreen";
import { useRouter } from "expo-router";
import React from "react";
import { Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { analyzeMeal } from "@/src/api/client";

/** Transform API response to the shape expected by FoodAnalysisResultsScreen */
function toFoodAnalysisResult(api: {
  ingredients: { name: string; amount: number; unit: string; possibility: number }[];
  nutrients: { name: string; amount: number; unit: string; percentage: number }[];
  calories_per_100g: number;
}) {
  const nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  nutrition.calories = Math.round(api.calories_per_100g);
  for (const n of api.nutrients) {
    if (n.name === "Protein") nutrition.protein = n.amount;
    if (n.name === "Carbohydrates") nutrition.carbs = n.amount;
    if (n.name === "Fat") nutrition.fat = n.amount;
  }
  return {
    title: "Meal analysis",
    ingredients: api.ingredients.map((i) => `${i.name} (${i.amount} ${i.unit})`),
    nutrition,
  };
}

export default function FoodAnalyzerTab() {
  const router = useRouter();

  async function handleProceed(imageUri: string) {
    try {
      const apiResult = await analyzeMeal(imageUri);
      const result = toFoodAnalysisResult(apiResult);
      router.push({
        pathname: "/(tabs)/food-analyzer/results",
        params: { imageUri, resultJson: JSON.stringify(result) },
      });
    } catch (e) {
      Alert.alert(
        "Analysis failed",
        (e as Error).message || "Could not analyze meal. Please try again."
      );
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <FoodAnalyzerScreen onProceed={handleProceed} />
    </SafeAreaView>
  );
}
