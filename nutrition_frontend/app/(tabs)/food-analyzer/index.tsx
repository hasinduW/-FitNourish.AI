import { FoodAnalyzerScreen } from "@/components/FoodAnalyzerScreen";
import { useRouter } from "expo-router";
import { AlertTriangle, X } from "lucide-react-native";
import React, { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { analyzeMeal } from "@/src/api/client";

const PRIMARY_GREEN = "#2EA37A";

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
    ingredients: api.ingredients.map((i) => i.name),
    nutrition,
  };
}

/** Extract the `detail` string from a FastAPI error body, falling back to raw text. */
function parseApiError(raw: string): string {
  try {
    const json = JSON.parse(raw);
    if (typeof json?.detail === "string") return json.detail;
  } catch {
    // not JSON — use raw
  }
  return raw;
}

export default function FoodAnalyzerTab() {
  const router = useRouter();
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleProceed(imageUri: string) {
    try {
      const apiResult = await analyzeMeal(imageUri);
      const result = toFoodAnalysisResult(apiResult);
      router.push({
        pathname: "/(tabs)/food-analyzer/results",
        params: { imageUri, resultJson: JSON.stringify(result) },
      });
    } catch (e) {
      const raw = (e as Error).message || "";
      const detail = parseApiError(raw);

      // Food-validation rejection from Gemini (backend sends this exact phrase)
      if (detail.toLowerCase().includes("does not appear to contain food")) {
        setValidationError(detail);
        return;
      }

      Alert.alert(
        "Analysis failed",
        detail || "Could not analyze meal. Please try again."
      );
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <FoodAnalyzerScreen onProceed={handleProceed} />

      <Modal
        visible={validationError !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setValidationError(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <Pressable
              onPress={() => setValidationError(null)}
              style={styles.closeBtn}
              hitSlop={8}
            >
              <X size={20} color="#6B6B6B" strokeWidth={2} />
            </Pressable>

            <View style={styles.iconCircle}>
              <AlertTriangle size={36} color="#F59E0B" strokeWidth={1.8} />
            </View>

            <Text style={styles.popupTitle}>Not a Food Image</Text>
            <Text style={styles.popupBody}>
              The uploaded image does not appear to contain a meal or food item.
              {"\n\n"}Please upload a clear photo of food or a meal to analyze
              its nutritional content.
            </Text>

            <Pressable
              onPress={() => setValidationError(null)}
              style={({ pressed }) => [
                styles.tryAgainBtn,
                pressed && styles.tryAgainBtnPressed,
              ]}
            >
              <Text style={styles.tryAgainBtnText}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  popup: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
    textAlign: "center",
  },
  popupBody: {
    fontSize: 15,
    color: "#6B6B6B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  tryAgainBtn: {
    width: "100%",
    backgroundColor: PRIMARY_GREEN,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  tryAgainBtnPressed: {
    opacity: 0.9,
  },
  tryAgainBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
