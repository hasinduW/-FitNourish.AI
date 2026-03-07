import { Fonts } from "@/constants/theme";
import { getIngredients } from "@/src/api/client";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
const DEFAULT_DAILY_CALORIE_TARGET = 2500;
const DEFAULT_CALORIE_RATIOS = [0.25, 0.4, 0.35];
const DEFAULT_MACRO_RATIOS = { fat: 0.3, carb: 0.45, protein: 0.25 };
const MIN_DAILY_CALORIES = 500;
const MAX_DAILY_CALORIES = 5000;

const isWeb = Platform.OS === "web";

function sumRatios(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

type Props = {
  initialDailyCalorieTarget?: number;
  initialMealsPerDay?: number;
  initialCalorieRatios?: number[];
  initialMacroRatios?: { fat: number; carb: number; protein: number };
  initialPreferredIngredients?: string[];
  onSave?: (settings: {
    dailyCalorieTarget: number;
    mealsPerDay: number;
    calorieDistributionRatios: number[];
    targetMacroRatios: { fat: number; carb: number; protein: number };
    preferredIngredients: string[];
  }) => void;
};

export function MealPlanSettingsScreen({
  initialDailyCalorieTarget = DEFAULT_DAILY_CALORIE_TARGET,
  initialMealsPerDay = DEFAULT_MEALS_PER_DAY,
  initialCalorieRatios = DEFAULT_CALORIE_RATIOS,
  initialMacroRatios = DEFAULT_MACRO_RATIOS,
  initialPreferredIngredients = [],
  onSave,
}: Props) {
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState(
    String(initialDailyCalorieTarget)
  );
  const [mealsPerDay, setMealsPerDay] = useState(String(initialMealsPerDay));
  const [calorieRatios, setCalorieRatios] = useState<string[]>(
    initialCalorieRatios.map((r) => String(r))
  );
  const [fat, setFat] = useState(String(initialMacroRatios.fat));
  const [carb, setCarb] = useState(String(initialMacroRatios.carb));
  const [protein, setProtein] = useState(String(initialMacroRatios.protein));
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>(
    initialPreferredIngredients
  );
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [allIngredients, setAllIngredients] = useState<string[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [ingredientDropdownVisible, setIngredientDropdownVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getIngredients()
      .then((data) => {
        if (!cancelled) setAllIngredients(data.ingredients ?? []);
      })
      .catch(() => {
        if (!cancelled) setAllIngredients([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingIngredients(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredIngredients = useMemo(() => {
    const q = ingredientSearch.trim().toLowerCase();
    if (!q) return allIngredients.slice(0, 50);
    return allIngredients
      .filter((name) => name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [allIngredients, ingredientSearch]);

  const dailyCalorieTargetNum = Math.max(
    MIN_DAILY_CALORIES,
    Math.min(MAX_DAILY_CALORIES, parseInt(dailyCalorieTarget, 10) || DEFAULT_DAILY_CALORIE_TARGET)
  );
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

  function handleResetDailyCalorieTarget() {
    setDailyCalorieTarget(String(DEFAULT_DAILY_CALORIE_TARGET));
  }

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

  function handleResetPreferredIngredients() {
    setSelectedIngredients([]);
  }

  function addIngredient(name: string) {
    if (name && !selectedIngredients.includes(name)) {
      setSelectedIngredients((prev) => [...prev, name].sort());
    }
    setIngredientSearch("");
    setIngredientDropdownVisible(false);
  }

  function removeIngredient(name: string) {
    setSelectedIngredients((prev) => prev.filter((x) => x !== name));
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
      dailyCalorieTarget: dailyCalorieTargetNum,
      mealsPerDay: mealsPerDayNum,
      calorieDistributionRatios,
      targetMacroRatios: {
        fat: macroSum > 0 ? fatNum / macroSum : fatNum,
        carb: macroSum > 0 ? carbNum / macroSum : carbNum,
        protein: macroSum > 0 ? proteinNum / macroSum : proteinNum,
      },
      preferredIngredients: selectedIngredients,
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

        {/* Section 0: Daily Calorie Target */}
        <Text style={styles.sectionLabel}>Daily Calorie Target</Text>
        <Text style={styles.sublabel}>
          Total calories per day for your meal plan (e.g. 2500).
        </Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={dailyCalorieTarget}
            onChangeText={setDailyCalorieTarget}
            keyboardType="number-pad"
            placeholder="2500"
          />
          <Pressable
            onPress={handleResetDailyCalorieTarget}
            style={({ pressed }) => [
              styles.resetBtn,
              pressed && styles.resetBtnPressed,
            ]}
          >
            <Text style={styles.resetBtnText}>Reset to Default</Text>
          </Pressable>
        </View>

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

        {/* Section 4: Preferred ingredients for meal plan */}
        <Text style={styles.sectionLabel}>Preferred Ingredients</Text>
        <Text style={styles.sublabel}>
          Search and select ingredients you want the meal plan to favor. Suggestions will prioritize meals containing these.
        </Text>
        <View style={styles.ingredientInputRow}>
          <TextInput
            style={[styles.input, styles.ingredientSearchInput]}
            value={ingredientSearch}
            onChangeText={(t) => {
              setIngredientSearch(t);
              setIngredientDropdownVisible(true);
            }}
            onFocus={() => setIngredientDropdownVisible(true)}
            onBlur={() => setTimeout(() => setIngredientDropdownVisible(false), 200)}
            placeholder="Search ingredients..."
            placeholderTextColor={GRAY_TEXT}
          />
          {loadingIngredients ? (
            <ActivityIndicator size="small" color={SAGE_GREEN} style={styles.ingredientLoader} />
          ) : null}
        </View>
        {ingredientDropdownVisible && filteredIngredients.length > 0 ? (
          <View style={styles.dropdownContainer}>
            <FlatList
              data={filteredIngredients}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              style={styles.dropdownList}
              renderItem={({ item }) => {
                const selected = selectedIngredients.includes(item);
                return (
                  <Pressable
                    onPress={() => addIngredient(item)}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      selected && styles.dropdownItemSelected,
                      pressed && styles.dropdownItemPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selected && styles.dropdownItemTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        ) : null}
        {selectedIngredients.length > 0 ? (
          <>
            <View style={styles.chipRow}>
              {selectedIngredients.map((name) => (
                <View key={name} style={styles.chip}>
                  <Text style={styles.chipText} numberOfLines={1}>
                    {name}
                  </Text>
                  <Pressable
                    onPress={() => removeIngredient(name)}
                    hitSlop={8}
                    style={styles.chipRemove}
                  >
                    <Text style={styles.chipRemoveText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
            <Pressable
              onPress={handleResetPreferredIngredients}
              style={({ pressed }) => [
                styles.resetBtn,
                pressed && styles.resetBtnPressed,
                styles.resetBtnPreferred,
              ]}
            >
              <Text style={styles.resetBtnText}>Clear preferred ingredients</Text>
            </Pressable>
          </>
        ) : null}

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
  ingredientInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  ingredientSearchInput: {
    flex: 1,
  },
  ingredientLoader: {
    position: "absolute",
    right: 14,
  },
  dropdownContainer: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    borderRadius: 10,
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  dropdownList: {
    maxHeight: 218,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GRAY_LIGHT,
  },
  dropdownItemSelected: {
    backgroundColor: "rgba(46, 163, 122, 0.12)",
  },
  dropdownItemPressed: {
    backgroundColor: GRAY_LIGHT,
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#333",
  },
  dropdownItemTextSelected: {
    color: SAGE_GREEN,
    fontWeight: "500",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46, 163, 122, 0.15)",
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 20,
    maxWidth: "100%",
  },
  chipText: {
    fontSize: 14,
    color: SAGE_DARK,
    marginRight: 4,
    maxWidth: 140,
  },
  chipRemove: {
    padding: 2,
  },
  chipRemoveText: {
    fontSize: 18,
    color: SAGE_DARK,
    fontWeight: "600",
    lineHeight: 20,
  },
  resetBtnPreferred: {
    marginBottom: 28,
  },
});
