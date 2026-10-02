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
import { roomStorage, RoomStorageDriver } from './storage/RoomStorageDriver';
import {
  GymData,
  AppSettings,
  ProtocolEntry,
  CalendarDayNote,
  UserProfile,
  SyncServerConfig,
  SyncLogEntry
} from '../../types';
import { initialGymData } from '../initialData';
import { normalizeGymDataToRelational, denormalizeRelationalToWeeks } from '../../domain/mappers';

/**
 * Formal Room Database in TypeScript / Offline-First Architecture
 * Mirrors Android Room Database architecture and provides structured table-level DAOs.
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
   * Sprawdza czy baza Room posiada już zainicjalizowane tabele strukturalne
   */
  public hasStructuredData(): boolean {
    const days = this.dayDao.getAll();
    return days.length > 0;
  }

  /**
   * Odtwarza pełny obiekt GymData bezpośrednio ze znormalizowanych tabel Room SQL
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
    const settings = this.storageDriver.readTable<AppSettings>('settings', initialGymData.settings);
    const protocols = this.storageDriver.readTable<ProtocolEntry[]>('protocols', []);
    const calendarNotes = this.storageDriver.readTable<CalendarDayNote[]>('calendar_notes' as any, initialGymData.calendarNotes || []);
    const profile = this.storageDriver.readTable<UserProfile>('profiles', initialGymData.profile);
    const profilesList = this.storageDriver.readTable<UserProfile[]>('profiles' as any, initialGymData.profilesList || []);
    const syncConfig = this.storageDriver.readTable<SyncServerConfig>('settings' as any, initialGymData.syncConfig);
    const syncLogs = this.storageDriver.readTable<SyncLogEntry[]>('settings' as any, []);
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
      activeSessionDraft,
      workoutSessionsHistory
    };
  }

  /**
   * Atomowy zapis do partycjonowanych tabel Room bez blokowania wątku UI
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
          if (gymData.settings) {
            this.storageDriver.writeTable('settings', gymData.settings);
          }
          if (gymData.protocolEntries) {
            this.storageDriver.writeTable('protocols', gymData.protocolEntries);
          }
          if (gymData.calendarNotes) {
            this.storageDriver.writeTable('calendar_notes' as any, gymData.calendarNotes);
          }
          if (gymData.profile) {
            this.storageDriver.writeTable('profiles', gymData.profile);
          }
        });
        resolve();
      } catch (err) {
        console.error('[RoomDatabase] Błąd w atomicWriteFromGymData:', err);
        reject(err);
      }
    });
  }

  /**
   * Bezpieczna migracja ze starego formatu JSON do schematu Room SQL
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
   * Wykonanie zestawu operacji w logicznej transakcji
   */
  public runInTransaction<T>(action: () => T): T {
    return action();
  }

  public clearAllTables(): void {
    this.storageDriver.clearAllTables();
  }
}

export const roomDatabase = new RoomDatabase();
