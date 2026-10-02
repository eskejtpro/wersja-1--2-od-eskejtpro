import React, { useMemo, useState, useEffect } from 'react';
import { 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Dumbbell, 
  Scale, 
  Calendar, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Sparkles, 
  ArrowUp, 
  ArrowDown, 
  Minus,
  Activity,
  Flame,
  BarChart3,
  Zap,
  Target,
  LayoutGrid,
  Columns,
  LayoutList,
  ChevronRight,
  Eye,
  Bot
} from 'lucide-react';
import { TrainingWeek, BodyWeightEntry, AppSettings } from '../types';
import { calculate1RM } from '../utils/calculations';
import { AnalysisExecutionOptions, analysisOptionsForWeek, detectVolumeJumps, executedReps, executedSets, executedVolume, historyForAnalysis, includeExerciseInAnalysis, regularityPercent, rollingAverage, scopeAnalysisWeeks, summarizeExecution, summarizeMonthlyExecution, summarizeWeekExercises, summarizeWeeklyExecution, volumeDeltaPercent, volumePerSet } from '../utils/analysis';
import { AiAgentReportCard } from './AiAgentReportCard';

type ReportLayoutPreset = 'bento_left' | 'compact_dashboard' | 'split_preview' | 'executive_strip';

interface MesocycleReportViewProps {
  weeks: TrainingWeek[];
  bodyWeights?: BodyWeightEntry[];
  unit: 'kg' | 'lbs';
  analysisOnlyCompleted?: boolean;
  analysisStartWeek?: number;
  analysisEndWeek?: number;
  analysisIncludePartialHistory?: boolean;
  analysisRequireHistoryForCompleted?: boolean;
  analysisMinExecutedSets?: number;
  analysisShowExecutionSummary?: boolean;
  analysisShowWeekComparison?: boolean;
  analysisShowWeeklyTonnage?: boolean;
  analysisShowWeeklyMetrics?: boolean;
  analysisShowExecutedDays?: boolean;
  analysisShowExecutedExercises?: boolean;
  analysisShowExecutedSets?: boolean;
  analysisShowExecutedReps?: boolean;
  analysisShowVolumeDelta?: boolean;
  analysisShowDataConfidence?: boolean;
  analysisShowRegularity?: boolean;
  analysisRegularityTargetPct?: number;
  analysisShowMonthlyComparison?: boolean;
  analysisMonthlyMetric?: 'volume' | 'executedSets' | 'executedReps';
  analysisShowPeriodComparison?: boolean;
  analysisPeriodComparisonMetric?: 'volume' | 'executedSets' | 'executedReps' | 'executedDays';
  analysisShowRollingVolume?: boolean;
  analysisWarnVolumeJumpPct?: number;
  analysisReportLayout?: ReportLayoutPreset;
  analysisShowLayoutSwitcher?: boolean;
  analysisShowAiAgent?: boolean;
  aiAgentMode?: 'heuristic_local' | 'server_endpoint';
  aiAgentServerUrl?: string;
  aiAgentApiKey?: string;
  aiAgentPersona?: 'coach_hardcore' | 'sports_scientist' | 'regenerative' | 'balanced';
  aiAgentFocus?: 'all_muscles' | 'hypertrophy_volume' | 'strength_progression' | 'fatigue_management';
  aiAgentResponseLength?: 'concise' | 'detailed' | 'bullet_points';
}

interface MainLiftSummary {
  name: string;
  category?: string;
  startWeight: number;
  endWeight: number;
  weightGain: number;
  weightGainPct: number;
  startReps: number;
  endReps: number;
  start1RM: number;
  end1RM: number;
  gain1RM: number;
  isMainCompound: boolean;
}

