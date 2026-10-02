import { Preferences } from '@capacitor/preferences';

/**
 * Structured key-level storage for WebView localStorage and web.
 * Values are JSON partitions, not SQLite tables. Android Preferences receives
 * an asynchronous best-effort mirror; localStorage remains the synchronous source.
 */

export const ROOM_TABLE_PREFIX = 'room_tbl_';

export type RoomTableName =
  | 'workout_plans'
  | 'training_weeks'
  | 'training_days'
  | 'exercises'
  | 'logged_sets'
  | 'body_weights'
  | 'circumferences'
  | 'body_part_measurements'
  | 'catalog_exercises'
  | 'workout_sessions'
  | 'active_session_draft'
  | 'settings'
  | 'protocols'
  | 'profiles';

export class RoomStorageDriver {
  private inMemoryCache: Map<string, unknown> = new Map();
  private isLoaded = false;

  private getTableKey(table: RoomTableName): string {
    return `${ROOM_TABLE_PREFIX}${table}`;
  }

  /**
   * Odczyt partycji JSON z localStorage
   */
  public readTable<T>(table: RoomTableName, defaultValue: T): T {
    const key = this.getTableKey(table);

    if (this.inMemoryCache.has(key)) {
      return this.inMemoryCache.get(key) as T;
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(key);
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          this.inMemoryCache.set(key, parsed);
          return parsed as T;
        }
      }
    } catch (e) {
      console.warn(`[RoomStorageDriver] Błąd odczytu tabeli ${table}:`, e);
    }

    this.inMemoryCache.set(key, defaultValue);
    return defaultValue;
  }

  /**
   * Zapis pojedynczej partycji JSON i best-effort kopii Preferences na Androidzie
   */
  public writeTable<T>(table: RoomTableName, data: T): void {
    const key = this.getTableKey(table);
    if (typeof window !== 'undefined' && window.localStorage) {
      const serialized = JSON.stringify(data);
      // Fail before updating the cache so callers cannot mistake volatile data for a durable save.
      window.localStorage.setItem(key, serialized);
      this.inMemoryCache.set(key, data);

      // Android Preferences is an asynchronous mirror only, not the authoritative store.
      try {
        void Preferences.set({ key, value: serialized }).catch((error) => {
          console.warn(`[RoomStorageDriver] Błąd kopii Preferences dla ${table}:`, error);
        });
      } catch (error) {
        console.warn(`[RoomStorageDriver] Błąd kopii Preferences dla ${table}:`, error);
      }
      return;
    }

    this.inMemoryCache.set(key, data);
  }

  /**
   * Sprawdza czy tabele Room zostały już zainicjalizowane na urządzeniu
   */
  public hasInitializedTables(): boolean {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(this.getTableKey('training_days')) !== null;
      }
    } catch {
      return false;
    }
    return false;
  }

  /**
   * Wyczyszczenie wszystkich tabel (np. przy twardym resecie bazy)
   */
  public clearAllTables(): void {
    this.inMemoryCache.clear();
    const tables: RoomTableName[] = [
      'workout_plans',
      'training_weeks',
      'training_days',
      'exercises',
      'logged_sets',
      'body_weights',
      'circumferences',
      'body_part_measurements',
      'catalog_exercises',
      'workout_sessions',
      'active_session_draft',
      'settings',
      'protocols',
      'profiles'
    ];

    tables.forEach((t) => {
      const key = this.getTableKey(t);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          Preferences.remove({ key }).catch(() => {});
        }
      } catch {}
    });
  }
}

export const roomStorage = new RoomStorageDriver();
