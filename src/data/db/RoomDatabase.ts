import {
  PlanDao,
  WeekDao,
  DayDao,
  ExerciseDao,
  LoggedSetDao,
  BodyWeightDao,
  CircumferenceDao,
  BodyPartMeasurementDao,
  CatalogDao,
  SessionDao,
  ActiveSessionDao
} from './daos/index';
import { roomStorage, RoomStorageDriver, ROOM_TABLE_PREFIX, RoomTableName } from './storage/RoomStorageDriver';
import {
  GymData,
  AppSettings,
  ProtocolEntry,
  CalendarDayNote,
  UserProfile,
  SyncServerConfig,
  SyncLogEntry,
  AiChatMessage,
  AiAgentMemory
} from '../../types';
import { initialGymData } from '../initialData';
import { normalizeGymDataToRelational, denormalizeRelationalToWeeks } from '../../domain/mappers';

/**
 * TypeScript local-data adapter exposing structured JSON partitions and DAO-shaped APIs.
 * This is not Android Room/SQLite; the Kotlin Room sources are not wired into the Capacitor app module.
 */
export class RoomDatabase {
  public static readonly VERSION = 3;
  public static readonly DATABASE_NAME = 'planpasika_room.db';
  public static readonly PRE_MIGRATION_BACKUP_KEY = 'planpasika_pre_room_sql_backup';
  public static readonly MIGRATION_FLAG_KEY = 'planpasika_room_migrated_v3';

  public readonly planDao: PlanDao;
  public readonly weekDao: WeekDao;
  public readonly dayDao: DayDao;
  public readonly exerciseDao: ExerciseDao;
  public readonly loggedSetDao: LoggedSetDao;
  public readonly bodyWeightDao: BodyWeightDao;
  public readonly circumferenceDao: CircumferenceDao;
  public readonly bodyPartMeasurementDao: BodyPartMeasurementDao;
  public readonly catalogDao: CatalogDao;
  public readonly sessionDao: SessionDao;
  public readonly activeDraftDao: ActiveSessionDao;
  public readonly storageDriver: RoomStorageDriver;

  private isInitialized = false;

  constructor(driver: RoomStorageDriver = roomStorage) {
    this.storageDriver = driver;
    this.planDao = new PlanDao();
    this.weekDao = new WeekDao();
    this.dayDao = new DayDao();
    this.exerciseDao = new ExerciseDao();
    this.loggedSetDao = new LoggedSetDao();
    this.bodyWeightDao = new BodyWeightDao();
    this.circumferenceDao = new CircumferenceDao();
    this.bodyPartMeasurementDao = new BodyPartMeasurementDao();
    this.catalogDao = new CatalogDao();
    this.sessionDao = new SessionDao();
    this.activeDraftDao = new ActiveSessionDao();
  }

  public initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  /**
   * Sprawdza, czy lokalne partycje JSON są już zainicjalizowane
   */
  public hasStructuredData(): boolean {
    const days = this.dayDao.getAll();
    return days.length > 0;
  }

