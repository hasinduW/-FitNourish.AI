import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { FoodDatabase, FoodItem, Meals, MealType } from "../types";
import { FOOD_DATABASE, MEAL_ICONS } from "../types/constants";

interface Props {
  meals: Meals;
  onMealsChange: (meals: Meals) => void;
}

export default function FoodLogger({ meals, onMealsChange }: Props) {
  const [currentMeal, setCurrentMeal] = useState<MealType>("breakfast");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodDatabase | null>(null);
  const [amount, setAmount] = useState("");

  const filteredFoods = FOOD_DATABASE.filter((food) =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const calculateNutrition = (food: FoodDatabase, grams: number) => {
    const multiplier = grams / 100;
    return {
      calories: Math.round(food.cal_per_100g * multiplier),
      sugar: Math.round(food.sugar_per_100g * multiplier * 10) / 10,
    };
  };

  const addFoodToMeal = () => {
    if (!selectedFood || !amount) return;
    const grams = parseFloat(amount);
    if (isNaN(grams) || grams <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid gram amount.");
      return;
    }
    const nutrition = calculateNutrition(selectedFood, grams);
    const newItem: FoodItem = {
      id: Date.now(),
      food: selectedFood.name,
      grams,
      calories: nutrition.calories,
      sugar: nutrition.sugar,
    };
    const updatedMeals: Meals = {
      ...meals,
      [currentMeal]: [...meals[currentMeal], newItem],
    };
    onMealsChange(updatedMeals);
    setSearchQuery("");
    setSelectedFood(null);
    setAmount("");
    setShowSuggestions(false);
  };

  const removeFoodItem = (mealType: MealType, itemId: number) => {
    const updatedMeals: Meals = {
      ...meals,
      [mealType]: meals[mealType].filter((item) => item.id !== itemId),
    };
    onMealsChange(updatedMeals);
  };

  const getDailyTotals = () => {
    let totalCal = 0;
    let totalSugar = 0;
    Object.values(meals).forEach((mealItems) => {
      mealItems.forEach((item: FoodItem) => {
        totalCal += item.calories;
        totalSugar += item.sugar;
      });
    });
    return {
      calories: Math.round(totalCal),
      sugar: Math.round(totalSugar * 10) / 10,
    };
  };

  const getSugarLevel = (sugar: number) => {
    if (sugar < 25) return "low";
    if (sugar < 50) return "medium";
    return "high";
  };

  const totals = getDailyTotals();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Food Logger</Text>

      {/* Meal Type Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.mealTabRow}
      >
        {(Object.keys(meals) as MealType[]).map((mealType) => (
          <TouchableOpacity
            key={mealType}
            onPress={() => setCurrentMeal(mealType)}
            style={[
              styles.mealTab,
              currentMeal === mealType && styles.mealTabActive,
            ]}
          >
            <Text style={styles.mealTabIcon}>{MEAL_ICONS[mealType]}</Text>
            <Text
              style={[
                styles.mealTabText,
                currentMeal === mealType && styles.mealTabTextActive,
              ]}
            >
              {mealType}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Food Search */}
      <View style={styles.addCard}>
        <Text style={styles.addCardTitle}>Add to {currentMeal}</Text>

        <TextInput
          style={styles.input}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setShowSuggestions(true);
            setSelectedFood(null);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search food..."
          placeholderTextColor="#9ca3af"
        />

        {/* Suggestions */}
        {showSuggestions && searchQuery.length > 0 && (
          <View style={styles.suggestions}>
            {filteredFoods.slice(0, 6).map((food) => (
              <TouchableOpacity
                key={food.name}
                style={styles.suggestionItem}
                onPress={() => {
                  setSelectedFood(food);
                  setSearchQuery(food.name);
                  setAmount(food.serving_g.toString());
                  setShowSuggestions(false);
                }}
              >
                <Text style={styles.suggestionName}>{food.name}</Text>
                <Text style={styles.suggestionMeta}>
                  {food.category} • {food.serving_g}g • {food.cal_per_100g}{" "}
                  cal/100g
                </Text>
              </TouchableOpacity>
            ))}
            {filteredFoods.length === 0 && (
              <Text style={styles.noResult}>No foods found</Text>
            )}
          </View>
        )}

        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount (grams)"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={[
            styles.addBtn,
            (!selectedFood || !amount) && styles.addBtnDisabled,
          ]}
          onPress={addFoodToMeal}
          disabled={!selectedFood || !amount}
        >
          <Text style={styles.addBtnText}>+ Add Food</Text>
        </TouchableOpacity>
      </View>

      {/* Meals List */}
      {(Object.entries(meals) as [MealType, FoodItem[]][]).map(
        ([mealType, items]) => (
          <View key={mealType} style={styles.mealCard}>
            <View style={styles.mealCardHeader}>
              <Text style={styles.mealCardIcon}>{MEAL_ICONS[mealType]}</Text>
              <Text style={styles.mealCardTitle}>{mealType}</Text>
              <Text style={styles.mealCardCal}>
                {items.reduce((sum, item) => sum + item.calories, 0)} cal
              </Text>
            </View>

            {items.length === 0 ? (
              <Text style={styles.emptyMeal}>No items added</Text>
            ) : (
              items.map((item) => (
                <View key={item.id} style={styles.foodRow}>
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{item.food}</Text>
                    <Text style={styles.foodMeta}>
                      {item.grams}g • {item.calories} cal • {item.sugar}g sugar
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeFoodItem(mealType, item.id)}
                  >
                    <Text style={styles.removeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ),
      )}

      {/* Daily Totals */}
      <View style={styles.totalsCard}>
        <Text style={styles.totalsTitle}>Daily Totals</Text>
        <View style={styles.totalsRow}>
          <View>
            <Text style={styles.totalsLabel}>Total Calories</Text>
            <Text style={styles.totalsValue}>{totals.calories}</Text>
            <Text style={styles.totalsUnit}>kcal</Text>
          </View>
          <View>
            <Text style={styles.totalsLabel}>Total Sugar</Text>
            <Text style={styles.totalsValue}>{totals.sugar}</Text>
            <Text style={styles.totalsUnit}>
              grams • {getSugarLevel(totals.sugar).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#065f46",
    marginBottom: 12,
    textAlign: "center",
  },

  mealTabRow: { flexDirection: "row", marginBottom: 12 },
  mealTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  mealTabActive: { backgroundColor: "#059669" },
  mealTabIcon: { fontSize: 16 },
  mealTabText: {
    fontWeight: "600",
    color: "#065f46",
    textTransform: "capitalize",
  },
  mealTabTextActive: { color: "#fff" },

  addCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  addCardTitle: {
    fontWeight: "700",
    fontSize: 16,
    color: "#065f46",
    marginBottom: 10,
  },
  input: {
    borderWidth: 2,
    borderColor: "#6ee7b7",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111",
    backgroundColor: "#f9fafb",
  },

  suggestions: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#6ee7b7",
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 200,
    overflow: "hidden",
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ecfdf5",
  },
  suggestionName: { fontWeight: "600", fontSize: 14, color: "#111" },
  suggestionMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  noResult: { padding: 12, color: "#9ca3af", textAlign: "center" },

  addBtn: {
    backgroundColor: "#059669",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  addBtnDisabled: { backgroundColor: "#d1d5db" },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  mealCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  mealCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  mealCardIcon: { fontSize: 18, marginRight: 6 },
  mealCardTitle: {
    fontWeight: "700",
    color: "#065f46",
    textTransform: "capitalize",
    flex: 1,
    fontSize: 15,
  },
  mealCardCal: { color: "#6b7280", fontSize: 13 },
  emptyMeal: { color: "#9ca3af", fontStyle: "italic", fontSize: 13 },

  foodRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  foodInfo: { flex: 1 },
  foodName: { fontWeight: "600", color: "#111", fontSize: 14 },
  foodMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  removeBtn: { color: "#ef4444", fontSize: 18, paddingHorizontal: 6 },

  totalsCard: {
    backgroundColor: "#059669",
    borderRadius: 14,
    padding: 20,
    marginTop: 4,
  },
  totalsTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 12,
  },
  totalsRow: { flexDirection: "row", justifyContent: "space-between" },
  totalsLabel: { color: "#d1fae5", fontSize: 13, marginBottom: 4 },
  totalsValue: { color: "#fff", fontSize: 36, fontWeight: "800" },
  totalsUnit: { color: "#a7f3d0", fontSize: 12, marginTop: 2 },
});
