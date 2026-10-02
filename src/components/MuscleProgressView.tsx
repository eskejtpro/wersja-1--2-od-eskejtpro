import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Award, 
  Dumbbell, 
  Activity, 
  Layers, 
  ChevronRight,
  ArrowUpRight,
  Target,
  Flame,
  CheckCircle2,
  BarChart3,
  Scale,
  Zap,
  Sparkles
} from 'lucide-react';
import { TrainingWeek, ExerciseHistoryPoint, Exercise } from '../types';
import { calculate1RM } from '../utils/calculations';
import { AnalysisExecutionOptions, analysisOptionsForWeek, dedupeHistory, executedSets, executedVolume, historyForAnalysis, includeExerciseInAnalysis, scopeAnalysisWeeks, summarizeExecution, summarizeMuscleFrequency } from '../utils/analysis';

interface MuscleProgressViewProps {
  weeks: TrainingWeek[];
  unit: 'kg' | 'lbs';
  analysisOnlyCompleted?: boolean;
  analysisHideEmptyGroups?: boolean;
  analysisIncludePartialHistory?: boolean;
  analysisStartWeek?: number;
  analysisEndWeek?: number;
  analysisDefaultMetric?: 'progressPct' | 'volume' | 'executedSets';
  analysisShowDataQualityWarnings?: boolean;
  analysisRequireHistoryForCompleted?: boolean;
  analysisMinExecutedSets?: number;
  analysisWarnMissingHistory?: boolean;
  analysisShowExecutionSummary?: boolean;
  analysisShowMuscleFrequency?: boolean;
}

export type MuscleGroupId = 'klatka' | 'plecy' | 'biceps' | 'triceps' | 'barki' | 'nogi';

interface MuscleGroupDef {
  id: MuscleGroupId;
  name: string;
  icon: string;
  description: string;
  keywords: string[];
}

const MUSCLE_GROUPS: MuscleGroupDef[] = [
  {
    id: 'klatka',
    name: 'Klatka Piersiowa',
    icon: '🏋️',
    description: 'Wyciskania sztangi/hantli, rozpiętki, pompki',
    keywords: ['klatk', 'wyciskan', 'ław', 'bench', 'rozpiętk', 'chest', 'incline']
  },
  {
    id: 'plecy',
    name: 'Plecy / Grzbiet',
    icon: '🦅',
    description: 'Martwe ciągi, wiosłowania oraz podciąganie na drążku',
    keywords: ['plec', 'martwy', 'wiosłow', 'drążk', 'podciągan', 'pull-up', 'chin-up', 'ściągan', 'back', 'lat', 'row', 'deadlift']
  },
  {
    id: 'barki',
    name: 'Barki / Naramienne',
    icon: '🛡️',
    description: 'OHP, wyciskanie żołnierskie, wznosy bokiem/w opadzie',
    keywords: ['bark', 'ohp', 'żołnierskie', 'wznos', 'milit', 'shoulder', 'press', 'face pull']
  },
  {
    id: 'biceps',
    name: 'Biceps',
    icon: '🦾',
    description: 'Uginania ze sztangą, hantlami, modlitewnik',
    keywords: ['bicep', 'uginan', 'modlitewnik', 'curl', 'ramion']
  },
  {
    id: 'triceps',
    name: 'Triceps',
    icon: '⚡',
    description: 'Dipy, wyciskanie francuskie, prostowanie ramion',
    keywords: ['tricep', 'francusk', 'prostowan', 'dipy', 'dips', 'czacha', 'pushdown', 'link']
  },
  {
    id: 'nogi',
    name: 'Nogi / Czworogłowe i Dwugłowe',
    icon: '🦵',
    description: 'Przysiady, suwnica, wykroki, RDL, łydki',
    keywords: ['nog', 'przysiad', 'squat', 'suwnic', 'wykrok', 'rdl', 'łydk', 'leg', 'czworo', 'dwugłow', 'hack']
  }
];

interface AggregatedExercise {
  name: string;
  category?: MuscleGroupId;
  latestWeight: number;
  latestReps: number;
  latestSets: number;
  initialWeight: number;
  initialReps: number;
  maxWeight: number;
  maxReps: number;
  weightGain: number;
  weightGainPct: number;
  best1RM: number;
  totalVolume: number;
  executedSets: number;
  history: ExerciseHistoryPoint[];
}

