import { Fonts } from "@/constants/theme";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const SAGE_GREEN = "#2EA37A";
const SAGE_DARK = "#258C62";
const GRAY_BORDER = "#E0E0E0";
const GRAY_LIGHT = "#E8E8E8";
const GRAY_TEXT = "#6B6B6B";
const ERROR_RED = "#DC2626";

const DEFAULT_MEALS_PER_DAY = 3;
const DEFAULT_CALORIE_RATIOS = [0.25, 0.4, 0.35];
const DEFAULT_MACRO_RATIOS = { fat: 0.3, carb: 0.45, protein: 0.25 };

const isWeb = Platform.OS === "web";

function sumRatios(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

type Props = {
  initialMealsPerDay?: number;
  initialCalorieRatios?: number[];
  initialMacroRatios?: { fat: number; carb: number; protein: number };
  onSave?: (settings: {
    mealsPerDay: number;
    calorieDistributionRatios: number[];
    targetMacroRatios: { fat: number; carb: number; protein: number };
  }) => void;
};

export function MealPlanSettingsScreen({
  initialMealsPerDay = DEFAULT_MEALS_PER_DAY,
  initialCalorieRatios = DEFAULT_CALORIE_RATIOS,
  initialMacroRatios = DEFAULT_MACRO_RATIOS,
  onSave,
}: Props) {
  const [mealsPerDay, setMealsPerDay] = useState(String(initialMealsPerDay));
  const [calorieRatios, setCalorieRatios] = useState<string[]>(
    initialCalorieRatios.map((r) => String(r))
  );
  const [fat, setFat] = useState(String(initialMacroRatios.fat));
  const [carb, setCarb] = useState(String(initialMacroRatios.carb));
  const [protein, setProtein] = useState(String(initialMacroRatios.protein));

  const mealsPerDayNum = Math.max(1, Math.min(10, parseInt(mealsPerDay, 10) || 1));
  const calorieInputsCount = Math.max(1, Math.min(10, mealsPerDayNum));
  const calorieValues = calorieRatios
    .slice(0, calorieInputsCount)
    .map((s) => parseFloat(s) || 0);
  const calorieTotal = sumRatios(calorieValues);
  const calorieTotalValid = Math.abs(calorieTotal - 1) < 0.001;

  const fatNum = parseFloat(fat) || 0;
  const carbNum = parseFloat(carb) || 0;
  const proteinNum = parseFloat(protein) || 0;
  const macroTotal = fatNum + carbNum + proteinNum;
  const macroTotalValid = Math.abs(macroTotal - 1) < 0.001;

  function handleResetMeals() {
    setMealsPerDay(String(DEFAULT_MEALS_PER_DAY));
  }

  function handleResetCalorieRatios() {
    setCalorieRatios(DEFAULT_CALORIE_RATIOS.map((r) => String(r)));
  }

  function handleResetMacroRatios() {
    setFat(String(DEFAULT_MACRO_RATIOS.fat));
    setCarb(String(DEFAULT_MACRO_RATIOS.carb));
    setProtein(String(DEFAULT_MACRO_RATIOS.protein));
  }

  function setCalorieRatioAt(index: number, value: string) {
    const next = [...calorieRatios];
    while (next.length <= index) next.push("0");
    next[index] = value;
    setCalorieRatios(next);
  }

  function handleSave() {
    const calValues = calorieRatios.slice(0, calorieInputsCount).map((s) => parseFloat(s) || 0);
    const calSum = sumRatios(calValues);
    const calorieDistributionRatios =
      calSum > 0 ? calValues.map((v) => v / calSum) : Array(calorieInputsCount).fill(1 / calorieInputsCount);
    const macroSum = fatNum + carbNum + proteinNum;
    onSave?.({
      mealsPerDay: mealsPerDayNum,
      calorieDistributionRatios,
      targetMacroRatios: {
        fat: macroSum > 0 ? fatNum / macroSum : fatNum,
        carb: macroSum > 0 ? carbNum / macroSum : carbNum,
        protein: macroSum > 0 ? proteinNum / macroSum : proteinNum,
      },
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={isWeb ? undefined : "padding"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={!isWeb}
      >
        {/* Header */}
        <Text style={[styles.headerTitle, { fontFamily: Fonts.serif }]}>
          Meal Plan Settings
        </Text>

        {/* Section 1: No of Meals */}
        <Text style={styles.sectionLabel}>No of Meals</Text>
        <Text style={styles.sublabel}>Set the number of meals per day.</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={mealsPerDay}
            onChangeText={setMealsPerDay}
            keyboardType="number-pad"
            placeholder="3"
          />
          <Pressable
            onPress={handleResetMeals}
            style={({ pressed }) => [
              styles.resetBtn,
              pressed && styles.resetBtnPressed,
            ]}
          >
            <Text style={styles.resetBtnText}>Reset to Defaults</Text>
          </Pressable>
        </View>

        {/* Section 2: Calorie Distribution Ratios */}
        <Text style={styles.sectionLabel}>Calorie Distribution Ratios</Text>
        <Text style={styles.sublabel}>
          Set how calories are distributed across meals (must sum to 100%).
        </Text>
        {Array.from({ length: calorieInputsCount }, (_, i) => (
          <View key={i} style={styles.ratioRow}>
            <Text style={styles.ratioLabel}>Meal {i + 1}</Text>
            <TextInput
              style={styles.inputSmall}
              value={calorieRatios[i] ?? ""}
              onChangeText={(v) => setCalorieRatioAt(i, v)}
              keyboardType="decimal-pad"
              placeholder="0.25"
            />
            <Text style={styles.percentLabel}>
              {((parseFloat(calorieRatios[i] ?? "0") || 0) * 100).toFixed(0)}%
            </Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text
            style={[
              styles.totalValue,
              { color: calorieTotalValid ? SAGE_GREEN : ERROR_RED },
            ]}
          >
            {(calorieTotal * 100).toFixed(1)}%
          </Text>
        </View>
        <Pressable
          onPress={handleResetCalorieRatios}
          style={({ pressed }) => [
            styles.resetBtn,
            pressed && styles.resetBtnPressed,
          ]}
        >
          <Text style={styles.resetBtnText}>Reset to Defaults</Text>
        </Pressable>

        {/* Section 3: Macronutrient Target Ratios */}
        <Text style={styles.sectionLabel}>Macronutrient Target Ratios</Text>
        <Text style={styles.sublabel}>
          Set target percentages for macronutrients (must sum to 100%).
        </Text>
        {[
          { label: "Fat", value: fat, set: setFat },
          { label: "Carbohydrates", value: carb, set: setCarb },
          { label: "Protein", value: protein, set: setProtein },
        ].map(({ label, value, set }) => (
          <View key={label} style={styles.ratioRow}>
            <Text style={styles.ratioLabel}>{label}</Text>
            <TextInput
              style={styles.inputSmall}
              value={value}
              onChangeText={set}
              keyboardType="decimal-pad"
              placeholder="0.30"
            />
            <Text style={styles.percentLabel}>
              {((parseFloat(value) || 0) * 100).toFixed(0)}%
            </Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text
            style={[
              styles.totalValue,
              { color: macroTotalValid ? SAGE_GREEN : ERROR_RED },
            ]}
          >
            {(macroTotal * 100).toFixed(1)}%
          </Text>
        </View>
        <Pressable
          onPress={handleResetMacroRatios}
          style={({ pressed }) => [
            styles.resetBtn,
            pressed && styles.resetBtnPressed,
          ]}
        >
          <Text style={styles.resetBtnText}>Reset to Defaults</Text>
        </Pressable>

        <View style={styles.footerSpacer} />
      </ScrollView>

      {/* Fixed Save button */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && styles.saveBtnPressed,
          ]}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "600",
    color: SAGE_GREEN,
    marginBottom: 28,
    textAlign: "center",
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  sublabel: {
    fontSize: 14,
    color: GRAY_TEXT,
    marginBottom: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1a1a1a",
    minWidth: 80,
  },
  inputSmall: {
    width: 80,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1a1a1a",
  },
  resetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: GRAY_LIGHT,
    borderRadius: 10,
  },
  resetBtnPressed: {
    backgroundColor: "#DDDDDD",
  },
  resetBtnText: {
    fontSize: 14,
    color: GRAY_TEXT,
    fontWeight: "500",
  },
  ratioRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  ratioLabel: {
    fontSize: 15,
    color: "#333",
    width: 120,
  },
  percentLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: SAGE_GREEN,
    minWidth: 40,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 14,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  footerSpacer: {
    height: 100,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: Platform.select({ ios: 34, default: 16 }),
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: GRAY_BORDER,
  },
  saveBtn: {
    width: "100%",
    backgroundColor: SAGE_GREEN,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnPressed: {
    backgroundColor: SAGE_DARK,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
