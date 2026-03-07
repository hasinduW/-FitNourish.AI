import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProviderBase,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Platform } from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider } from "@/contexts/AuthContext";

// ThemeProvider from @react-navigation requires `children` in its type; allow implicit JSX children
const ThemeProvider = NavThemeProviderBase as ComponentType<
  { value: typeof DefaultTheme; children?: ReactNode }
>;

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Defer navigation tree until client mount to avoid useLayoutEffect SSR warning (web).
  if (!mounted && Platform.OS === "web") {
    return <View style={{ flex: 1, backgroundColor: "#fff" }} />;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="Login" />
          <Stack.Screen name="Signup" />
          <Stack.Screen name="Dashboard" />
          <Stack.Screen name="Healthhub" />
        </Stack>
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}