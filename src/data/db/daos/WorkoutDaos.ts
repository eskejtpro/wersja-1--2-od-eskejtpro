import { roomStorage } from '../storage/RoomStorageDriver';
import {
  WorkoutPlanEntity,
  TrainingWeekEntity,
  TrainingDayEntity,
  ExerciseEntity,
  LoggedSetEntity
} from '../entities';

export class PlanDao {
  public getAll(): WorkoutPlanEntity[] {
    const record = roomStorage.readTable<Record<string, WorkoutPlanEntity>>('workout_plans', {});
    return Object.values(record);
  }

  public getById(id: string): WorkoutPlanEntity | null {
    const record = roomStorage.readTable<Record<string, WorkoutPlanEntity>>('workout_plans', {});
    return record[id] || null;
  }

  public getActive(): WorkoutPlanEntity | null {
    const all = this.getAll();
    return all.find((p) => p.isActive) || all[0] || null;
  }

  public insertOrUpdate(plan: WorkoutPlanEntity): void {
    const record = roomStorage.readTable<Record<string, WorkoutPlanEntity>>('workout_plans', {});
    record[plan.id] = plan;
    roomStorage.writeTable('workout_plans', record);
  }

  public setAll(plans: WorkoutPlanEntity[]): void {
    const record: Record<string, WorkoutPlanEntity> = {};
    plans.forEach((p) => { record[p.id] = p; });
    roomStorage.writeTable('workout_plans', record);
  }
}

export class WeekDao {
  public getForPlan(planId: string): TrainingWeekEntity[] {
    const record = roomStorage.readTable<Record<string, TrainingWeekEntity>>('training_weeks', {});
    return Object.values(record)
      .filter((w) => w.planId === planId)
      .sort((a, b) => a.number - b.number);
  }

  public getAll(): TrainingWeekEntity[] {
    const record = roomStorage.readTable<Record<string, TrainingWeekEntity>>('training_weeks', {});
    return Object.values(record).sort((a, b) => a.number - b.number);
  }

  public getById(id: string): TrainingWeekEntity | null {
    const record = roomStorage.readTable<Record<string, TrainingWeekEntity>>('training_weeks', {});
    return record[id] || null;
  }

  public insertOrUpdate(week: TrainingWeekEntity): void {
    const record = roomStorage.readTable<Record<string, TrainingWeekEntity>>('training_weeks', {});
    record[week.id] = week;
    roomStorage.writeTable('training_weeks', record);
  }

  public setAll(weeks: TrainingWeekEntity[]): void {
    const record: Record<string, TrainingWeekEntity> = {};
    weeks.forEach((w) => { record[w.id] = w; });
    roomStorage.writeTable('training_weeks', record);
  }
}

export class DayDao {
  public getForWeek(weekId: string): TrainingDayEntity[] {
    const record = roomStorage.readTable<Record<string, TrainingDayEntity>>('training_days', {});
    return Object.values(record)
      .filter((d) => d.weekId === weekId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getAll(): TrainingDayEntity[] {
    const record = roomStorage.readTable<Record<string, TrainingDayEntity>>('training_days', {});
    return Object.values(record).sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getById(id: string): TrainingDayEntity | null {
    const record = roomStorage.readTable<Record<string, TrainingDayEntity>>('training_days', {});
    return record[id] || null;
  }

  public setCompleted(dayId: string, completed: boolean): void {
    const record = roomStorage.readTable<Record<string, TrainingDayEntity>>('training_days', {});
    if (record[dayId]) {
      record[dayId] = { ...record[dayId], completed };
      roomStorage.writeTable('training_days', record);
    }
  }

  public updateNotes(dayId: string, notes: string): void {
    const record = roomStorage.readTable<Record<string, TrainingDayEntity>>('training_days', {});
    if (record[dayId]) {
      record[dayId] = { ...record[dayId], notes };
      roomStorage.writeTable('training_days', record);
    }
  }

  public insertOrUpdate(day: TrainingDayEntity): void {
    const record = roomStorage.readTable<Record<string, TrainingDayEntity>>('training_days', {});
    record[day.id] = day;
    roomStorage.writeTable('training_days', record);
  }

  public setAll(days: TrainingDayEntity[]): void {
    const record: Record<string, TrainingDayEntity> = {};
    days.forEach((d) => { record[d.id] = d; });
    roomStorage.writeTable('training_days', record);
  }
}

export class ExerciseDao {
  public getForDay(dayId: string): ExerciseEntity[] {
    const record = roomStorage.readTable<Record<string, ExerciseEntity>>('exercises', {});
    return Object.values(record)
      .filter((e) => e.dayId === dayId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getAll(): ExerciseEntity[] {
    const record = roomStorage.readTable<Record<string, ExerciseEntity>>('exercises', {});
    return Object.values(record).sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getById(id: string): ExerciseEntity | null {
    const record = roomStorage.readTable<Record<string, ExerciseEntity>>('exercises', {});
    return record[id] || null;
  }

  public updateWeight(exerciseId: string, weight: number): void {
    const record = roomStorage.readTable<Record<string, ExerciseEntity>>('exercises', {});
    if (record[exerciseId]) {
      record[exerciseId] = { ...record[exerciseId], weight };
      roomStorage.writeTable('exercises', record);
    }
  }

  public insertOrUpdate(exercise: ExerciseEntity): void {
    const record = roomStorage.readTable<Record<string, ExerciseEntity>>('exercises', {});
    record[exercise.id] = exercise;
    roomStorage.writeTable('exercises', record);
  }

  public setAll(exercises: ExerciseEntity[]): void {
    const record: Record<string, ExerciseEntity> = {};
    exercises.forEach((e) => { record[e.id] = e; });
    roomStorage.writeTable('exercises', record);
  }

  public delete(id: string): void {
    const record = roomStorage.readTable<Record<string, ExerciseEntity>>('exercises', {});
    delete record[id];
    roomStorage.writeTable('exercises', record);
  }
}

export class LoggedSetDao {
  public getForExercise(exerciseId: string): LoggedSetEntity[] {
    const record = roomStorage.readTable<Record<string, LoggedSetEntity>>('logged_sets', {});
    return Object.values(record)
      .filter((s) => s.exerciseId === exerciseId)
      .sort((a, b) => a.setNumber - b.setNumber);
  }

  public getAll(): LoggedSetEntity[] {
    const record = roomStorage.readTable<Record<string, LoggedSetEntity>>('logged_sets', {});
    return Object.values(record).sort((a, b) => a.setNumber - b.setNumber);
  }

  public insertOrUpdate(set: LoggedSetEntity): void {
    const record = roomStorage.readTable<Record<string, LoggedSetEntity>>('logged_sets', {});
    record[set.id] = set;
    roomStorage.writeTable('logged_sets', record);
  }

  public setAll(sets: LoggedSetEntity[]): void {
    const record: Record<string, LoggedSetEntity> = {};
    sets.forEach((s) => { record[s.id] = s; });
    roomStorage.writeTable('logged_sets', record);
  }

  public delete(id: string): void {
    const record = roomStorage.readTable<Record<string, LoggedSetEntity>>('logged_sets', {});
    delete record[id];
    roomStorage.writeTable('logged_sets', record);
  }
}
