import React from 'react';
import { 
  Play, 
  Pause, 
  CheckCircle, 
  X, 
} from 'lucide-react';
import { soundService } from '../utils/soundService';

interface ActiveWorkoutBarProps {
  dayName: string;
  totalVolume: number;
  completedSets: number;
  totalSets: number;
  unit: 'kg' | 'lbs';
  onFinishWorkout: () => void;
  // Timer sesji przekazywany z persistent useWorkoutTimer
  elapsedSeconds?: number;
  isSessionActive?: boolean;
  onToggleSessionPause?: () => void;
  // Rest timer
  restTimerSeconds: number | null;
  onUpdateRestTimer?: (seconds: number | null) => void;
  onStartRestTimer?: (seconds: number) => void;
  onAdjustRestTimer?: (deltaSeconds: number) => void;
  onCancelRestTimer?: () => void;
  isDark?: boolean;
}

export const ActiveWorkoutBar: React.FC<ActiveWorkoutBarProps> = ({
  dayName,
  totalVolume,
  completedSets,
  totalSets,
  unit,
  onFinishWorkout,
  elapsedSeconds = 0,
  isSessionActive = true,
  onToggleSessionPause,
  restTimerSeconds,
  onUpdateRestTimer,
  onStartRestTimer,
  onAdjustRestTimer,
  onCancelRestTimer,
  isDark = true
}) => {
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAdjustRestTimer = (delta: number) => {
    if (onAdjustRestTimer) {
      onAdjustRestTimer(delta);
    } else if (onUpdateRestTimer) {
      if (restTimerSeconds === null) {
        onUpdateRestTimer(Math.max(10, delta > 0 ? delta : 60));
      } else {
        const next = Math.max(0, restTimerSeconds + delta);
        onUpdateRestTimer(next > 0 ? next : null);
      }
    }
  };

  const handleStartDefaultTimer = (secs: number) => {
    if (onStartRestTimer) {
      onStartRestTimer(secs);
    } else if (onUpdateRestTimer) {
      onUpdateRestTimer(secs);
      soundService.triggerHaptic('light');
    }
  };

  const handleCancelRestTimer = () => {
    if (onCancelRestTimer) {
      onCancelRestTimer();
    } else if (onUpdateRestTimer) {
      onUpdateRestTimer(null);
    }
  };

  return (
    <div 
      className={`fixed left-0 right-0 z-35 transition-all select-none border-t shadow-2xl backdrop-blur-xl ${
        isDark 
          ? 'bg-slate-900/95 border-emerald-500/30 text-slate-100' 
          : 'bg-white/95 border-emerald-300 text-slate-800'
      } bottom-[calc(3.75rem+env(safe-area-inset-bottom))] md:bottom-0 md:max-w-4xl md:mx-auto md:rounded-t-2xl md:border-x`}
      id="active-live-workout-bar"
    >
      {/* 1. Rest Timer Progress Ribbon (gdy timer jest aktywny) */}
      {restTimerSeconds !== null && restTimerSeconds > 0 && (
        <div className="bg-emerald-950/80 border-b border-emerald-800/40 px-3 py-1.5 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono font-bold text-emerald-400">
              Przerwa: {formatTime(restTimerSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleAdjustRestTimer(-15)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] font-bold cursor-pointer"
              title="Odejmij 15 sekund"
            >
              -15s
            </button>
            <button
              type="button"
              onClick={() => handleAdjustRestTimer(30)}
              className="px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-[10px] font-bold cursor-pointer"
              title="Dodaj 30 sekund"
            >
              +30s
            </button>
            <button
              type="button"
              onClick={handleCancelRestTimer}
              className="p-1 rounded bg-slate-800 hover:bg-red-900 text-slate-400 hover:text-white cursor-pointer"
              title="Pomiń przerwę"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Live Bar Row */}
      <div className="px-3.5 py-2 flex items-center justify-between gap-2.5">
        {/* Lewa strona: Stoper & Dzień */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onToggleSessionPause}
            className={`p-2 rounded-xl border flex items-center justify-center min-w-[40px] min-h-[40px] cursor-pointer transition-colors ${
              isSessionActive
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}
            title={isSessionActive ? 'Wstrzymaj stoper sesji' : 'Wznów stoper'}
          >
            {isSessionActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-black text-sm text-emerald-400">
                {formatTime(elapsedSeconds)}
              </span>
              <span className="text-[10px] text-slate-400 truncate hidden xs:inline">
                • {dayName}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 truncate">
              {completedSets}/{totalSets} serii • {totalVolume.toLocaleString('pl-PL')} {unit}
            </p>
          </div>
        </div>

        {/* Prawa strona: Szybki Timer & Zakończ */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Szybkie przyciski startu timera (gdy timer nie jest aktywny) */}
          {(restTimerSeconds === null || restTimerSeconds <= 0) && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleStartDefaultTimer(60)}
                className="px-2 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              >
                60s
              </button>
              <button
                type="button"
                onClick={() => handleStartDefaultTimer(90)}
                className="px-2 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              >
                90s
              </button>
              <button
                type="button"
                onClick={() => handleStartDefaultTimer(120)}
                className="px-2 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              >
                2m
              </button>
            </div>
          )}

          {/* Przycisk Zakończ Trening */}
          <button
            type="button"
            onClick={onFinishWorkout}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40 min-h-[40px] active:scale-95 transition-all"
            id="btn-finish-active-session"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Zakończ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
