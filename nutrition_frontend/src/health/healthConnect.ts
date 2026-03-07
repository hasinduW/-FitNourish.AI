// src/health/healthConnect.ts

import {
  initialize,
  requestPermission,
  readRecords,
  getGrantedPermissions,
} from "react-native-health-connect";

const DEFAULT_DELAY_MS = 800;

// ✅ We request ONLY what we want
// - TotalCaloriesBurned -> we will store it into calories_burned_active (demo field)
// - HeartRate + RestingHeartRate for resting
const REQUIRED = [
  { accessType: "read", recordType: "Steps" },
  { accessType: "read", recordType: "HeartRate" },
  { accessType: "read", recordType: "TotalCaloriesBurned" },
  { accessType: "read", recordType: "Height" },
  { accessType: "read", recordType: "Weight" },
  { accessType: "read", recordType: "ExerciseSession" },
  { accessType: "read", recordType: "RestingHeartRate" },
] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ---------------- INIT (SAFE) ---------------- */

export async function hcInit() {
  try {
    const ok = await initialize();
    return !!ok;
  } catch (e) {
    console.log("HC init error:", e);
    return false;
  }
}

/* ------------ PERMISSION (CHECK THEN REQUEST) ------------ */

function samePerm(a: any, b: any) {
  return a?.accessType === b?.accessType && a?.recordType === b?.recordType;
}

async function getGrantedSafe(): Promise<any[]> {
  try {
    const g = await getGrantedPermissions();
    return Array.isArray(g) ? g : [];
  } catch {
    return [];
  }
}

export async function hcEnsurePermissions(delayMs = DEFAULT_DELAY_MS) {
  const ok = await hcInit();
  if (!ok) throw new Error("Health Connect is not available on this phone");

  await sleep(delayMs);

  const grantedNow = await getGrantedSafe();
  console.log("HC grantedNow:", grantedNow);

  const missing = REQUIRED.filter((req) => !grantedNow.some((g) => samePerm(g, req)));
  console.log("HC missing:", missing);

  if (missing.length === 0) return grantedNow;

  const grantedAfterRequest = await requestPermission(missing as any);
  console.log("HC grantedAfter (requestPermission return):", grantedAfterRequest);

  const grantedAfter = await getGrantedSafe();
  console.log("HC grantedAfter (getGrantedPermissions):", grantedAfter);

  const stillMissing = REQUIRED.filter((req) => !grantedAfter.some((g) => samePerm(g, req)));
  console.log("HC stillMissing:", stillMissing);

  if (stillMissing.length > 0) {
    throw new Error(
      "Permission denied. Please allow permissions in Health Connect → Apps → nutrition_mobile."
    );
  }

  return grantedAfter;
}

/* ----------------- TIME HELPERS ----------------- */

