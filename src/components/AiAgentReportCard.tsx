import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bot, 
  Sparkles, 
  RotateCw, 
  Copy, 
  Check, 
  Layers, 
  Flame, 
  Dumbbell, 
  Shield, 
  Zap, 
  Target, 
  Activity, 
  ChevronDown, 
  ChevronUp,
  Server,
  Cpu,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { TrainingWeek, BodyWeightEntry, AppSettings } from '../types';
import { 
  MuscleAnalysisFact, 
  AiAgentAnalysisResult, 
  extractMuscleFacts, 
  generateLocalHeuristicInsight, 
  requestAiAgentAnalysis 
} from '../utils/aiAgentEngine';

interface AiAgentReportCardProps {
  weeks: TrainingWeek[];
  bodyWeights?: BodyWeightEntry[];
  settings: AppSettings;
  unit: 'kg' | 'lbs';
}

const MUSCLE_TABS: Array<{ key: MuscleAnalysisFact['key']; label: string; icon: React.FC<{ className?: string }> }> = [
  { key: 'global', label: 'Mezocykl Całość', icon: Flame },
  { key: 'chest', label: 'Klatka', icon: Dumbbell },
  { key: 'back', label: 'Plecy', icon: Shield },
  { key: 'legs', label: 'Nogi', icon: Zap },
  { key: 'shoulders', label: 'Barki', icon: Target },
  { key: 'arms', label: 'Ramiona', icon: Activity },
  { key: 'core', label: 'Brzuch & Core', icon: Layers },
];

export const AiAgentReportCard: React.FC<AiAgentReportCardProps> = ({
  weeks,
  bodyWeights,
  settings,
  unit
}) => {
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleAnalysisFact['key']>('global');
  const [seedIndex, setSeedIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [result, setResult] = useState<AiAgentAnalysisResult | null>(null);

  const facts = useMemo(() => extractMuscleFacts(weeks, unit), [weeks, unit]);

  // Load initial analysis or reload when muscle or seed changes
  useEffect(() => {
    let isMounted = true;
    setIsGenerating(true);

    const timer = setTimeout(async () => {
      const res = await requestAiAgentAnalysis(selectedMuscle, weeks, bodyWeights, settings, seedIndex);
      if (isMounted) {
        setResult(res);
        setIsGenerating(false);
      }
    }, 180);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedMuscle, seedIndex, weeks, bodyWeights, settings, unit]);

  const handleRegenerate = () => {
    setSeedIndex((prev) => prev + 1);
  };

  const handleCopy = () => {
    if (!result) return;
    const textToCopy = `🤖 Analiza AI Agenta [${MUSCLE_TABS.find(t => t.key === selectedMuscle)?.label}]:\n${result.headline}\n\n${result.summary}\n\n💡 Wskazówka:\n${result.tacticalTip}\n\n🎯 Cel: ${result.actionableGoal}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeFact = facts[selectedMuscle] || facts.global;

  const personaLabel = useMemo(() => {
    switch (settings.aiAgentPersona) {
      case 'coach_hardcore': return 'Trener Siłowy (Hardcore)';
      case 'sports_scientist': return 'Naukowiec Sportowy';
      case 'regenerative': return 'Fizjoterapeuta & Regeneracja';
      default: return 'Zrównoważony Trener Personalny';
    }
  }, [settings.aiAgentPersona]);

  return (
    <div 
      className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden transition-all duration-300"
      id="ai-agent-report-card"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10 border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-sm shrink-0 relative">
            <Bot className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Agent Analityczny & AI Coach</span>
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
              Inteligentna mikro-analiza postępów, objętości i periodyzacji dla poszczególnych partii mięśniowych.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Kliknij, aby wygenerować nową, świeżą analizę lub losową wskazówkę dla tej partii"
            id="btn-ai-agent-regenerate"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Generuj / Losuj Poradę</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!result}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center justify-center transition-all cursor-pointer"
            title="Kopiuj treść wskazówki do schowka"
            id="btn-ai-agent-copy"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center justify-center transition-all cursor-pointer"
            title={isCollapsed ? 'Rozwiń panel analizy agenta' : 'Zwiń panel analizy agenta'}
            id="btn-ai-agent-toggle-collapse"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-4 pt-3.5 relative z-10">
          {/* Muscle Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80">
            {MUSCLE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = selectedMuscle === tab.key;
              const factForTab = facts[tab.key];
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedMuscle(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                  id={`btn-ai-tab-${tab.key}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                  {factForTab && factForTab.totalSets > 0 && (
                    <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                      isSelected ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {factForTab.totalSets}s
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Metrics Bar for Selected Muscle */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-950/60 border border-slate-800/70 rounded-xl p-2.5">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Serie Robocze</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-emerald-400 font-mono">{activeFact.totalSets}</span>
                <span className="text-[10px] text-slate-400 font-medium">serii</span>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/70 rounded-xl p-2.5">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Tonaż Partii</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-sky-300 font-mono">{activeFact.totalVolume.toLocaleString('pl-PL')}</span>
                <span className="text-[10px] text-slate-400 font-medium">{unit}</span>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/70 rounded-xl p-2.5">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Ćwiczenia / Baza</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-purple-300 font-mono">{activeFact.exercisesCount}</span>
                <span className="text-[10px] text-slate-400 font-medium">ruchów</span>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/70 rounded-xl p-2.5">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Najcięższy Wynik</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-amber-300 font-mono">{activeFact.topWeight || '—'}</span>
                <span className="text-[10px] text-slate-400 font-medium">{activeFact.topWeight ? unit : ''}</span>
              </div>
            </div>
          </div>

          {/* AI Output Content Card */}
          {result && (
            <div className={`space-y-3 transition-opacity duration-200 ${isGenerating ? 'opacity-50' : 'opacity-100'}`}>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h4 className="text-xs sm:text-sm font-bold text-slate-100">
                      {result.headline}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    Styl: <strong className="text-slate-300 font-normal">{personaLabel}</strong>
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {result.summary}
                </p>

                {/* Tactical Tip & Next-Step Goal */}
                <div className="pt-2 border-t border-slate-850 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  <div className="md:col-span-8 bg-slate-900/90 rounded-lg p-3 border border-slate-800 flex items-start gap-2.5">
                    <TrendingUp className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-teal-400 block font-mono">
                        Wskazówka Trenerska & Hipertrofia
                      </span>
                      <p className="text-slate-200 text-xs mt-0.5 leading-snug">
                        {result.tacticalTip}
                      </p>
                    </div>
                  </div>

                  <div className="md:col-span-4 bg-emerald-950/30 rounded-lg p-3 border border-emerald-500/30 flex items-start gap-2.5">
                    <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-300 block font-mono">
                        Cel na Kolejną Sesję
                      </span>
                      <p className="text-emerald-100 text-xs font-semibold mt-0.5 leading-snug">
                        {result.actionableGoal}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer status & settings annotation */}
          <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
            <span>
              Ostatnia analiza: <strong className="text-slate-400 font-mono">{result?.generatedAt || 'teraz'}</strong>
            </span>
            <span className="text-slate-400">
              Personalizuj styl, personę trenera i opcje serwera w <strong className="text-emerald-400 font-semibold">Ustawieniach</strong>.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
