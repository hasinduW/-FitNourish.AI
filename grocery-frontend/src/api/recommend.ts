// src/api/recommend.ts
import axios from "axios";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.8.101:5000";

export type TravelMode = "driving" | "walking" | "bicycling" | "transit";
export type TravelProvider = "google" | "haversine";
export type CostModel = "distance" | "time";

export type RecommendStoreRequest = {
  items:
    | { clean_product_id: number; qty: number }[]
    | { candidate_clean_product_ids: number[]; qty: number; name?: string }[];
  user_location: { lat: number; lng: number };
  travel?: {
    mode?: TravelMode;
    provider?: TravelProvider;
    cost_model?: CostModel;
    cost_per_km?: number;   // for distance model
    cost_per_min?: number;  // for time model
    include_route?: boolean; // request polyline (recommended store)
  };
};

export async function recommendStore(payload: RecommendStoreRequest) {
  const url = `${API_BASE_URL}/recommend/store`;
  const res = await axios.post(url, payload, { timeout: 30000 });
  return res.data;
}