function isoBetween(start: Date, end: Date) {
  return {
    operator: "between" as const,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

function betweenToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  return isoBetween(start, end);
}

function betweenLastHours(hours: number) {
  const end = new Date();
  const start = new Date();
  start.setHours(start.getHours() - hours);
  return isoBetween(start, end);
}

function betweenLastDays(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return isoBetween(start, end);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/* ---------------- SAFE READER ------------------- */
/**
 * ✅ FIX: readRecords() usually returns { records: [...] }
 */
async function safeRead<T = any>(recordType: string, options: any): Promise<T[]> {
  try {
    const res: any = await readRecords(recordType as any, options);

    if (res && Array.isArray(res.records)) return res.records as T[];
    if (Array.isArray(res)) return res as T[];

    return [];
  } catch (e) {
    console.log("HC read error:", recordType, e);
    return [];
  }
}

/* ---------------- ENERGY HELPERS ------------------- */

function energyToKcal(energy: any): number {
  if (!energy) return 0;

  const kcal = energy?.inKilocalories;
  if (typeof kcal === "number") return kcal;

  const kj = energy?.inKilojoules;
  if (typeof kj === "number") return kj * 0.239005736;

  const cal = energy?.inCalories;
  if (typeof cal === "number") return cal / 1000;

  return 0;
}

/* ---------------- FETCH (REAL ONLY) ------------------- */
/**
 * ✅ IMPORTANT:
 * This function returns ONLY real values from Health Connect.
 * (No dummy values here.)
 * Dummy values will be added in index.tsx AFTER we see what is missing.
 */
export async function hcFetchTodayBestEffort(): Promise<Partial<Record<string, any>>> {
  const out: Partial<Record<string, any>> = {};

  const today = betweenToday();
  const last24h = betweenLastHours(24);
  const last7d = betweenLastDays(7);

  // Steps (today)
  const steps = await safeRead<any>("Steps", { timeRangeFilter: today });
  console.log("HC Steps records:", steps.length);
  if (steps.length) {
    const totalSteps = steps.reduce((sum, r) => sum + (r.count ?? 0), 0);
    if (totalSteps > 0) out.steps_per_day = totalSteps;
  }

  // ✅ TotalCaloriesBurned -> store into calories_burned_active (demo field)
  let totalCal = await safeRead<any>("TotalCaloriesBurned", { timeRangeFilter: today });
  console.log("HC TotalCaloriesBurned today:", totalCal.length);

  if (!totalCal.length) {
    totalCal = await safeRead<any>("TotalCaloriesBurned", { timeRangeFilter: last24h });
    console.log("HC TotalCaloriesBurned last24h:", totalCal.length);
  }

  if (totalCal.length) {
    const totalKcal = totalCal.reduce((sum, r) => sum + energyToKcal(r?.energy), 0);
    const rounded = Math.round(totalKcal || 0);
    if (rounded > 0) out.calories_burned_active = rounded;
  }

  // Heart Rate: today -> 24h -> 7d
  const hrToday = await safeRead<any>("HeartRate", { timeRangeFilter: today });
  const hr24 = hrToday.length ? hrToday : await safeRead<any>("HeartRate", { timeRangeFilter: last24h });
  const hr7 = hr24.length ? hr24 : await safeRead<any>("HeartRate", { timeRangeFilter: last7d });

  const samples: number[] = (hr7 ?? [])
    .flatMap((r) => r.samples ?? [])
    .map((s: any) => s?.beatsPerMinute)
    .filter((x: any) => typeof x === "number" && x > 0 && x < 250);

  console.log("HC HeartRate samples:", samples.length);

  if (samples.length) {
    const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
    out.avg_heart_rate = avg;

    // estimate resting from p10 (if no RestingHeartRate record)
    const sorted = [...samples].sort((a, b) => a - b);
    const p10 = sorted[Math.floor(sorted.length * 0.1)] ?? sorted[0];
    out.resting_heart_rate = Math.round(p10);
  }

  // Prefer real RestingHeartRate record (today or 7d)
  const rhrToday = await safeRead<any>("RestingHeartRate", { timeRangeFilter: today });
  const rhr7 = rhrToday.length ? rhrToday : await safeRead<any>("RestingHeartRate", { timeRangeFilter: last7d });

  console.log("HC RestingHeartRate records:", rhrToday.length, rhr7.length);

  if (rhr7.length) {
    const values = rhr7
      .map((r: any) => r?.beatsPerMinute)
      .filter((x: any) => typeof x === "number" && x > 0 && x < 250);

    if (values.length) {
      out.resting_heart_rate = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    }
  }

  // Exercise sessions -> active minutes (today)
  const sessions = await safeRead<any>("ExerciseSession", { timeRangeFilter: today });
  console.log("HC ExerciseSession records:", sessions.length);

  if (sessions.length) {
    let totalMinutes = 0;
    for (const s of sessions) {
      const start = s?.startTime ? new Date(s.startTime).getTime() : null;
      const end = s?.endTime ? new Date(s.endTime).getTime() : null;
      if (start && end && end > start) totalMinutes += (end - start) / 1000 / 60;
    }
    if (totalMinutes > 0) out.active_minutes = Math.round(totalMinutes);
  }

  // Height & Weight (latest within 365 days)
  const longRange = betweenLastDays(365);

  const heights = await safeRead<any>("Height", { timeRangeFilter: longRange });
  console.log("HC Height records:", heights.length);
  if (heights.length) {
    const latest = heights[heights.length - 1];
    const cm = latest?.height?.inCentimeters;
    if (typeof cm === "number" && cm > 0) out.height_cm = round1(cm);
  }

  const weights = await safeRead<any>("Weight", { timeRangeFilter: longRange });
  console.log("HC Weight records:", weights.length);
  if (weights.length) {
    const latest = weights[weights.length - 1];
    const kg = latest?.weight?.inKilograms;
    if (typeof kg === "number" && kg > 0) out.weight_kg = round1(kg);
  }

  console.log("HC final out (REAL only):", out);
  return out;
}

/* -------- ONE BUTTON CALL (PERMISSION + READ) ----- */

export async function hcConnectAndFetchToday(delayMs = DEFAULT_DELAY_MS) {
  await hcEnsurePermissions(delayMs);
  return await hcFetchTodayBestEffort();
}