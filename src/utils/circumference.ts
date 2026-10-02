import { CircumferenceEntry } from '../types';

const cmPattern = /^\d+(?:[.,]\d)?$/;
export const EMA_ALPHA = 0.3;
export const ANALYSIS_THRESHOLDS = {
  circumferenceMillimetersPerWeek: 1,
  strengthKilogramsPerWeek: 0.5
} as const;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const standardDeviation = (values: number[]) => {
  if (!values.length) return 0;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length);
};

export function parseCircumferenceMillimeters(input: string): number | null {
  const normalized = input.trim();
  if (!cmPattern.test(normalized)) return null;
  const centimeters = Number(normalized.replace(',', '.'));
  if (!Number.isFinite(centimeters) || centimeters <= 0) return null;
  const millimeters = Math.round(centimeters * 10);
  return millimeters > 0 ? millimeters : null;
}

export function circumferenceEntriesOrEmpty(entries?: CircumferenceEntry[]): CircumferenceEntry[] {
  return Array.isArray(entries) ? entries : [];
}

export function sortCircumferences(entries: CircumferenceEntry[]): CircumferenceEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export function sameCircumferenceSeries(a: CircumferenceEntry, b: CircumferenceEntry): boolean {
  return a.bodyPart === b.bodyPart && a.side === b.side && a.variant === b.variant;
}

export function calculateCircumferenceChange(currentMillimeters: number, baselineMillimeters: number) {
  const millimeters = currentMillimeters - baselineMillimeters;
  return {
    millimeters,
    centimeters: Math.round((millimeters / 10) * 10) / 10,
    percent: baselineMillimeters > 0 ? Math.round((100 * millimeters / baselineMillimeters) * 10) / 10 : 0
  };
}

export function calculateEma(values: number[], alpha = EMA_ALPHA): number[] {
  if (!values.length) return [];
  return values.reduce<number[]>((result, value) => {
    const previous = result.at(-1);
    result.push(previous === undefined ? value : Math.round((alpha * value + (1 - alpha) * previous) * 10) / 10);
    return result;
  }, []);
}

export interface CircumferenceTrendPoint {
  entry: CircumferenceEntry;
  uncertain: boolean;
  medianOfPreviousThree: number | null;
  zScore: number | null;
}

export interface CircumferenceTrendAnalysis {
  raw: CircumferenceTrendPoint[];
  trendPoints: { date: string; value: number }[];
  slopePerWeek: number | null;
  standardDeviation: number;
  isConstant: boolean;
}

export function regressionSlopePerWeek(points: { date: string; value: number }[]): number | null {
  const byDate = new Map<string, number[]>();
  points.forEach((point) => byDate.set(point.date, [...(byDate.get(point.date) || []), point.value]));
  const daily = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({ date, value: median(values) }));
  if (daily.length < 3) return null;
  const firstDay = Date.parse(`${daily[0].date}T00:00:00Z`) / 86400000;
  const x = daily.map((point) => Date.parse(`${point.date}T00:00:00Z`) / 86400000 - firstDay);
  const y = daily.map((point) => point.value);
  const averageX = x.reduce((sum, value) => sum + value, 0) / x.length;
  const averageY = y.reduce((sum, value) => sum + value, 0) / y.length;
  const denominator = x.reduce((sum, value) => sum + (value - averageX) ** 2, 0);
  if (denominator === 0) return null;
  return Math.round((7 * x.reduce((sum, value, index) => sum + (value - averageX) * (y[index] - averageY), 0) / denominator) * 100) / 100;
}

