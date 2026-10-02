import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  Circle, 
  Dumbbell, 
  Copy, 
  FileText, 
  ChevronRight, 
  Calendar, 
  Flame, 
  Layers, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Pencil
} from 'lucide-react';
import { TrainingWeek, TrainingDay, Exercise, LoggedSet, AppSettings } from '../types';
import { calculateVolume } from '../utils/calculations';
import { ExerciseCard } from './ExerciseCard';

interface WorkoutPlanViewProps {
  weeks: TrainingWeek[];
  selectedWeekId: string;
  selectedDayId: string;
  onSelectWeek: (id: string) => void;
  onSelectDay: (id: string) => void;
  onAddWeek: () => void;
  onDeleteWeek: (id: string) => void;
  onDuplicateWeek: (id: string) => void;
  onAddDay: (weekId: string) => void;
  onDeleteDay: (weekId: string, dayId: string) => void;
  onToggleDayCompleted: (weekId: string, dayId: string) => void;
  onUpdateDayNotes?: (weekId: string, dayId: string, notes: string) => void;
  onUpdateExerciseWeight: (weekId: string, dayId: string, exerciseId: string, newWeight: number) => void;
  onSaveExercisePerformance: (
    weekId: string,
    dayId: string,
    exerciseId: string,
    sets: number,
    reps: number,
    weight: number,
    loggedSets?: LoggedSet[]
  ) => void;
  onRenameExercise?: (weekId: string, dayId: string, exerciseId: string, newName: string) => void;
  onRenameWeek: (weekId: string, newName: string) => void;
  onUpdateWeekStartDate: (weekId: string, newDate: string) => void;
  onRenameDay: (weekId: string, dayId: string, newName: string) => void;
  onOpenAddExerciseModal: () => void;
  onOpenEditExerciseModal: (exercise: Exercise) => void;
  onOpenHistoryModal: (exercise: Exercise) => void;
  onDeleteExercise: (weekId: string, dayId: string, exerciseId: string) => void;
  unit: 'kg' | 'lbs';
  settings?: AppSettings;
}