  /**
   * Odtwarza obiekt GymData z logicznych partycji JSON
   */
  public loadGymData(): GymData | null {
    const days = this.dayDao.getAll();
    if (days.length === 0) return null;

    const relational = {
      plans: this.planDao.getAll(),
      weeks: this.weekDao.getAll(),
      days: days,
      exercises: this.exerciseDao.getAll(),
      loggedSets: this.loggedSetDao.getAll()
    };

    const weeks = denormalizeRelationalToWeeks(relational);
    const legacy = this.readLegacyFullJson();
    const settings = this.readTableWithLegacy('settings', initialGymData.settings, legacy?.settings, this.isObject);
    const protocols = this.readTableWithLegacy('protocols', [], legacy?.protocolEntries, this.isArray);
    const calendarNotes = this.readTableWithLegacy('calendar_notes', initialGymData.calendarNotes || [], legacy?.calendarNotes, this.isArray);
    const profile = this.readTableWithLegacy('profiles', initialGymData.profile, legacy?.profile, this.isObject);
    const profilesList = this.readTableWithLegacy('profiles_list', initialGymData.profilesList || [], legacy?.profilesList, this.isArray);
    const syncConfig = this.readTableWithLegacy('sync_config', initialGymData.syncConfig, legacy?.syncConfig, this.isObject);
    const syncLogs = this.readTableWithLegacy('sync_logs', [], legacy?.syncLogs, this.isArray);
    const bloodTests = this.readTableWithLegacy('blood_tests', [], legacy?.bloodTests, this.isArray);
    const aiChatHistory = this.readTableWithLegacy('ai_chat_history', [], legacy?.aiChatHistory, this.isArray);
    const aiAgentMemories = this.readTableWithLegacy('ai_agent_memories', [], legacy?.aiAgentMemories, this.isArray);
    const bodyWeights = this.bodyWeightDao.getAll();
    const circumferences = this.circumferenceDao.getAll();
    const bodyPartMeasurements = this.bodyPartMeasurementDao.getAll();
    const catalogExercises = this.catalogDao.getAll();
    const workoutSessionsHistory = this.sessionDao.getAll();
    const activeSessionDraft = this.activeDraftDao.getDraft();

    return {
      settings,
      weeks,
      bodyWeights,
      circumferences,
      bodyPartMeasurements,
      catalogExercises,
      protocolEntries: protocols,
      calendarNotes,
      profile,
      profilesList,
      syncConfig,
      syncLogs,
      bloodTests,
      aiChatHistory,
      aiAgentMemories,
      activeSessionDraft,
      workoutSessionsHistory
    };
  }

