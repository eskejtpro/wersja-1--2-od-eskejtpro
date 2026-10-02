import { BodyPartMeasurement, BodyPartType, BODY_PARTS } from '../types';

export const BODY_PART_CONFIG: Record<
  BodyPartType,
  {
    label: string;
    fullLabel: string;
    description: string;
    color: string;
    stroke: string;
    bg: string;
    border: string;
    badge: string;
    placeholder: string;
  }
> = {
  biceps: {
    label: 'Biceps',
    fullLabel: 'Biceps (ramię w napięciu)',
    description: 'Pomiar obwodu ramienia zgiętego w łokciu i maksymalnie napiętego.',
    color: 'text-purple-400',
    stroke: '#a855f7',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    placeholder: 'np. 38.5'
  },
  triceps: {
    label: 'Triceps',
    fullLabel: 'Triceps (obwód ramienia)',
    description: 'Pomiar obwodu ramienia rozluźnionego lub z akcentem na głowę trójgłową.',
    color: 'text-indigo-400',
    stroke: '#6366f1',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    placeholder: 'np. 36.0'
  },
  klata: {
    label: 'Klata',
    fullLabel: 'Klatka piersiowa',
    description: 'Pomiar na wysokości sutków / najszerszego punktu klatki na spokojnym wydechu.',
    color: 'text-emerald-400',
    stroke: '#10b981',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    placeholder: 'np. 108.0'
  },
  barki: {
    label: 'Barki',
    fullLabel: 'Obręcz barkowa',
    description: 'Pomiar w najszerszym punkcie barków wokół mięśni naramiennych.',
    color: 'text-sky-400',
    stroke: '#0ea5e9',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    placeholder: 'np. 122.5'
  },
  nogi: {
    label: 'Nogi',
    fullLabel: 'Uda / Nogi',
    description: 'Pomiar w najszerszym punkcie uda (mięsień czworogłowy/dwugłowy).',
    color: 'text-amber-400',
    stroke: '#f59e0b',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    placeholder: 'np. 62.0'
  }
};

export function parseBodyMeasurementValue(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  const parsed = parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 350) return null;
  return Math.round(parsed * 10) / 10;
}

export function sortBodyMeasurements(entries: BodyPartMeasurement[]): BodyPartMeasurement[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export interface PartProgressionStats {
  part: BodyPartType;
  count: number;
  latest: BodyPartMeasurement | null;
  first: BodyPartMeasurement | null;
  previous: BodyPartMeasurement | null;
  currentValue: number | null;
  totalChange: number;
  totalChangePct: number;
  changeFromPrevious: number | null;
  min: number | null;
  max: number | null;
  daysElapsed: number;
  monthlyRate: number | null;
  trendLabel: string;
}

export function calculatePartProgressionStats(
  entries: BodyPartMeasurement[],
  part: BodyPartType
): PartProgressionStats {
  const filtered = sortBodyMeasurements(entries.filter((e) => e.part === part));
  const count = filtered.length;

  if (count === 0) {
    return {
      part,
      count: 0,
      latest: null,
      first: null,
      previous: null,
      currentValue: null,
      totalChange: 0,
      totalChangePct: 0,
      changeFromPrevious: null,
      min: null,
      max: null,
      daysElapsed: 0,
      monthlyRate: null,
      trendLabel: 'Brak pomiarów'
    };
  }

  const latest = filtered[count - 1];
  const first = filtered[0];
  const previous = count > 1 ? filtered[count - 2] : null;

  const totalChange = Math.round((latest.value - first.value) * 10) / 10;
  const totalChangePct = first.value > 0 ? Math.round(((latest.value - first.value) / first.value) * 1000) / 10 : 0;
  const changeFromPrevious = previous ? Math.round((latest.value - previous.value) * 10) / 10 : null;

  const values = filtered.map((e) => e.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const tFirst = Date.parse(`${first.date}T00:00:00Z`);
  const tLatest = Date.parse(`${latest.date}T00:00:00Z`);
  const daysElapsed = Math.max(0, Math.round((tLatest - tFirst) / 86400000));

  let monthlyRate: number | null = null;
  if (daysElapsed >= 7 && count >= 2) {
    monthlyRate = Math.round((totalChange / (daysElapsed / 30)) * 10) / 10;
  }

  let trendLabel = 'Stabilizacja obwodu (±0.3 cm)';
  if (totalChange > 0.3) {
    trendLabel = `Hipertrofia (+${totalChange} cm)`;
  } else if (totalChange < -0.3) {
    trendLabel = `Redukcja (${totalChange} cm)`;
  }

  return {
    part,
    count,
    latest,
    first,
    previous,
    currentValue: latest.value,
    totalChange,
    totalChangePct,
    changeFromPrevious,
    min,
    max,
    daysElapsed,
    monthlyRate,
    trendLabel
  };
}

export function formatCm(value: number): string {
  return `${value.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} cm`;
}

export function formatSignedCm(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} cm`;
}
