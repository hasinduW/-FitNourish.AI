import {
  FoodAnalysisResultsScreen,
  DUMMY_FOOD_RESULT,
} from "@/components/FoodAnalysisResultsScreen";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FoodAnalysisResultsPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ imageUri?: string; resultJson?: string }>();
  const imageUri = params.imageUri ?? "";
  const result = params.resultJson
    ? (JSON.parse(params.resultJson) as typeof DUMMY_FOOD_RESULT)
    : DUMMY_FOOD_RESULT;

  function onBack() {
    router.back();
  }

  if (!imageUri) {
    router.back();
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <FoodAnalysisResultsScreen
        imageUri={imageUri}
        onBack={onBack}
        result={result}
      />
    </SafeAreaView>
  );
}
