import { HydrationDayRecord, HydrationLogItem } from '../types';

const STORAGE_KEY = 'gymtracker_hydration_history';
const LEGACY_TODAY_KEY = 'gymtracker_water_today';
export const DEFAULT_DAILY_WATER_TARGET_ML = 3000;

export function getTodayDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function currentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function getHydrationDay(history: Record<string, HydrationDayRecord>, date: string): HydrationDayRecord {
  return history[date] ?? { date, totalMl: 0, targetMl: DEFAULT_DAILY_WATER_TARGET_ML, entries: [] };
}

export function loadHydrationHistory(): Record<string, HydrationDayRecord> {
  let history: Record<string, HydrationDayRecord> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) history = JSON.parse(raw);
  } catch {}

  const today = getTodayDateKey();
  try {
    const legacyValue = Number.parseInt(localStorage.getItem(LEGACY_TODAY_KEY) || '', 10);
    if (Number.isFinite(legacyValue) && legacyValue > 0 && !history[today]) {
      history[today] = {
        date: today,
        totalMl: legacyValue,
        targetMl: DEFAULT_DAILY_WATER_TARGET_ML,
        entries: [{ id: 'legacy-hydration-entry', time: '08:00', amountMl: legacyValue, timestamp: 0 }],
      };
    }
  } catch {}
  return history;
}

function save(history: Record<string, HydrationDayRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    const today = getTodayDateKey();
    if (history[today]) localStorage.setItem(LEGACY_TODAY_KEY, String(history[today].totalMl));
  } catch {}
}

export function logWaterIntake(history: Record<string, HydrationDayRecord>, date: string, amountMl: number): Record<string, HydrationDayRecord> {
  if (!Number.isFinite(amountMl) || amountMl <= 0) return history;
  const day = getHydrationDay(history, date);
  const entry: HydrationLogItem = { id: `water-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, time: currentTime(), amountMl, timestamp: Date.now() };
  const entries = [...day.entries, entry];
  const next = { ...history, [date]: { ...day, entries, totalMl: entries.reduce((sum, item) => sum + item.amountMl, 0) } };
  save(next);
  return next;
}

export function removeWaterEntry(history: Record<string, HydrationDayRecord>, date: string, entryId: string): Record<string, HydrationDayRecord> {
  const day = getHydrationDay(history, date);
  const entries = day.entries.filter((entry) => entry.id !== entryId);
  const next = { ...history, [date]: { ...day, entries, totalMl: entries.reduce((sum, item) => sum + item.amountMl, 0) } };
  save(next);
  return next;
}

export function clearWaterDay(history: Record<string, HydrationDayRecord>, date: string): Record<string, HydrationDayRecord> {
  const day = getHydrationDay(history, date);
  const next = { ...history, [date]: { ...day, totalMl: 0, entries: [] } };
  save(next);
  return next;
}

export function getRecentHydrationStats(history: Record<string, HydrationDayRecord>, days = 7, endDate = getTodayDateKey()) {
  const end = new Date(`${endDate}T12:00:00`);
  const entries = Array.from({ length: days }, (_, offset) => {
    const day = new Date(end); day.setDate(end.getDate() - (days - 1 - offset));
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const record = getHydrationDay(history, key);
    return { date: key, totalMl: record.totalMl, targetMl: record.targetMl };
  });
  return { days: entries, averageMl: Math.round(entries.reduce((sum, entry) => sum + entry.totalMl, 0) / Math.max(1, entries.length)), daysMetGoalCount: entries.filter((entry) => entry.totalMl >= entry.targetMl).length };
}
