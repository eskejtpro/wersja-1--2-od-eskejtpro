import { Exercise, ExerciseHistoryPoint, LoggedSet, TrainingDay, TrainingWeek } from '../types';
import { calculate1RM, calculateVolume } from './calculations';

export interface AnalysisExecutionOptions {
  onlyCompleted: boolean;
  includePartialHistory: boolean;
  requireHistoryForCompleted: boolean;
  minExecutedSets: number;
  /** First day of the selected analysis cycle. Older history is not part of this cycle. */
  startDate?: string;
  /** Optional last day of the selected analysis cycle. */
  endDate?: string;
}

/** Normalise persisted execution counts so malformed/negative values cannot inflate or poison metrics. */
const nonNegativeCount = (value: number | undefined, fallback = 0): number => {
  const candidate = value ?? fallback;
  return Number.isFinite(candidate) ? Math.max(0, candidate) : Math.max(0, fallback);
};

const effectiveSets = (exercise: Exercise, point?: ExerciseHistoryPoint): number =>
  nonNegativeCount(point?.sets, nonNegativeCount(exercise.sets));

const effectiveReps = (exercise: Exercise, point?: ExerciseHistoryPoint): number =>
  nonNegativeCount(point?.reps, nonNegativeCount(exercise.reps));

/** Only canonical calendar dates may affect ordering and cycle boundaries. */
const isValidDateKey = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const historySetCount = (exercise: Exercise): number =>
  (exercise.history || []).reduce((sum, point) => sum + effectiveSets(exercise, point), 0);

export const historyForAnalysis = (
  exercise: Exercise,
  options: Pick<AnalysisExecutionOptions, 'startDate' | 'endDate'> = {},
): ExerciseHistoryPoint[] => {
  return dedupeHistory(exercise.history || [], options.startDate, options.endDate);
};

export const hasExecutedHistory = (
  exercise: Exercise,
  minExecutedSets = 1,
  options: Pick<AnalysisExecutionOptions, 'startDate' | 'endDate'> = {},
): boolean =>
  historyForAnalysis(exercise, options).reduce((sum, point) => sum + effectiveSets(exercise, point), 0) >= Math.max(1, minExecutedSets);

const completedLoggedSetEntries = (exercise: Exercise): LoggedSet[] =>
  (exercise.loggedSets || []).filter((set) => set.completed);

const completedLoggedSets = (exercise: Exercise): number => completedLoggedSetEntries(exercise).length;

export const includeExerciseInAnalysis = (
  day: TrainingDay,
  exercise: Exercise,
  options: AnalysisExecutionOptions,
): boolean => {
  if (!options.onlyCompleted) return true;
  const hasHistory = hasExecutedHistory(exercise, options.minExecutedSets, options);
  if (day.completed) return !options.requireHistoryForCompleted || hasHistory;

  // A history point can also be created while editing a planned exercise.
  // It is not execution evidence unless at least the requested number of
  // individual sets was explicitly marked as completed.
  return options.includePartialHistory && completedLoggedSets(exercise) >= Math.max(1, options.minExecutedSets);
};

export const dedupeHistory = (
  history: ExerciseHistoryPoint[] = [],
  startDate?: string,
  endDate?: string,
): ExerciseHistoryPoint[] => {
  const byDate = new Map<string, ExerciseHistoryPoint>();
  history.forEach((point) => {
    if (!isValidDateKey(point.date)) return;
    if ((!startDate || point.date >= startDate) && (!endDate || point.date <= endDate)) byDate.set(point.date, point);
  });
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
};

