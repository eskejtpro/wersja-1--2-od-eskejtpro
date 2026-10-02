/**
 * Formal Room Database Entities for Android & Offline-First Web
 * Aligned with domain models and Room annotations.
 */

import {
  WorkoutPlanEntity,
  TrainingWeekEntity,
  TrainingDayEntity,
  ExerciseEntity,
  LoggedSetEntity,
  BodyWeightEntry,
  CircumferenceEntry,
  BodyPartMeasurement,
  CatalogExercise,
  WorkoutSessionRecord,
  ActiveSessionDraft
} from '../../../types';

export type {
  WorkoutPlanEntity,
  TrainingWeekEntity,
  TrainingDayEntity,
  ExerciseEntity,
  LoggedSetEntity,
  BodyWeightEntry,
  CircumferenceEntry,
  BodyPartMeasurement,
  CatalogExercise,
  WorkoutSessionRecord,
  ActiveSessionDraft
};

// Aliases for Android Room convention
export type BodyWeightEntity = BodyWeightEntry;
export type CircumferenceEntity = CircumferenceEntry;
export type BodyPartMeasurementEntity = BodyPartMeasurement;
export type CatalogExerciseEntity = CatalogExercise;
export type WorkoutSessionEntity = WorkoutSessionRecord;