export const MesocycleReportView: React.FC<MesocycleReportViewProps> = ({
  weeks: sourceWeeks = [],
  bodyWeights = [],
  unit = 'kg', 
  analysisOnlyCompleted = true, 
  analysisStartWeek = 1, 
  analysisEndWeek = 999, 
  analysisIncludePartialHistory = false, 
  analysisRequireHistoryForCompleted = false, 
  analysisMinExecutedSets = 1, 
  analysisShowExecutionSummary = true, 
  analysisShowWeekComparison = true, 
  analysisShowWeeklyTonnage = false, 
  analysisShowWeeklyMetrics = false, 
  analysisShowExecutedDays = true, 
  analysisShowExecutedExercises = true, 
  analysisShowExecutedSets = true, 
  analysisShowExecutedReps = true, 
  analysisShowVolumeDelta = true, 
  analysisShowDataConfidence = true, 
  analysisShowRegularity = false, 
  analysisRegularityTargetPct = 80, 
  analysisShowMonthlyComparison = false, 
  analysisMonthlyMetric = 'volume', 
  analysisShowPeriodComparison = false, 
  analysisPeriodComparisonMetric = 'volume', 
  analysisShowRollingVolume = false, 
  analysisWarnVolumeJumpPct = 30,
  analysisReportLayout,
  analysisShowLayoutSwitcher = false,
  analysisShowAiAgent = true,
  aiAgentMode,
  aiAgentServerUrl,
  aiAgentApiKey,
  aiAgentPersona,
  aiAgentFocus,
  aiAgentResponseLength
}) => {
  const weeks = useMemo(() => scopeAnalysisWeeks(sourceWeeks, analysisStartWeek, analysisEndWeek), [sourceWeeks, analysisStartWeek, analysisEndWeek]);
  const analysisOptions = useMemo<AnalysisExecutionOptions>(() => ({
    onlyCompleted: analysisOnlyCompleted,
    includePartialHistory: analysisIncludePartialHistory,
    requireHistoryForCompleted: analysisRequireHistoryForCompleted,
    minExecutedSets: analysisMinExecutedSets,
    startDate: weeks[0]?.startDate,
  }), [analysisOnlyCompleted, analysisIncludePartialHistory, analysisRequireHistoryForCompleted, analysisMinExecutedSets, weeks]);
  const executionSummary = useMemo(() => summarizeExecution(weeks, analysisOptions), [weeks, analysisOptions]);
  const weeklyMetrics = useMemo(() => summarizeWeeklyExecution(weeks, analysisOptions), [weeks, analysisOptions]);
  const rollingVolume = useMemo(() => rollingAverage(weeklyMetrics.map((m) => m.volume), 4), [weeklyMetrics]);
  const volumeJumpAlerts = useMemo(() => detectVolumeJumps(weeklyMetrics, analysisWarnVolumeJumpPct), [weeklyMetrics, analysisWarnVolumeJumpPct]);
  const monthlyMetrics = useMemo(() => summarizeMonthlyExecution(weeks, analysisOptions), [weeks, analysisOptions]);
  const periodComparison = useMemo(() => {
    const half = Math.ceil(weeklyMetrics.length / 2);
    const first = weeklyMetrics.slice(0, half);
    const second = weeklyMetrics.slice(half);
    const sum = (items: typeof weeklyMetrics) => items.reduce((acc, item) => ({
      plannedDays: acc.plannedDays + item.plannedDays,
      executedDays: acc.executedDays + item.executedDays,
      executedExercises: acc.executedExercises + item.executedExercises,
      executedSets: acc.executedSets + item.executedSets,
      executedReps: acc.executedReps + item.executedReps,
      volume: acc.volume + item.volume,
    }), { plannedDays: 0, executedDays: 0, executedExercises: 0, executedSets: 0, executedReps: 0, volume: 0 });
    const firstSummary = sum(first);
    const secondSummary = sum(second);
    const metricValue = (summary: typeof firstSummary) => summary[analysisPeriodComparisonMetric];
    return {
      firstWeeks: first.map((item) => item.weekNumber).join(', '),
      secondWeeks: second.map((item) => item.weekNumber).join(', '),
      first: firstSummary,
      second: secondSummary,
      firstValue: metricValue(firstSummary),
      secondValue: metricValue(secondSummary),
      delta: metricValue(secondSummary) - metricValue(firstSummary),
      hasEnoughData: first.length > 0 && second.length > 0 && (firstSummary.executedDays > 0 || secondSummary.executedDays > 0),
    };
  }, [weeklyMetrics, analysisPeriodComparisonMetric]);
  const [compareWeekAId, setCompareWeekAId] = useState<string>('');
  const [compareWeekBId, setCompareWeekBId] = useState<string>('');
  const compareWeekA = weeks.find((week) => week.id === compareWeekAId) || weeks[0];
  const compareWeekB = weeks.find((week) => week.id === compareWeekBId) || weeks[weeks.length - 1];
  const comparisonRows = useMemo(() => {
    if (!compareWeekA || !compareWeekB || compareWeekA.id === compareWeekB.id) return [];
    const first = summarizeWeekExercises(compareWeekA, analysisOptions);
    const last = summarizeWeekExercises(compareWeekB, analysisOptions);
    const names = new Set([...first.map((item) => item.name), ...last.map((item) => item.name)]);
    return Array.from(names).map((name) => {
      const a = first.find((item) => item.name === name);
      const b = last.find((item) => item.name === name);
      const volumeDelta = (b?.volume || 0) - (a?.volume || 0);
      return {
        name,
        firstVolume: a?.volume || 0,
        lastVolume: b?.volume || 0,
        firstSets: a?.sets || 0,
        lastSets: b?.sets || 0,
        firstReps: a?.reps || 0,
        lastReps: b?.reps || 0,
        volumeDelta,
      };
    }).sort((a, b) => Math.abs(b.volumeDelta) - Math.abs(a.volumeDelta) || a.name.localeCompare(b.name));
  }, [compareWeekA, compareWeekB, analysisOptions]);
  // 1. Overall Volume & Tonnage Analysis
  const totalVolumeKg = useMemo(() => {
    return weeks.reduce((wAcc, w, weekIndex) => {
      const weekOptions = analysisOptionsForWeek(w, analysisOptions, weeks[weekIndex + 1]?.startDate);
      return (
        wAcc +
        w.days.reduce((dAcc, d) => {
          return (
            dAcc +
            d.exercises.reduce((eAcc, e) => {
              return eAcc + executedVolume(d, e, weekOptions);
            }, 0)
          );
        }, 0)
      );
    }, 0);
  }, [weeks, analysisOptions]);

  // Volume by Week
  const weeklyTonnage = useMemo(() => weeklyMetrics.map((metrics, idx) => ({
    ...metrics,
    weekName: weeks[idx]?.name || `Tydzień ${metrics.weekNumber}`,
    startDate: weeks[idx]?.startDate,
    totalDays: metrics.plannedDays,
    completedDays: metrics.executedDays,
    isCompleted: metrics.plannedDays > 0 && metrics.executedDays === metrics.plannedDays,
  })), [weeklyMetrics, weeks]);

  const maxWeeklyVol = useMemo(() => {
    const vols = weeklyTonnage.map((w) => w.volume);
    return vols.length > 0 ? Math.max(...vols, 1000) : 1000;
  }, [weeklyTonnage]);

  // 2. Training Adherence / Frequency Metrics
  const { plannedDays: totalWorkouts, executedDays: executedWorkouts, executedSets: totalSetsCount, executedReps: totalRepsCount } = executionSummary;

  const adherencePct = totalWorkouts > 0 ? Math.round((executedWorkouts / totalWorkouts) * 100) : 0;

  // 3. Body Weight Progression over Cycle
  const weightProgression = useMemo(() => {
    if (!bodyWeights || bodyWeights.length === 0) return null;

    const sorted = [...bodyWeights].sort((a, b) => a.date.localeCompare(b.date));
    const firstEntry = sorted[0];
    const lastEntry = sorted[sorted.length - 1];

    const startWeight = firstEntry.weight;
    const endWeight = lastEntry.weight;
    const diff = Math.round((endWeight - startWeight) * 10) / 10;
    const diffPct = startWeight > 0 ? Math.round((diff / startWeight) * 1000) / 10 : 0;

    // Approximate duration in weeks
    const firstD = new Date(firstEntry.date);
    const lastD = new Date(lastEntry.date);
    const diffDays = Math.max(1, Math.round((lastD.getTime() - firstD.getTime()) / (1000 * 3600 * 24)));
    const durationWeeks = Math.max(1, Math.round((diffDays / 7) * 10) / 10);
    const ratePerWeek = Math.round((diff / durationWeeks) * 100) / 100;

    return {
      startDate: firstEntry.date,
      endDate: lastEntry.date,
      startWeight,
      endWeight,
      diff,
      diffPct,
      durationWeeks,
      ratePerWeek
    };
  }, [bodyWeights]);

  // 4. Main Compound Lifts Progression (Tydzień 1 vs Ostatni Tydzień)
  const mainLifts = useMemo(() => {
    if (weeks.length === 0) return [];

    const firstWeek = weeks[0];
    const lastWeek = weeks[weeks.length - 1];

    // Collect all exercises from all weeks by normalized name
    const liftNamesSet = new Set<string>();
    weeks.forEach((w, weekIndex) => {
      const weekOptions = analysisOptionsForWeek(w, analysisOptions, weeks[weekIndex + 1]?.startDate);
      w.days.forEach((d) => {
        d.exercises.forEach((e) => {
          if (includeExerciseInAnalysis(d, e, weekOptions)) liftNamesSet.add(e.name.trim());
        });
      });
    });

    const isCompoundName = (n: string) => {
      const lower = n.toLowerCase();
      return (
        lower.includes('wyciskanie') ||
        lower.includes('przysiad') ||
        lower.includes('martwy') ||
        lower.includes('ohp') ||
        lower.includes('żołnierskie') ||
        lower.includes('podciąganie') ||
        lower.includes('wiosłowanie') ||
        lower.includes('bench') ||
        lower.includes('squat') ||
        lower.includes('deadlift') ||
        lower.includes('press') ||
        lower.includes('row')
      );
    };

    const detectCategory = (n: string, explicitCat?: string): string => {
      if (explicitCat) {
        const map: Record<string, string> = {
          klatka: 'Klatka',
          plecy: 'Plecy',
          biceps: 'Biceps',
          triceps: 'Triceps',
          barki: 'Barki',
          nogi: 'Nogi',
          brzuch: 'Brzuch',
          klata: 'Klatka'
        };
        return map[explicitCat.toLowerCase()] || explicitCat;
      }
      const lower = n.toLowerCase();
      if (lower.includes('wycisk') || lower.includes('klat') || lower.includes('hantl') || lower.includes('rozpiętki') || lower.includes('dips') || lower.includes('bench')) return 'Klatka';
      if (lower.includes('martwy') || lower.includes('wiosł') || lower.includes('podciąg') || lower.includes('ściąg') || lower.includes('plec') || lower.includes('row') || lower.includes('pull')) return 'Plecy';
      if (lower.includes('przysiad') || lower.includes('squat') || lower.includes('rdl') || lower.includes('wykrok') || lower.includes('suwnic') || lower.includes('czworogł') || lower.includes('dwugł') || lower.includes('łydk') || lower.includes('nog')) return 'Nogi';
      if (lower.includes('ohp') || lower.includes('żołnierskie') || lower.includes('boki') || lower.includes('wznosy') || lower.includes('bark') || lower.includes('press') || lower.includes('military')) return 'Barki';
      if (lower.includes('biceps') || lower.includes('uginan')) return 'Biceps';
      if (lower.includes('triceps') || lower.includes('prostowan') || lower.includes('francusk')) return 'Triceps';
      if (lower.includes('plank') || lower.includes('deska') || lower.includes('brzuch') || lower.includes('wiszen') || lower.includes('allahy') || lower.includes('core')) return 'Brzuch';
      return 'Ogólne';
    };

    const summaries: MainLiftSummary[] = [];

    liftNamesSet.forEach((liftName) => {
      // Find start occurrence (preferably in week 1, or first week it appears)
      let startEx = null;
      for (let weekIndex = 0; weekIndex < weeks.length; weekIndex += 1) {
        const w = weeks[weekIndex];
        const weekOptions = analysisOptionsForWeek(w, analysisOptions, weeks[weekIndex + 1]?.startDate);
        for (const d of w.days) {
          const match = d.exercises.find((e) => e.name.trim().toLowerCase() === liftName.toLowerCase() && includeExerciseInAnalysis(d, e, weekOptions));
          if (match) {
            startEx = match;
            break;
          }
        }
        if (startEx) break;
      }

      // Find end occurrence (preferably in last week, or last week it appears)
      let endEx = null;
      for (let i = weeks.length - 1; i >= 0; i--) {
        const w = weeks[i];
        const weekOptions = analysisOptionsForWeek(w, analysisOptions, weeks[i + 1]?.startDate);
        for (const d of w.days) {
          const match = d.exercises.find((e) => e.name.trim().toLowerCase() === liftName.toLowerCase() && includeExerciseInAnalysis(d, e, weekOptions));
          if (match) {
            endEx = match;
            break;
          }
        }
        if (endEx) break;
      }

      if (startEx && endEx) {
        const startIndex = weeks.findIndex((week) => week.days.some((day) => day.exercises.includes(startEx!)));
        const endIndex = weeks.findIndex((week) => week.days.some((day) => day.exercises.includes(endEx!)));
        const startHistory = historyForAnalysis(startEx, analysisOptionsForWeek(weeks[startIndex], analysisOptions, weeks[startIndex + 1]?.startDate));
        const endHistory = historyForAnalysis(endEx, analysisOptionsForWeek(weeks[endIndex], analysisOptions, weeks[endIndex + 1]?.startDate));
        const startPoint = startHistory.length ? startHistory[0] : startEx;
        const endPoint = endHistory.length ? endHistory[endHistory.length - 1] : endEx;
        const sWeight = startPoint.weight;
        const eWeight = endPoint.weight;
        const sReps = startPoint.reps;
        const eReps = endPoint.reps;
        const s1RM = calculate1RM(sWeight, sReps);
        const e1RM = calculate1RM(eWeight, eReps);

        const wGain = Math.round((eWeight - sWeight) * 10) / 10;
        const wGainPct = sWeight > 0 ? Math.round((wGain / sWeight) * 1000) / 10 : 0;
        const gain1RM = Math.round((e1RM - s1RM) * 10) / 10;

        summaries.push({
          name: liftName,
          category: detectCategory(liftName, endEx.category || startEx.category),
          startWeight: sWeight,
          endWeight: eWeight,
          weightGain: wGain,
          weightGainPct: wGainPct,
          startReps: sReps,
          endReps: eReps,
          start1RM: s1RM,
          end1RM: e1RM,
          gain1RM,
          isMainCompound: isCompoundName(liftName)
        });
      }
    });

    // Sort: Compound lifts first, then by highest absolute progress
    return summaries.sort((a, b) => {
      if (a.isMainCompound && !b.isMainCompound) return -1;
      if (!a.isMainCompound && b.isMainCompound) return 1;
      return b.weightGain - a.weightGain;
    });
  }, [weeks, analysisOptions]);

  // Layout Proposal State (Persisted in localStorage & AppSettings)
  const [layoutPreset, setLayoutPreset] = useState<ReportLayoutPreset>(() => {
    if (analysisReportLayout) return analysisReportLayout;
    try {
      const saved = localStorage.getItem('gymtracker_report_layout_preset');
      if (saved && ['bento_left', 'compact_dashboard', 'split_preview', 'executive_strip'].includes(saved)) {
        return saved as ReportLayoutPreset;
      }
    } catch (_) {}
    return 'bento_left';
  });

  useEffect(() => {
    if (analysisReportLayout) {
      setLayoutPreset(analysisReportLayout);
    }
  }, [analysisReportLayout]);

  const handleSelectPreset = (preset: ReportLayoutPreset) => {
    setLayoutPreset(preset);
    try {
      localStorage.setItem('gymtracker_report_layout_preset', preset);
    } catch (_) {}
  };

  // Additional Computed Analytics for Modern Presentation
  const avgVolumePerWorkout = executedWorkouts > 0 ? Math.round(totalVolumeKg / executedWorkouts) : 0;
  const avgVolumePerSet = totalSetsCount > 0 ? Math.round((totalVolumeKg / totalSetsCount) * 10) / 10 : 0;
  const avgRepsPerSet = totalSetsCount > 0 ? Math.round((totalRepsCount / totalSetsCount) * 10) / 10 : 0;
  
  const cycleStatus = useMemo(() => {
    if (weeks.length >= 6) return { label: 'Zalecany Deload', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    if (adherencePct >= 90) return { label: 'Wysoka Dyscyplina', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    if (adherencePct >= 70) return { label: 'Faza Akumulacji', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
    return { label: 'Cykl w Toku', color: 'text-slate-400 bg-slate-800 border-slate-700' };
  }, [weeks.length, adherencePct]);

  // Handle Print Action
  const handlePrint = () => {
    window.print();
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-6" id="mesocycle-summary-report">
      {/* ─── INTELIGENTNY AGENT ANALITYCZNY & AI COACH ─── */}
      {analysisShowAiAgent !== false && (
        <AiAgentReportCard
          weeks={weeks}
          bodyWeights={bodyWeights}
          unit={unit}
          settings={{
            unit,
            aiAgentMode,
            aiAgentServerUrl,
            aiAgentApiKey,
            aiAgentPersona,
            aiAgentFocus,
            aiAgentResponseLength
          } as AppSettings}
        />
      )}

      {/* ─── GÓRNA BELKA NAWIGACJI / SELEKTOR PROPOZYCJI UKŁADU (OPCJONALNY / Z USTAWIEŃ) ─── */}
      {analysisShowLayoutSwitcher && (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-tight">Układ Raportu & Kafelków</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                  4 Propozycje
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Wybierz najbardziej intuicyjną kompozycję kafelków podsumowania:</p>
            </div>
          </div>

          {/* 4 Pigułki Przełączania Propozycji */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => handleSelectPreset('bento_left')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                layoutPreset === 'bento_left'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
              title="Propozycja 1: Bento z dużą centralą tonażu po lewej stronie"
            >
              <Columns className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">1. Bento Lewa</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPreset('compact_dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                layoutPreset === 'compact_dashboard'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
              title="Propozycja 2: Klasyczny, symetryczny Dashboard 4-karty Pro z paskami"
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">2. Dashboard Pro</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPreset('split_preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                layoutPreset === 'split_preview'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
              title="Propozycja 3: Split 60/40 - Kafelki po lewej i natychmiastowy wykres po prawej"
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">3. Split 60/40</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPreset('executive_strip')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                layoutPreset === 'executive_strip'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
              title="Propozycja 4: Kompaktowa wstęga wskaźników KPI bez zbędnego scrollowania"
            >
              <LayoutList className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">4. Wstęga KPI</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PROPOZYCJA 1: BENTO CENTRALA PO LEWEJ STRONIE (ASYMETRYCZNY NOWOCZESNY)
          ═══════════════════════════════════════════════════════════════════════ */}
      {layoutPreset === 'bento_left' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch animate-fadeIn">
          {/* LEWA STRONA: GŁÓWNA CENTRALA CYKLU & FUNKCJE WYŻEJ */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-md flex flex-col justify-between relative overflow-hidden group">
            {/* Tło akcentowe */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-4 relative z-10">
              {/* Header z etykietą i statusem cyklu */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 font-mono">
                    Główny Wynik Cyklu
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cycleStatus.color}`}>
                  {cycleStatus.label}
                </span>
              </div>

              {/* Tonaż w centrum uwagi */}
              <div className="pt-1">
                <div className="text-xs text-slate-400 font-medium">Łączny Tonaż Mezocyklu</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono">
                    {totalVolumeKg.toLocaleString('pl-PL')}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono">
                    {unit.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Całkowity podniesiony ciężar na przestrzeni <strong className="text-slate-200">{weeks.length} tygodni</strong> ({executionSummary.executedDays} sesji).
                </p>
              </div>

              {/* Mikro-wskaźniki intensywności w centrali */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block font-medium">Śr. Tonaż / Trening</span>
                  <span className="text-sm font-bold text-white font-mono">
                    {avgVolumePerWorkout.toLocaleString('pl-PL')} {unit}
                  </span>
                </div>
                <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block font-medium">Śr. Obciążenie / Seria</span>
                  <span className="text-sm font-bold text-sky-300 font-mono">
                    {avgVolumePerSet.toLocaleString('pl-PL')} {unit}
                  </span>
                </div>
              </div>
            </div>

            {/* Główne Przyciski Akcji na Dole Centrali (Wyżej i z Lewej) */}
            <div className="pt-5 mt-5 border-t border-slate-800/80 flex flex-wrap items-center gap-2.5 relative z-10">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                id="btn-print-report-bento"
              >
                <Printer className="w-4 h-4 text-slate-950" />
                <span>Drukuj / Zapisz Raport PDF</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('analysis-week-comparison')}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                title="Przewiń do porównania wykonania tygodni"
              >
                <span>Porównaj</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* PRAWA STRONA: 4 SEKCJE METRYK (SIATKA 2x2) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. MASA CIAŁA I TREND */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Scale className="w-4 h-4" />
                  <span>Masa Ciała & Skład</span>
                </span>
                {weightProgression && (
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                    weightProgression.diff < 0 ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'
                  }`}>
                    {weightProgression.diff < 0 ? 'Redukcja' : weightProgression.diff > 0 ? 'Masa' : 'Utrzymanie'}
                  </span>
                )}
              </div>

              {weightProgression ? (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl sm:text-3xl font-black font-mono ${
                      weightProgression.diff >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {weightProgression.diff >= 0 ? `+${weightProgression.diff}` : weightProgression.diff} {unit}
                    </span>
                    <span className="text-xs text-slate-400 font-medium font-mono">
                      ({weightProgression.diffPct >= 0 ? `+${weightProgression.diffPct}` : weightProgression.diffPct}%)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span>Start: <strong className="text-slate-200">{weightProgression.startWeight} {unit}</strong></span>
                    <span>Koniec: <strong className="text-slate-200">{weightProgression.endWeight} {unit}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="py-3 text-center text-xs text-slate-500 font-mono">
                  Brak wpisów wagi w wybranym okresie
                </div>
              )}
            </div>

            {/* 2. FREKWENCJA I REALIZACJA */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Frekwencja & Realizacja</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  Cel: 80%
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                    {adherencePct}%
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    {executedWorkouts} / {totalWorkouts} dni
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800/80">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      adherencePct >= 80 ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(4, adherencePct))}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400">
                  {adherencePct >= 80 ? 'Plan zrealizowany z należytą starannością' : 'Uwaga na opuszczone jednostki treningowe'}
                </div>
              </div>
            </div>

            {/* 3. WOLUMEN SERII I POWTÓRZEŃ */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  <span>Objętość & Serie</span>
                </span>
                <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                  Śr. {avgRepsPerSet} powt./seria
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-purple-300 font-mono">
                    {totalSetsCount}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">wykonanych serii</span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                  Łącznie <strong className="text-slate-200 font-mono">{totalRepsCount.toLocaleString('pl-PL')}</strong> wykonanych powtórzeń roboczych.
                </p>
              </div>
            </div>

            {/* 4. ĆWICZENIA & REKORDY SIŁOWE */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Flame className="w-4 h-4" />
                  <span>Baza Ćwiczeń & Boje</span>
                </span>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {mainLifts.filter(l => l.isMainCompound).length} Bojów Głównych
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                    {executionSummary.executedExercises}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">ćwiczeń w planie</span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                  Zanotowano <strong className="text-emerald-400">{mainLifts.filter(l => l.weightGain > 0).length}</strong> ćwiczeń z dodatnim przyrostem siły.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PROPOZYCJA 2: DASHBOARD PRO (4 NOWOCZESNE KARTY Z PASKAMI POSTĘPU)
          ═══════════════════════════════════════════════════════════════════════ */}
      {layoutPreset === 'compact_dashboard' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Górna belka akcji dla Dashboardu */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Podsumowanie Mezocyklu (Dashboard Pro)</h3>
                <p className="text-xs text-slate-400">Zakres: tydzień {weeks[0]?.number}–{weeks[weeks.length - 1]?.number} ({weeks.length} tyg.)</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Drukuj Raport PDF</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Kafelek 1: Tonaż */}
            <div className="bg-slate-900 border-l-4 border-l-emerald-400 border-y border-r border-slate-800 rounded-2xl p-4.5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 font-mono">Tonaż Całego Cyklu</span>
                <Dumbbell className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-white font-mono">
                {totalVolumeKg.toLocaleString('pl-PL')} <span className="text-sm font-normal text-slate-400">{unit}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Średnio <strong className="text-slate-200">{avgVolumePerWorkout.toLocaleString('pl-PL')} {unit}</strong> na każdą sesję treningową.
              </p>
            </div>

            {/* Kafelek 2: Masa Ciała */}
            <div className="bg-slate-900 border-l-4 border-l-sky-400 border-y border-r border-slate-800 rounded-2xl p-4.5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300 font-mono">Masa Ciała (Cykl)</span>
                <Scale className="w-4 h-4 text-sky-400" />
              </div>
              {weightProgression ? (
                <>
                  <div className="text-3xl font-black font-mono">
                    <span className={weightProgression.diff >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                      {weightProgression.diff >= 0 ? `+${weightProgression.diff}` : weightProgression.diff} {unit}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {weightProgression.startWeight} {unit} → {weightProgression.endWeight} {unit} ({weightProgression.diffPct >= 0 ? `+${weightProgression.diffPct}` : weightProgression.diffPct}%)
                  </p>
                </>
              ) : (
                <div className="text-xs text-slate-500 py-2">Brak pomiarów wagi</div>
              )}
            </div>

            {/* Kafelek 3: Frekwencja */}
            <div className="bg-slate-900 border-l-4 border-l-teal-400 border-y border-r border-slate-800 rounded-2xl p-4.5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300 font-mono">Frekwencja</span>
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-3xl font-black text-teal-300 font-mono">
                {adherencePct}%
              </div>
              <p className="text-[11px] text-slate-400">
                Wykonano <strong className="text-slate-200">{executedWorkouts} z {totalWorkouts}</strong> zaplanowanych jednostek.
              </p>
            </div>

            {/* Kafelek 4: Objętość */}
            <div className="bg-slate-900 border-l-4 border-l-purple-400 border-y border-r border-slate-800 rounded-2xl p-4.5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 font-mono">Objętość Pracy</span>
                <Layers className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-3xl font-black text-purple-300 font-mono">
                {totalSetsCount} <span className="text-sm font-normal text-slate-400">serii</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Łącznie <strong className="text-slate-200">{totalRepsCount.toLocaleString('pl-PL')}</strong> wykonanych powtórzeń.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PROPOZYCJA 3: SPLIT 60/40 (KAFELKI PO LEWEJ + NATYCHMIASTOWY PODGLĄD)
          ═══════════════════════════════════════════════════════════════════════ */}
      {layoutPreset === 'split_preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch animate-fadeIn">
          {/* LEWA STRONA: KOMPAKTOWE KAFELKI KPI (60%) */}
          <div className="lg:col-span-7 space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono block">Tonaż Łączny</span>
                <span className="text-2xl sm:text-3xl font-black text-white font-mono">{totalVolumeKg.toLocaleString('pl-PL')} {unit}</span>
                <span className="text-[10px] text-slate-400 block mt-1">{weeks.length} tyg. mezocyklu</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase font-bold text-sky-400 font-mono block">Masa Ciała</span>
                <span className="text-2xl sm:text-3xl font-black text-sky-300 font-mono">
                  {weightProgression ? `${weightProgression.diff >= 0 ? '+' : ''}${weightProgression.diff} ${unit}` : '—'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {weightProgression ? `${weightProgression.startWeight} → ${weightProgression.endWeight} ${unit}` : 'Brak danych'}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase font-bold text-teal-400 font-mono block">Frekwencja</span>
                <span className="text-2xl sm:text-3xl font-black text-teal-300 font-mono">{adherencePct}%</span>
                <span className="text-[10px] text-slate-400 block mt-1">{executedWorkouts}/{totalWorkouts} dni zaliczonych</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase font-bold text-purple-400 font-mono block">Serie & Powtórzenia</span>
                <span className="text-2xl sm:text-3xl font-black text-purple-300 font-mono">{totalSetsCount}</span>
                <span className="text-[10px] text-slate-400 block mt-1">{totalRepsCount.toLocaleString('pl-PL')} powtórzeń</span>
              </div>
            </div>

            {/* Pasek szybkiego eksportu pod kafelkami */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">Potrzebujesz pełnej dokumentacji?</span>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Eksportuj PDF</span>
              </button>
            </div>
          </div>

          {/* PRAWA STRONA: PODGLĄD WYKRESU PERIODYZACJI (40%) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Periodyzacja Tonażu</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Postęp tyg.</span>
              </div>

              <div className="space-y-2.5">
                {weeklyTonnage.map((w) => {
                  const pct = Math.round((w.volume / maxWeeklyVol) * 100);
                  return (
                    <div key={w.weekName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">{w.weekName}</span>
                        <span className="font-mono font-bold text-emerald-400 text-xs">{w.volume.toLocaleString('pl-PL')} {unit}</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.max(5, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Status: <strong className="text-slate-200">{cycleStatus.label}</strong></span>
              <button
                type="button"
                onClick={() => scrollToSection('analysis-weekly-tonnage')}
                className="text-emerald-400 hover:underline cursor-pointer"
              >
                Pełny wykres →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PROPOZYCJA 4: WSTĘGA STATYSTYK KPI (MINIMALISTYCZNY COMPACT STRIP)
          ═══════════════════════════════════════════════════════════════════════ */}
      {layoutPreset === 'executive_strip' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Podsumowanie Główne Cyklu</h3>
              <span className="text-xs text-slate-400 font-mono">({weeks.length} tygodni)</span>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Drukuj / PDF</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-800 pt-1">
            <div className="py-2 md:py-0 md:pr-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Tonaż Łączny</span>
              <span className="text-2xl font-black text-white font-mono">{totalVolumeKg.toLocaleString('pl-PL')} <span className="text-xs text-slate-400">{unit}</span></span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">Śr. {avgVolumePerWorkout.toLocaleString('pl-PL')} {unit}/trening</span>
            </div>

            <div className="py-2 md:py-0 md:px-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Waga Ciała</span>
              <span className="text-2xl font-black font-mono">
                {weightProgression ? (
                  <span className={weightProgression.diff >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                    {weightProgression.diff >= 0 ? `+${weightProgression.diff}` : weightProgression.diff} {unit}
                  </span>
                ) : <span className="text-slate-500">—</span>}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {weightProgression ? `${weightProgression.startWeight} → ${weightProgression.endWeight} ${unit}` : 'Brak wpisów'}
              </span>
            </div>

            <div className="py-2 md:py-0 md:px-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Frekwencja</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">{adherencePct}%</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{executedWorkouts}/{totalWorkouts} dni zaliczone</span>
            </div>

            <div className="py-2 md:py-0 md:pl-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Serie & Powtórzenia</span>
              <span className="text-2xl font-black text-purple-300 font-mono">{totalSetsCount} <span className="text-xs text-slate-400">serii</span></span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{totalRepsCount.toLocaleString('pl-PL')} powtórzeń</span>
            </div>
          </div>
        </div>
      )}

      {analysisShowExecutionSummary && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400" id="mesocycle-execution-summary">
          <span>Zakres: <strong className="text-slate-200">{weeks.length > 0 ? `tydzień ${weeks[0].number}–${weeks[weeks.length - 1].number}` : 'brak tygodni'}</strong></span>
          <span>Wykonane dni: <strong className="text-emerald-300">{executionSummary.executedDays}</strong></span>
          <span>Ćwiczenia: <strong className="text-emerald-300">{executionSummary.executedExercises}</strong></span>
          <span>Serie: <strong className="text-teal-300">{executionSummary.executedSets}</strong></span>
          <span>Powtórzenia: <strong className="text-teal-300">{executionSummary.executedReps.toLocaleString('pl-PL')}</strong></span>
        </div>
      )}

      {analysisShowWeekComparison && weeks.length > 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4" id="analysis-week-comparison">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Porównanie Wykonania Tygodni</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Porównaj wybrane tygodnie na podstawie faktycznie wykonanych ćwiczeń i serii.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <label className="text-slate-400" htmlFor="select-comparison-week-a">Od:</label>
              <select id="select-comparison-week-a" value={compareWeekA?.id || ''} onChange={(event) => setCompareWeekAId(event.target.value)} className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200">
                {weeks.map((week) => <option key={week.id} value={week.id}>{week.name}</option>)}
              </select>
              <label className="text-slate-400" htmlFor="select-comparison-week-b">Do:</label>
              <select id="select-comparison-week-b" value={compareWeekB?.id || ''} onChange={(event) => setCompareWeekBId(event.target.value)} className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200">
                {weeks.map((week) => <option key={week.id} value={week.id}>{week.name}</option>)}
              </select>
            </div>
          </div>

          {comparisonRows.length === 0 ? (
            <div className="px-3 py-4 rounded-lg bg-slate-950/60 border border-dashed border-slate-800 text-xs text-slate-500">Wybierz dwa różne tygodnie z wykonanymi ćwiczeniami.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]" id="week-comparison-table">
                <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <tr><th className="py-2 pr-3">Ćwiczenie</th><th className="py-2 px-3">Serie</th><th className="py-2 px-3">Powtórzenia</th><th className="py-2 px-3">Tonaż ({unit})</th><th className="py-2 pl-3">Zmiana</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {comparisonRows.map((row) => (
                    <tr key={row.name} data-exercise-name={row.name}>
                      <td className="py-2.5 pr-3 font-bold text-slate-200">{row.name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{row.firstSets} → {row.lastSets}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{row.firstReps} → {row.lastReps}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{row.firstVolume.toLocaleString('pl-PL')} → {row.lastVolume.toLocaleString('pl-PL')}</td>
                      <td className={`py-2.5 pl-3 font-mono font-bold ${row.volumeDelta > 0 ? 'text-emerald-300' : row.volumeDelta < 0 ? 'text-amber-300' : 'text-slate-500'}`}>{row.volumeDelta > 0 ? '+' : ''}{row.volumeDelta.toLocaleString('pl-PL')} {unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {volumeJumpAlerts.length > 0 && <div id="analysis-volume-jumps" className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-200">
        <strong>Skok tonażu tygodniowego:</strong> {volumeJumpAlerts.map((alert) => `tydz. ${alert.weekNumber} +${Math.round(alert.deltaPct)}%`).join(', ')}. To ostrzeżenie matematyczne na podstawie wykonanych danych.
      </div>}

      {/* ═══════════════════════════════════════════════════════════════════════
          SEKCJA 1: PROGRESJA SIŁOWA W GŁÓWNYCH BOJACH (TYDZIEŃ 1 VS OSTATNI)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4" id="analysis-main-lifts">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Progresja Siłowa w Głównych Bojach (Tydzień 1 vs Ostatni Tydzień)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Zestawienie wyników na początku mezocyklu z aktualnymi rekordami w bojach wielostawowych i akcesoriach.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 self-start sm:self-auto">
            {mainLifts.length} ćwiczeń w cyklu
          </span>
        </div>

        {mainLifts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
            Brak ćwiczeń w planie treningowym do wygenerowania tabeli progresu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3">Ćwiczenie</th>
                  <th className="py-2.5 px-3">Kategoria</th>
                  <th className="py-2.5 px-3">Tydzień 1 (Start)</th>
                  <th className="py-2.5 px-3">Finał (Aktualny)</th>
                  <th className="py-2.5 px-3">Przyrost Ciężaru</th>
                  <th className="py-2.5 px-3">1RM Start → Finał</th>
                  <th className="py-2.5 px-3 text-right">Status Progresu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                {mainLifts.map((lift) => {
                  const isPositive = lift.weightGain > 0;
                  const isNegative = lift.weightGain < 0;

                  const getCatBadgeClass = (cat?: string) => {
                    const c = (cat || '').toLowerCase();
                    if (c.includes('klatk')) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                    if (c.includes('plec')) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
                    if (c.includes('nog')) return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
                    if (c.includes('bark')) return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
                    if (c.includes('biceps') || c.includes('triceps') || c.includes('ramion')) return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
                    if (c.includes('brzuch')) return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
                    return 'bg-slate-800 text-slate-300 border-slate-700/60';
                  };

                  return (
                    <tr key={lift.name} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          {lift.isMainCompound && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Bój wielostawowy" />
                          )}
                          <span className="font-extrabold text-white text-xs">{lift.name}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getCatBadgeClass(lift.category)}`}>
                          {lift.category || 'Ogólne'}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <span className="text-slate-200">{lift.startWeight} {unit}</span>
                        <span className="text-[10px] text-slate-500 ml-1">({lift.startReps} powt.)</span>
                      </td>

                      <td className="py-3 px-3 font-mono font-black text-white">
                        <span>{lift.endWeight} {unit}</span>
                        <span className="text-[10px] text-slate-400 font-normal ml-1">({lift.endReps} powt.)</span>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <div className="flex items-center gap-1.5">
                          {isPositive ? (
                            <span className="text-emerald-400 font-black flex items-center gap-0.5">
                              <ArrowUp className="w-3.5 h-3.5" />
                              +{lift.weightGain} {unit}
                            </span>
                          ) : isNegative ? (
                            <span className="text-rose-400 font-black flex items-center gap-0.5">
                              <ArrowDown className="w-3.5 h-3.5" />
                              {lift.weightGain} {unit}
                            </span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-0.5">
                              <Minus className="w-3.5 h-3.5" />
                              0 {unit}
                            </span>
                          )}

                          {isPositive && (
                            <span className="text-[10px] text-emerald-400/90 font-sans">
                              (+{lift.weightGainPct}%)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <span className="text-slate-400">{lift.start1RM}</span>
                        <span className="text-slate-600 mx-1">→</span>
                        <span className="font-bold text-amber-400">{lift.end1RM} {unit}</span>
                        {lift.gain1RM > 0 && (
                          <span className="text-[10px] text-emerald-400 font-bold ml-1.5">
                            (+{lift.gain1RM})
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                          isPositive
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : isNegative
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                        }`}>
                          {isPositive ? '✓ Progres' : isNegative ? 'Deload' : '= Utrzymanie'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SEKCJA 2: PERIODYZACJA OBJĘTOŚCI I STATYSTYKI TYGODNIOWE
          ═══════════════════════════════════════════════════════════════════════ */}
      {/* Weekly Tonnage Progression Bar Chart */}
      {analysisShowWeeklyTonnage && <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4" id="analysis-weekly-tonnage">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Progresja Tonażu Tydzień po Tygodniu (Periodyzacja Objętości)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Wizualizacja tonażu w kolejnych tygodniach mezocyklu. Wzrost oznacza progresywne przeładowanie (Overload).
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {weeklyTonnage.map((w) => {
            const pctOfMax = Math.round((w.volume / maxWeeklyVol) * 100);
            return (
              <div key={w.weekName} className="space-y-1" id={`weekly-tonnage-week-${w.weekNumber}`}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{w.weekName}</span>
                    {w.startDate && (
                      <span className="text-[11px] font-mono text-slate-500">({w.startDate})</span>
                    )}
                    {w.isCompleted ? (
                      <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        100% Zaliczone
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-400 text-[10px]">
                        {w.completedDays}/{w.totalDays} dni
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-black text-emerald-400 text-xs">
                    {w.volume.toLocaleString('pl-PL')} {unit}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800/80">
                  <div
                    className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, pctOfMax)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>}

      {analysisShowWeeklyMetrics && <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4" id="analysis-weekly-metrics">
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2"><Activity className="w-4 h-4 text-teal-400" />Metryki wykonania tydzień po tygodniu</h3>
          <p className="text-xs text-slate-400 mt-0.5">Wartości pochodzą wyłącznie z wykonanych dni i zapisanych serii w zakresie danego tygodnia.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]" id="weekly-metrics-table">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800"><tr>
              <th className="py-2 pr-3">Tydzień</th>
              {analysisShowExecutedDays && <th className="py-2 px-3">Dni</th>}
              {analysisShowExecutedExercises && <th className="py-2 px-3">Ćwiczenia</th>}
              {analysisShowExecutedSets && <th className="py-2 px-3">Serie</th>}
              {analysisShowExecutedReps && <th className="py-2 px-3">Powtórzenia</th>}
              <th className="py-2 px-3">Tonaż</th><th className="py-2 px-3">Tonaż/serię</th>
              {analysisShowVolumeDelta && <th className="py-2 px-3">Zmiana</th>}
              {analysisShowDataConfidence && <th className="py-2 pl-3">Jakość</th>}
            </tr></thead>
            <tbody className="divide-y divide-slate-800/70">{weeklyTonnage.map((week, index) => {
              const previous = weeklyTonnage[index - 1]?.volume || 0;
              const delta = volumeDeltaPercent(week.volume, previous);
              return <tr key={week.weekNumber} data-week-metrics={week.weekNumber}>
                <td className="py-2.5 pr-3 font-bold text-slate-200">{week.weekName}</td>
                {analysisShowExecutedDays && <td className="py-2.5 px-3 font-mono text-slate-300">{week.executedDays}/{week.plannedDays}</td>}
                {analysisShowExecutedExercises && <td className="py-2.5 px-3 font-mono text-slate-300">{week.executedExercises}</td>}
                {analysisShowExecutedSets && <td className="py-2.5 px-3 font-mono text-teal-300">{week.executedSets}</td>}
                {analysisShowExecutedReps && <td className="py-2.5 px-3 font-mono text-teal-300">{week.executedReps.toLocaleString('pl-PL')}</td>}
                <td className="py-2.5 px-3 font-mono text-emerald-300">{week.volume.toLocaleString('pl-PL')} {unit}</td><td className="py-2.5 px-3 font-mono text-sky-300">{volumePerSet(week.volume, week.executedSets) == null ? '—' : `${volumePerSet(week.volume, week.executedSets)!.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} ${unit}`}</td>
                {analysisShowVolumeDelta && <td className={`py-2.5 px-3 font-mono font-bold ${delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-amber-300' : 'text-slate-500'}`}>{index === 0 ? '—' : `${delta > 0 ? '+' : ''}${delta}%`}</td>}
                {analysisShowDataConfidence && <td className="py-2.5 pl-3 font-mono text-sky-300">{week.dataConfidencePct}%</td>}
              </tr>;
            })}</tbody>
          </table>
        </div>
      </div>}

      {analysisShowRollingVolume && <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4" id="analysis-rolling-volume">
        <div><h3 className="text-sm font-extrabold uppercase tracking-wider text-white">Średnia krocząca tonażu (4 tygodnie)</h3><p className="text-xs text-slate-400 mt-0.5">Średnia obejmuje wyłącznie wykonany tonaż z ostatnich 4 tygodni.</p></div>
        {weeklyMetrics.length < 4 ? <p className="text-xs text-amber-300">Brak wystarczających danych — potrzeba co najmniej 4 tygodni.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-[11px]"><thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800"><tr><th className="py-2 pr-3">Tydzień</th><th className="py-2 px-3">Tonaż</th><th className="py-2 pl-3">Średnia 4T</th></tr></thead><tbody className="divide-y divide-slate-800/70">{weeklyMetrics.map((week, i) => <tr key={week.weekNumber}><td className="py-2.5 pr-3 font-bold text-slate-200">Tydzień {week.weekNumber}</td><td className="py-2.5 px-3 font-mono text-emerald-300">{week.volume.toLocaleString('pl-PL')} {unit}</td><td className="py-2.5 pl-3 font-mono text-purple-300">{rollingVolume[i] == null ? '—' : `${rollingVolume[i]!.toLocaleString('pl-PL')} ${unit}`}</td></tr>)}</tbody></table></div>}
      </div>}

      {analysisShowRegularity && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4" id="analysis-regularity">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-sky-400" />Regularność realizacji planu</h3>
            <p className="text-xs text-slate-400 mt-0.5">Wykonane dni ÷ zaplanowane dni. Cel: {analysisRegularityTargetPct}%.</p>
          </div>
          <div className="space-y-3">
            {weeklyTonnage.map((week) => {
              const pct = regularityPercent(week.executedDays, week.plannedDays);
              const reached = pct >= analysisRegularityTargetPct;
              return (
                <div key={week.weekNumber} data-regularity-week={week.weekNumber} className="space-y-1">
                  <div className="flex items-center justify-between text-xs"><span className="font-bold text-slate-200">{week.weekName}</span><span className={reached ? 'text-emerald-300 font-mono font-bold' : 'text-amber-300 font-mono font-bold'}>{pct}% ({week.executedDays}/{week.plannedDays})</span></div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800/80"><div className={reached ? 'bg-sky-400 h-full rounded-full' : 'bg-amber-400 h-full rounded-full'} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {analysisShowMonthlyComparison && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4" id="analysis-monthly-comparison">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-400" />Porównanie miesięczne</h3>
            <p className="text-xs text-slate-400 mt-0.5">Agregacja zapisanych, wykonanych punktów historii według miesiąca kalendarzowego.</p>
          </div>
          {monthlyMetrics.length === 0 ? <div className="text-xs text-slate-500">Brak wystarczających danych miesięcznych.</div> : (
            <div className="overflow-x-auto"><table className="w-full text-left text-[11px]" id="monthly-comparison-table"><thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800"><tr><th className="py-2 pr-3">Miesiąc</th><th className="py-2 px-3">Sesje</th><th className="py-2 px-3">Serie</th><th className="py-2 px-3">Powtórzenia</th><th className="py-2 pl-3">{analysisMonthlyMetric === 'volume' ? `Tonaż (${unit})` : analysisMonthlyMetric === 'executedSets' ? 'Serie' : 'Powtórzenia'}</th></tr></thead><tbody className="divide-y divide-slate-800/70">{monthlyMetrics.map((month) => <tr key={month.month} data-month={month.month}><td className="py-2.5 pr-3 font-bold text-slate-200">{month.month}</td><td className="py-2.5 px-3 font-mono text-slate-300">{month.sessions}</td><td className="py-2.5 px-3 font-mono text-teal-300">{month.executedSets}</td><td className="py-2.5 px-3 font-mono text-teal-300">{month.executedReps}</td><td className="py-2.5 pl-3 font-mono text-purple-300">{(analysisMonthlyMetric === 'volume' ? month.volume : analysisMonthlyMetric === 'executedSets' ? month.executedSets : month.executedReps).toLocaleString('pl-PL')}{analysisMonthlyMetric === 'volume' ? ` ${unit}` : ''}</td></tr>)}</tbody></table></div>
          )}
        </div>
      )}

      {analysisShowPeriodComparison && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4" id="analysis-period-comparison">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-400" />Porównanie okresów cyklu</h3>
            <p className="text-xs text-slate-400 mt-0.5">Pierwsza połowa zakresu analizy vs druga połowa. Liczone tylko z wykonanych danych tygodniowych.</p>
          </div>
          {!periodComparison.hasEnoughData ? (
            <div className="text-xs text-slate-500">Brak wystarczających danych do porównania dwóch okresów.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]" id="period-comparison-table">
                <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <tr><th className="py-2 pr-3">Okres</th><th className="py-2 px-3">Tygodnie</th><th className="py-2 px-3">Dni</th><th className="py-2 px-3">Ćwiczenia</th><th className="py-2 px-3">Serie</th><th className="py-2 px-3">Powtórzenia</th><th className="py-2 pl-3">Tonaż</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  <tr data-period="first"><td className="py-2.5 pr-3 font-bold text-slate-200">Okres A</td><td className="py-2.5 px-3 font-mono text-slate-400">{periodComparison.firstWeeks}</td><td className="py-2.5 px-3 font-mono text-sky-300">{periodComparison.first.executedDays}/{periodComparison.first.plannedDays}</td><td className="py-2.5 px-3 font-mono text-slate-300">{periodComparison.first.executedExercises}</td><td className="py-2.5 px-3 font-mono text-teal-300">{periodComparison.first.executedSets}</td><td className="py-2.5 px-3 font-mono text-teal-300">{periodComparison.first.executedReps}</td><td className="py-2.5 pl-3 font-mono text-purple-300">{periodComparison.first.volume.toLocaleString('pl-PL')} {unit}</td></tr>
                  <tr data-period="second"><td className="py-2.5 pr-3 font-bold text-slate-200">Okres B</td><td className="py-2.5 px-3 font-mono text-slate-400">{periodComparison.secondWeeks}</td><td className="py-2.5 px-3 font-mono text-sky-300">{periodComparison.second.executedDays}/{periodComparison.second.plannedDays}</td><td className="py-2.5 px-3 font-mono text-slate-300">{periodComparison.second.executedExercises}</td><td className="py-2.5 px-3 font-mono text-teal-300">{periodComparison.second.executedSets}</td><td className="py-2.5 px-3 font-mono text-teal-300">{periodComparison.second.executedReps}</td><td className="py-2.5 pl-3 font-mono text-purple-300">{periodComparison.second.volume.toLocaleString('pl-PL')} {unit}</td></tr>
                </tbody>
              </table>
              <div id="period-comparison-delta" className="mt-3 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-300">
                Zmiana wybranej metryki: <span className={periodComparison.delta >= 0 ? 'text-emerald-300 font-mono font-bold' : 'text-rose-300 font-mono font-bold'}>{periodComparison.delta >= 0 ? '+' : ''}{periodComparison.delta.toLocaleString('pl-PL')}{analysisPeriodComparisonMetric === 'volume' ? ` ${unit}` : ''}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Coach & Periodization Recommendations */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex items-start gap-4">
        <Sparkles className="w-6 h-6 text-emerald-400 shrink-0 mt-1" />
        <div className="space-y-1.5 text-xs text-slate-300">
          <h4 className="font-extrabold text-white text-sm">
            Wnioski Periodyzacji i Zalecenia Regeneracyjne
          </h4>
          <p className="leading-relaxed text-slate-300">
            Mezocykl zrealizowany na poziomie <strong>{adherencePct}% frekwencji</strong> z łącznym tonażem <strong>{totalVolumeKg.toLocaleString('pl-PL')} {unit}</strong>.
            {weeks.length >= 6 ? (
              <span> Po {weeks.length} tygodniach intensywnej akumulacji obciążenia zaleca się zaplanowanie <strong>1 tygodnia deloadu (odciążenia)</strong> z redukcją objętości o 40-50% przy zachowaniu ciężaru roboczego, aby umożliwić pełną superkompensację układu nerwowego, więzadeł i stawów przed kolejnym blokiem siłowo-hipertroficznym.</span>
            ) : (
              <span> Blok w trakcie akumulacji. Utrzymuj progresywne przeładowanie (Overload) dodając 1.25 - 2.5 kg lub 1 powtórzenie w głównych seriach roboczych co tydzień.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
