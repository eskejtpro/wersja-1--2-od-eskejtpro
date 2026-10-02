import {
  WorkoutPlanEntity,
  TrainingWeekEntity,
  TrainingDayEntity,
  ExerciseEntity,
  LoggedSetEntity,
  ActiveSessionDraft,
  WorkoutSessionRecord,
  BodyWeightEntry,
  CircumferenceEntry,
  BodyPartMeasurement,
  CatalogExercise,
  AppSettings,
  GymData
} from '../types';

/**
 * Kontrakt repozytorium treningowego - abstrakcja dla Room/SQLite i offline-first cache
 */
export interface IWorkoutRepository {
  // Plany
  getActivePlan(): Promise<WorkoutPlanEntity | null>;
  getAllPlans(): Promise<WorkoutPlanEntity[]>;
  savePlan(plan: WorkoutPlanEntity): Promise<void>;
  
  // Tygodnie i Dni
  getWeeksForPlan(planId: string): Promise<TrainingWeekEntity[]>;
  getDaysForWeek(weekId: string): Promise<TrainingDayEntity[]>;
  getDayWithExercises(dayId: string): Promise<{
    day: TrainingDayEntity;
    exercises: (ExerciseEntity & { loggedSets: LoggedSetEntity[] })[];
  } | null>;
  
  // Status Dnia
  toggleDayCompletion(dayId: string, completed: boolean): Promise<void>;
  updateDayNotes(dayId: string, notes: string): Promise<void>;

  // Ćwiczenia i Serie
  updateExerciseWeight(exerciseId: string, newWeight: number): Promise<void>;
  saveLoggedSet(exerciseId: string, set: Omit<LoggedSetEntity, 'id'>): Promise<LoggedSetEntity>;
  deleteLoggedSet(setId: string): Promise<void>;

  // Aktywna Sesja (Crash Proof Draft)
  getActiveSessionDraft(): Promise<ActiveSessionDraft | null>;
  saveActiveSessionDraft(draft: ActiveSessionDraft): Promise<void>;
  clearActiveSessionDraft(): Promise<void>;

  // Archiwum Ukończonych Treningów
  finishWorkoutSession(session: WorkoutSessionRecord): Promise<void>;
  getWorkoutSessionHistory(limit?: number): Promise<WorkoutSessionRecord[]>;
}

/**
 * Kontrakt repozytorium bazy ćwiczeń i rekordów osobistych (PR)
 */
export interface IExerciseRepository {
  getCatalogExercises(filterCategory?: string, searchQuery?: string): Promise<CatalogExercise[]>;
  getCatalogExerciseById(id: string): Promise<CatalogExercise | null>;
  saveCustomExercise(exercise: CatalogExercise): Promise<void>;
  deleteCustomExercise(id: string): Promise<void>;
  getExerciseHistory(exerciseName: string): Promise<{
    date: string;
    weight: number;
    reps: number;
    sets: number;
    e1RM: number;
  }[]>;
  getPersonalRecord(exerciseName: string): Promise<{
    maxWeight: number;
    maxE1RM: number;
    maxVolume: number;
    date: string;
  } | null>;
}

/**
 * Kontrakt repozytorium pomiarów ciała i obwodów
 */
export interface IBodyMeasurementRepository {
  // Waga
  getBodyWeights(limit?: number): Promise<BodyWeightEntry[]>;
  addBodyWeight(entry: Omit<BodyWeightEntry, 'id'>): Promise<BodyWeightEntry>;
  deleteBodyWeight(id: string): Promise<void>;

  // Obwody
  getCircumferences(): Promise<CircumferenceEntry[]>;
  addCircumference(entry: Omit<CircumferenceEntry, 'id'>): Promise<CircumferenceEntry>;
  deleteCircumference(id: string): Promise<void>;

  // Partie ciała (cm)
  getBodyPartMeasurements(): Promise<BodyPartMeasurement[]>;
  addBodyPartMeasurement(entry: Omit<BodyPartMeasurement, 'id'>): Promise<BodyPartMeasurement>;
  deleteBodyPartMeasurement(id: string): Promise<void>;
}

/**
 * Kontrakt repozytorium preferencji i kopii zapasowych
 */
export interface ISettingsAndBackupRepository {
  getSettings(): Promise<AppSettings>;
  updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
  createFullExport(): Promise<GymData>;
  restoreFullImport(data: GymData): Promise<boolean>;
}
