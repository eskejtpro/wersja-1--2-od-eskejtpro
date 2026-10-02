import { roomStorage } from '../storage/RoomStorageDriver';
import {
  BodyWeightEntity,
  CircumferenceEntity,
  BodyPartMeasurementEntity,
  CatalogExerciseEntity,
  WorkoutSessionEntity
} from '../entities';
import { ActiveSessionDraft } from '../../../types';

export class BodyWeightDao {
  public getAll(): BodyWeightEntity[] {
    return roomStorage.readTable<BodyWeightEntity[]>('body_weights', []);
  }

  public setAll(weights: BodyWeightEntity[]): void {
    roomStorage.writeTable('body_weights', weights);
  }

  public insert(entry: BodyWeightEntity): void {
    const list = this.getAll();
    const filtered = list.filter((w) => w.id !== entry.id);
    filtered.push(entry);
    roomStorage.writeTable('body_weights', filtered);
  }

  public delete(id: string): void {
    const list = this.getAll().filter((w) => w.id !== id);
    roomStorage.writeTable('body_weights', list);
  }
}

export class CircumferenceDao {
  public getAll(): CircumferenceEntity[] {
    return roomStorage.readTable<CircumferenceEntity[]>('circumferences', []);
  }

  public setAll(entries: CircumferenceEntity[]): void {
    roomStorage.writeTable('circumferences', entries);
  }

  public insert(entry: CircumferenceEntity): void {
    const list = this.getAll();
    const filtered = list.filter((c) => c.id !== entry.id);
    filtered.push(entry);
    roomStorage.writeTable('circumferences', filtered);
  }

  public delete(id: string): void {
    const list = this.getAll().filter((c) => c.id !== id);
    roomStorage.writeTable('circumferences', list);
  }
}

export class BodyPartMeasurementDao {
  public getAll(): BodyPartMeasurementEntity[] {
    return roomStorage.readTable<BodyPartMeasurementEntity[]>('body_part_measurements', []);
  }

  public setAll(entries: BodyPartMeasurementEntity[]): void {
    roomStorage.writeTable('body_part_measurements', entries);
  }

  public insert(entry: BodyPartMeasurementEntity): void {
    const list = this.getAll();
    const filtered = list.filter((m) => m.id !== entry.id);
    filtered.push(entry);
    roomStorage.writeTable('body_part_measurements', filtered);
  }
}

export class CatalogDao {
  public getAll(): CatalogExerciseEntity[] {
    return roomStorage.readTable<CatalogExerciseEntity[]>('catalog_exercises', []);
  }

  public setAll(exercises: CatalogExerciseEntity[]): void {
    roomStorage.writeTable('catalog_exercises', exercises);
  }

  public insertOrUpdate(exercise: CatalogExerciseEntity): void {
    const list = this.getAll();
    const idx = list.findIndex((e) => e.id === exercise.id);
    if (idx >= 0) {
      list[idx] = exercise;
    } else {
      list.push(exercise);
    }
    roomStorage.writeTable('catalog_exercises', list);
  }

  public delete(id: string): void {
    const list = this.getAll().filter((e) => e.id !== id);
    roomStorage.writeTable('catalog_exercises', list);
  }
}

export class SessionDao {
  public getAll(): WorkoutSessionEntity[] {
    return roomStorage.readTable<WorkoutSessionEntity[]>('workout_sessions', []);
  }

  public setAll(sessions: WorkoutSessionEntity[]): void {
    roomStorage.writeTable('workout_sessions', sessions);
  }

  public insert(session: WorkoutSessionEntity): void {
    const list = this.getAll();
    list.unshift(session);
    roomStorage.writeTable('workout_sessions', list);
  }
}

export class ActiveSessionDao {
  public getDraft(): ActiveSessionDraft | null {
    return roomStorage.readTable<ActiveSessionDraft | null>('active_session_draft', null);
  }

  public saveDraft(draft: ActiveSessionDraft): void {
    roomStorage.writeTable('active_session_draft', {
      ...draft,
      lastSavedAt: new Date().toISOString()
    });
  }

  public clearDraft(): void {
    roomStorage.writeTable('active_session_draft', null);
  }
}