const shiftDate = (value: string | undefined, days: number): string | undefined => {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** Restrict history to one calendar week while preserving user-selected bounds. */
export const analysisOptionsForWeek = (
  week: TrainingWeek,
  options: AnalysisExecutionOptions,
  nextWeekStartDate?: string,
): AnalysisExecutionOptions => {
  const startDate = week.startDate || options.startDate;
  const inferredEndDate = nextWeekStartDate
    ? shiftDate(nextWeekStartDate, -1)
    : shiftDate(startDate, 6);
  const endDate = options.endDate && inferredEndDate
    ? options.endDate < inferredEndDate ? options.endDate : inferredEndDate
    : options.endDate || inferredEndDate;
  return { ...options, startDate, endDate };
};

export const executedVolume = (
  day: TrainingDay,
  exercise: Exercise,
  options: AnalysisExecutionOptions,
): number => {
  if (!includeExerciseInAnalysis(day, exercise, options)) return 0;
  const history = historyForAnalysis(exercise, options);
  if (history.length > 0) {
    return history.reduce((sum, point) => sum + calculateVolume(effectiveSets(exercise, point), effectiveReps(exercise, point), point.weight), 0);
  }
  if (!day.completed) {
    return completedLoggedSetEntries(exercise).reduce((sum, set) => sum + calculateVolume(1, nonNegativeCount(set.reps), set.weight), 0);
  }
  return day.completed ? calculateVolume(exercise.sets, exercise.reps, exercise.weight) : 0;
};

export const executedSets = (
  day: TrainingDay,
  exercise: Exercise,
  options: AnalysisExecutionOptions,
): number => {
  if (!includeExerciseInAnalysis(day, exercise, options)) return 0;
  const history = historyForAnalysis(exercise, options);
  if (history.length > 0) return history.reduce((sum, point) => sum + effectiveSets(exercise, point), 0);
  if (!day.completed) return completedLoggedSets(exercise);
  return exercise.sets;
};

export const executedReps = (
  day: TrainingDay,
  exercise: Exercise,
  options: AnalysisExecutionOptions,
): number => {
  if (!includeExerciseInAnalysis(day, exercise, options)) return 0;
  const history = historyForAnalysis(exercise, options);
  if (history.length > 0) return history.reduce((sum, point) => sum + effectiveSets(exercise, point) * effectiveReps(exercise, point), 0);
  if (!day.completed) return completedLoggedSetEntries(exercise).reduce((sum, set) => sum + nonNegativeCount(set.reps), 0);
  return exercise.sets * exercise.reps;
};

export interface AnalysisExecutionSummary {
  plannedDays: number;
  executedDays: number;
  completedDays: number;
  partialDays: number;
  executedExercises: number;
  executedSets: number;
  executedReps: number;
  missingHistoryDays: number;
  executedWeekNumbers: number[];
}

/**
 * One canonical execution summary for every analysis surface.  It deliberately
 * uses the same inclusion and date rules as volume, sets and 1RM calculations.
 */
export const summarizeExecution = (
  weeks: TrainingWeek[],
  options: AnalysisExecutionOptions,
): AnalysisExecutionSummary => {
  const summary: AnalysisExecutionSummary = {
    plannedDays: 0,
    executedDays: 0,
    completedDays: 0,
    partialDays: 0,
    executedExercises: 0,
    executedSets: 0,
    executedReps: 0,
    missingHistoryDays: 0,
    executedWeekNumbers: [],
  };
  const weekNumbers = new Set<number>();

  weeks.forEach((week, weekIndex) => {
    const weekOptions = analysisOptionsForWeek(week, options, weeks[weekIndex + 1]?.startDate);
    summary.plannedDays += week.days.length;
    week.days.forEach((day) => {
      const includedExercises = day.exercises.filter((exercise) =>
        includeExerciseInAnalysis(day, exercise, weekOptions) && executedSets(day, exercise, weekOptions) > 0,
      );
      const daySets = includedExercises.reduce((sum, exercise) => sum + executedSets(day, exercise, weekOptions), 0);
      const dayReps = includedExercises.reduce((sum, exercise) => sum + executedReps(day, exercise, weekOptions), 0);
      const isPartial = !day.completed && daySets > 0;

      if (day.completed) summary.completedDays += 1;
      if (isPartial) summary.partialDays += 1;
      if (day.completed || isPartial) {
        summary.executedDays += 1;
        weekNumbers.add(week.number);
      }
      summary.executedExercises += includedExercises.length;
      summary.executedSets += daySets;
      summary.executedReps += dayReps;

      const hasHistory = day.exercises.some((exercise) => historyForAnalysis(exercise, weekOptions).length > 0);
      if (day.completed && day.exercises.length > 0 && !hasHistory) summary.missingHistoryDays += 1;
    });
  });

  summary.executedWeekNumbers = Array.from(weekNumbers).sort((a, b) => a - b);
  return summary;
};

export interface WeekExerciseAnalysis {
  name: string;
  category?: string;
  volume: number;
  sets: number;
  reps: number;
}

/** Aggregate executed work per exercise for one selectable comparison week. */
export const summarizeWeekExercises = (
  week: TrainingWeek,
  options: AnalysisExecutionOptions,
): WeekExerciseAnalysis[] => {
  const weekOptions = analysisOptionsForWeek(week, options);
  const byExercise = new Map<string, WeekExerciseAnalysis>();
  week.days.forEach((day) => {
    day.exercises.forEach((exercise) => {
      if (!includeExerciseInAnalysis(day, exercise, weekOptions)) return;
      const sets = executedSets(day, exercise, weekOptions);
      const reps = executedReps(day, exercise, weekOptions);
      const volume = executedVolume(day, exercise, weekOptions);
      if (sets <= 0 && reps <= 0 && volume <= 0) return;
      const key = exercise.name.trim().toLowerCase();
      const prior = byExercise.get(key);
      byExercise.set(key, {
        name: prior?.name || exercise.name.trim(),
        category: prior?.category || exercise.category,
        volume: (prior?.volume || 0) + volume,
        sets: (prior?.sets || 0) + sets,
        reps: (prior?.reps || 0) + reps,
      });
    });
  });
  return Array.from(byExercise.values()).sort((a, b) => b.volume - a.volume || a.name.localeCompare(b.name));
};

export interface AnalysisWeekMetrics {
  weekNumber: number;
  plannedDays: number;
  executedDays: number;
  executedExercises: number;
  executedSets: number;
  executedReps: number;
  volume: number;
  adherencePct: number;
  dataConfidencePct: number;
}

/** Return the strongest recorded point using estimated 1RM, with weight as a tie-breaker. */
export const bestHistoryPoint = (history: ExerciseHistoryPoint[] = []): ExerciseHistoryPoint | undefined =>
  history.reduce<ExerciseHistoryPoint | undefined>((best, point) => {
    if (!best) return point;
    const pointScore = calculate1RM(point.weight, point.reps);
    const bestScore = calculate1RM(best.weight, best.reps);
    return pointScore > bestScore || (pointScore === bestScore && point.weight > best.weight) ? point : best;
  }, undefined);

/** Return the chronologically latest point, independent of input ordering. */
export const latestHistoryPoint = (history: ExerciseHistoryPoint[] = []): ExerciseHistoryPoint | undefined =>
  [...history].sort((a, b) => a.date.localeCompare(b.date)).at(-1);

/** Simple least-squares slope of a numeric series; positive means improving. */
export const trendSlope = (values: number[]): number => {
  if (values.length < 2) return 0;
  const meanX = (values.length - 1) / 2;
  const meanY = values.reduce((sum, value) => sum + value, 0) / values.length;
  const numerator = values.reduce((sum, value, index) => sum + (index - meanX) * (value - meanY), 0);
  const denominator = values.reduce((sum, _value, index) => sum + (index - meanX) ** 2, 0);
  return denominator === 0 ? 0 : numerator / denominator;
};

/** Percentage change from a previous value, safely handling a zero baseline. */
export const volumeDeltaPercent = (current: number, previous: number): number =>
  previous === 0 ? (current === 0 ? 0 : 100) : Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;

export const regularityPercent = (executedDays: number, plannedDays: number): number =>
  plannedDays > 0 ? Math.round((Math.max(0, executedDays) / plannedDays) * 1000) / 10 : 0;

export type PersonalRecordMetric = 'weight' | 'e1RM' | 'volume';

export const historyMetricValue = (point: ExerciseHistoryPoint, metric: PersonalRecordMetric): number => {
  if (metric === 'weight') return point.weight;
  if (metric === 'e1RM') return calculate1RM(point.weight, point.reps);
  return calculateVolume(point.sets, point.reps, point.weight);
};

export type ProgressionStatus = 'insufficient' | 'progressing' | 'regressing' | 'stable';
export const progressionStatus = (history: ExerciseHistoryPoint[], metric: PersonalRecordMetric = 'weight'): ProgressionStatus => {
  if (history.length < 2) return 'insufficient';
  const first = historyMetricValue(history[0], metric);
  const last = historyMetricValue(history[history.length - 1], metric);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return 'insufficient';
  return last > first ? 'progressing' : last < first ? 'regressing' : 'stable';
};

/** Return points that establish a new all-time personal record in the series. */
export const personalRecordIndices = (
  history: ExerciseHistoryPoint[] = [],
  metric: PersonalRecordMetric = 'e1RM',
): number[] => {
  let best = Number.NEGATIVE_INFINITY;
  return history.reduce<number[]>((indices, point, index) => {
    const value = historyMetricValue(point, metric);
    if (value > best) {
      best = value;
      indices.push(index);
    }
    return indices;
  }, []);
};

export type StagnationState = 'insufficient' | 'progressing' | 'stagnating';

/** Detect a flat/non-positive trend only when enough recent sessions exist. */
export const detectStagnation = (
  history: ExerciseHistoryPoint[] = [],
  metric: PersonalRecordMetric = 'e1RM',
  window = 4,
  minSessions = 3,
): StagnationState => {
  const recent = history.slice(-Math.max(1, window));
  if (recent.length < Math.max(2, minSessions)) return 'insufficient';
  return trendSlope(recent.map((point) => historyMetricValue(point, metric))) > 0 ? 'progressing' : 'stagnating';
};

export const summarizeWeekExecution = (
  week: TrainingWeek,
  options: AnalysisExecutionOptions,
  nextWeekStartDate?: string,
): AnalysisWeekMetrics => {
  const weekOptions = analysisOptionsForWeek(week, options, nextWeekStartDate);
  const executed = week.days.map((day) => {
    const exercises = day.exercises.filter((exercise) => includeExerciseInAnalysis(day, exercise, weekOptions) && executedSets(day, exercise, weekOptions) > 0);
    return {
      exercises,
      sets: exercises.reduce((sum, exercise) => sum + executedSets(day, exercise, weekOptions), 0),
      reps: exercises.reduce((sum, exercise) => sum + executedReps(day, exercise, weekOptions), 0),
      volume: exercises.reduce((sum, exercise) => sum + executedVolume(day, exercise, weekOptions), 0),
    };
  });
  const executedDays = executed.filter((day) => day.sets > 0).length;
  const executedExercises = executed.reduce((sum, day) => sum + day.exercises.length, 0);
  const executedSetsCount = executed.reduce((sum, day) => sum + day.sets, 0);
  const executedRepsCount = executed.reduce((sum, day) => sum + day.reps, 0);
  const volume = executed.reduce((sum, day) => sum + day.volume, 0);
  return {
    weekNumber: week.number,
    plannedDays: week.days.length,
    executedDays,
    executedExercises,
    executedSets: executedSetsCount,
    executedReps: executedRepsCount,
    volume,
    adherencePct: regularityPercent(executedDays, week.days.length),
    // Execution is confidence evidence even for body-weight/zero-load work;
    // volume is deliberately not used as a proxy for whether a session happened.
    dataConfidencePct: executedDays > 0 ? 100 : 0,
  };
};

export const summarizeWeeklyExecution = (
  weeks: TrainingWeek[],
  options: AnalysisExecutionOptions,
): AnalysisWeekMetrics[] => weeks.map((week, index) => summarizeWeekExecution(week, options, weeks[index + 1]?.startDate));

export interface VolumeJumpAlert { weekNumber: number; previousVolume: number; volume: number; deltaPct: number; }
export const detectVolumeJumps = (metrics: AnalysisWeekMetrics[], thresholdPct = 20): VolumeJumpAlert[] => {
  const threshold = Math.max(0, thresholdPct);
  return metrics.slice(1).flatMap((current, index) => {
    const previous = metrics[index];
    if (!previous || previous.volume <= 0) return [];
    const deltaPct = ((current.volume - previous.volume) / previous.volume) * 100;
    return deltaPct >= threshold ? [{ weekNumber: current.weekNumber, previousVolume: previous.volume, volume: current.volume, deltaPct }] : [];
  });
};

export interface MuscleFrequencyMetric {
  category: string;
  activeWeeks: number;
  sessions: number;
  executedSets: number;
}

/** Count executed sessions and sets per muscle group, without planned-day inflation. */
export const summarizeMuscleFrequency = (
  weeks: TrainingWeek[],
  options: AnalysisExecutionOptions,
  resolveCategory: (exercise: Exercise) => string | undefined,
): MuscleFrequencyMetric[] => {
  const byCategory = new Map<string, MuscleFrequencyMetric>();
  weeks.forEach((week, index) => {
    const weekOptions = analysisOptionsForWeek(week, options, weeks[index + 1]?.startDate);
    const touchedThisWeek = new Set<string>();
    week.days.forEach((day) => {
      const setsByCategory = new Map<string, number>();
      day.exercises.forEach((exercise) => {
        if (!includeExerciseInAnalysis(day, exercise, weekOptions)) return;
        const sets = executedSets(day, exercise, weekOptions);
        if (sets <= 0) return;
        const category = resolveCategory(exercise);
        if (!category) return;
        setsByCategory.set(category, (setsByCategory.get(category) || 0) + sets);
      });
      setsByCategory.forEach((sets, category) => {
        const current = byCategory.get(category) || { category, activeWeeks: 0, sessions: 0, executedSets: 0 };
        current.sessions += 1;
        current.executedSets += sets;
        touchedThisWeek.add(category);
        byCategory.set(category, current);
      });
    });
    touchedThisWeek.forEach((category) => {
      const current = byCategory.get(category);
      if (current) current.activeWeeks += 1;
    });
  });
  return Array.from(byCategory.values()).sort((a, b) => b.executedSets - a.executedSets || a.category.localeCompare(b.category));
};

export interface MonthlyExecutionMetric {
  month: string;
  sessions: number;
  executedSets: number;
  executedReps: number;
  volume: number;
}

/** Aggregate executed history by calendar month; no history means no fabricated month. */
export const summarizeMonthlyExecution = (
  weeks: TrainingWeek[],
  options: AnalysisExecutionOptions,
): MonthlyExecutionMetric[] => {
  const byMonth = new Map<string, MonthlyExecutionMetric & { dates: Set<string> }>();
  weeks.forEach((week, index) => {
    const weekOptions = analysisOptionsForWeek(week, options, weeks[index + 1]?.startDate);
    week.days.forEach((day) => {
      day.exercises.forEach((exercise) => {
        if (!includeExerciseInAnalysis(day, exercise, weekOptions)) return;
        const history = historyForAnalysis(exercise, weekOptions);
        const points = history.length > 0 ? history : day.completed && week.startDate ? [{ date: week.startDate, weight: exercise.weight, reps: exercise.reps, sets: exercise.sets }] : [];
        points.forEach((point) => {
          const month = point.date.slice(0, 7);
          if (!/^\d{4}-\d{2}$/.test(month)) return;
          const current = byMonth.get(month) || { month, sessions: 0, executedSets: 0, executedReps: 0, volume: 0, dates: new Set<string>() };
          current.dates.add(point.date);
          current.executedSets += effectiveSets(exercise, point);
          current.executedReps += effectiveSets(exercise, point) * effectiveReps(exercise, point);
          current.volume += calculateVolume(effectiveSets(exercise, point), effectiveReps(exercise, point), point.weight);
          byMonth.set(month, current);
        });
      });
    });
  });
  return Array.from(byMonth.values()).map(({ dates, ...metric }) => ({ ...metric, sessions: dates.size })).sort((a, b) => a.month.localeCompare(b.month));
};

export const scopeAnalysisWeeks = (weeks: TrainingWeek[], startWeek = 1, endWeek = Number.MAX_SAFE_INTEGER): TrainingWeek[] =>
  weeks.filter((week) => (week.number || 0) >= startWeek && (week.number || 0) <= endWeek);

/** Trailing average over available executed metrics; returns null until a full window exists. */
export const rollingAverage = (values: number[], window = 4): (number | null)[] => {
  if (!Number.isInteger(window) || window < 1) return values.map(() => null);
  return values.map((_, index) => index + 1 < window ? null : values.slice(index - window + 1, index + 1).reduce((a, b) => a + b, 0) / window);
};

/** Executed tonnage efficiency, guarded against zero completed sets. */
export const volumePerSet = (volume: number, executedSets: number): number | null =>
  executedSets > 0 && Number.isFinite(volume) ? volume / executedSets : null;
