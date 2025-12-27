import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  DAILY_LOGS: "spendful_daily_logs",
  APP_SETTINGS: "spendful_app_settings",
  SUBSCRIPTION: "spendful_subscription",
};

export interface DailyLog {
  id: string;
  date: string;
  did_spend: boolean;
  amount: number | null;
  category: string | null;
  note: string | null;
  created_at: number;
  updated_at: number;
}

export const SPENDING_CATEGORIES = [
  "Uncategorized",
  "Groceries",
  "Shopping",
  "Rent",
  "Water",
  "Electricity",
  "Sewage",
  "Insurance",
  "Mortgage",
  "Transportation",
  "Dining",
  "Subscriptions",
  "Other",
] as const;

export type SpendingCategory = typeof SPENDING_CATEGORIES[number];

export interface AppSettings {
  daily_reminder_time: string;
  notifications_enabled: boolean;
  free_history_days: number;
  tone: string;
  first_launch_at: number | null;
  onboarding_completed: boolean;
  updated_at: number;
}

export interface Subscription {
  plan: "free" | "monthly" | "yearly" | "lifetime";
  is_active: boolean;
  expires_at: number | null;
  source: "apple" | "google" | null;
  updated_at: number;
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getAllLogs(): Promise<DailyLog[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_LOGS);
    if (!data) return [];
    const logs = JSON.parse(data) as DailyLog[];
    return logs.map((log) => ({
      ...log,
      category: log.category ?? null,
    }));
  } catch {
    return [];
  }
}

async function saveAllLogs(logs: DailyLog[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(logs));
}

export async function getDailyLog(date: string): Promise<DailyLog | null> {
  const logs = await getAllLogs();
  return logs.find((log) => log.date === date) || null;
}

export async function saveDailyLog(
  date: string,
  didSpend: boolean,
  amount: number | null = null,
  category: string | null = null,
  note: string | null = null
): Promise<DailyLog> {
  const logs = await getAllLogs();
  const now = Date.now();
  const existingIndex = logs.findIndex((log) => log.date === date);

  const effectiveCategory = didSpend ? (category || "Uncategorized") : null;

  if (existingIndex >= 0) {
    logs[existingIndex] = {
      ...logs[existingIndex],
      did_spend: didSpend,
      amount,
      category: effectiveCategory,
      note,
      updated_at: now,
    };
    await saveAllLogs(logs);
    return logs[existingIndex];
  } else {
    const newLog: DailyLog = {
      id: generateUUID(),
      date,
      did_spend: didSpend,
      amount,
      category: effectiveCategory,
      note,
      created_at: now,
      updated_at: now,
    };
    logs.push(newLog);
    await saveAllLogs(logs);
    return newLog;
  }
}

export async function getLogsForDateRange(
  startDate: string,
  endDate: string
): Promise<DailyLog[]> {
  const logs = await getAllLogs();
  return logs
    .filter((log) => log.date >= startDate && log.date <= endDate)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function getDefaultSettings(): AppSettings {
  return {
    daily_reminder_time: "20:00",
    notifications_enabled: false,
    free_history_days: 14,
    tone: "calm",
    first_launch_at: null,
    onboarding_completed: false,
    updated_at: Date.now(),
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
    if (data) {
      return { ...getDefaultSettings(), ...JSON.parse(data) };
    }
    return getDefaultSettings();
  } catch {
    return getDefaultSettings();
  }
}

export async function updateAppSettings(
  settings: Partial<Omit<AppSettings, "updated_at">>
): Promise<void> {
  const current = await getAppSettings();
  const updated: AppSettings = {
    ...current,
    ...settings,
    updated_at: Date.now(),
  };
  await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(updated));
}

function getDefaultSubscription(): Subscription {
  return {
    plan: "free",
    is_active: false,
    expires_at: null,
    source: null,
    updated_at: Date.now(),
  };
}

export async function getSubscription(): Promise<Subscription> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
    if (data) {
      return { ...getDefaultSubscription(), ...JSON.parse(data) };
    }
    return getDefaultSubscription();
  } catch {
    return getDefaultSubscription();
  }
}

export async function updateSubscription(
  subscription: Partial<Omit<Subscription, "updated_at">>
): Promise<void> {
  const current = await getSubscription();
  const updated: Subscription = {
    ...current,
    ...subscription,
    updated_at: Date.now(),
  };
  await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(updated));
}

export function getWeekDateRange(): { startDate: string; endDate: string } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const format = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: format(startOfWeek),
    endDate: format(endOfWeek),
  };
}

export function getMonthDateRange(monthOffset: number = 0): {
  startDate: string;
  endDate: string;
  year: number;
  month: number;
} {
  const today = new Date();
  const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const format = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return {
    startDate: format(startOfMonth),
    endDate: format(endOfMonth),
    year,
    month: month + 1,
  };
}

export function isPremium(subscription: Subscription): boolean {
  if (subscription.plan === "lifetime") {
    return true;
  }
  
  if (subscription.is_active && subscription.plan !== "free") {
    if (subscription.expires_at === null) {
      return true;
    }
    return subscription.expires_at > Date.now();
  }
  
  return false;
}

export function canViewDate(date: string, subscription: Subscription, freeHistoryDays: number): boolean {
  if (isPremium(subscription)) {
    return true;
  }

  const todayStr = getTodayDate();
  
  if (date === todayStr) {
    return true;
  }
  
  const today = new Date(todayStr + "T00:00:00");
  const targetDate = new Date(date + "T00:00:00");
  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= freeHistoryDays;
}

export function getFreeHistoryCutoffDate(freeHistoryDays: number): string {
  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setDate(today.getDate() - freeHistoryDays);
  
  const year = cutoffDate.getFullYear();
  const month = String(cutoffDate.getMonth() + 1).padStart(2, "0");
  const day = String(cutoffDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface SpendingStats {
  totalSpend: number;
  averageSpendPerSpendDay: number;
  spendDays: number;
  noSpendDays: number;
  topCategories: { category: string; total: number }[];
}

export function calculateSpendingStats(logs: DailyLog[]): SpendingStats {
  const spendLogs = logs.filter((log) => log.did_spend);
  const noSpendLogs = logs.filter((log) => !log.did_spend);

  const totalSpend = spendLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
  const spendDays = spendLogs.length;
  const noSpendDays = noSpendLogs.length;
  const averageSpendPerSpendDay = spendDays > 0 ? totalSpend / spendDays : 0;

  const categoryTotals: Record<string, number> = {};
  spendLogs.forEach((log) => {
    const cat = log.category || "Uncategorized";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (log.amount || 0);
  });

  const topCategories = Object.entries(categoryTotals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 2);

  return {
    totalSpend,
    averageSpendPerSpendDay,
    spendDays,
    noSpendDays,
    topCategories,
  };
}
