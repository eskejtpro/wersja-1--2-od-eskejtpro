import type { GymData } from '../types';

type UnknownRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isString = (value: unknown): value is string => typeof value === 'string';

function isLoggedSet(value: unknown): boolean {
  return isRecord(value) && isFiniteNumber(value.setNumber) && isFiniteNumber(value.weight) && isFiniteNumber(value.reps) && typeof value.completed === 'boolean';
}

function isHistoryPoint(value: unknown): boolean {
  return isRecord(value) && isString(value.date) && isFiniteNumber(value.weight) && isFiniteNumber(value.reps) &&
    isFiniteNumber(value.sets) && (!('rpe' in value) || value.rpe === undefined || isFiniteNumber(value.rpe)) &&
    (!('loggedSets' in value) || (Array.isArray(value.loggedSets) && value.loggedSets.every(isLoggedSet)));
}

function isExercise(value: unknown): boolean {
  return isRecord(value) && isString(value.id) && isString(value.name) && isFiniteNumber(value.sets) &&
    isFiniteNumber(value.reps) && isFiniteNumber(value.weight) && isFiniteNumber(value.rpe) && isString(value.notes) &&
    Array.isArray(value.history) && value.history.every(isHistoryPoint) &&
    (!('goalWeight' in value) || value.goalWeight === undefined || isFiniteNumber(value.goalWeight)) &&
    (!('loggedSets' in value) || (Array.isArray(value.loggedSets) && value.loggedSets.every(isLoggedSet)));
}

function isWeek(value: unknown): boolean {
  return isRecord(value) && isString(value.id) && isString(value.name) && isFiniteNumber(value.number) &&
    Array.isArray(value.days) && value.days.every((day) => isRecord(day) && isString(day.id) && isString(day.name) &&
      typeof day.completed === 'boolean' && Array.isArray(day.exercises) && day.exercises.every(isExercise));
}

/** Validates the durable workout core while allowing optional fields from older exports. */
export function isGymData(value: unknown): value is GymData {
  return isRecord(value) && isRecord(value.settings) && (value.settings.unit === 'kg' || value.settings.unit === 'lbs') &&
    (value.settings.theme === 'dark' || value.settings.theme === 'light') && typeof value.settings.autoSave === 'boolean' &&
    Array.isArray(value.weeks) && value.weeks.every(isWeek) && Array.isArray(value.bodyWeights) &&
    value.bodyWeights.every((entry) => isRecord(entry) && isString(entry.id) && isString(entry.date) && isFiniteNumber(entry.weight) && isString(entry.notes)) &&
    (!('circumferences' in value) || (Array.isArray(value.circumferences) && value.circumferences.every((entry) => isRecord(entry) &&
      isString(entry.id) && isString(entry.date) && isFiniteNumber(entry.millimeters) && Number.isInteger(entry.millimeters) && entry.millimeters > 0 && isString(entry.notes)))) &&
    (!('bodyPartMeasurements' in value) || (Array.isArray(value.bodyPartMeasurements) && value.bodyPartMeasurements.every((entry) => isRecord(entry) &&
      isString(entry.id) && isString(entry.date) && isFiniteNumber(entry.value))));
}
