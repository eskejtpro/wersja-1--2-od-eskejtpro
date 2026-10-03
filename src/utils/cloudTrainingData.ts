import type { GymData } from '../types';

// Only portable user data is sent. Device settings, credentials and live drafts stay local.
const listFields = [
  'weeks', 'bodyWeights', 'circumferences', 'bodyPartMeasurements', 'calendarNotes',
  'catalogExercises', 'workoutSessionsHistory',
] as const;

function withoutCredentials(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutCredentials);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([key]) =>
      !/token|api.?key|secret|password|credential|authorization|googleUser|googleAccount|syncConfig|syncLogs/i.test(key)
      && !['__proto__', 'constructor', 'prototype'].includes(key)
    ).map(([key, child]) => [key, withoutCredentials(child)]));
  }
  return value;
}

export function cloudTrainingSnapshot(data: GymData): GymData {
  const snapshot: Record<string, unknown> = { settings: {} };
  for (const key of listFields) snapshot[key] = withoutCredentials(data[key] || []);
  return JSON.parse(JSON.stringify(snapshot)) as GymData;
}

export function trainingFingerprint(data: GymData): string {
  return JSON.stringify(cloudTrainingSnapshot(data));
}

export function restoreCloudTraining(local: GymData, remote: GymData): GymData {
  const portable = cloudTrainingSnapshot(remote);
  return { ...local, ...portable, settings: local.settings,
    syncConfig: local.syncConfig, syncLogs: local.syncLogs, activeSessionDraft: local.activeSessionDraft };
}

export function trainingCounts(data: GymData | null) {
  const weeks = data?.weeks || [];
  return {
    weeks: weeks.length,
    exercises: weeks.reduce((count, week) => count + (week.days || []).reduce((n, day) => n + (day.exercises || []).length, 0), 0),
    sessions: data?.workoutSessionsHistory?.length || 0,
    measurements: (data?.bodyWeights?.length || 0) + (data?.circumferences?.length || 0) + (data?.bodyPartMeasurements?.length || 0),
  };
}
