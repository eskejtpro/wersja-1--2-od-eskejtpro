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
  GymData,
  ProtocolEntry,
  CalendarDayNote,
  UserProfile,
  SyncServerConfig,
  SyncLogEntry
} from '../../types';
import { initialGymData } from '../initialData';
import { DEFAULT_CATALOG_EXERCISES } from '../defaultCatalogExercises';
import { normalizeGymDataToRelational, denormalizeRelationalToWeeks } from '../../domain/mappers';
import { roomDatabase } from './RoomDatabase';

export interface DatabaseState {
  version: number;
  migratedAt: string;
  plans: Record<string, WorkoutPlanEntity>;
  weeks: Record<string, TrainingWeekEntity>;
  days: Record<string, TrainingDayEntity>;
  exercises: Record<string, ExerciseEntity>;
  loggedSets: Record<string, LoggedSetEntity>;
  activeSessionDraft: ActiveSessionDraft | null;
  workoutSessionsHistory: WorkoutSessionRecord[];
  bodyWeights: BodyWeightEntry[];
  circumferences: CircumferenceEntry[];
  bodyPartMeasurements: BodyPartMeasurement[];
  catalogExercises: CatalogExercise[];
  protocols: ProtocolEntry[];
  calendarNotes: CalendarDayNote[];
  profile?: UserProfile;
  profilesList: UserProfile[];
  syncConfig?: SyncServerConfig;
  syncLogs: SyncLogEntry[];
  settings: AppSettings;
}

const DB_STORAGE_KEY = 'planpasika_db_v3';
const MIGRATION_BACKUP_KEY = 'planpasika_v3_pre_migration_backup';
const LEGACY_STORAGE_KEY = 'gymtracker_windows_data_v1';

class AppDatabase {
  private state: DatabaseState;
  private isInitialized = false;

  constructor() {
    this.state = this.getInitialEmptyState();
  }

  private getInitialEmptyState(): DatabaseState {
    return {
      version: 3,
      migratedAt: new Date().toISOString(),
      plans: {},
      weeks: {},
      days: {},
      exercises: {},
      loggedSets: {},
      activeSessionDraft: null,
      workoutSessionsHistory: [],
      bodyWeights: [],
      circumferences: [],
      bodyPartMeasurements: [],
      catalogExercises: DEFAULT_CATALOG_EXERCISES,
      protocols: initialGymData.protocolEntries || [],
      calendarNotes: initialGymData.calendarNotes || [],
      profile: initialGymData.profile,
      profilesList: initialGymData.profilesList || [],
      syncConfig: initialGymData.syncConfig,
      syncLogs: initialGymData.syncLogs || [],
      settings: initialGymData.settings
    };
  }

  public initialize(): void {
    if (this.isInitialized) return;

    try {
      const stored = localStorage.getItem(DB_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DatabaseState;
        if (parsed && parsed.version === 3) {
          this.state = parsed;
          this.isInitialized = true;
          return;
        }
      }
    } catch (err) {
      console.warn('Błąd odczytu bazy v3 z pamięci lokalnej:', err);
    }

    // Jeśli brak bazy v3, uruchom automatyczną bezstratną migrację z v2
    this.migrateFromLegacy();
    this.isInitialized = true;
  }

  /**
   * Bezstratny proces migracji z monolitycznego JSON do znormalizowanej bazy relacyjnej v3
   */
  public migrateFromLegacy(overrideData?: GymData): void {
    let sourceData: GymData = initialGymData;

    if (overrideData) {
      sourceData = overrideData;
    } else {
      try {
        const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyStored) {
          const parsed = JSON.parse(legacyStored) as GymData;
          if (parsed && Array.isArray(parsed.weeks)) {
            sourceData = parsed;
            // Zabezpieczenie: zachowanie nienaruszonej kopii w osobnym kluczu
            localStorage.setItem(MIGRATION_BACKUP_KEY, legacyStored);
          }
        }
      } catch (err) {
        console.error('Błąd odczytu danych legacy podczas migracji:', err);
      }
    }

    const relational = normalizeGymDataToRelational(sourceData);

    const plansRecord: Record<string, WorkoutPlanEntity> = {};
    relational.plans.forEach(p => { plansRecord[p.id] = p; });

    const weeksRecord: Record<string, TrainingWeekEntity> = {};
    relational.weeks.forEach(w => { weeksRecord[w.id] = w; });

    const daysRecord: Record<string, TrainingDayEntity> = {};
    relational.days.forEach(d => { daysRecord[d.id] = d; });

    const exercisesRecord: Record<string, ExerciseEntity> = {};
    relational.exercises.forEach(e => { exercisesRecord[e.id] = e; });

