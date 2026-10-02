import { ActiveSessionDraft, ActiveExerciseDraft } from '../types';
import { workoutRepository } from '../data/repositories/WorkoutRepositoryImpl';

export const activeSessionService = {
  async getActiveDraft(): Promise<ActiveSessionDraft | null> {
    return workoutRepository.getActiveSessionDraft();
  },

  async saveDraft(
    weekId: string,
    dayId: string,
    dayName: string,
    exercises: ActiveExerciseDraft[],
    elapsedSeconds = 0,
    planId = 'plan-main-1'
  ): Promise<ActiveSessionDraft> {
    const existing = await workoutRepository.getActiveSessionDraft();
    const sessionId = existing?.sessionId || `session-${Date.now()}`;
    const startedAt = existing?.startedAt || new Date().toISOString();

    const draft: ActiveSessionDraft = {
      sessionId,
      planId,
      weekId,
      dayId,
      dayName,
      startedAt,
      lastSavedAt: new Date().toISOString(),
      elapsedSeconds,
      isPaused: false,
      activeExercises: exercises
    };

    await workoutRepository.saveActiveSessionDraft(draft);
    return draft;
  },

  async clearDraft(): Promise<void> {
    await workoutRepository.clearActiveSessionDraft();
  },

  async hasUnfinishedSession(): Promise<boolean> {
    const draft = await workoutRepository.getActiveSessionDraft();
    if (!draft) return false;
    // Sprawdzamy czy ma chociaż jedno ćwiczenie i czy nie minęło więcej niż 24h
    const ageHours = (Date.now() - new Date(draft.lastSavedAt).getTime()) / (1000 * 60 * 60);
    return draft.activeExercises.length > 0 && ageHours < 24;
  }
};