export function analyzeCircumferenceTrend(entries: CircumferenceEntry[]): CircumferenceTrendAnalysis {
  const sorted = sortCircumferences(entries);
  const values = sorted.map((entry) => entry.millimeters);
  const deviation = standardDeviation(values);
  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const raw = sorted.map((entry, index) => {
    const previous = sorted.slice(Math.max(0, index - 3), index).map((item) => item.millimeters);
    const medianOfPreviousThree = previous.length === 3 ? median(previous) : null;
    const mad = medianOfPreviousThree === null ? 0 : median(previous.map((value) => Math.abs(value - medianOfPreviousThree)));
    const uncertain = medianOfPreviousThree !== null && Math.abs(entry.millimeters - medianOfPreviousThree) > Math.max(15, mad * 3);
    return { entry, uncertain, medianOfPreviousThree, zScore: deviation === 0 ? null : Math.round(((entry.millimeters - mean) / deviation) * 100) / 100 };
  });
  const byDate = new Map<string, number[]>();
  raw.filter((point) => !point.uncertain).forEach((point) => {
    const current = byDate.get(point.entry.date) || [];
    current.push(point.entry.millimeters);
    byDate.set(point.entry.date, current);
  });
  const trendPoints = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, dayValues]) => ({ date, value: median(dayValues) }));
  const slopePerWeek = regressionSlopePerWeek(trendPoints);
  return { raw, trendPoints, slopePerWeek, standardDeviation: Math.round(deviation * 100) / 100, isConstant: deviation === 0 };
}

export function pearsonCorrelation(first: number[], second: number[]): number | null {
  if (first.length < 5 || first.length !== second.length || first.some((value) => !Number.isFinite(value)) || second.some((value) => !Number.isFinite(value))) return null;
  const firstAverage = first.reduce((sum, value) => sum + value, 0) / first.length;
  const secondAverage = second.reduce((sum, value) => sum + value, 0) / second.length;
  const firstDeviation = Math.sqrt(first.reduce((sum, value) => sum + (value - firstAverage) ** 2, 0));
  const secondDeviation = Math.sqrt(second.reduce((sum, value) => sum + (value - secondAverage) ** 2, 0));
  if (firstDeviation === 0 || secondDeviation === 0) return null;
  return Math.round((first.reduce((sum, value, index) => sum + (value - firstAverage) * (second[index] - secondAverage), 0) / (firstDeviation * secondDeviation)) * 100) / 100;
}

export function pearsonForSharedDates(first: { date: string; value: number }[], second: { date: string; value: number }[]) {
  const dailyMedian = (points: { date: string; value: number }[]) => {
    const grouped = new Map<string, number[]>();
    points.forEach((point) => grouped.set(point.date, [...(grouped.get(point.date) || []), point.value]));
    return new Map([...grouped.entries()].map(([date, values]) => [date, median(values)]));
  };
  const firstByDate = dailyMedian(first);
  const secondByDate = dailyMedian(second);
  const dates = [...firstByDate.keys()].filter((date) => secondByDate.has(date)).sort();
  return { count: dates.length, r: pearsonCorrelation(dates.map((date) => firstByDate.get(date)!), dates.map((date) => secondByDate.get(date)!)) };
}

export function interpretCircumferenceAndStrength(circumferenceSlope: number | null, strengthSlope: number | null): string {
  if (circumferenceSlope !== null && strengthSlope !== null && circumferenceSlope >= ANALYSIS_THRESHOLDS.circumferenceMillimetersPerWeek && strengthSlope >= ANALYSIS_THRESHOLDS.strengthKilogramsPerWeek) return 'zgodny wzrost obwodu i siły';
  if (strengthSlope !== null && strengthSlope >= ANALYSIS_THRESHOLDS.strengthKilogramsPerWeek && (circumferenceSlope === null || Math.abs(circumferenceSlope) < ANALYSIS_THRESHOLDS.circumferenceMillimetersPerWeek)) return 'progres siłowy przy stabilnym obwodzie';
  if (circumferenceSlope !== null && circumferenceSlope >= ANALYSIS_THRESHOLDS.circumferenceMillimetersPerWeek && (strengthSlope === null || strengthSlope < ANALYSIS_THRESHOLDS.strengthKilogramsPerWeek)) return 'wzrost obwodu bez progresu siłowego — możliwa retencja, tłuszcz lub błąd pomiaru';
  return 'brak istotnego trendu';
}