export const MuscleProgressView: React.FC<MuscleProgressViewProps> = ({ weeks, unit, analysisOnlyCompleted = true, analysisHideEmptyGroups = true, analysisIncludePartialHistory = false, analysisStartWeek = 1, analysisEndWeek = 999, analysisDefaultMetric = 'progressPct', analysisShowDataQualityWarnings = true, analysisRequireHistoryForCompleted = false, analysisMinExecutedSets = 1, analysisWarnMissingHistory = true, analysisShowExecutionSummary = true, analysisShowMuscleFrequency = true }) => {
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroupId | 'all'>('all');
  const scopedWeeks = useMemo(() => scopeAnalysisWeeks(weeks, analysisStartWeek, analysisEndWeek), [weeks, analysisStartWeek, analysisEndWeek]);
  const analysisOptions = useMemo<AnalysisExecutionOptions>(() => ({
    onlyCompleted: analysisOnlyCompleted,
    includePartialHistory: analysisIncludePartialHistory,
    requireHistoryForCompleted: analysisRequireHistoryForCompleted,
    minExecutedSets: analysisMinExecutedSets,
    startDate: scopedWeeks[0]?.startDate,
  }), [analysisOnlyCompleted, analysisIncludePartialHistory, analysisRequireHistoryForCompleted, analysisMinExecutedSets, scopedWeeks]);

  // Aggregate all exercises from weeks & days
  const allAggregatedExercises = useMemo(() => {
    const map = new Map<string, AggregatedExercise>();

    scopedWeeks.forEach((week, weekIndex) => {
      const weekOptions = analysisOptionsForWeek(week, analysisOptions, scopedWeeks[weekIndex + 1]?.startDate);
      week.days.forEach((day) => {
        day.exercises.forEach((ex) => {
          if (!includeExerciseInAnalysis(day, ex, weekOptions)) return;
          const existing = map.get(ex.name);
          const sortedHistory = dedupeHistory([...(existing?.history || []), ...historyForAnalysis(ex, weekOptions)], analysisOptions.startDate);

          const weights = sortedHistory.map((h) => h.weight);
          const repsArr = sortedHistory.map((h) => h.reps);
          const maxW = weights.length > 0 ? Math.max(...weights) : ex.weight;
          const initialW = weights.length > 0 ? weights[0] : ex.weight;
          const initR = repsArr.length > 0 ? repsArr[0] : ex.reps;
          const maxR = repsArr.length > 0 ? Math.max(...repsArr) : ex.reps;
          const latestPoint = sortedHistory[sortedHistory.length - 1];

          const bestPoint = sortedHistory.find((p) => p.weight === maxW) || { weight: maxW, reps: ex.reps };
          const best1RM = calculate1RM(bestPoint.weight, bestPoint.reps);

          const currentVol = (existing?.totalVolume || 0) + executedVolume(day, ex, weekOptions);
          const currentExecutedSets = (existing?.executedSets || 0) + executedSets(day, ex, weekOptions);

          map.set(ex.name, {
            name: ex.name,
            category: (ex.category as MuscleGroupId) || existing?.category,
            latestWeight: latestPoint ? latestPoint.weight : ex.weight,
            latestReps: latestPoint ? latestPoint.reps : ex.reps,
            latestSets: latestPoint ? latestPoint.sets : ex.sets,
            initialWeight: initialW,
            initialReps: initR,
            maxWeight: maxW,
            maxReps: maxR,
            weightGain: Math.round((maxW - initialW) * 10) / 10,
            weightGainPct: initialW > 0 ? Math.round(((maxW - initialW) / initialW) * 100) : 0,
            best1RM,
            totalVolume: currentVol,
            executedSets: currentExecutedSets,
            history: sortedHistory
          });
        });
      });
    });

    return Array.from(map.values());
  }, [scopedWeeks, analysisOptions]);

  // Helper to match exercise to muscle group
  const matchesGroup = (exName: string, group: MuscleGroupDef): boolean => {
    const lower = exName.toLowerCase();
    return group.keywords.some((k) => lower.includes(k));
  };

  // Grouped exercises map
  const groupedData = useMemo(() => {
    const result: Record<MuscleGroupId, AggregatedExercise[]> = {
      klatka: [],
      plecy: [],
      barki: [],
      biceps: [],
      triceps: [],
      nogi: []
    };

    allAggregatedExercises.forEach((ex) => {
      if (ex.category && result[ex.category]) {
        result[ex.category].push(ex);
        return;
      }

      let matched = false;
      for (const group of MUSCLE_GROUPS) {
        if (matchesGroup(ex.name, group)) {
          result[group.id].push(ex);
          matched = true;
          break;
        }
      }
      // Fallback matching if not found
      if (!matched) {
        const lower = ex.name.toLowerCase();
        if (lower.includes('push') || lower.includes('press')) result.klatka.push(ex);
        else if (lower.includes('pull')) result.plecy.push(ex);
        else result.klatka.push(ex);
      }
    });

    return result;
  }, [allAggregatedExercises]);

  // Pull-up specific analysis
  const pullUpExercises = useMemo(() => {
    return allAggregatedExercises.filter((ex) => {
      const lower = ex.name.toLowerCase();
      return lower.includes('podciągan') || lower.includes('drążk') || lower.includes('pull-up') || lower.includes('chin-up');
    });
  }, [allAggregatedExercises]);

  // Chart Metric state & Hover state
  const [chartMetric, setChartMetric] = useState<'progressPct' | 'volume' | 'executedSets'>(analysisDefaultMetric);
  const [hoveredBarId, setHoveredBarId] = useState<MuscleGroupId | null>(null);

  // Group metrics & aggregated progress
  const groupMetrics = useMemo(() => {
    const colors: Record<MuscleGroupId, { hex: string; bg: string; border: string }> = {
      klatka: { hex: '#3b82f6', bg: 'bg-blue-500/20', border: 'border-blue-500' },
      plecy: { hex: '#06b6d4', bg: 'bg-cyan-500/20', border: 'border-cyan-500' },
      barki: { hex: '#8b5cf6', bg: 'bg-purple-500/20', border: 'border-purple-500' },
      biceps: { hex: '#ec4899', bg: 'bg-pink-500/20', border: 'border-pink-500' },
      triceps: { hex: '#f59e0b', bg: 'bg-amber-500/20', border: 'border-amber-500' },
      nogi: { hex: '#10b981', bg: 'bg-emerald-500/20', border: 'border-emerald-500' }
    };

    return MUSCLE_GROUPS.map((group) => {
      const exercises = groupedData[group.id];
      const executedExercises = exercises.filter((e) => e.executedSets > 0);
      const totalVolume = executedExercises.reduce((sum, e) => sum + e.totalVolume, 0);
      const totalExecutedSets = executedExercises.reduce((sum, e) => sum + e.executedSets, 0);
      const withWeight = executedExercises.filter((e) => e.initialWeight > 0);
      const avgGainPct = withWeight.length > 0
        ? Math.round((withWeight.reduce((sum, e) => sum + e.weightGainPct, 0) / withWeight.length) * 10) / 10
        : 0;
      const totalGainKg = Math.round(executedExercises.reduce((sum, e) => sum + e.weightGain, 0) * 10) / 10;
      const topEx = executedExercises.slice().sort((a, b) => b.weightGain - a.weightGain)[0];

      return {
        id: group.id,
        name: group.name,
        icon: group.icon,
        exerciseCount: executedExercises.length,
        totalVolume,
        totalExecutedSets,
        avgGainPct,
        totalGainKg,
        color: colors[group.id],
        topExercise: topEx && topEx.weightGain > 0 ? topEx.name : (topEx ? topEx.name : 'Brak'),
        topGain: topEx ? topEx.weightGain : 0
      };
    });
  }, [groupedData]);

  // Total executed sets across all muscle groups
  const totalExecutedSetsAll = useMemo(() => {
    return groupMetrics.reduce((sum, g) => sum + g.totalExecutedSets, 0);
  }, [groupMetrics]);

  // v1.2 analysis contract: groups with no executed history are not analysis data.
  const activeGroupMetrics = useMemo(() => analysisHideEmptyGroups ? groupMetrics.filter((g) => g.exerciseCount > 0 && g.totalExecutedSets > 0) : groupMetrics, [groupMetrics, analysisHideEmptyGroups]);

  const dataQuality = useMemo(() => {
    const execution = summarizeExecution(scopedWeeks, analysisOptions);
    const sortedWeeks = execution.executedWeekNumbers;
    const gaps = sortedWeeks.length > 1 ? sortedWeeks.slice(1).filter((n, i) => n - sortedWeeks[i] > 1).length : 0;
    return { ...execution, gaps };
  }, [scopedWeeks, analysisOptions]);

  const muscleFrequency = useMemo(() => summarizeMuscleFrequency(scopedWeeks, analysisOptions, (exercise) => {
    if (exercise.category) return exercise.category;
    const lower = exercise.name.toLowerCase();
    return MUSCLE_GROUPS.find((group) => group.keywords.some((keyword) => lower.includes(keyword)))?.id;
  }), [scopedWeeks, analysisOptions]);

  // Structural Balance Calculation (Push vs Pull vs Legs)
  const structuralBalance = useMemo(() => {
    const pushVol = (groupedData.klatka.reduce((s, e) => s + e.totalVolume, 0)) +
                    (groupedData.barki.reduce((s, e) => s + e.totalVolume, 0)) +
                    (groupedData.triceps.reduce((s, e) => s + e.totalVolume, 0));
    const pullVol = (groupedData.plecy.reduce((s, e) => s + e.totalVolume, 0)) +
                    (groupedData.biceps.reduce((s, e) => s + e.totalVolume, 0));
    const legVol  = groupedData.nogi.reduce((s, e) => s + e.totalVolume, 0);

    const totalVol = pushVol + pullVol + legVol;
    const pushPct = totalVol > 0 ? Math.round((pushVol / totalVol) * 100) : 33;
    const pullPct = totalVol > 0 ? Math.round((pullVol / totalVol) * 100) : 33;
    const legPct  = totalVol > 0 ? Math.round((legVol / totalVol) * 100) : 34;

    const pushPullRatio = pullVol > 0 ? Math.round((pushVol / pullVol) * 100) / 100 : 1;

    let balanceStatus: { text: string; badge: string; color: string; advice: string };
    if (totalVol === 0) {
      balanceStatus = {
        text: 'Brak danych objętościowych',
        badge: 'Oczekiwanie',
        color: 'text-slate-400',
        advice: 'Dodaj i ukończ serie w planie treningowym, aby wygenerować analizę Push/Pull.'
      };
    } else if (pushPullRatio > 1.3) {
      balanceStatus = {
        text: 'Dominacja Ruchów Pchających (Push)',
        badge: '⚠️ Dysbalans',
        color: 'text-amber-400',
        advice: 'Tonaż klatki, barków i tricepsów mocno przewyższa grzbiet. Dołóż serii wiosłowań lub drążka dla ochrony obręczy barkowej.'
      };
    } else if (pushPullRatio < 0.75) {
      balanceStatus = {
        text: 'Dominacja Ruchów Ciągnących (Pull)',
        badge: 'Dominacja Grzbietu',
        color: 'text-cyan-400',
        advice: 'Wysoka przewaga pleców i bicepsów. Twoje barki są bezpieczne, możesz zwiększyć objętość wyciskań.'
      };
    } else {
      balanceStatus = {
        text: 'Wzorcowy Balans Strukturalny',
        badge: '✅ Perfekcyjny',
        color: 'text-emerald-400',
        advice: 'Prawidłowy stosunek siłowy między ruchami pchającymi i ciągnącymi (współczynnik Push:Pull w normie).'
      };
    }

    const activeGroups = groupMetrics.filter((g) => g.totalExecutedSets > 0);
    const bestGrowth = activeGroups.slice().sort((a, b) => b.avgGainPct - a.avgGainPct)[0];
    const lowestGrowth = activeGroups.slice().sort((a, b) => a.avgGainPct - b.avgGainPct)[0];

    return {
      pushVol,
      pullVol,
      legVol,
      pushPct,
      pullPct,
      legPct,
      pushPullRatio,
      balanceStatus,
      bestGrowth,
      lowestGrowth
    };
  }, [groupedData, groupMetrics]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-950 text-slate-100" id="muscle-progress-view">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span>Analiza Ogólna Progresu Ciężaru i Partii Mięśniowych</span>
            </h2>
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[10px] font-mono font-bold">
              6 Głównych Partii
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Śledź dynamiczny wzrost siły w podziale na <strong>klatkę, plecy, biceps, triceps, barki oraz nogi</strong>.
            Dla pleców dostępny jest dedykowany moduł analizy <strong>progresu powtórzeń i ciężaru na drążku</strong>.
          </p>
        </div>

        {/* Quick Summary Pill */}
        <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Łącznie ćwiczeń:</span>
            <span className="font-bold text-emerald-400 text-sm">{allAggregatedExercises.length}</span>
          </div>
          <div className="w-px h-6 bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Tygodni w cyklu:</span>
            <span className="font-bold text-emerald-400 text-sm">{scopedWeeks.length}</span>
          </div>
        </div>
      </div>

      {analysisShowDataQualityWarnings && analysisWarnMissingHistory && (dataQuality.missingHistoryDays > 0 || dataQuality.gaps > 0) && (
        <div className="px-4 py-3 rounded-xl bg-amber-950/30 border border-amber-800/50 text-xs text-amber-200" id="analysis-quality-warning">
          <strong>Kontrola jakości danych:</strong> {dataQuality.missingHistoryDays > 0 && `${dataQuality.missingHistoryDays} ukończonych dni bez historii serii. `}{dataQuality.gaps > 0 && `${dataQuality.gaps} przerw w wykonanych tygodniach.`} Analiza nie uzupełnia braków domysłami.
        </div>
      )}

      {analysisShowExecutionSummary && (
        <div className="flex flex-wrap gap-3 text-[11px] text-slate-400" id="analysis-execution-summary">
          <span>Wykonane dni: <strong className="text-emerald-300">{dataQuality.completedDays}</strong></span>
          <span>Dni częściowe: <strong className="text-cyan-300">{dataQuality.partialDays}</strong></span>
          <span>Ćwiczenia z wykonaniem: <strong className="text-emerald-300">{dataQuality.executedExercises}</strong></span>
        </div>
      )}

      {analysisShowMuscleFrequency && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-3" id="analysis-muscle-frequency">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2"><Activity className="w-4 h-4 text-sky-400" />Częstotliwość partii mięśniowych</h3>
            <p className="text-xs text-slate-400 mt-0.5">Sesje i serie wykonane w wybranym zakresie tygodni.</p>
          </div>
          {muscleFrequency.length === 0 ? <div className="text-xs text-slate-500">Brak wystarczających danych wykonania.</div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" id="muscle-frequency-grid">
              {muscleFrequency.map((metric) => (
                <div key={metric.category} className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2" data-frequency-category={metric.category}>
                  <div className="flex items-center justify-between text-xs"><span className="font-bold text-slate-200">{metric.category}</span><span className="font-mono text-emerald-300">{metric.activeWeeks} tyg.</span></div>
                  <div className="mt-1 text-[11px] text-slate-400">{metric.sessions} sesji · {metric.executedSets} serii</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Partitions / Navigation Filter Tabs */}
      <div className="flex flex-wrap gap-2 pb-1 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setSelectedGroup('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            selectedGroup === 'all'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
          }`}
          id="btn-filter-group-all"
        >
          <span>🌐 Wszystkie Partie</span>
        </button>

        {MUSCLE_GROUPS.filter((group) => !analysisHideEmptyGroups || groupedData[group.id].length > 0).map((group) => {
          const count = groupedData[group.id].length;
          const isSelected = selectedGroup === group.id;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setSelectedGroup(group.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
              }`}
              id={`btn-filter-group-${group.id}`}
            >
              <span>{group.icon}</span>
              <span>{group.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isSelected ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 📊 NOWY WYKRES & INTELIGENTNA ANALIZA PARTII MIĘŚNIOWYCH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Interactive Comparison Bar Chart (2 cols on desktop) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>Wykres Porównawczy Partii Mięśniowych</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kliknij na słupek partii, aby natychmiast przefiltrować ćwiczenia poniżej.
              </p>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setChartMetric('progressPct')}
                className={`px-2.5 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                  chartMetric === 'progressPct'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                id="btn-metric-pct"
              >
                📈 Wzrost Siły (%)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('executedSets')}
                className={`px-2.5 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                  chartMetric === 'executedSets'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                id="btn-metric-sets"
              >
                📋 Serie Wykonane
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('volume')}
                className={`px-2.5 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                  chartMetric === 'volume'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                id="btn-metric-vol"
              >
                ⚖️ Tonaż ({unit})
              </button>
            </div>
          </div>

          {/* SVG Bar Chart */}
          {(() => {
            const chartW = 740;
            const chartH = 220;
            const padLeft = 65;
            const padRight = 20;
            const padTop = 30;
            const padBottom = 48;
            const innerW = chartW - padLeft - padRight;
            const innerH = chartH - padTop - padBottom;
            const slotW = innerW / Math.max(1, activeGroupMetrics.length);
            const barW = 46;

            const values = activeGroupMetrics.map((g) =>
              chartMetric === 'progressPct'
                ? g.avgGainPct
                : chartMetric === 'executedSets'
                ? g.totalExecutedSets
                : g.totalVolume
            );
            const maxVal = Math.max(chartMetric === 'progressPct' ? 10 : chartMetric === 'executedSets' ? 5 : 500, ...values);

            return (
              <div className="w-full overflow-x-auto select-none pt-1">
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto min-w-[540px]">
                  {/* Grid Lines & Y Axis Labels */}
                  {[0, 0.5, 1].map((ratio) => {
                    const yVal = Math.round(maxVal * (1 - ratio));
                    const yPx = padTop + innerH * ratio;
                    return (
                      <g key={ratio}>
                        <line
                          x1={padLeft}
                          y1={yPx}
                          x2={chartW - padRight}
                          y2={yPx}
                          stroke="#27272a"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={padLeft - 8}
                          y={yPx + 4}
                          fill="#71717a"
                          fontSize="10"
                          textAnchor="end"
                          fontFamily="monospace"
                        >
                          {chartMetric === 'progressPct'
                            ? `+${yVal}%`
                            : chartMetric === 'executedSets'
                            ? `${yVal} ser.`
                            : `${yVal.toLocaleString()} ${unit}`}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bars for Each Muscle Group */}
                  {activeGroupMetrics.map((g, i) => {
                    const val =
                      chartMetric === 'progressPct'
                        ? g.avgGainPct
                        : chartMetric === 'executedSets'
                        ? g.totalExecutedSets
                        : g.totalVolume;
                    const h = Math.max(val > 0 ? 6 : 2, (val / maxVal) * innerH);
                    const x = padLeft + i * slotW + (slotW - barW) / 2;
                    const y = padTop + innerH - h;
                    const isHovered = hoveredBarId === g.id;
                    const isSelected = selectedGroup === g.id;

                    return (
                      <g
                        key={g.id}
                        className="cursor-pointer transition-opacity"
                        onMouseEnter={() => setHoveredBarId(g.id)}
                        onMouseLeave={() => setHoveredBarId(null)}
                        onClick={() => setSelectedGroup(selectedGroup === g.id ? 'all' : g.id)}
                      >
                        {/* Interactive Click/Hover Background Column */}
                        <rect
                          x={padLeft + i * slotW + 4}
                          y={padTop}
                          width={slotW - 8}
                          height={innerH + 42}
                          fill={isHovered ? 'rgba(255,255,255,0.03)' : 'transparent'}
                          rx="8"
                        />

                        {/* Top Value Label */}
                        <text
                          x={x + barW / 2}
                          y={Math.max(14, y - 8)}
                          fill={isHovered || isSelected ? '#ffffff' : '#a1a1aa'}
                          fontSize="11"
                          fontWeight={isHovered || isSelected ? 'bold' : '600'}
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {chartMetric === 'progressPct'
                            ? (val > 0 ? `+${val}%` : '0%')
                            : chartMetric === 'executedSets'
                            ? `${val} ser.`
                            : `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}k`}
                        </text>

                        {/* Bar Rect */}
                        <rect
                          x={x}
                          y={y}
                          width={barW}
                          height={h}
                          fill={g.color.hex}
                          opacity={isSelected ? 1.0 : (isHovered ? 0.95 : 0.75)}
                          rx="6"
                          stroke={isSelected ? '#ffffff' : (isHovered ? g.color.hex : 'none')}
                          strokeWidth={isSelected ? 2 : 1}
                        />

                        {/* Bottom Label (Icon + Name) */}
                        <text
                          x={x + barW / 2}
                          y={padTop + innerH + 18}
                          fontSize="14"
                          textAnchor="middle"
                        >
                          {g.icon}
                        </text>
                        <text
                          x={x + barW / 2}
                          y={padTop + innerH + 34}
                          fill={isSelected ? '#ffffff' : '#d4d4d8'}
                          fontSize="11"
                          fontWeight={isSelected ? 'bold' : '500'}
                          textAnchor="middle"
                        >
                          {g.id === 'klatka' ? 'Klatka' :
                           g.id === 'plecy' ? 'Plecy' :
                           g.id === 'barki' ? 'Barki' :
                           g.id === 'biceps' ? 'Biceps' :
                           g.id === 'triceps' ? 'Triceps' : 'Nogi'}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })()}

          {/* Hover / Selection Live Data Pill */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-3.5 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
            {(() => {
              const activeG = groupMetrics.find((g) => g.id === (hoveredBarId || (selectedGroup !== 'all' ? selectedGroup : 'klatka'))) || groupMetrics[0];
              return (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{activeG.icon}</span>
                    <span className="font-bold text-slate-100">{activeG.name}:</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {activeG.avgGainPct > 0 ? `+${activeG.avgGainPct}% średniego wzrostu siły` : 'Brak odnotowanego wzrostu'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                    <span>Tonaż: <strong className="text-emerald-400">{activeG.totalVolume.toLocaleString()} {unit}</strong></span>
                    <span>Ćwiczeń: <strong className="text-slate-200">{activeG.exerciseCount}</strong></span>
                    <span>Lider: <strong className="text-amber-300">{activeG.topExercise}</strong></span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* 🧠 SMART INTEL: Asystent Balansu Strukturalnego & Priorytety */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Inteligentny Balans Partii</span>
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700 ${structuralBalance.balanceStatus.color}`}>
                {structuralBalance.balanceStatus.badge}
              </span>
            </div>

            {/* Push / Pull / Legs Volume Bar */}
            <div className="mt-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-emerald-400 font-bold">Push: {structuralBalance.pushPct}%</span>
                <span className="text-teal-400 font-bold">Pull: {structuralBalance.pullPct}%</span>
                <span className="text-cyan-400 font-bold">Legs: {structuralBalance.legPct}%</span>
              </div>

              {/* Segmented Progress Bar */}
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                <div
                  style={{ width: `${structuralBalance.pushPct}%` }}
                  className="bg-emerald-500 h-full transition-all"
                  title={`Push (Klatka/Barki/Triceps): ${structuralBalance.pushVol} ${unit}`}
                />
                <div
                  style={{ width: `${structuralBalance.pullPct}%` }}
                  className="bg-teal-500 h-full transition-all"
                  title={`Pull (Plecy/Biceps): ${structuralBalance.pullVol} ${unit}`}
                />
                <div
                  style={{ width: `${structuralBalance.legPct}%` }}
                  className="bg-cyan-500 h-full transition-all"
                  title={`Legs (Nogi): ${structuralBalance.legVol} ${unit}`}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Push: {Math.round(structuralBalance.pushVol).toLocaleString()} {unit}</span>
                <span>Pull: {Math.round(structuralBalance.pullVol).toLocaleString()} {unit}</span>
                <span>Legs: {Math.round(structuralBalance.legVol).toLocaleString()} {unit}</span>
              </div>
            </div>

            {/* Structural Advice Card */}
            <div className="mt-3.5 p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-200">
                  Stosunek Push : Pull = {structuralBalance.pushPullRatio}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {structuralBalance.balanceStatus.advice}
              </p>
            </div>
          </div>

          {/* Quick Insights: Top Growth & Lagging Focus */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
            {structuralBalance.bestGrowth && (
              <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-md border border-emerald-900/30">
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Lider Wzrostu:</span>
                  <strong className="text-slate-200">{structuralBalance.bestGrowth.name}</strong>
                </span>
                <span className="font-mono font-bold text-emerald-400 text-[11px]">
                  +{structuralBalance.bestGrowth.avgGainPct}%
                </span>
              </div>
            )}

            {structuralBalance.lowestGrowth && structuralBalance.lowestGrowth.id !== structuralBalance.bestGrowth?.id && (
              <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-md border border-amber-900/30">
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sugerowany Fokus:</span>
                  <strong className="text-slate-200">{structuralBalance.lowestGrowth.name}</strong>
                </span>
                <span className="font-mono font-bold text-amber-400 text-[11px]">
                  +{structuralBalance.lowestGrowth.avgGainPct}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 📊 WYKRES 2: DEDYKOAWNY WYKRES ROZKŁADU WYKONANYCH SERIE OD POCZĄTKU PLANU */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Wykres 2: Objętość Wykonanych Serie Od Początku Planu wg Partii</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Porównanie liczby wykonanych serii roboczych dla poszczególnych grup mięśniowych od startu cyklu.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/50 rounded-lg px-3 py-1.5 text-xs text-emerald-200">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Suma serii w cyklu: <strong className="font-mono text-emerald-300 font-extrabold">{totalExecutedSetsAll} serii</strong></span>
          </div>
        </div>

        {/* Horizontal SVG / Visual Progress Bar Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {activeGroupMetrics.map((g) => {
            const pctOfTotal = totalExecutedSetsAll > 0 ? Math.round((g.totalExecutedSets / totalExecutedSetsAll) * 100) : 0;
            const maxGroupSets = Math.max(1, ...activeGroupMetrics.map((m) => m.totalExecutedSets));
            const barFillPct = maxGroupSets > 0 ? Math.max(5, (g.totalExecutedSets / maxGroupSets) * 100) : 0;
            const isSelected = selectedGroup === g.id;

            return (
              <div
                key={g.id}
                onClick={() => setSelectedGroup(selectedGroup === g.id ? 'all' : g.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                  isSelected
                    ? 'bg-slate-950 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                }`}
                id={`chart2-group-${g.id}`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{g.icon}</span>
                    <span className="font-bold text-slate-200">{g.name}</span>
                  </div>
                  <div className="font-mono text-xs text-right">
                    <span className="text-emerald-300 font-extrabold text-sm">{g.totalExecutedSets}</span>
                    <span className="text-slate-500 text-[10px]"> serii</span>
                  </div>
                </div>

                {/* Bar Visualizer */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800 flex">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barFillPct}%`,
                        backgroundColor: g.color.hex
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>{g.exerciseCount} ćwiczeń w partii</span>
                    <span className="text-slate-400 font-semibold">{pctOfTotal}% całości cyklu</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dedykowany Moduł: Podciąganie na drążku (Ciężar + Powtórzenia) */}
      {(selectedGroup === 'all' || selectedGroup === 'plecy') && (
        <div className="bg-gradient-to-r from-emerald-950/30 via-slate-900 to-teal-950/30 border border-emerald-900/40 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🎯</span>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Plecy: Specjalna Analiza Podciągania na Drążku</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 text-[10px] font-mono">
                    Ciężar &amp; Powtórzenia
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Precyzyjna progresja wytrzymałościowo-siłowa podciągania (nachwyt / podchwyt).
                </p>
              </div>
            </div>
            {pullUpExercises.length > 0 && (
              <span className="text-xs text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-lg">
                ✓ Aktywne w Twoim planie treningowym
              </span>
            )}
          </div>

          {pullUpExercises.length === 0 ? (
            <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-400">
              Nie dodano jeszcze ćwiczenia "Podciąganie na drążku" do planu treningowego. Dodaj je w zakładce <strong>Plan &amp; Ciężary</strong>, aby śledzić progresję powtórzeń i ciężaru na pasie.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {pullUpExercises.map((pu) => {
                const repGain = pu.maxReps - pu.initialReps;
                return (
                  <div key={pu.name} className="col-span-1 md:col-span-2 lg:col-span-4 bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span>{pu.name}</span>
                      </h4>
                      <span className="text-[11px] font-mono text-slate-400">
                        Ostatnio: {pu.latestSets} serie x {pu.latestReps} powt. @ {pu.latestWeight} {unit}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      {/* Reps progress */}
                      <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3">
                        <span className="text-[10px] text-slate-500 uppercase block">Progres Powtórzeń:</span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="font-bold text-base text-slate-200">{pu.initialReps}</span>
                          <span className="text-slate-500">➔</span>
                          <span className="font-bold text-base text-teal-400">{pu.maxReps} powt.</span>
                        </div>
                        <span className={`text-[10px] font-bold ${repGain >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {repGain >= 0 ? `+${repGain} powt. w serii` : `${repGain} powt.`}
                        </span>
                      </div>

                      {/* Weight progress */}
                      <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3">
                        <span className="text-[10px] text-slate-500 uppercase block">Ciężar Dodany (pas):</span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="font-bold text-base text-slate-200">{pu.initialWeight}</span>
                          <span className="text-slate-500">➔</span>
                          <span className="font-bold text-base text-emerald-400">{pu.maxWeight} {unit}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {pu.weightGain >= 0 ? `+${pu.weightGain} ${unit}` : `${pu.weightGain} ${unit}`}
                        </span>
                      </div>

                      {/* Max reps in single set */}
                      <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3">
                        <span className="text-[10px] text-slate-500 uppercase block">Rekord Serii:</span>
                        <div className="font-bold text-base text-amber-400 mt-1">
                          {pu.maxReps} powtórzeń
                        </div>
                        <span className="text-[10px] text-slate-400">Czysta technika do brody</span>
                      </div>

                      {/* History count */}
                      <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3">
                        <span className="text-[10px] text-slate-500 uppercase block">Zarejestrowanych Sesji:</span>
                        <div className="font-bold text-base text-teal-400 mt-1">
                          {pu.history.length} treningów
                        </div>
                        <span className="text-[10px] text-slate-400">Historia postępów</span>
                      </div>
                    </div>

                    {/* Timeline of pull-up progress */}
                    {pu.history.length > 0 && (
                      <div className="bg-slate-900/70 rounded-lg p-3 border border-slate-800 text-[11px] font-mono space-y-1.5">
                        <span className="text-[10px] text-slate-400 block uppercase font-sans font-semibold">
                          Chronologiczny rejestr podciągania (Powtórzenia &amp; Ciężar):
                        </span>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {pu.history.map((h, i) => (
                            <span key={i} className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1">
                              <span className="text-slate-500">{h.date}:</span>
                              <span className="font-bold text-teal-400">{h.reps} powt.</span>
                              <span className="text-slate-400">@ {h.weight} {unit}</span>
                              {i > 0 && h.reps > pu.history[i - 1].reps && (
                                <span className="text-emerald-400 text-[10px]">▲</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Muscle Groups Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {MUSCLE_GROUPS.filter((g) => (selectedGroup === 'all' || selectedGroup === g.id) && (!analysisHideEmptyGroups || groupedData[g.id].length > 0)).map((group) => {
          const exercises = groupedData[group.id];
          const totalGroupVol = exercises.reduce((acc, e) => acc + e.totalVolume, 0);
          const totalGroupExecutedSets = exercises.reduce((acc, e) => acc + e.executedSets, 0);
          const topExercise = exercises.slice().sort((a, b) => b.weightGain - a.weightGain)[0];

          return (
            <div
              key={group.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-sm"
              id={`card-group-${group.id}`}
            >
              {/* Group Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{group.icon}</span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span>{group.name}</span>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {exercises.length} {exercises.length === 1 ? 'ćwiczenie' : 'ćwiczeń'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{group.description}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase block">Wykonane Serie:</span>
                  <span className="font-mono font-extrabold text-xs text-emerald-300">
                    {totalGroupExecutedSets} serii
                  </span>
                  <span className="text-[10px] text-slate-500 block font-mono">
                    ({totalGroupVol.toLocaleString('pl-PL')} {unit})
                  </span>
                </div>
              </div>

              {/* Exercises in Group */}
              {exercises.length === 0 ? (
                <div className="p-4 bg-slate-950/40 border border-dashed border-slate-800 rounded-lg text-center text-xs text-slate-500">
                  Brak ćwiczeń przypisanych do tej partii w aktualnym planie.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {exercises.map((ex) => {
                    const isPositive = ex.weightGain > 0;
                    return (
                      <div
                        key={ex.name}
                        className="bg-slate-950 border border-slate-800/90 rounded-lg p-3 text-xs space-y-2 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-200 truncate">{ex.name}</span>
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] flex items-center gap-1 ${
                            isPositive
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/50'
                              : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}>
                            {isPositive ? `+${ex.weightGain} ${unit} (+${ex.weightGainPct}%)` : `0 ${unit}`}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-400">
                          <div className="bg-slate-900/80 px-2 py-1.5 rounded">
                            <span className="text-[9px] text-slate-500 block uppercase font-sans">Wyjściowy:</span>
                            <span className="text-slate-200 font-bold">{ex.initialWeight} {unit}</span>
                          </div>
                          <div className="bg-slate-900/80 px-2 py-1.5 rounded">
                            <span className="text-[9px] text-slate-500 block uppercase font-sans">Aktualny:</span>
                            <span className="text-emerald-400 font-bold">{ex.latestWeight} {unit}</span>
                          </div>
                          <div className="bg-slate-900/80 px-2 py-1.5 rounded">
                            <span className="text-[9px] text-slate-500 block uppercase font-sans">Wykonano:</span>
                            <span className="text-teal-300 font-bold">{ex.executedSets} serii</span>
                          </div>
                          <div className="bg-slate-900/80 px-2 py-1.5 rounded">
                            <span className="text-[9px] text-slate-500 block uppercase font-sans">Szac. 1RM:</span>
                            <span className="text-amber-400 font-bold">{ex.best1RM} {unit}</span>
                          </div>
                        </div>

                        {/* Mini history pill row */}
                        {ex.history.length > 1 && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono overflow-x-auto no-scrollbar pt-1">
                            <span>Historia:</span>
                            {ex.history.map((h, idx) => (
                              <span key={idx} className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-300">
                                {h.weight}k
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Best performer badge */}
              {topExercise && topExercise.weightGain > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    Lider progresu: <strong className="text-slate-200">{topExercise.name}</strong>
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">
                    +{topExercise.weightGain} {unit}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
