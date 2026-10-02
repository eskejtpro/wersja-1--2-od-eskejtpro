export const WORKOUT_SESSION_KEYS = {
  start: 'planpasika_session_start_v1',
  active: 'planpasika_session_active_v1',
  paused: 'planpasika_session_paused_v1',
  pausedAt: 'planpasika_session_paused_at_v1',
  accumulatedPaused: 'planpasika_session_accumulated_paused_v1',
} as const;

export interface WorkoutSessionStorage {
  getItem(key: string): string | null;
}

export interface WorkoutSessionSnapshot {
  startTime: number;
  hasActiveSession: boolean;
  isSessionActive: boolean;
  pausedAt: number | null;
  accumulatedPausedMs: number;
}

function positiveTimestamp(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function readWorkoutSession(storage: WorkoutSessionStorage): WorkoutSessionSnapshot {
  const startTime = positiveTimestamp(storage.getItem(WORKOUT_SESSION_KEYS.start));
  const explicitActive = storage.getItem(WORKOUT_SESSION_KEYS.active);
  const legacyPaused = storage.getItem(WORKOUT_SESSION_KEYS.paused);
  const pausedAt = positiveTimestamp(storage.getItem(WORKOUT_SESSION_KEYS.pausedAt));
  const accumulatedValue = Number(storage.getItem(WORKOUT_SESSION_KEYS.accumulatedPaused) || 0);
  const accumulatedPausedMs = Number.isFinite(accumulatedValue) && accumulatedValue >= 0 ? accumulatedValue : 0;

  // Before the explicit active key existed, only a saved pause/resume action is evidence
  // that the user had started a session. A timestamp alone was created on every app launch.
  const hasLegacySession = startTime !== null && legacyPaused === 'true' && pausedAt !== null;
  const hasActiveSession = startTime !== null && (explicitActive === 'true' || (explicitActive === null && hasLegacySession));
  const isSessionActive = hasActiveSession && legacyPaused !== 'true';

  return {
    startTime: hasActiveSession ? startTime as number : 0,
    hasActiveSession,
    isSessionActive,
    pausedAt: hasActiveSession && legacyPaused === 'true' ? pausedAt : null,
    accumulatedPausedMs,
  };
}

export function shouldHoldWorkoutWakeLock(
  enabled: boolean,
  activeView: string,
  hasActiveSession: boolean,
  isSessionRunning: boolean,
  pageVisible: boolean,
  apiSupported: boolean
): boolean {
  return enabled && activeView === 'plan' && hasActiveSession && isSessionRunning && pageVisible && apiSupported;
}
