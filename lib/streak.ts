import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY = 'streak_data_v1';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null; // 'YYYY-MM-DD'
  readDays: string[]; // last 7 days that had a read, 'YYYY-MM-DD'
}

const DEFAULT: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastReadDate: null,
  readDays: [],
};

export function toDateString(date: Date): string {
  // Local date, not UTC, so streaks respect the user's timezone
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(fromStr: string, toStr: string): number {
  const a = new Date(fromStr + 'T00:00:00');
  const b = new Date(toStr + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export async function loadStreak(): Promise<StreakData> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export async function saveStreak(data: StreakData): Promise<void> {
  try {
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/**
 * Called on app open. Detects missed days and grace period.
 * Grace period = exactly 1 calendar day missed (the day after the missed day is today).
 * Returns updated data and whether the grace banner should show.
 */
export function checkOnOpen(data: StreakData): { data: StreakData; graceActive: boolean } {
  if (!data.lastReadDate) {
    return { data, graceActive: false };
  }

  const today = toDateString(new Date());
  const daysSince = daysBetween(data.lastReadDate, today);

  if (daysSince <= 1) {
    // 0 = already read today, 1 = read yesterday (streak intact)
    return { data, graceActive: false };
  }

  if (daysSince === 2) {
    // Missed exactly 1 day → show grace prompt, don't reset yet
    return { data, graceActive: true };
  }

  // Missed 2+ days → reset streak silently
  return { data: { ...data, currentStreak: 0 }, graceActive: false };
}

/**
 * Called when the user reads an article. Increments or starts a streak.
 * graceActive = the user was in the grace window when they read.
 */
export function recordRead(data: StreakData, graceActive: boolean): StreakData {
  const today = toDateString(new Date());

  if (data.lastReadDate === today) {
    return data; // Already counted today
  }

  const daysSince = data.lastReadDate ? daysBetween(data.lastReadDate, today) : null;

  let newStreak: number;
  if (daysSince === 1 || (daysSince === 2 && graceActive)) {
    // Consecutive day or grace recovery — extend streak
    newStreak = data.currentStreak + 1;
  } else {
    // New streak starts from 1
    newStreak = 1;
  }

  const longestStreak = Math.max(data.longestStreak, newStreak);

  // Keep only last 7 calendar days
  const cutoff = toDateString(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
  const readDays = [
    ...data.readDays.filter(d => d >= cutoff && d !== today),
    today,
  ];

  return { currentStreak: newStreak, longestStreak, lastReadDate: today, readDays };
}