export const WorkoutPlanView: React.FC<WorkoutPlanViewProps> = ({
  weeks,
  selectedWeekId,
  selectedDayId,
  onSelectWeek,
  onSelectDay,
  onAddWeek,
  onDeleteWeek,
  onDuplicateWeek,
  onAddDay,
  onDeleteDay,
  onToggleDayCompleted,
  onUpdateDayNotes,
  onUpdateExerciseWeight,
  onSaveExercisePerformance,
  onRenameExercise,
  onRenameWeek,
  onUpdateWeekStartDate,
  onRenameDay,
  onOpenAddExerciseModal,
  onOpenEditExerciseModal,
  onOpenHistoryModal,
  onDeleteExercise,
  unit,
  settings
}) => {
  const currentWeek = weeks.find((w) => w.id === selectedWeekId) || weeks[0];
  const currentDay = currentWeek?.days.find((d) => d.id === selectedDayId) || currentWeek?.days[0];

  // Day notes state
  const [dayNotes, setDayNotes] = useState<string>(currentDay?.notes || '');
  const [notesSavedSuccess, setNotesSavedSuccess] = useState<boolean>(false);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(Boolean(currentDay?.notes));

  useEffect(() => {
    setDayNotes(currentDay?.notes || '');
    if (currentDay?.notes) {
      setIsNotesOpen(true);
    }
  }, [currentDay?.id, currentDay?.notes]);

  const handleSaveNotes = () => {
    if (currentWeek && currentDay && onUpdateDayNotes) {
      onUpdateDayNotes(currentWeek.id, currentDay.id, dayNotes);
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 2000);
    }
  };

  // Day total metrics
  const dayExercises = currentDay?.exercises || [];
  const dayVolume = dayExercises.reduce(
    (acc, ex) => acc + calculateVolume(ex.sets, ex.reps, ex.weight),
    0
  );
  const dayTotalSets = dayExercises.reduce((acc, ex) => acc + ex.sets, 0);
  const completedExercisesCount = dayExercises.filter(
    (ex) => ex.loggedSets && ex.loggedSets.length > 0 && ex.loggedSets.every((s) => s.completed)
  ).length;

  // Smart Today Calculation
  const now = new Date();
  const polishDayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  const todayDayName = polishDayNames[now.getDay()];
  const todayFormatted = now.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

  // Sugerowany dzień treningowy na dziś (pierwszy nieukończony lub pierwszy)
  const suggestedDay = currentWeek?.days.find((d) => !d.completed) || currentWeek?.days[0];
  const isViewingSuggestedDay = currentDay?.id === suggestedDay?.id;

  // Postęp serii w sesji
  const totalPlannedSets = dayExercises.reduce((acc, ex) => acc + (ex.sets || 3), 0);
  const totalCompletedSets = dayExercises.reduce((acc, ex) => {
    return acc + (ex.loggedSets ? ex.loggedSets.filter((s) => s.completed).length : 0);
  }, 0);
  const dayProgressPercent = totalPlannedSets > 0 ? Math.round((totalCompletedSets / totalPlannedSets) * 100) : 0;

  // Week completed days count
  const weekCompletedDaysCount = currentWeek?.days.filter((d) => d.completed).length || 0;
  const weekTotalDaysCount = currentWeek?.days.length || 0;

  // Overload Progression Helper: Find previous week or historical performance for an exercise
  const getPreviousPerformance = (exercise: Exercise) => {
    if (!currentWeek) return null;
    const currentWeekIdx = weeks.findIndex((w) => w.id === currentWeek.id);

    // 1. Check immediately preceding week
    if (currentWeekIdx > 0) {
      const prevWeek = weeks[currentWeekIdx - 1];
      for (const d of prevWeek.days) {
        const match = d.exercises.find(
          (e) => e.name.trim().toLowerCase() === exercise.name.trim().toLowerCase()
        );
        if (match) {
          return {
            weight: match.weight,
            reps: match.reps,
            sets: match.sets,
            volume: match.sets * match.reps * match.weight,
            weekLabel: prevWeek.name
          };
        }
      }
    }

    // 2. Fallback: check exercise.history
    if (exercise.history && exercise.history.length > 0) {
      const lastHist = exercise.history[exercise.history.length - 1];
      return {
        weight: lastHist.weight,
        reps: lastHist.reps,
        sets: lastHist.sets || exercise.sets,
        volume: (lastHist.sets || exercise.sets) * lastHist.reps * lastHist.weight,
        weekLabel: `Historia (${lastHist.date})`
      };
    }

    return null;
  };

  const isAmoled = settings?.amoledBlack === true;
  const cardDensity = settings?.cardDensity || 'compact';
  const isCompact = cardDensity === 'compact' || cardDensity === 'ultra_dense';
  const isUltraDense = cardDensity === 'ultra_dense';
  const cardRadiusClass = settings?.cardBorderRadius === 'sharp' ? 'rounded-xs' : settings?.cardBorderRadius === 'pill' ? 'rounded-3xl' : 'rounded-2xl';

  return (
    <div className={`flex flex-col w-full flex-1 ${isAmoled ? 'bg-black' : ''}`} id="view-workout-plan">
      {/* 1. Week & Timeline Navigation Bar */}
      <section className={`${
        isUltraDense ? 'p-2 sm:px-4 sm:py-2 space-y-2' : isCompact ? 'p-3 sm:px-5 sm:py-2.5 space-y-2.5' : 'p-4 sm:px-6 sm:py-3.5 space-y-3'
      } border-b ${isAmoled ? 'border-zinc-800 bg-black' : 'border-slate-800/80 bg-slate-950/70'} backdrop-blur-sm`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Week Selector Chips */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar max-w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1.5 mr-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cykl:</span>
            </span>

            {weeks.map((week) => {
              const isSelected = week.id === currentWeek?.id;
              const completedCount = week.days.filter((d) => d.completed).length;
              return (
                <button
                  key={week.id}
                  type="button"
                  onClick={() => onSelectWeek(week.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-xs shadow-emerald-950/20'
                      : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                  }`}
                  id={`btn-week-${week.id}`}
                >
                  <span className="flex items-center gap-1.5">
                    {week.name || `Tydzień ${week.number}`}
                    {isSelected && (
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newName = window.prompt("Podaj nową nazwę tygodnia:", week.name);
                          if (newName) onRenameWeek(week.id, newName);
                        }}
                        className="p-0.5 rounded hover:bg-emerald-500/20 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <input
                      type="date"
                      value={week.startDate || ''}
                      onChange={(e) => onUpdateWeekStartDate(week.id, e.target.value)}
                      className="ml-2 bg-transparent text-[10px] text-emerald-200 border-b border-emerald-500/30 focus:border-emerald-400 outline-hidden"
                      title="Data startu tygodnia"
                    />
                  )}
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    isSelected
                      ? 'bg-emerald-500/25 text-emerald-200'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {completedCount}/{week.days.length}
                  </span>
                </button>
              );
            })}

            {/* Quick add week */}
            <button
              type="button"
              onClick={onAddWeek}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-dashed border-slate-700 hover:border-slate-500 flex items-center gap-1 shrink-0 font-medium transition-colors"
              title="Dodaj nowy tydzień cyklu treningowego"
              id="btn-add-week"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Nowy Tydzień</span>
            </button>
          </div>

          {/* Week Management Actions */}
          <div className="flex items-center gap-1.5">
            {currentWeek && (
              <button
                type="button"
                onClick={() => onDuplicateWeek(currentWeek.id)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 flex items-center gap-1.5 font-medium transition-colors"
                title="Zduplikuj bieżący tydzień z progresją ciężarów"
                id="btn-duplicate-week"
              >
                <Copy className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden sm:inline">Duplikuj tydzień (+progres)</span>
              </button>
            )}
            {weeks.length > 1 && currentWeek && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Czy na pewno usunąć ${currentWeek.name}?`)) {
                    onDeleteWeek(currentWeek.id);
                  }
                }}
                className="p-1.5 text-xs rounded-xl bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"
                title="Usuń ten tydzień"
                id="btn-delete-week"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Interactive Day Cards Carousel */}
        {currentWeek && (
          <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar w-full sm:w-auto">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
                Dni Treningowe:
              </span>

              {currentWeek.days.map((day, dIdx) => {
                const isSelected = day.id === currentDay?.id;
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => onSelectDay(day.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2.5 border shrink-0 ${
                      isSelected
                        ? 'bg-slate-900 text-emerald-400 border-emerald-500/50 shadow-sm shadow-emerald-950/20'
                        : 'bg-slate-950 text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border-slate-800/80'
                    }`}
                    id={`btn-day-${day.id}`}
                  >
                    {day.completed ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className="truncate max-w-[180px] font-medium text-slate-200 flex items-center gap-1">
                      {day.name}
                      {isSelected && (
                        <span
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newName = window.prompt("Podaj nową nazwę dnia:", day.name);
                            if (newName) onRenameDay(currentWeek.id, day.id, newName);
                          }}
                          className="p-0.5 rounded hover:bg-emerald-500/20 cursor-pointer"
                        >
                          <Pencil className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-400 font-mono">
                      {day.exercises.length} ćw.
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => onAddDay(currentWeek.id)}
                className="px-2.5 py-2 text-xs rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-dashed border-slate-800 hover:border-slate-700 flex items-center gap-1 shrink-0 transition-colors"
                id="btn-add-day"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dodaj dzień</span>
              </button>
            </div>

            {/* Current day delete option */}
            {currentDay && currentWeek.days.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Czy na pewno chcesz usunąć dzień: ${currentDay.name}?`)) {
                    onDeleteDay(currentWeek.id, currentDay.id);
                  }
                }}
                className="text-slate-500 hover:text-red-400 text-xs p-1.5 rounded-lg transition-colors hidden sm:flex items-center gap-1"
                title="Usuń ten dzień treningowy"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-[11px]">Usuń dzień</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* 3. Main Workspace Area */}
      <main className={`${
        isUltraDense ? 'p-2 sm:p-3 space-y-2.5' : isCompact ? 'p-3 sm:p-4 space-y-3' : 'p-4 sm:p-6 space-y-4'
      } max-w-6xl w-full mx-auto`}>
        {/* Smart Today Quick Action Banner (gdy oglądamy inny dzień niż dzisiejszy planowany) */}
        {!isViewingSuggestedDay && suggestedDay && (
          <div className={`${isAmoled ? 'bg-zinc-950 border-emerald-500/40' : 'bg-slate-900/95 border-emerald-500/40'} ${cardRadiusClass} ${
            isCompact ? 'p-2.5 sm:p-3' : 'p-3.5'
          } border flex items-center justify-between gap-3 shadow-md shadow-emerald-950/20`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="text-xs min-w-0">
                <p className="font-bold text-slate-200">
                  Dziś jest {todayDayName} ({todayFormatted})
                </p>
                <p className="text-slate-400 truncate">
                  Twój kolejny trening: <strong className="text-emerald-300">{suggestedDay.name}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectDay(suggestedDay.id)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              Rozpocznij Dzisiaj
            </button>
          </div>
        )}

        {/* Active Workout Hero Card */}
        {currentDay && (
          <div
            className={`${cardRadiusClass} ${
              isUltraDense ? 'p-3 sm:p-4' : isCompact ? 'p-3.5 sm:p-5' : 'p-5 sm:p-6'
            } border transition-all relative overflow-hidden ${
              currentDay.completed
                ? isAmoled
                  ? 'bg-zinc-950 border-emerald-800/60 text-slate-100 shadow-md'
                  : 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-800/60 text-slate-100 shadow-md shadow-emerald-950/20'
                : isAmoled
                ? 'bg-zinc-950 border-zinc-800 text-slate-100 shadow-xs'
                : 'bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-slate-800 text-slate-100 shadow-xs'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
              {/* Left Day Title & Metrics */}
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{currentWeek?.name || 'Tydzień 1'}</span>
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs font-mono text-slate-400">
                    {dayExercises.length} ćwiczeń w sesji
                  </span>
                  {isViewingSuggestedDay && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Dzisiejszy Trening
                      </span>
                    </>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5 truncate">
                  <Dumbbell className="w-6 h-6 text-emerald-400 shrink-0" />
                  <span className="truncate">{currentDay.name}</span>
                </h2>

                {/* Day KPIs pill badges */}
                <div className="flex items-center gap-3 pt-1 flex-wrap text-xs font-mono">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Objętość:</span>
                    <span className="font-extrabold text-emerald-400 text-sm">
                      {dayVolume.toLocaleString('pl-PL')} {unit}
                    </span>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Suma Serii:</span>
                    <span className="font-extrabold text-teal-300 text-sm">{dayTotalSets} serii</span>
                  </div>

                  {completedExercisesCount > 0 && (
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 flex items-center gap-2 text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-xs">Ukończono {completedExercisesCount}/{dayExercises.length} ćw.</span>
                    </div>
                  )}
                </div>

                {/* Real-Time Session Progress Bar */}
                <div className="pt-2 max-w-md space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Postęp serii:</span>
                    <span className="font-bold text-emerald-400">
                      {totalCompletedSets}/{totalPlannedSets} serii ({dayProgressPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                      style={{ width: `${dayProgressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Finish/Save Workout Big CTA */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNotesOpen(!isNotesOpen)}
                  className={`px-3.5 py-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                    isNotesOpen 
                      ? 'bg-slate-800 border-slate-700 text-white' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Pokaż lub ukryj uwagi do tego treningu"
                  id="btn-toggle-day-notes"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>{isNotesOpen ? 'Ukryj Notatki' : 'Notatki Sesji'}</span>
                  {dayNotes && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSaveNotes();
                    onToggleDayCompleted(currentWeek.id, currentDay.id);
                  }}
                  className={`px-6 py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer ${
                    currentDay.completed
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white border border-emerald-400/40 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                  id="btn-finish-workout-day"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>
                    {currentDay.completed 
                      ? 'Trening Ukończony ✓ (Kliknij, aby cofnąć)' 
                      : 'ZAKOŃCZ I ZAPISZ SESJĘ TRENINGOWĄ'}
                  </span>
                </button>
              </div>
            </div>

            {/* Expandable Notes Area */}
            {isNotesOpen && (
              <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <label htmlFor="day-notes-textarea" className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Uwagi z treningu i odczucia (RPE, regeneracja, ból, technika):</span>
                  </label>
                  {notesSavedSuccess && (
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Zapisano!
                    </span>
                  )}
                </div>
                <textarea
                  id="day-notes-textarea"
                  rows={2}
                  value={dayNotes}
                  onChange={(e) => setDayNotes(e.target.value)}
                  onBlur={handleSaveNotes}
                  placeholder="Zapisz swoje odczucia po treningu, poziom zmęczenia, uwagi do techniki w ćwiczeniach..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden transition-all resize-y leading-relaxed font-sans"
                />
              </div>
            )}
          </div>
        )}

        {/* 4. Exercises List Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Lista Ćwiczeń ({dayExercises.length})</span>
            </h3>

            <button
              type="button"
              onClick={onOpenAddExerciseModal}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
              id="btn-add-exercise-list-top"
            >
              <Plus className="w-4 h-4" />
              <span>Dodaj Ćwiczenie</span>
            </button>
          </div>

          {dayExercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
                <Dumbbell className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-300">Brak ćwiczeń w tym dniu treningowym</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                Dodaj pierwsze ćwiczenie (np. Wyciskanie sztangi, Przysiad ze sztangą, Podciąganie), aby rejestrować serie, progresować ciężary i budować wykresy siły.
              </p>
              <button
                type="button"
                onClick={onOpenAddExerciseModal}
                className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Dodaj pierwsze ćwiczenie</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {dayExercises.map((exercise, idx) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  index={idx}
                  weekId={currentWeek.id}
                  dayId={currentDay.id}
                  unit={unit}
                  previousPerformance={getPreviousPerformance(exercise)}
                  onSavePerformance={onSaveExercisePerformance}
                  onRenameExercise={onRenameExercise}
                  onOpenEditModal={onOpenEditExerciseModal}
                  onOpenHistoryModal={onOpenHistoryModal}
                  onDelete={onDeleteExercise}
                  settings={settings}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