    const loggedSetsRecord: Record<string, LoggedSetEntity> = {};
    relational.loggedSets.forEach(ls => { loggedSetsRecord[ls.id] = ls; });

    this.state = {
      version: 3,
      migratedAt: new Date().toISOString(),
      plans: plansRecord,
      weeks: weeksRecord,
      days: daysRecord,
      exercises: exercisesRecord,
      loggedSets: loggedSetsRecord,
      activeSessionDraft: sourceData.activeSessionDraft || null,
      workoutSessionsHistory: sourceData.workoutSessionsHistory || [],
      bodyWeights: Array.isArray(sourceData.bodyWeights) ? sourceData.bodyWeights : [],
      circumferences: Array.isArray(sourceData.circumferences) ? sourceData.circumferences : [],
      bodyPartMeasurements: Array.isArray(sourceData.bodyPartMeasurements) ? sourceData.bodyPartMeasurements : [],
      catalogExercises: Array.isArray(sourceData.catalogExercises) && sourceData.catalogExercises.length > 0
        ? sourceData.catalogExercises
        : DEFAULT_CATALOG_EXERCISES,
      protocols: Array.isArray(sourceData.protocolEntries) ? sourceData.protocolEntries : (initialGymData.protocolEntries || []),
      calendarNotes: Array.isArray(sourceData.calendarNotes) ? sourceData.calendarNotes : (initialGymData.calendarNotes || []),
      profile: sourceData.profile || initialGymData.profile,
      profilesList: Array.isArray(sourceData.profilesList) && sourceData.profilesList.length > 0
        ? sourceData.profilesList
        : (initialGymData.profilesList || []),
      syncConfig: sourceData.syncConfig || initialGymData.syncConfig,
      syncLogs: Array.isArray(sourceData.syncLogs) ? sourceData.syncLogs : (initialGymData.syncLogs || []),
      settings: {
        ...initialGymData.settings,
        ...(sourceData.settings || {})
      }
    };

