import { useState, useEffect, useRef, useCallback } from 'react';
import { soundService } from './soundService';

const STORAGE_SESSION_START = 'planpasika_session_start_v1';
const STORAGE_SESSION_PAUSED = 'planpasika_session_paused_v1';
const STORAGE_PAUSED_AT = 'planpasika_session_paused_at_v1';
const STORAGE_ACCUMULATED_PAUSED = 'planpasika_session_accumulated_paused_v1';
const STORAGE_REST_TARGET = 'planpasika_rest_target_v1';

export interface WorkoutTimerState {
  elapsedSeconds: number;
  isSessionActive: boolean;
  restTimerSeconds: number | null;
  toggleSessionPause: () => void;
  resetSessionTimer: () => void;
  startRestTimer: (seconds: number) => void;
  adjustRestTimer: (deltaSeconds: number) => void;
  cancelRestTimer: () => void;
}

export function useWorkoutTimer(): WorkoutTimerState {
  // 1. Inicjalizacja czasu startu sesji z pamięci trwałej (odpornej na restart i zmianę okna)
  const [sessionStartTime, setSessionStartTime] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION_START);
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch {}
    const now = Date.now();
    try {
      localStorage.setItem(STORAGE_SESSION_START, String(now));
    } catch {}
    return now;
  });

  const [isSessionActive, setIsSessionActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION_PAUSED);
      if (saved !== null) return saved !== 'true';
    } catch {}
    return true;
  });

  const [pausedAt, setPausedAt] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PAUSED_AT);
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch {}
    return null;
  });

  const [accumulatedPausedMs, setAccumulatedPausedMs] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACCUMULATED_PAUSED);
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val >= 0) return val;
      }
    } catch {}
    return 0;
  });

  // 2. Rest Timer target timestamp (czas na zegarze, w którym kończy się przerwa)
  const [restTargetMs, setRestTargetMs] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_REST_TARGET);
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val > Date.now()) return val;
      }
    } catch {}
    return null;
  });

  // Wartości wyliczane w czasie rzeczywistym
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [restTimerSeconds, setRestTimerSeconds] = useState<number | null>(null);

  const hasNotifiedRestFinishedRef = useRef<boolean>(false);

  // Funkcja przeliczająca dokładny czas zegarowy (wall-clock time)
  const recalculateTimers = useCallback(() => {
    const now = Date.now();

    // Stoper sesji
    if (sessionStartTime > 0) {
      if (!isSessionActive && pausedAt) {
        const elapsed = Math.max(0, Math.floor((pausedAt - sessionStartTime - accumulatedPausedMs) / 1000));
        setElapsedSeconds(elapsed);
      } else {
        const elapsed = Math.max(0, Math.floor((now - sessionStartTime - accumulatedPausedMs) / 1000));
        setElapsedSeconds(elapsed);
      }
    }

    // Odliczanie przerwy
    if (restTargetMs !== null) {
      const remainingMs = restTargetMs - now;
      if (remainingMs > 0) {
        const remainingSecs = Math.ceil(remainingMs / 1000);
        setRestTimerSeconds(remainingSecs);
        hasNotifiedRestFinishedRef.current = false;
      } else {
        // Czas przerwy minął
        setRestTimerSeconds(null);
        setRestTargetMs(null);
        try {
          localStorage.removeItem(STORAGE_REST_TARGET);
        } catch {}

        if (!hasNotifiedRestFinishedRef.current) {
          hasNotifiedRestFinishedRef.current = true;
          soundService.notifyTimerFinished();
        }
      }
    } else {
      setRestTimerSeconds(null);
    }
  }, [sessionStartTime, isSessionActive, pausedAt, accumulatedPausedMs, restTargetMs]);

  // Główny interwał zegara (500ms dla pełnej płynności i braku desynchronizacji)
  useEffect(() => {
    recalculateTimers();
    const interval = setInterval(recalculateTimers, 500);

    return () => clearInterval(interval);
  }, [recalculateTimers]);

  // Natychmiastowe przeliczenie przy powrocie do okna lub odblokowaniu telefonu
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        recalculateTimers();
      }
    };

    const handleFocus = () => {
      recalculateTimers();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [recalculateTimers]);

  // Akcje: Pauza / Wznowienie sesji
  const toggleSessionPause = useCallback(() => {
    const now = Date.now();
    if (isSessionActive) {
      // Wstrzymaj
      setIsSessionActive(false);
      setPausedAt(now);
      try {
        localStorage.setItem(STORAGE_SESSION_PAUSED, 'true');
        localStorage.setItem(STORAGE_PAUSED_AT, String(now));
      } catch {}
    } else {
      // Wznów
      let extraPaused = 0;
      if (pausedAt) {
        extraPaused = Math.max(0, now - pausedAt);
      }
      const newAccumulated = accumulatedPausedMs + extraPaused;
      setAccumulatedPausedMs(newAccumulated);
      setPausedAt(null);
      setIsSessionActive(true);
      try {
        localStorage.setItem(STORAGE_SESSION_PAUSED, 'false');
        localStorage.removeItem(STORAGE_PAUSED_AT);
        localStorage.setItem(STORAGE_ACCUMULATED_PAUSED, String(newAccumulated));
      } catch {}
    }
  }, [isSessionActive, pausedAt, accumulatedPausedMs]);

  // Akcje: Reset stoperu sesji (np. po zakończeniu lub rozpoczęciu nowego treningu)
  const resetSessionTimer = useCallback(() => {
    const now = Date.now();
    setSessionStartTime(now);
    setIsSessionActive(true);
    setPausedAt(null);
    setAccumulatedPausedMs(0);
    setElapsedSeconds(0);
    setRestTargetMs(null);
    setRestTimerSeconds(null);
    hasNotifiedRestFinishedRef.current = false;

    try {
      localStorage.setItem(STORAGE_SESSION_START, String(now));
      localStorage.setItem(STORAGE_SESSION_PAUSED, 'false');
      localStorage.removeItem(STORAGE_PAUSED_AT);
      localStorage.setItem(STORAGE_ACCUMULATED_PAUSED, '0');
      localStorage.removeItem(STORAGE_REST_TARGET);
    } catch {}
  }, []);

  // Akcje: Uruchomienie rest timera na X sekund
  const startRestTimer = useCallback((seconds: number) => {
    const target = Date.now() + Math.max(5, seconds) * 1000;
    setRestTargetMs(target);
    setRestTimerSeconds(seconds);
    hasNotifiedRestFinishedRef.current = false;
    soundService.triggerHaptic('light');

    try {
      localStorage.setItem(STORAGE_REST_TARGET, String(target));
    } catch {}
  }, []);

  // Akcje: Dodanie / odjęcie sekund od rest timera
  const adjustRestTimer = useCallback((deltaSeconds: number) => {
    const now = Date.now();
    let currentRemaining = 0;
    if (restTargetMs && restTargetMs > now) {
      currentRemaining = Math.ceil((restTargetMs - now) / 1000);
    }

    const nextRemaining = currentRemaining + deltaSeconds;
    if (nextRemaining <= 0) {
      setRestTargetMs(null);
      setRestTimerSeconds(null);
      try {
        localStorage.removeItem(STORAGE_REST_TARGET);
      } catch {}
    } else {
      const newTarget = now + nextRemaining * 1000;
      setRestTargetMs(newTarget);
      setRestTimerSeconds(nextRemaining);
      try {
        localStorage.setItem(STORAGE_REST_TARGET, String(newTarget));
      } catch {}
    }
  }, [restTargetMs]);

  // Akcje: Anulowanie rest timera
  const cancelRestTimer = useCallback(() => {
    setRestTargetMs(null);
    setRestTimerSeconds(null);
    try {
      localStorage.removeItem(STORAGE_REST_TARGET);
    } catch {}
  }, []);

  return {
    elapsedSeconds,
    isSessionActive,
    restTimerSeconds,
    toggleSessionPause,
    resetSessionTimer,
    startRestTimer,
    adjustRestTimer,
    cancelRestTimer
  };
}
