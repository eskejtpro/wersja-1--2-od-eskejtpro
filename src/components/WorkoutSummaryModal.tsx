import React, { useState } from 'react';
import { 
  Trophy, 
  Flame, 
  Clock, 
  Dumbbell, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Save,
  MessageSquare
} from 'lucide-react';
import { WorkoutSessionRecord } from '../types';

interface WorkoutSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayName: string;
  totalVolume: number;
  completedSets: number;
  totalSets: number;
  unit: 'kg' | 'lbs';
  onConfirmFinish: (summary: { rpe: number; notes: string }) => void;
  isDark?: boolean;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  isOpen,
  onClose,
  dayName,
  totalVolume,
  completedSets,
  totalSets,
  unit,
  onConfirmFinish,
  isDark = true
}) => {
  const [rpe, setRpe] = useState<number>(8);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none">
      <div 
        className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 overflow-hidden relative ${
          isDark 
            ? 'bg-slate-900 border-slate-800 text-slate-100' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
            <Trophy className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black tracking-tight">Trening Zakończony!</h3>
          <p className="text-xs text-slate-400 font-medium">
            Świetna robota! Podsumowanie jednostki: <span className="text-emerald-400 font-bold">{dayName}</span>
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
              Całkowity Tonaż
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              <span className="text-base font-black font-mono text-emerald-400">
                {totalVolume.toLocaleString('pl-PL')} {unit}
              </span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
              Ukończone Serie
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <span className="text-base font-black font-mono text-teal-400">
                {completedSets} / {totalSets}
              </span>
            </div>
          </div>
        </div>

        {/* RPE Selector */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">Ocena intensywności (RPE):</span>
            <span className="text-emerald-400 font-mono text-sm">{rpe} / 10</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            {[6, 7, 8, 9, 10].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setRpe(val)}
                className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                  rpe === val
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                    : isDark 
                      ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' 
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5 mb-6">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Krótka notatka z treningu (opcjonalnie):</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Np. bardzo dobra stabilizacja, pompa na barkach..."
            rows={2}
            className={`w-full p-3 rounded-xl border text-xs focus:outline-hidden focus:border-emerald-500 ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600' 
                : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          />
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => {
            onConfirmFinish({ rpe, notes });
            onClose();
          }}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 active:scale-98 transition-all min-h-[48px]"
        >
          <Save className="w-4 h-4" />
          <span>Zapisz w Dzienniku i Zakończ</span>
        </button>
      </div>
    </div>
  );
};