  /**
   * Zapisuje partycje JSON; brak transakcji ACID i rollbacku między kluczami
   */
  public async atomicWriteFromGymData(gymData: GymData): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.runInTransaction(() => {
          const schema = normalizeGymDataToRelational(gymData);

          // 1. Zapis tabel treningowych
          this.planDao.setAll(schema.plans);
          this.weekDao.setAll(schema.weeks);
          this.dayDao.setAll(schema.days);
          this.exerciseDao.setAll(schema.exercises);
          this.loggedSetDao.setAll(schema.loggedSets);

          // 2. Zapis tabel pomiarów i katalogu
          this.bodyWeightDao.setAll(Array.isArray(gymData.bodyWeights) ? gymData.bodyWeights : []);
          this.circumferenceDao.setAll(Array.isArray(gymData.circumferences) ? gymData.circumferences : []);
          this.bodyPartMeasurementDao.setAll(Array.isArray(gymData.bodyPartMeasurements) ? gymData.bodyPartMeasurements : []);
          this.catalogDao.setAll(Array.isArray(gymData.catalogExercises) ? gymData.catalogExercises : []);

          // 3. Zapis historii sesji i szkicu
          this.sessionDao.setAll(Array.isArray(gymData.workoutSessionsHistory) ? gymData.workoutSessionsHistory : []);
          if (gymData.activeSessionDraft) {
            this.activeDraftDao.saveDraft(gymData.activeSessionDraft);
          } else {
            this.activeDraftDao.clearDraft();
          }

          // 4. Zapis tabel konfiguracji i profili
          this.storageDriver.writeTable('settings', gymData.settings || initialGymData.settings);
          this.storageDriver.writeTable('protocols', Array.isArray(gymData.protocolEntries) ? gymData.protocolEntries : []);
          this.storageDriver.writeTable('calendar_notes', Array.isArray(gymData.calendarNotes) ? gymData.calendarNotes : []);
          this.storageDriver.writeTable('profiles', gymData.profile || initialGymData.profile);
          this.storageDriver.writeTable('profiles_list', Array.isArray(gymData.profilesList) ? gymData.profilesList : []);
          this.storageDriver.writeTable('sync_config', gymData.syncConfig || initialGymData.syncConfig);
          this.storageDriver.writeTable('sync_logs', Array.isArray(gymData.syncLogs) ? gymData.syncLogs : []);
          this.storageDriver.writeTable('blood_tests', Array.isArray(gymData.bloodTests) ? gymData.bloodTests : []);
          this.storageDriver.writeTable('ai_chat_history', Array.isArray(gymData.aiChatHistory) ? gymData.aiChatHistory : []);
          this.storageDriver.writeTable('ai_agent_memories', Array.isArray(gymData.aiAgentMemories) ? gymData.aiAgentMemories : []);
        });
        resolve();
      } catch (err) {
        console.error('[RoomDatabase] Błąd w atomicWriteFromGymData:', err);
        reject(err);
      }
    });
  }

  /**
   * Verifies the durable raw JSON partitions, never treating the driver's cache as proof.
   * Every key is written by atomicWriteFromGymData, including an explicit `null` draft.
   */
  public verifyPersistedTables(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      throw new Error('Brak trwałego localStorage do weryfikacji tabel Room.');
    }

    const tables: RoomTableName[] = [
      'workout_plans', 'training_weeks', 'training_days', 'exercises', 'logged_sets',
      'body_weights', 'circumferences', 'body_part_measurements', 'catalog_exercises',
      'workout_sessions', 'active_session_draft', 'settings', 'protocols', 'calendar_notes',
      'profiles', 'profiles_list', 'sync_config', 'sync_logs', 'blood_tests',
      'ai_chat_history', 'ai_agent_memories'
    ];

    for (const table of tables) {
      const key = `${ROOM_TABLE_PREFIX}${table}`;
      const raw = window.localStorage.getItem(key);
      if (raw === null) throw new Error(`Brak trwałej tabeli Room: ${table}.`);

      const cachedRead = this.storageDriver.readTable<unknown>(table, undefined);
      let expected: string | undefined;
      try {
        expected = JSON.stringify(cachedRead);
      } catch {
        throw new Error(`Nie można zserializować oczekiwanej tabeli Room: ${table}.`);
      }
      if (expected === undefined || raw !== expected) {
        throw new Error(`Rozbieżność trwałej tabeli Room: ${table}.`);
      }
    }
  }

  private readLegacyFullJson(): Partial<GymData> | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const raw = window.localStorage.getItem('gymtracker_windows_data_v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      return this.isObject(parsed) ? parsed as Partial<GymData> : null;
    } catch {
      return null;
    }
  }

  private readTableWithLegacy<T>(table: Parameters<RoomStorageDriver['readTable']>[0], fallback: T, legacy: unknown, valid: (value: unknown) => boolean): T {
    const value = this.storageDriver.readTable<unknown>(table, undefined);
    if (this.storageDriver.hasTable(table)) return valid(value) ? value as T : fallback;
    return valid(legacy) ? legacy as T : fallback;
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private isArray<T>(value: unknown): value is T[] {
    return Array.isArray(value);
  }

  /**
   * Zapisuje kopię wejściowego JSON przed zapisaniem partycji lokalnych
   */
  public async migrateFromJson(legacyData: GymData): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Snapshot bezpieczeństwa przed migracją
        window.localStorage.setItem(RoomDatabase.PRE_MIGRATION_BACKUP_KEY, JSON.stringify(legacyData));
      }
    } catch (err) {
      console.warn('[RoomDatabase] Nie udało się zapisać pre-migration snapshotu:', err);
    }

    await this.atomicWriteFromGymData(legacyData);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(RoomDatabase.MIGRATION_FLAG_KEY, new Date().toISOString());
      }
    } catch {}
  }

  /**
   * Zgodnościowy wrapper; nie zapewnia izolacji ani rollbacku.
   */
  public runInTransaction<T>(action: () => T): T {
    return action();
  }

  public clearAllTables(): void {
    this.storageDriver.clearAllTables();
  }
}

export const roomDatabase = new RoomDatabase();
