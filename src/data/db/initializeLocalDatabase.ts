import type { GymData } from '../../types';
import type { RoomDatabase } from './RoomDatabase';

export type LocalDatabaseInitializationResult = {
  data: GymData;
  source: 'structured-data' | 'existing-data';
};

/**
 * Opens the structured local tables, preserving the already-selected persisted
 * app state as the recovery source when those tables are missing or incomplete.
 */
export async function initializeLocalDatabaseFlow(
  database: RoomDatabase,
  fallbackData: GymData
): Promise<LocalDatabaseInitializationResult> {
  await database.initialize();

  if (database.hasStructuredData()) {
    const structuredData = database.loadGymData();
    if (structuredData?.weeks?.length) {
      return { data: structuredData, source: 'structured-data' };
    }
  }

  await database.migrateFromJson(fallbackData);
  const recoveredData = database.loadGymData();

  return {
    data: recoveredData?.weeks?.length ? recoveredData : fallbackData,
    source: 'existing-data'
  };
}
