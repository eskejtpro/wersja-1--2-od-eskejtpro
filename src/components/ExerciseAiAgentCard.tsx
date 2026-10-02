import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bot, 
  Sparkles, 
  RotateCw, 
  Copy, 
  Check, 
  TrendingUp, 
  Flame, 
  Dumbbell, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Server, 
  Cpu, 
  Zap, 
  ShieldAlert 
} from 'lucide-react';
import { AppSettings, ExerciseHistoryPoint } from '../types';
import { 
  ExerciseAiAnalysisResult, 
  requestExerciseAiAnalysis 
} from '../utils/aiAgentEngine';

interface ExerciseAiAgentCardProps {
  exerciseName: string;
  historyPoints: ExerciseHistoryPoint[];
  goalWeight?: number;
  settings: Partial<AppSettings>;
  unit: 'kg' | 'lbs';
}

export const ExerciseAiAgentCard: React.FC<ExerciseAiAgentCardProps> = ({
  exerciseName,
  historyPoints,
  goalWeight,
  settings,
  unit
}) => {
  const [seedIndex, setSeedIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [result, setResult] = useState<ExerciseAiAnalysisResult | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsGenerating(true);

    const timer = setTimeout(async () => {
      const res = await requestExerciseAiAnalysis(
        exerciseName,
        historyPoints,
        goalWeight,
        settings,
        seedIndex
      );
      if (isMounted) {
        setResult(res);
        setIsGenerating(false);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [exerciseName, historyPoints, goalWeight, settings, seedIndex]);

  const handleRegenerate = () => {
    setSeedIndex((prev) => prev + 1);
  };

  const handleCopy = () => {
    if (!result) return;
    const textToCopy = `🤖 Analiza AI Agenta dla [${exerciseName}]:\n${result.headline}\n\n${result.summary}\n\n💡 Wskazówka Techniczna:\n${result.tacticalTip}\n\n🎯 Cel: ${result.actionableGoal}\n⚡ Rekomendacja: ${result.suggestedWeightDelta} (${result.suggestedRepRange})`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const personaLabel = useMemo(() => {
    switch (settings.aiAgentPersona) {
      case 'coach_hardcore': return 'Trener Siłowy (Hardcore)';
      case 'sports_scientist': return 'Naukowiec Sportowy';
      case 'regenerative': return 'Fizjoterapeuta & Regeneracja';
      default: return 'Zrównoważony Trener';
    }
  }, [settings.aiAgentPersona]);

  return (
    <div 
      className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden transition-all duration-300"
      id="exercise-ai-agent-card"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-44 h-44 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-sm shrink-0 relative">
            <Bot className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Agent AI: Analiza Wykresu &amp; Wskazówki Progresji</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {result?.source === 'server_endpoint' ? (
                  <span className="flex items-center gap-1">
                    <Server className="w-3 h-3 text-sky-400" />
                    <span>Serwer API</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-emerald-400" />
                    <span>Heurystyka Offline</span>
                  </span>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Inteligentna ewaluacja trajektorii obciążeń, formuły e1RM i zaleceń mikro-ładowania dla: <strong className="text-emerald-300">{exerciseName}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Wygeneruj nową wskazówkę i zalecenie periodyzacji dla tego ćwiczenia"
            id="btn-exercise-ai-regenerate"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Generuj / Losuj Poradę</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            title="Kopiuj całą analizę do schowka"
            id="btn-exercise-ai-copy"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            title={isCollapsed ? 'Rozwiń panel' : 'Zwiń panel'}
            id="btn-exercise-ai-toggle"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      {!isCollapsed && (
        <div className="mt-3.5 space-y-3.5 relative z-10 animate-fadeIn">
          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block font-medium">Sugerowany Przyrost</span>
              <div className="text-sm font-extrabold text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>{result?.suggestedWeightDelta || `+2.5 ${unit}`}</span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block font-medium">Docelowy Zakres Powt.</span>
              <div className="text-sm font-extrabold text-sky-300 font-mono mt-0.5 flex items-center gap-1">
                <Dumbbell className="w-3.5 h-3.5 text-sky-400" />
                <span>{result?.suggestedRepRange || '6–10 powt.'}</span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block font-medium">Ryzyko Stagnacji</span>
              <div className="text-sm font-extrabold font-mono mt-0.5 flex items-center gap-1">
                {result?.stagnationRisk === 'high' ? (
                  <span className="text-rose-400 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span>Wysokie (Deload)</span>
                  </span>
                ) : result?.stagnationRisk === 'moderate' ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Umiarkowane</span>
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Brak (Czysty Progres)</span>
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block font-medium">Persona Agenta</span>
              <div className="text-xs font-bold text-slate-200 mt-0.5 truncate">
                {personaLabel}
              </div>
            </div>
          </div>

          {/* Analysis Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Left: Summary and Progression Advice */}
            <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{result?.headline || 'Ocena Trajektorii Boju'}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {result?.generatedAt || ''}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {result?.summary}
              </p>
              <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                <strong className="text-sky-300 font-medium">Prognoza e1RM: </strong>
                <span>{result?.e1rmForecast}</span>
              </div>
            </div>

            {/* Right: Tactical Tip and Actionable Goal */}
            <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 mb-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Wytyczna Techniczna &amp; Bodziec</span>
                </span>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {result?.tacticalTip}
                </p>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-2.5 mt-2 flex items-start gap-2">
                <Target className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-emerald-300 block">Cel na następną sesję:</span>
                  <span className="text-slate-300">{result?.actionableGoal}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
