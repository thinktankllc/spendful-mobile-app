import * as SQLite from "expo-sqlite";

const DB_NAME = "spendful.db";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initializeDatabase(db);
  }
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS daily_logs (
      id TEXT PRIMARY KEY,
      date TEXT UNIQUE NOT NULL,
      did_spend INTEGER NOT NULL,
      amount REAL,
      note TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      daily_reminder_time TEXT DEFAULT '20:00',
      notifications_enabled INTEGER DEFAULT 0,
      free_history_days INTEGER DEFAULT 14,
      tone TEXT DEFAULT 'calm',
      first_launch_at INTEGER,
      onboarding_completed INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      plan TEXT DEFAULT 'free',
      is_active INTEGER DEFAULT 0,
      expires_at INTEGER,
      source TEXT,
      updated_at INTEGER NOT NULL
    );
  `);

  const settings = await database.getFirstAsync<{ id: number }>(
    "SELECT id FROM app_settings WHERE id = 1"
  );
  if (!settings) {
    const now = Date.now();
    await database.runAsync(
      "INSERT INTO app_settings (id, updated_at) VALUES (1, ?)",
      [now]
    );
  }

  const subscription = await database.getFirstAsync<{ id: number }>(
    "SELECT id FROM subscriptions WHERE id = 1"
  );
  if (!subscription) {
    const now = Date.now();
    await database.runAsync(
      "INSERT INTO subscriptions (id, updated_at) VALUES (1, ?)",
      [now]
    );
  }
}

export interface DailyLog {
  id: string;
  date: string;
  did_spend: boolean;
  amount: number | null;
  note: string | null;
  created_at: number;
  updated_at: number;
}

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

export async function getDailyLog(date: string): Promise<DailyLog | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    date: string;
    did_spend: number;
    amount: number | null;
    note: string | null;
    created_at: number;
    updated_at: number;
  }>("SELECT * FROM daily_logs WHERE date = ?", [date]);

  if (!row) return null;

  return {
    id: row.id,
    date: row.date,
    did_spend: row.did_spend === 1,
    amount: row.amount,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function saveDailyLog(
  date: string,
  didSpend: boolean,
  amount: number | null = null,
  note: string | null = null
): Promise<DailyLog> {
  const database = await getDatabase();
  const now = Date.now();
  const existing = await getDailyLog(date);

  if (existing) {
    await database.runAsync(
      "UPDATE daily_logs SET did_spend = ?, amount = ?, note = ?, updated_at = ? WHERE date = ?",
      [didSpend ? 1 : 0, amount, note, now, date]
    );
    return {
      ...existing,
      did_spend: didSpend,
      amount,
      note,
      updated_at: now,
    };
  } else {
    const id = generateUUID();
    await database.runAsync(
      "INSERT INTO daily_logs (id, date, did_spend, amount, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, date, didSpend ? 1 : 0, amount, note, now, now]
    );
    return {
      id,
      date,
      did_spend: didSpend,
      amount,
      note,
      created_at: now,
      updated_at: now,
    };
  }
}

export async function getLogsForDateRange(
  startDate: string,
  endDate: string
): Promise<DailyLog[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    date: string;
    did_spend: number;
    amount: number | null;
    note: string | null;
    created_at: number;
    updated_at: number;
  }>("SELECT * FROM daily_logs WHERE date >= ? AND date <= ? ORDER BY date DESC", [
    startDate,
    endDate,
  ]);

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    did_spend: row.did_spend === 1,
    amount: row.amount,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function getAppSettings(): Promise<AppSettings> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    daily_reminder_time: string;
    notifications_enabled: number;
    free_history_days: number;
    tone: string;
    first_launch_at: number | null;
    onboarding_completed: number;
    updated_at: number;
  }>("SELECT * FROM app_settings WHERE id = 1");

  if (!row) {
    throw new Error("App settings not found");
  }

  return {
    daily_reminder_time: row.daily_reminder_time || "20:00",
    notifications_enabled: row.notifications_enabled === 1,
    free_history_days: row.free_history_days || 14,
    tone: row.tone || "calm",
    first_launch_at: row.first_launch_at,
    onboarding_completed: row.onboarding_completed === 1,
    updated_at: row.updated_at,
  };
}

export async function updateAppSettings(
  settings: Partial<Omit<AppSettings, "updated_at">>
): Promise<void> {
  const database = await getDatabase();
  const now = Date.now();

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (settings.daily_reminder_time !== undefined) {
    updates.push("daily_reminder_time = ?");
    values.push(settings.daily_reminder_time);
  }
  if (settings.notifications_enabled !== undefined) {
    updates.push("notifications_enabled = ?");
    values.push(settings.notifications_enabled ? 1 : 0);
  }
  if (settings.free_history_days !== undefined) {
    updates.push("free_history_days = ?");
    values.push(settings.free_history_days);
  }
  if (settings.tone !== undefined) {
    updates.push("tone = ?");
    values.push(settings.tone);
  }
  if (settings.first_launch_at !== undefined) {
    updates.push("first_launch_at = ?");
    values.push(settings.first_launch_at);
  }
  if (settings.onboarding_completed !== undefined) {
    updates.push("onboarding_completed = ?");
    values.push(settings.onboarding_completed ? 1 : 0);
  }

  updates.push("updated_at = ?");
  values.push(now);

  if (updates.length > 0) {
    await database.runAsync(
      `UPDATE app_settings SET ${updates.join(", ")} WHERE id = 1`,
      values
    );
  }
}

export async function getSubscription(): Promise<Subscription> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    plan: string;
    is_active: number;
    expires_at: number | null;
    source: string | null;
    updated_at: number;
  }>("SELECT * FROM subscriptions WHERE id = 1");

  if (!row) {
    throw new Error("Subscription not found");
  }

  return {
    plan: (row.plan || "free") as Subscription["plan"],
    is_active: row.is_active === 1,
    expires_at: row.expires_at,
    source: row.source as Subscription["source"],
    updated_at: row.updated_at,
  };
}

export async function updateSubscription(
  subscription: Partial<Omit<Subscription, "updated_at">>
): Promise<void> {
  const database = await getDatabase();
  const now = Date.now();

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (subscription.plan !== undefined) {
    updates.push("plan = ?");
    values.push(subscription.plan);
  }
  if (subscription.is_active !== undefined) {
    updates.push("is_active = ?");
    values.push(subscription.is_active ? 1 : 0);
  }
  if (subscription.expires_at !== undefined) {
    updates.push("expires_at = ?");
    values.push(subscription.expires_at);
  }
  if (subscription.source !== undefined) {
    updates.push("source = ?");
    values.push(subscription.source);
  }

  updates.push("updated_at = ?");
  values.push(now);

  if (updates.length > 0) {
    await database.runAsync(
      `UPDATE subscriptions SET ${updates.join(", ")} WHERE id = 1`,
      values
    );
  }
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

export function canViewDate(date: string, subscription: Subscription, freeHistoryDays: number): boolean {
  if (subscription.is_active && subscription.plan !== "free") {
    return true;
  }

  const today = new Date();
  const targetDate = new Date(date);
  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays <= freeHistoryDays;
}
