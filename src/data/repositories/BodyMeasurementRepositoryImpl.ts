import { IBodyMeasurementRepository } from '../../domain/repositories';
import { BodyWeightEntry, CircumferenceEntry, BodyPartMeasurement } from '../../types';
import { appDatabase } from '../db/AppDatabase';

export class BodyMeasurementRepositoryImpl implements IBodyMeasurementRepository {
  constructor() {
    appDatabase.initialize();
  }

  async getBodyWeights(limit?: number): Promise<BodyWeightEntry[]> {
    const list = appDatabase.getBodyWeights().sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return limit ? list.slice(0, limit) : list;
  }

  async addBodyWeight(entry: Omit<BodyWeightEntry, 'id'>): Promise<BodyWeightEntry> {
    const fullEntry: BodyWeightEntry = {
      ...entry,
      id: `bw-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    appDatabase.addBodyWeight(fullEntry);
    return fullEntry;
  }

  async deleteBodyWeight(id: string): Promise<void> {
    appDatabase.deleteBodyWeight(id);
  }

  async getCircumferences(): Promise<CircumferenceEntry[]> {
    return appDatabase.getCircumferences().sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async addCircumference(entry: Omit<CircumferenceEntry, 'id'>): Promise<CircumferenceEntry> {
    const fullEntry: CircumferenceEntry = {
      ...entry,
      id: `circ-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    appDatabase.addCircumference(fullEntry);
    return fullEntry;
  }

  async deleteCircumference(id: string): Promise<void> {
    appDatabase.deleteCircumference(id);
  }

  async getBodyPartMeasurements(): Promise<BodyPartMeasurement[]> {
    return appDatabase.getBodyPartMeasurements().sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async addBodyPartMeasurement(entry: Omit<BodyPartMeasurement, 'id'>): Promise<BodyPartMeasurement> {
    const fullEntry: BodyPartMeasurement = {
      ...entry,
      id: `bpm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    appDatabase.addBodyPartMeasurement(fullEntry);
    return fullEntry;
  }

  async deleteBodyPartMeasurement(id: string): Promise<void> {
    appDatabase.deleteBodyPartMeasurement(id);
  }
}

export const bodyMeasurementRepository = new BodyMeasurementRepositoryImpl();
