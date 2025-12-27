import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  SPEND_ENTRIES: "spendful_spend_entries",
  APP_SETTINGS: "spendful_app_settings",
  SUBSCRIPTION: "spendful_subscription",
  MIGRATED_V2: "spendful_migrated_v2",
};

export interface SpendEntry {
  entry_id: string;
  date: string;
  amount: number;
  category: string | null;
  note: string | null;
  timestamp: number;
  created_at: number;
  updated_at: number;
}

export interface DayData {
  date: string;
  entries: SpendEntry[];
  totalAmount: number;
  hasSpend: boolean;
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

interface LegacyDailyLog {
  id: string;
  date: string;
  did_spend: boolean;
  amount: number | null;
  category: string | null;
  note: string | null;
  created_at: number;
  updated_at: number;
}

async function migrateFromV1(): Promise<void> {
  const migrated = await AsyncStorage.getItem(STORAGE_KEYS.MIGRATED_V2);
  if (migrated === "true") return;

  try {
    const oldData = await AsyncStorage.getItem("spendful_daily_logs");
    if (oldData) {
      const oldLogs = JSON.parse(oldData) as LegacyDailyLog[];
      const newEntries: SpendEntry[] = [];

      for (const log of oldLogs) {
        if (log.did_spend && log.amount && log.amount > 0) {
          newEntries.push({
            entry_id: log.id,
            date: log.date,
            amount: log.amount,
            category: log.category || "Uncategorized",
            note: log.note,
            timestamp: log.created_at,
            created_at: log.created_at,
            updated_at: log.updated_at,
          });
        }
      }

      if (newEntries.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.SPEND_ENTRIES, JSON.stringify(newEntries));
      }
    }
    await AsyncStorage.setItem(STORAGE_KEYS.MIGRATED_V2, "true");
  } catch {
    await AsyncStorage.setItem(STORAGE_KEYS.MIGRATED_V2, "true");
  }
}

async function getAllEntries(): Promise<SpendEntry[]> {
  await migrateFromV1();
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SPEND_ENTRIES);
    if (!data) return [];
    return JSON.parse(data) as SpendEntry[];
  } catch {
    return [];
  }
}

async function saveAllEntries(entries: SpendEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.SPEND_ENTRIES, JSON.stringify(entries));
}

export async function getEntriesForDate(date: string): Promise<SpendEntry[]> {
  const entries = await getAllEntries();
  return entries
    .filter((e) => e.date === date)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export async function getDayData(date: string): Promise<DayData> {
  const entries = await getEntriesForDate(date);
  const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
  return {
    date,
    entries,
    totalAmount,
    hasSpend: entries.length > 0,
  };
}

export async function addSpendEntry(
  date: string,
  amount: number,
  category: string | null = null,
  note: string | null = null
): Promise<SpendEntry> {
  const entries = await getAllEntries();
  const now = Date.now();
  
  const newEntry: SpendEntry = {
    entry_id: generateUUID(),
    date,
    amount,
    category: category || "Uncategorized",
    note,
    timestamp: now,
    created_at: now,
    updated_at: now,
  };

  entries.push(newEntry);
  await saveAllEntries(entries);
  return newEntry;
}

export async function updateSpendEntry(
  entryId: string,
  amount: number,
  category: string | null = null,
  note: string | null = null
): Promise<SpendEntry | null> {
  const entries = await getAllEntries();
  const index = entries.findIndex((e) => e.entry_id === entryId);
  
  if (index < 0) return null;

  entries[index] = {
    ...entries[index],
    amount,
    category: category || "Uncategorized",
    note,
    updated_at: Date.now(),
  };

  await saveAllEntries(entries);
  return entries[index];
}

export async function deleteSpendEntry(entryId: string): Promise<boolean> {
  const entries = await getAllEntries();
  const filtered = entries.filter((e) => e.entry_id !== entryId);
  
  if (filtered.length === entries.length) return false;

  await saveAllEntries(filtered);
  return true;
}

export async function getEntriesForDateRange(
  startDate: string,
  endDate: string
): Promise<SpendEntry[]> {
  const entries = await getAllEntries();
  return entries
    .filter((e) => e.date >= startDate && e.date <= endDate)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export async function getDayDataForDateRange(
  startDate: string,
  endDate: string
): Promise<Map<string, DayData>> {
  const entries = await getEntriesForDateRange(startDate, endDate);
  const dayMap = new Map<string, DayData>();

  for (const entry of entries) {
    if (!dayMap.has(entry.date)) {
      dayMap.set(entry.date, {
        date: entry.date,
        entries: [],
        totalAmount: 0,
        hasSpend: false,
      });
    }
    const day = dayMap.get(entry.date)!;
    day.entries.push(entry);
    day.totalAmount += entry.amount;
    day.hasSpend = true;
  }

  return dayMap;
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
  totalEntries: number;
  spendDays: number;
  averageSpendPerSpendDay: number;
  topCategories: { category: string; total: number }[];
  highestSpendDay: { date: string; amount: number } | null;
  lowestSpendDay: { date: string; amount: number } | null;
  totalDaysInPeriod: number;
}

export function calculateSpendingStats(
  entries: SpendEntry[],
  totalDaysInPeriod: number = 7
): SpendingStats {
  if (entries.length === 0) {
    return {
      totalSpend: 0,
      totalEntries: 0,
      spendDays: 0,
      averageSpendPerSpendDay: 0,
      topCategories: [],
      highestSpendDay: null,
      lowestSpendDay: null,
      totalDaysInPeriod,
    };
  }

  const dayTotals: Record<string, number> = {};
  const categoryTotals: Record<string, number> = {};
  let totalSpend = 0;

  for (const entry of entries) {
    totalSpend += entry.amount;
    dayTotals[entry.date] = (dayTotals[entry.date] || 0) + entry.amount;
    const cat = entry.category || "Uncategorized";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + entry.amount;
  }

  const spendDays = Object.keys(dayTotals).length;
  const averageSpendPerSpendDay = spendDays > 0 ? totalSpend / spendDays : 0;

  const topCategories = Object.entries(categoryTotals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  const dayAmounts = Object.entries(dayTotals).map(([date, amount]) => ({ date, amount }));
  dayAmounts.sort((a, b) => b.amount - a.amount);

  const highestSpendDay = dayAmounts.length > 0 ? dayAmounts[0] : null;
  const lowestSpendDay = dayAmounts.length > 0 ? dayAmounts[dayAmounts.length - 1] : null;

  return {
    totalSpend,
    totalEntries: entries.length,
    spendDays,
    averageSpendPerSpendDay,
    topCategories,
    highestSpendDay,
    lowestSpendDay,
    totalDaysInPeriod,
  };
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
