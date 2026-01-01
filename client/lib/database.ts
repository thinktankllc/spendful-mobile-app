import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  SPEND_ENTRIES: "spendful_spend_entries",
  APP_SETTINGS: "spendful_app_settings",
  SUBSCRIPTION: "spendful_subscription",
  MIGRATED_V2: "spendful_migrated_v2",
  CUSTOM_CATEGORIES: "spendful_custom_categories",
  RECURRING_ENTRIES: "spendful_recurring_entries",
};

export interface SpendEntry {
  entry_id: string;
  date: string;
  amount: number;
  category: string | null;
  currency: string | null;
  note: string | null;
  timestamp: number;
  created_at: number;
  updated_at: number;
}

export interface CustomCategory {
  id: string;
  name: string;
  created_at: number;
}

export interface RecurringEntry {
  id: string;
  amount: number;
  category: string | null;
  currency: string | null;
  note: string | null;
  frequency: "weekly" | "biweekly" | "monthly";
  start_date: string;
  end_date: string | null;
  last_generated_date: string | null;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

export interface DayData {
  date: string;
  entries: SpendEntry[];
  totalAmount: number;
  hasSpend: boolean;
}

export const DEFAULT_CATEGORIES = [
  "Uncategorized",
  "Groceries",
  "Shopping",
  "Rent",
  "Utilities",
  "Insurance",
  "Transportation",
  "Dining",
  "Subscriptions",
  "Entertainment",
  "Healthcare",
  "Other",
] as const;

export type DefaultCategory = typeof DEFAULT_CATEGORIES[number];

export const SPENDING_CATEGORIES = DEFAULT_CATEGORIES;

export type ThemeMode = "light" | "dark" | "system";

export interface AppSettings {
  daily_reminder_time: string;
  notifications_enabled: boolean;
  free_history_days: number;
  tone: string;
  first_launch_at: number | null;
  onboarding_completed: boolean;
  show_onboarding_on_launch: boolean;
  default_currency: string;
  theme_mode: ThemeMode;
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
            currency: null,
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
  note: string | null = null,
  currency: string | null = null
): Promise<SpendEntry> {
  const entries = await getAllEntries();
  const now = Date.now();
  
  const newEntry: SpendEntry = {
    entry_id: generateUUID(),
    date,
    amount,
    category: category || "Uncategorized",
    currency,
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
  note: string | null = null,
  currency: string | null = null
): Promise<SpendEntry | null> {
  const entries = await getAllEntries();
  const index = entries.findIndex((e) => e.entry_id === entryId);
  
  if (index < 0) return null;

  entries[index] = {
    ...entries[index],
    amount,
    category: category || "Uncategorized",
    currency,
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
    free_history_days: 30,
    tone: "calm",
    first_launch_at: null,
    onboarding_completed: false,
    show_onboarding_on_launch: false,
    default_currency: "USD",
    theme_mode: "system",
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

export function formatCurrency(amount: number, currency: string = "USD"): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "\u20AC",
    GBP: "\u00A3",
    JPY: "\u00A5",
    CNY: "\u00A5",
    KRW: "\u20A9",
    INR: "\u20B9",
    VND: "\u20AB",
    BRL: "R$",
    CAD: "C$",
    AUD: "A$",
    MXN: "MX$",
  };
  const symbol = symbols[currency] || currency + " ";
  return `${symbol}${amount.toFixed(2)}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function getCustomCategories(): Promise<CustomCategory[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_CATEGORIES);
    if (!data) return [];
    return JSON.parse(data) as CustomCategory[];
  } catch {
    return [];
  }
}

export async function addCustomCategory(name: string): Promise<CustomCategory> {
  const categories = await getCustomCategories();
  const newCategory: CustomCategory = {
    id: generateUUID(),
    name: name.trim(),
    created_at: Date.now(),
  };
  categories.push(newCategory);
  await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(categories));
  return newCategory;
}

export async function renameCustomCategory(id: string, newName: string): Promise<boolean> {
  const categories = await getCustomCategories();
  const index = categories.findIndex((c) => c.id === id);
  if (index < 0) return false;
  
  categories[index].name = newName.trim();
  await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(categories));
  return true;
}

export async function deleteCustomCategory(id: string): Promise<boolean> {
  const categories = await getCustomCategories();
  const filtered = categories.filter((c) => c.id !== id);
  if (filtered.length === categories.length) return false;
  
  await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(filtered));
  return true;
}

export async function getAllCategories(): Promise<string[]> {
  const customCategories = await getCustomCategories();
  const customNames = customCategories.map((c) => c.name);
  return [...DEFAULT_CATEGORIES, ...customNames];
}

export const SUPPORTED_CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "\u20AC" },
  { code: "GBP", name: "British Pound", symbol: "\u00A3" },
  { code: "JPY", name: "Japanese Yen", symbol: "\u00A5" },
  { code: "CNY", name: "Chinese Yuan", symbol: "\u00A5" },
  { code: "KRW", name: "Korean Won", symbol: "\u20A9" },
  { code: "INR", name: "Indian Rupee", symbol: "\u20B9" },
  { code: "VND", name: "Vietnamese Dong", symbol: "\u20AB" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$" },
] as const;

export async function getRecurringEntries(): Promise<RecurringEntry[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.RECURRING_ENTRIES);
    if (!data) return [];
    return JSON.parse(data) as RecurringEntry[];
  } catch {
    return [];
  }
}

export async function addRecurringEntry(
  amount: number,
  frequency: "weekly" | "biweekly" | "monthly",
  startDate: string,
  category: string | null = null,
  currency: string | null = null,
  note: string | null = null,
  endDate: string | null = null
): Promise<RecurringEntry> {
  const entries = await getRecurringEntries();
  const now = Date.now();
  
  const newEntry: RecurringEntry = {
    id: generateUUID(),
    amount,
    category: category || "Uncategorized",
    currency,
    note,
    frequency,
    start_date: startDate,
    end_date: endDate,
    last_generated_date: null,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  
  entries.push(newEntry);
  await AsyncStorage.setItem(STORAGE_KEYS.RECURRING_ENTRIES, JSON.stringify(entries));
  return newEntry;
}

export async function updateRecurringEntry(
  id: string,
  updates: Partial<Omit<RecurringEntry, "id" | "created_at" | "updated_at">>
): Promise<RecurringEntry | null> {
  const entries = await getRecurringEntries();
  const index = entries.findIndex((e) => e.id === id);
  
  if (index < 0) return null;
  
  entries[index] = {
    ...entries[index],
    ...updates,
    updated_at: Date.now(),
  };
  
  await AsyncStorage.setItem(STORAGE_KEYS.RECURRING_ENTRIES, JSON.stringify(entries));
  return entries[index];
}

export async function deleteRecurringEntry(id: string): Promise<boolean> {
  const entries = await getRecurringEntries();
  const filtered = entries.filter((e) => e.id !== id);
  if (filtered.length === entries.length) return false;
  
  await AsyncStorage.setItem(STORAGE_KEYS.RECURRING_ENTRIES, JSON.stringify(filtered));
  return true;
}

function getNextOccurrenceDate(
  lastDate: string,
  frequency: "weekly" | "biweekly" | "monthly"
): string {
  const date = new Date(lastDate + "T00:00:00");
  
  switch (frequency) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "biweekly":
      date.setDate(date.getDate() + 14);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const LAST_RECURRING_CHECK_KEY = "spendful_last_recurring_check";

export async function generateRecurringEntriesForToday(): Promise<number> {
  const today = getTodayDate();
  
  const lastCheck = await AsyncStorage.getItem(LAST_RECURRING_CHECK_KEY);
  if (lastCheck === today) {
    return 0;
  }
  
  const recurringEntries = await getRecurringEntries();
  let generated = 0;
  
  for (const recurring of recurringEntries) {
    if (!recurring.is_active) continue;
    if (recurring.end_date && recurring.end_date < today) continue;
    if (recurring.start_date > today) continue;
    
    let nextDate = recurring.last_generated_date 
      ? getNextOccurrenceDate(recurring.last_generated_date, recurring.frequency)
      : recurring.start_date;
    
    while (nextDate <= today) {
      if (recurring.end_date && nextDate > recurring.end_date) break;
      
      await addSpendEntry(
        nextDate,
        recurring.amount,
        recurring.category,
        recurring.note ? `[Recurring] ${recurring.note}` : "[Recurring]",
        recurring.currency
      );
      
      await updateRecurringEntry(recurring.id, { last_generated_date: nextDate });
      generated++;
      
      nextDate = getNextOccurrenceDate(nextDate, recurring.frequency);
    }
  }
  
  await AsyncStorage.setItem(LAST_RECURRING_CHECK_KEY, today);
  
  return generated;
}

export interface ExportData {
  exportedAt: string;
  version: string;
  entries: SpendEntry[];
  settings: AppSettings;
  customCategories: CustomCategory[];
}

export async function exportAllData(): Promise<ExportData> {
  const [entries, settings, customCategories] = await Promise.all([
    getAllEntries(),
    getAppSettings(),
    getCustomCategories(),
  ]);
  
  return {
    exportedAt: new Date().toISOString(),
    version: "1.0.0",
    entries: entries.sort((a, b) => b.date.localeCompare(a.date)),
    settings,
    customCategories,
  };
}

export function convertToCSV(entries: SpendEntry[]): string {
  const headers = ["Date", "Amount", "Currency", "Category", "Note", "Created At"];
  
  const escapeCSVField = (value: string): string => {
    return value.replace(/"/g, '""');
  };
  
  const rows = entries.map((e) => [
    escapeCSVField(e.date),
    escapeCSVField(e.amount.toString()),
    escapeCSVField(e.currency || "USD"),
    escapeCSVField(e.category || "Uncategorized"),
    escapeCSVField(e.note || ""),
    escapeCSVField(new Date(e.created_at).toISOString()),
  ]);
  
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");
  
  return csvContent;
}
