import React, { useState, useEffect } from 'react';
import { 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Dumbbell, 
  Edit3, 
  History, 
  Minus, 
  Plus, 
  Save, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  X, 
  Target,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Flame
} from 'lucide-react';
import { Exercise, LoggedSet, AppSettings } from '../types';
import { calculate1RM, calculateVolume, calculatePlates } from '../utils/calculations';

interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  weekId: string;
  dayId: string;
  unit: 'kg' | 'lbs';
  settings?: AppSettings;
  isCollapsed?: boolean;
  onToggleCollapse?: (exerciseId: string) => void;
  previousPerformance?: {
    weight: number;
    reps: number;
    sets: number;
    volume: number;
    weekLabel?: string;
  } | null;
  onSavePerformance: (
    weekId: string,
    dayId: string,
    exerciseId: string,
    sets: number,
    reps: number,
    weight: number,
    loggedSets?: LoggedSet[]
  ) => void;
  onRenameExercise?: (weekId: string, dayId: string, exerciseId: string, newName: string) => void;
  onOpenEditModal: (exercise: Exercise) => void;
  onOpenHistoryModal: (exercise: Exercise) => void;
  onDelete: (weekId: string, dayId: string, exerciseId: string) => void;
}

const initialLoggedSets = (exercise: Exercise): LoggedSet[] => {
  if (exercise.loggedSets && exercise.loggedSets.length > 0) return exercise.loggedSets;
  return Array.from({ length: exercise.sets || 3 }, (_, index) => ({
    setNumber: index + 1,
    weight: exercise.weight ?? 60,
    reps: exercise.reps || 8,
    completed: false,
  }));
};

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  index,
  weekId,
  dayId,
  unit,
  settings,
  isCollapsed,
  onToggleCollapse,
  previousPerformance,
  onSavePerformance,
  onRenameExercise,
  onOpenEditModal,
  onOpenHistoryModal,
  onDelete
}) => {
  const [sets, setSets] = useState<number>(exercise.sets || 3);
  const [reps, setReps] = useState<number>(exercise.reps || 8);
  const [weight, setWeight] = useState<number>(exercise.weight ?? 60);
  const [isTrackerOpen, setIsTrackerOpen] = useState<boolean>(false);
  const [isWarmupOpen, setIsWarmupOpen] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(false);

  const isCardCollapsed = isCollapsed !== undefined ? isCollapsed : internalCollapsed;
  const handleToggleCardCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse(exercise.id);
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  const isAmoled = settings?.amoledBlack === true;
  const isHighContrast = settings?.highContrastBorders === true;
  const isGymDigits = settings?.gymDigits !== false;
  const isLeftHanded = settings?.handedness === 'left';
  const cardRadiusClass = settings?.cardBorderRadius === 'sharp' ? 'rounded-xs' : settings?.cardBorderRadius === 'pill' ? 'rounded-3xl' : 'rounded-2xl';
  const cardDensity = settings?.cardDensity || 'compact';
  const isCompact = cardDensity === 'compact' || cardDensity === 'ultra_dense';
  const isUltraDense = cardDensity === 'ultra_dense';

  // Overload Progression Indicator calculations
  const weightDiff = previousPerformance ? Math.round((weight - previousPerformance.weight) * 10) / 10 : null;
  const repsDiff = previousPerformance ? reps - previousPerformance.reps : null;
  const currentVolumeCalc = Math.round(sets * reps * weight);
  const volumeDiff = previousPerformance ? Math.round(currentVolumeCalc - previousPerformance.volume) : null;

  // Inline name editing state
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>(exercise.name);

  useEffect(() => {
    setTempName(exercise.name);
  }, [exercise.name]);

  // Initialize individual set logs
  const [detailedSets, setDetailedSets] = useState<LoggedSet[]>(() => initialLoggedSets(exercise));

  // Sync state if exercise changes from outside
  useEffect(() => {
    setSets(exercise.sets || 3);
    setReps(exercise.reps || 8);
    setWeight(exercise.weight ?? 60);
    setDetailedSets(initialLoggedSets(exercise));
  }, [exercise.id, exercise.sets, exercise.reps, exercise.weight, exercise.loggedSets]);

  // Adjusters for quick buttons
  const adjustSets = (delta: number) => {
    const updated = Math.max(1, Math.min(25, sets + delta));
    setSets(updated);
    setDetailedSets((prev) => {
      if (updated > prev.length) {
        const next = [...prev];
        for (let i = prev.length + 1; i <= updated; i++) {
          next.push({
            setNumber: i,
            weight: weight,
            reps: reps,
            completed: false
          });
        }
        return next;
      } else if (updated < prev.length) {
        return prev.slice(0, updated);
      }
      return prev;
    });
  };

  const adjustReps = (delta: number) => {
    const updated = Math.max(1, reps + delta);
    setReps(updated);
  };

  const adjustWeight = (delta: number) => {
    const updated = Math.max(0, Math.round((weight + delta) * 10) / 10);
    setWeight(updated);
  };

  // Detailed sets operations
  const toggleSetComplete = (setIndex: number) => {
    const next = detailedSets.map((s, idx) => (idx === setIndex ? { ...s, completed: !s.completed } : s));
    setDetailedSets(next);
    // Auto save on set check outside setState updater
    onSavePerformance(weekId, dayId, exercise.id, sets, reps, weight, next);
  };

  const updateSetRow = (setIndex: number, field: 'weight' | 'reps', val: number) => {
    setDetailedSets((prev) =>
      prev.map((s, idx) => (idx === setIndex ? { ...s, [field]: val } : s))
    );
  };

  const addDetailedSet = () => {
    const nextNum = detailedSets.length + 1;
    const lastSet = detailedSets[detailedSets.length - 1];
    const newSet: LoggedSet = {
      setNumber: nextNum,
      weight: lastSet ? lastSet.weight : weight,
      reps: lastSet ? lastSet.reps : reps,
      completed: false
    };
    const updated = [...detailedSets, newSet];
    setDetailedSets(updated);
    setSets(updated.length);
  };

  const removeDetailedSet = (setIndex: number) => {
    if (detailedSets.length <= 1) return;
    const filtered = detailedSets.filter((_, idx) => idx !== setIndex);
    const renumbered = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    setDetailedSets(renumbered);
    setSets(renumbered.length);
  };

  // Save changes and log to history
  const handleSave = () => {
    onSavePerformance(weekId, dayId, exercise.id, sets, reps, weight, detailedSets);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2400);
  };

  const estimated1RM = calculate1RM(weight, reps);
  const currentVolume = calculateVolume(sets, reps, weight);
  const completedSetsCount = detailedSets.filter((s) => s.completed).length;
  const isFullyCompleted = detailedSets.length > 0 && completedSetsCount === detailedSets.length;

  // Muscle group badge style
  const getCategoryBadgeClass = (category?: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('klatka') || cat.includes('chest')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (cat.includes('plecy') || cat.includes('back')) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    if (cat.includes('nogi') || cat.includes('legs') || cat.includes('quad')) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    if (cat.includes('barki') || cat.includes('shoulder')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (cat.includes('ramiona') || cat.includes('biceps') || cat.includes('triceps')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div 
      className={`${cardRadiusClass} border transition-all duration-200 ${
        isUltraDense ? 'p-2.5 sm:p-3 space-y-2' : isCompact ? 'p-3 sm:p-4 space-y-2.5' : 'p-4 sm:p-5 space-y-4'
      } ${
        isAmoled ? 'amoled-card-3d' : 'card-3d'
      } ${
        isFullyCompleted 
          ? 'border-emerald-500/50 shadow-emerald-950/20' 
          : isAmoled ? 'border-zinc-800' : 'border-slate-800/90 hover:border-slate-700'
      } ${isHighContrast ? 'border-emerald-500/60 ring-1 ring-emerald-500/30' : ''}`}
      id={`exercise-card-${exercise.id}`}
    >
      {/* 1. Header: Number, Name, Badges & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`${isCompact ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'} rounded-lg flex items-center justify-center font-mono font-black shrink-0 border ${
            isFullyCompleted
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-800 text-slate-300 border-slate-700/60'
          }`}>
            {isFullyCompleted ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : index + 1}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {isEditingName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (tempName.trim() && onRenameExercise) {
                      onRenameExercise(weekId, dayId, exercise.id, tempName.trim());
                    }
                    setIsEditingName(false);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    autoFocus
                    placeholder="Nazwa ćwiczenia..."
                    className="px-2.5 py-1 text-sm font-bold rounded-lg bg-slate-950 border border-emerald-500 text-white focus:outline-hidden"
                    id={`input-rename-${exercise.id}`}
                  />
                  <button
                    type="submit"
                    className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                    title="Zapisz"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempName(exercise.name);
                      setIsEditingName(false);
                    }}
                    className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    title="Anuluj"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1.5 group">
                  <h4 
                    onClick={() => setIsEditingName(true)}
                    className="font-extrabold text-white text-base tracking-tight cursor-pointer hover:text-emerald-400 transition-colors"
                    title="Kliknij, aby edytować nazwę"
                  >
                    {exercise.name}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="p-1 text-slate-500 hover:text-emerald-400 transition-colors opacity-60 group-hover:opacity-100"
                    title="Zmień nazwę"
                    id={`btn-inline-rename-${exercise.id}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Muscle Category Tag */}
              {exercise.category && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getCategoryBadgeClass(exercise.category)}`}>
                  {exercise.category}
                </span>
              )}

              {exercise.rpe && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  RPE {exercise.rpe}
                </span>
              )}

              {/* Overload Progression Indicator (Porównanie z poprzednim tygodniem) */}
              {previousPerformance && (
                <div
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono border flex items-center gap-1 transition-all ${
                    weightDiff !== null && weightDiff > 0
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : weightDiff !== null && weightDiff < 0
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      : repsDiff !== null && repsDiff > 0
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : repsDiff !== null && repsDiff < 0
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700/60'
                  }`}
                  title={`Wskaźnik Progresywnego Przeładowania vs ${previousPerformance.weekLabel || 'Poprzedni tydzień'}: ${previousPerformance.weight} ${unit} × ${previousPerformance.reps} powt.`}
                >
                  {weightDiff !== null && weightDiff > 0 ? (
                    <>
                      <ArrowUp className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>+{weightDiff} {unit}</span>
                      <span className="text-[9px] font-sans font-semibold text-emerald-400/90 hidden sm:inline">(Progres!)</span>
                    </>
                  ) : weightDiff !== null && weightDiff < 0 ? (
                    <>
                      <ArrowDown className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>{weightDiff} {unit}</span>
                      <span className="text-[9px] font-sans font-semibold text-rose-400/90 hidden sm:inline">(Deload)</span>
                    </>
                  ) : repsDiff !== null && repsDiff > 0 ? (
                    <>
                      <ArrowUp className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>+{repsDiff} powt.</span>
                      <span className="text-[9px] font-sans font-semibold text-emerald-400/90 hidden sm:inline">(Objętość +)</span>
                    </>
                  ) : repsDiff !== null && repsDiff < 0 ? (
                    <>
                      <ArrowDown className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{repsDiff} powt.</span>
                    </>
                  ) : (
                    <>
                      <Minus className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>= Stały ciężar</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {exercise.notes && (
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl">{exercise.notes}</p>
            )}
          </div>
        </div>

        {/* Action icons & KPI pills */}
        <div className="flex items-center gap-2">
          {/* 1RM Pill */}
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-right">
            <span className="text-[9px] text-slate-500 uppercase block font-mono font-bold leading-none">
              Szac. 1RM
            </span>
            <span className="text-xs font-black text-emerald-400 font-mono">
              {estimated1RM} {unit}
            </span>
          </div>

          {/* Volume Pill */}
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-right hidden sm:block">
            <span className="text-[9px] text-slate-500 uppercase block font-mono font-bold leading-none">
              Tonaż
            </span>
            <span className="text-xs font-black text-sky-400 font-mono">
              {currentVolume.toLocaleString('pl-PL')} {unit}
            </span>
          </div>

          {/* History modal */}
          <button
            type="button"
            onClick={() => onOpenHistoryModal(exercise)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
            title="Wykres progresu ciężarów w czasie"
            id={`btn-history-${exercise.id}`}
          >
            <History className="w-4 h-4" />
          </button>

          {/* Edit details */}
          <button
            type="button"
            onClick={() => onOpenEditModal(exercise)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
            title="Edytuj szczegóły ćwiczenia"
            id={`btn-edit-${exercise.id}`}
          >
            <Edit3 className="w-4 h-4" />
          </button>

          {/* Delete exercise */}
          <button
            type="button"
            onClick={() => onDelete(weekId, dayId, exercise.id)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700/80 transition-colors"
            title="Usuń ćwiczenie"
            id={`btn-delete-${exercise.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleToggleCardCollapse}
            className={`px-2.5 py-2 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              isCardCollapsed
                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40 shadow-xs'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/80'
            }`}
            title={isCardCollapsed ? 'Rozwiń szczegóły ćwiczenia' : 'Zwiń ćwiczenie do kompaktowego paska'}
            aria-label={isCardCollapsed ? 'Rozwiń ćwiczenie' : 'Zwiń ćwiczenie'}
            id={`btn-collapse-${exercise.id}`}
          >
            {isCardCollapsed ? <><span className="text-xs font-bold">Rozwiń</span><ChevronDown className="w-4 h-4" /></> : <><span className="text-xs font-bold">Zwiń</span><ChevronUp className="w-4 h-4" /></>}
          </button>
        </div>
      </div>

      {isCardCollapsed ? (
        <div onClick={handleToggleCardCollapse} className="pt-2.5 mt-0.5 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-900/30 -mx-1 px-1 rounded-xl transition-colors group">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono shadow-inner">
              <Dumbbell className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-black text-emerald-400">{weight} {unit}</span><span className="text-slate-600 font-bold">•</span><span className="text-slate-200 font-bold">{sets} s</span><span className="text-slate-600 font-bold">•</span><span className="text-slate-200 font-bold">{reps} p</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar" onClick={(event) => event.stopPropagation()}>
              {detailedSets.map((set, setIndex) => (
                <button key={setIndex} type="button" onClick={() => toggleSetComplete(setIndex)} className={`min-h-[30px] px-2 rounded-lg font-mono text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer active:scale-90 ${set.completed ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/60' : 'bg-slate-950 text-slate-400 border-slate-800'}`} title={`Seria ${setIndex + 1}: kliknij, aby ${set.completed ? 'odznaczyć' : 'zaliczyć'}`}>
                  {set.completed ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <Circle className="w-3 h-3 text-slate-600 shrink-0" />}<span>S{setIndex + 1}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto"><span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl border ${isFullyCompleted ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : completedSetsCount > 0 ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-slate-900/80 text-slate-400 border-slate-800'}`}>{isFullyCompleted ? 'Wszystkie serie zaliczone' : `${completedSetsCount}/${detailedSets.length} serii`}</span><ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400" /></div>
        </div>
      ) : (
        <>
      {/* 2. Interactive Parameters Strip (Weight, Sets, Reps) */}
      <div className={`${
        isAmoled ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-950/80 border-slate-800/80'
      } border ${cardRadiusClass} ${
        isUltraDense ? 'p-2 gap-2' : isCompact ? 'p-2.5 sm:p-3 gap-3' : 'p-3.5 gap-4'
      } flex flex-wrap items-center justify-between ${
        isLeftHanded ? 'flex-row-reverse' : 'flex-row'
      }`}>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* CIĘŻAR ROBOCZY */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1 font-mono">
              <Dumbbell className="w-3 h-3 text-emerald-400" />
              <span>Ciężar ({unit}):</span>
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0"
                value={weight}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) setWeight(Math.max(0, val));
                }}
                className="w-16 h-8 text-center font-mono font-black text-sm text-emerald-400 bg-slate-900 border border-slate-700 rounded-lg focus:outline-hidden focus:border-emerald-500"
                id={`input-weight-${exercise.id}`}
              />
              {/* Quick weight adjustment thumb pills */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustWeight(-2.5)}
                  className="px-2 h-9 min-w-[36px] rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors active:scale-90 cursor-pointer"
                  title="Odejmij 2.5 kg"
                >
                  -2.5
                </button>
                <button
                  type="button"
                  onClick={() => adjustWeight(-1.25)}
                  className="px-2 h-9 min-w-[36px] rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors active:scale-90 cursor-pointer"
                  title="Odejmij 1.25 kg"
                >
                  -1.25
                </button>
                <button
                  type="button"
                  onClick={() => adjustWeight(1.25)}
                  className="px-2 h-9 min-w-[36px] rounded-lg text-xs font-mono font-bold bg-emerald-700/80 hover:bg-emerald-600 text-white transition-colors active:scale-90 cursor-pointer shadow-xs"
                  title="Dodaj 1.25 kg mikro-progresu"
                >
                  +1.25
                </button>
                <button
                  type="button"
                  onClick={() => adjustWeight(2.5)}
                  className="px-2 h-9 min-w-[36px] rounded-lg text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors active:scale-90 cursor-pointer shadow-xs"
                  title="Dodaj 2.5 kg progresu"
                >
                  +2.5
                </button>
                <button
                  type="button"
                  onClick={() => adjustWeight(5.0)}
                  className="px-2 h-9 min-w-[36px] rounded-lg text-xs font-mono font-bold bg-teal-700 hover:bg-teal-600 text-white transition-colors active:scale-90 cursor-pointer shadow-xs"
                  title="Dodaj 5 kg progresu"
                >
                  +5.0
                </button>
              </div>
            </div>
          </div>

          {/* SERIE */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
              Serie:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => adjustSets(-1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors active:scale-95"
                title="Odejmij serię"
                id={`btn-minus-sets-${exercise.id}`}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min="1"
                max="25"
                value={sets}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) adjustSets(val - sets);
                }}
                className="w-12 h-8 text-center font-mono font-black text-white bg-slate-900 border border-slate-700 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
                id={`input-sets-${exercise.id}`}
              />
              <button
                type="button"
                onClick={() => adjustSets(1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors active:scale-95"
                title="Dodaj serię"
                id={`btn-plus-sets-${exercise.id}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* POWTÓRZENIA */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
              Powtórzenia:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => adjustReps(-1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors active:scale-95"
                title="Odejmij powtórzenie"
                id={`btn-minus-reps-${exercise.id}`}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min="1"
                max="99"
                value={reps}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setReps(Math.max(1, val));
                }}
                className="w-12 h-8 text-center font-mono font-black text-white bg-slate-900 border border-slate-700 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
                id={`input-reps-${exercise.id}`}
              />
              <button
                type="button"
                onClick={() => adjustReps(1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors active:scale-95"
                title="Dodaj powtórzenie"
                id={`btn-plus-reps-${exercise.id}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right CTA: Save Performance & Detailed Tracker Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer ${
              savedSuccess
                ? 'bg-emerald-600 text-white scale-102 shadow-md'
                : 'btn-3d-emerald text-white'
            }`}
            id={`btn-save-performance-${exercise.id}`}
            title="Zapisz aktualny ciężar i serie do planu"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Zapisano ✓</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Zapisz</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsTrackerOpen(!isTrackerOpen)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
              isTrackerOpen
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            id={`btn-toggle-tracker-${exercise.id}`}
            title="Pokaż rejestrator pojedynczych serii roboczych"
          >
            <span>Serie robocze ({completedSetsCount}/{detailedSets.length})</span>
            {isTrackerOpen ? <ChevronUp className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsWarmupOpen(!isWarmupOpen)}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1 transition-all cursor-pointer ${
              isWarmupOpen
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-300 hover:bg-slate-800'
            }`}
            title="Kalkulator serii rozgrzewkowych i talerzy"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Rozgrzewka</span>
          </button>
        </div>
      </div>

      {/* Drawer: Smart Warm-up Ramp & Plate Breakdown */}
      {isWarmupOpen && (
        <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 text-xs space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> Rampa Rozgrzewki dla {weight} {unit}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Gryf {settings?.barbellCollarWeight || 20}kg</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Gryf', w: settings?.barbellCollarWeight || 20, reps: '10p' },
              { label: '45%', w: Math.round(((settings?.barbellCollarWeight || 20) + (weight - (settings?.barbellCollarWeight || 20)) * 0.45) / 2.5) * 2.5, reps: '5p' },
              { label: '70%', w: Math.round(((settings?.barbellCollarWeight || 20) + (weight - (settings?.barbellCollarWeight || 20)) * 0.70) / 2.5) * 2.5, reps: '3p' },
              { label: '85%', w: Math.round(((settings?.barbellCollarWeight || 20) + (weight - (settings?.barbellCollarWeight || 20)) * 0.85) / 2.5) * 2.5, reps: '1p' }
            ].map((ramp, rIdx) => {
              const bWeight = settings?.barbellCollarWeight || 20;
              const plates = calculatePlates(Math.max(bWeight, ramp.w), bWeight);
              return (
                <div key={rIdx} className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mb-0.5">
                    <span>{ramp.label}</span>
                    <span className="font-mono font-bold text-white">{ramp.reps}</span>
                  </div>
                  <span className="text-xs font-black font-mono text-amber-400 block">{ramp.w} {unit}</span>
                  <div className="text-[9px] text-slate-400 truncate mt-1">
                    {plates.length === 0 ? 'Sam gryf' : plates.map(p => `${p.count}×${p.weight}k`).join(', ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
        </>
      )}

      {/* Sugestia Progresji po Ukończeniu Wszystkich Serii */}
      {isFullyCompleted && (
        <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-emerald-200">
              <strong>Zaliczono wszystkie serie!</strong> Sugerowana progresja na kolejny tydzień:
            </span>
          </div>
          <button
            type="button"
            onClick={() => adjustWeight(2.5)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 cursor-pointer transition-all shadow-xs"
            title="Dodaj +2.5 kg do aktualnego ciężaru"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+2.5 kg</span>
          </button>
        </div>
      )}

      {/* 3. Interactive Set Bubbles Tracker (Quick Click to Check-off Sets) */}
      <div className={`flex items-center justify-between gap-2 pt-0.5 ${isLeftHanded ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
          <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
            Serie:
          </span>

          {detailedSets.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => toggleSetComplete(idx)}
              className={`${
                isUltraDense
                  ? 'min-h-[34px] min-w-[36px] px-2 py-1 text-[11px]'
                  : isCompact
                  ? 'min-h-[38px] min-w-[42px] px-2.5 py-1.5 text-xs'
                  : 'min-h-[44px] min-w-[48px] px-3.5 py-2 text-xs'
              } rounded-xl font-mono font-bold transition-all flex items-center justify-center gap-1 border active:scale-90 cursor-pointer ${
                s.completed
                  ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/70 shadow-sm shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                  : isAmoled ? 'bg-zinc-950 text-slate-400 border-zinc-800 hover:border-zinc-700' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
              title={`Kliknij, aby oznaczyć serię ${idx + 1} jako ${s.completed ? 'niewykonaną' : 'ukończoną'}`}
            >
              {s.completed ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <Circle className="w-3 h-3 text-slate-600" />
              )}
              <span>S{idx + 1}</span>
            </button>
          ))}
        </div>

        <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
          {completedSetsCount === detailedSets.length && detailedSets.length > 0
            ? '🔥 Zaliczone!'
            : `${detailedSets.length - completedSetsCount} do końca`}
        </span>
      </div>

      {/* 4. Detailed Set Table (Expandable for individual weights) */}
      {isTrackerOpen && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>Szczegółowy rejestr serii z indywidualnym ciężarem:</span>
            </span>

            <button
              type="button"
              onClick={addDetailedSet}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 hover:border-emerald-500/40 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Dodaj serię</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {detailedSets.map((s, sIdx) => (
              <div
                key={sIdx}
                className={`flex flex-wrap items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                  s.completed
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleSetComplete(sIdx)}
                    className="p-1 rounded-full transition-colors"
                  >
                    {s.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                    )}
                  </button>

                  <span className="font-mono font-bold text-slate-300 w-16">
                    Seria {s.setNumber}:
                  </span>

                  {/* Weight */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Ciężar:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={s.weight}
                      onChange={(e) => updateSetRow(sIdx, 'weight', parseFloat(e.target.value) || 0)}
                      className="w-14 px-1.5 py-0.5 rounded-lg bg-slate-950 border border-slate-700 font-mono font-bold text-emerald-400 text-center text-xs"
                    />
                    <span className="text-[10px] text-slate-500">{unit}</span>
                  </div>

                  {/* Reps */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Powtórzenia:</span>
                    <input
                      type="number"
                      min="1"
                      value={s.reps}
                      onChange={(e) => updateSetRow(sIdx, 'reps', parseInt(e.target.value, 10) || 1)}
                      className="w-12 px-1.5 py-0.5 rounded-lg bg-slate-950 border border-slate-700 font-mono font-bold text-white text-center text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-1 sm:mt-0">
                  <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                    1RM: {calculate1RM(s.weight, s.reps)} {unit}
                  </span>
                  {detailedSets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDetailedSet(sIdx)}
                      className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      title="Usuń tę serię"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
