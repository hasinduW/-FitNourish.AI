import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { login as apiLogin, signup as apiSignup } from "../src/api/client";

const TOKEN_KEY = "@fitnourish_token";
const USER_KEY = "@fitnourish_user";

type User = {
  user_id: string;
  username: string;
  first_name?: string;
  last_name?: string;
} | null;

type AuthContextType = {
  token: string | null;
  user: User;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (firstName: string, lastName: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStored = useCallback(async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        router.replace("/Dashboard" as any);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStored();
  }, [loadStored]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiLogin(username, password);
    const u = {
      user_id: res.user_id,
      username: res.username,
      first_name: res.first_name,
      last_name: res.last_name,
    };
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, res.access_token),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(u)),
    ]);
    setToken(res.access_token);
    setUser(u);
    router.replace("/Dashboard" as any);
  }, []);

  const signup = useCallback(
    async (firstName: string, lastName: string, username: string, password: string) => {
      const res = await apiSignup(firstName, lastName, username, password);
      const u = {
        user_id: res.user_id,
        username: res.username,
        first_name: res.first_name,
        last_name: res.last_name,
      };
      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, res.access_token),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(u)),
      ]);
      setToken(res.access_token);
      setUser(u);
      router.replace("/Dashboard" as any);
    },
    []
  );

  const logout = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    setToken(null);
    setUser(null);
    router.replace("/Login" as any);
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, user, isLoading, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