    this.persist();
  }

  public persist(): void {
    try {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(this.state));
    } catch (err) {
      console.error('Błąd zapisu bazy v3 do pamięci trwałej:', err);
    }

    try {
      // Synchronizacja strukturalna Room (Structured Table Partitioning)
      roomDatabase.planDao.setAll(Object.values(this.state.plans));
      roomDatabase.weekDao.setAll(Object.values(this.state.weeks));
      roomDatabase.dayDao.setAll(Object.values(this.state.days));
      roomDatabase.exerciseDao.setAll(Object.values(this.state.exercises));
      roomDatabase.loggedSetDao.setAll(Object.values(this.state.loggedSets));
      roomDatabase.bodyWeightDao.setAll(this.state.bodyWeights);
      roomDatabase.circumferenceDao.setAll(this.state.circumferences);
      roomDatabase.bodyPartMeasurementDao.setAll(this.state.bodyPartMeasurements);
      roomDatabase.catalogDao.setAll(this.state.catalogExercises);
      roomDatabase.sessionDao.setAll(this.state.workoutSessionsHistory);
      if (this.state.activeSessionDraft) {
        roomDatabase.activeDraftDao.saveDraft(this.state.activeSessionDraft);
      } else {
        roomDatabase.activeDraftDao.clearDraft();
      }
    } catch {
      // Ignoruj błędy poza środowiskiem przeglądarki/WebView
    }
  }

  // ==========================================
  // METODY PLANY I STRUKTURA TRENINGOWA
  // ==========================================

  public getActivePlan(): WorkoutPlanEntity | null {
    const plans = Object.values(this.state.plans);
    return plans.find(p => p.isActive) || plans[0] || null;
  }

  public getAllPlans(): WorkoutPlanEntity[] {
    return Object.values(this.state.plans);
  }

  public getWeeksForPlan(planId: string): TrainingWeekEntity[] {
    return Object.values(this.state.weeks)
      .filter(w => w.planId === planId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getDaysForWeek(weekId: string): TrainingDayEntity[] {
    return Object.values(this.state.days)
      .filter(d => d.weekId === weekId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getExercisesForDay(dayId: string): ExerciseEntity[] {
    return Object.values(this.state.exercises)
      .filter(e => e.dayId === dayId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getLoggedSetsForExercise(exerciseId: string): LoggedSetEntity[] {
    return Object.values(this.state.loggedSets)
      .filter(s => s.exerciseId === exerciseId)
      .sort((a, b) => a.setNumber - b.setNumber);
  }

  public setDayCompleted(dayId: string, completed: boolean): void {
    if (this.state.days[dayId]) {
      this.state.days[dayId] = {
        ...this.state.days[dayId],
        completed
      };
      this.persist();
    }
  }

  public updateExerciseWeight(exerciseId: string, weight: number): void {
    if (this.state.exercises[exerciseId]) {
      this.state.exercises[exerciseId] = {
        ...this.state.exercises[exerciseId],
        weight
      };
      this.persist();
    }
  }

  public saveLoggedSet(set: LoggedSetEntity): void {
    this.state.loggedSets[set.id] = set;
    this.persist();
  }

  public deleteLoggedSet(setId: string): void {
    delete this.state.loggedSets[setId];
    this.persist();
  }

  // ==========================================
  // ACTIVE SESSION DRAFT (CRASH-PROOF RECOVERY)
  // ==========================================

  public getActiveSessionDraft(): ActiveSessionDraft | null {
    return this.state.activeSessionDraft;
  }

  public saveActiveSessionDraft(draft: ActiveSessionDraft): void {
    this.state.activeSessionDraft = {
      ...draft,
      lastSavedAt: new Date().toISOString()
    };
    this.persist();
  }

  public clearActiveSessionDraft(): void {
    this.state.activeSessionDraft = null;
    this.persist();
  }

  // ==========================================
  // POMIARY CIAŁA
  // ==========================================

  public getBodyWeights(): BodyWeightEntry[] {
    return [...this.state.bodyWeights];
  }

  public addBodyWeight(entry: BodyWeightEntry): void {
    this.state.bodyWeights.push(entry);
    this.persist();
  }

  public deleteBodyWeight(id: string): void {
    this.state.bodyWeights = this.state.bodyWeights.filter(b => b.id !== id);
    this.persist();
  }

  public getCircumferences(): CircumferenceEntry[] {
    return [...this.state.circumferences];
  }

  public addCircumference(entry: CircumferenceEntry): void {
    this.state.circumferences.push(entry);
    this.persist();
  }

  public deleteCircumference(id: string): void {
    this.state.circumferences = this.state.circumferences.filter(c => c.id !== id);
    this.persist();
  }

  public getBodyPartMeasurements(): BodyPartMeasurement[] {
    return [...this.state.bodyPartMeasurements];
  }

  public addBodyPartMeasurement(entry: BodyPartMeasurement): void {
    this.state.bodyPartMeasurements.push(entry);
    this.persist();
  }

  public deleteBodyPartMeasurement(id: string): void {
    this.state.bodyPartMeasurements = this.state.bodyPartMeasurements.filter(m => m.id !== id);
    this.persist();
  }

  // ==========================================
  // KATALOG ĆWICZEŃ
  // ==========================================

  public getCatalogExercises(): CatalogExercise[] {
    return [...this.state.catalogExercises];
  }

  public saveCatalogExercise(exercise: CatalogExercise): void {
    const existingIndex = this.state.catalogExercises.findIndex(e => e.id === exercise.id);
    if (existingIndex >= 0) {
      this.state.catalogExercises[existingIndex] = exercise;
    } else {
      this.state.catalogExercises.push(exercise);
    }
    this.persist();
  }

  public deleteCatalogExercise(id: string): void {
    this.state.catalogExercises = this.state.catalogExercises.filter(e => e.id !== id);
    this.persist();
  }

  // ==========================================
  // USTAWIENIA I EKSPORT PEŁNY
  // ==========================================

  public getSettings(): AppSettings {
    return { ...this.state.settings };
  }

  public updateSettings(patch: Partial<AppSettings>): void {
    this.state.settings = {
      ...this.state.settings,
      ...patch
    };
    this.persist();
  }

  /**
   * Zwraca pełny obiekt GymData na potrzeby kompatybilności wstecznej z dotychczasowymi widokami
   */
  public toGymData(): GymData {
    const relational = {
      plans: Object.values(this.state.plans),
      weeks: Object.values(this.state.weeks),
      days: Object.values(this.state.days),
      exercises: Object.values(this.state.exercises),
      loggedSets: Object.values(this.state.loggedSets)
    };

    const weeks = denormalizeRelationalToWeeks(relational);

    return {
      settings: this.state.settings,
      weeks,
      bodyWeights: this.state.bodyWeights,
      circumferences: this.state.circumferences,
      bodyPartMeasurements: this.state.bodyPartMeasurements,
      catalogExercises: this.state.catalogExercises,
      protocolEntries: this.state.protocols,
      calendarNotes: this.state.calendarNotes,
      profile: this.state.profile,
      profilesList: this.state.profilesList,
      syncConfig: this.state.syncConfig,
      syncLogs: this.state.syncLogs,
      activeSessionDraft: this.state.activeSessionDraft,
      workoutSessionsHistory: this.state.workoutSessionsHistory
    };
  }

  public getRawState(): DatabaseState {
    return this.state;
  }
}

export const appDatabase = new AppDatabase();
export { roomDatabase, RoomDatabase } from './RoomDatabase';
