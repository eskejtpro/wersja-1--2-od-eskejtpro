import { ISettingsAndBackupRepository } from '../../domain/repositories';
import { AppSettings, GymData } from '../../types';
import { appDatabase } from '../db/AppDatabase';

export class SettingsAndBackupRepositoryImpl implements ISettingsAndBackupRepository {
  constructor() {
    appDatabase.initialize();
  }

  async getSettings(): Promise<AppSettings> {
    return appDatabase.getSettings();
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    appDatabase.updateSettings(settings);
    return appDatabase.getSettings();
  }

  async createFullExport(): Promise<GymData> {
    return appDatabase.toGymData();
  }

  async restoreFullImport(data: GymData): Promise<boolean> {
    if (!data || !Array.isArray(data.weeks)) {
      throw new Error('Nieprawidłowa struktura danych importu: brak sekcji tygodni.');
    }
    appDatabase.migrateFromLegacy(data);
    return true;
  }
}

export const settingsAndBackupRepository = new SettingsAndBackupRepositoryImpl();
