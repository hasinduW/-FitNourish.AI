import { Stack } from "expo-router";
import { GroceryProvider } from "../components/grocery-optimizer/state/GroceryContext";

export default function RootLayout() {
  return (
    <GroceryProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Enter Items" }} />
        <Stack.Screen name="search_items" options={{ title: "Search Items" }} />
        <Stack.Screen name="item_list" options={{ title: "Review Item List" }} />
        <Stack.Screen name="prices" options={{ title: "Price Comparison" }} />
        <Stack.Screen name="alternative" options={{ title: "Find Alternative" }} />
        <Stack.Screen name="recommendation" options={{ title: "Cheapest & Nearest" }} />
        <Stack.Screen name="multistore-plan" options={{ title: "Multi-store plan" }} />
      </Stack>
    </GroceryProvider>
  );
}