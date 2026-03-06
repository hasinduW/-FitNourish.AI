// src/api/ai.ts
import axios from "axios";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.8.101:5000";

export async function fetchAiInsights(payload: any) {
  const url = `${API_BASE_URL}/ai/insights`;
  const res = await axios.post(url, payload, { timeout: 30000 });
  return res.data as { insights: string };
}