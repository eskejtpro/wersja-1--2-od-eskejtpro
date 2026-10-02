import { IWorkoutRepository } from '../../domain/repositories';
import {
  WorkoutPlanEntity,
  TrainingWeekEntity,
  TrainingDayEntity,
  ExerciseEntity,
  LoggedSetEntity,
  ActiveSessionDraft,
  WorkoutSessionRecord
} from '../../types';
import { appDatabase } from '../db/AppDatabase';

export class WorkoutRepositoryImpl implements IWorkoutRepository {
  constructor() {
    appDatabase.initialize();
  }

  async getActivePlan(): Promise<WorkoutPlanEntity | null> {
    return appDatabase.getActivePlan();
  }

  async getAllPlans(): Promise<WorkoutPlanEntity[]> {
    return appDatabase.getAllPlans();
  }

  async savePlan(plan: WorkoutPlanEntity): Promise<void> {
    const raw = appDatabase.getRawState();
    raw.plans[plan.id] = plan;
    appDatabase.persist();
  }

  async getWeeksForPlan(planId: string): Promise<TrainingWeekEntity[]> {
    return appDatabase.getWeeksForPlan(planId);
  }

  async getDaysForWeek(weekId: string): Promise<TrainingDayEntity[]> {
    return appDatabase.getDaysForWeek(weekId);
  }

  async getDayWithExercises(dayId: string): Promise<{
    day: TrainingDayEntity;
    exercises: (ExerciseEntity & { loggedSets: LoggedSetEntity[] })[];
  } | null> {
    const raw = appDatabase.getRawState();
    const day = raw.days[dayId];
    if (!day) return null;

    const exercises = appDatabase.getExercisesForDay(dayId).map(ex => ({
      ...ex,
      loggedSets: appDatabase.getLoggedSetsForExercise(ex.id)
    }));

    return { day, exercises };
  }

  async toggleDayCompletion(dayId: string, completed: boolean): Promise<void> {
    appDatabase.setDayCompleted(dayId, completed);
  }

  async updateDayNotes(dayId: string, notes: string): Promise<void> {
    const raw = appDatabase.getRawState();
    if (raw.days[dayId]) {
      raw.days[dayId].notes = notes;
      appDatabase.persist();
    }
  }

  async updateExerciseWeight(exerciseId: string, newWeight: number): Promise<void> {
    appDatabase.updateExerciseWeight(exerciseId, newWeight);
  }

  async saveLoggedSet(exerciseId: string, set: Omit<LoggedSetEntity, 'id'>): Promise<LoggedSetEntity> {
    const fullSet: LoggedSetEntity = {
      ...set,
      id: `${exerciseId}-set-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      exerciseId
    };
    appDatabase.saveLoggedSet(fullSet);
    return fullSet;
  }

  async deleteLoggedSet(setId: string): Promise<void> {
    appDatabase.deleteLoggedSet(setId);
  }

  async getActiveSessionDraft(): Promise<ActiveSessionDraft | null> {
    return appDatabase.getActiveSessionDraft();
  }

  async saveActiveSessionDraft(draft: ActiveSessionDraft): Promise<void> {
    appDatabase.saveActiveSessionDraft(draft);
  }

  async clearActiveSessionDraft(): Promise<void> {
    appDatabase.clearActiveSessionDraft();
  }

  async finishWorkoutSession(session: WorkoutSessionRecord): Promise<void> {
    const raw = appDatabase.getRawState();
    raw.workoutSessionsHistory.unshift(session);
    raw.activeSessionDraft = null;
    appDatabase.persist();
  }

  async getWorkoutSessionHistory(limit = 50): Promise<WorkoutSessionRecord[]> {
    const raw = appDatabase.getRawState();
    return raw.workoutSessionsHistory.slice(0, limit);
  }
}

export const workoutRepository = new WorkoutRepositoryImpl();
