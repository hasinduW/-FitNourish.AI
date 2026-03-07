import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "../../components/haptic-tab";
import { Colors } from "../../constants/theme";
import { useColorScheme } from "../../hooks/use-color-scheme";

const PRIMARY_GREEN = "#2EA37A";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const tint = PRIMARY_GREEN;

  // ✅ Ensure TypeScript knows this is only "light" or "dark"
  const theme: "light" | "dark" =
    colorScheme === "dark" ? "dark" : "light";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? "light"].tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="home" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="food-analyzer"
        options={{
          title: "Food Analyzer",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="camera-alt" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="meal-plan-generator"
        options={{
          title: "Meal Plan",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="restaurant-menu" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="meal-plan-generator/settings"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="explore"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          // title: "Profile",
          // tabBarIcon: ({ color }) => (
          //   <MaterialIcons name="person" size={26} color={color} />
          // ),
          href: null,
        }}
      />
    </Tabs>
  );
}