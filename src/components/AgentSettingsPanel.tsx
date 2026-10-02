import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Cpu, 
  Server, 
  CheckCircle2, 
  XCircle, 
  Play, 
  RotateCw, 
  Dumbbell, 
  Shield, 
  Target, 
  Activity, 
  Zap, 
  Layers, 
  Check, 
  Copy, 
  Terminal,
  Clock,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { AppSettings, TrainingWeek } from '../types';
import { 
  AgentFullDiagnosticReport, 
  runAiAgentDiagnostics 
} from '../utils/aiAgentEngine';

interface AgentSettingsPanelProps {
  settings: AppSettings;
  weeks: TrainingWeek[];
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

const PERSONAS = [
  {
    id: 'balanced',
    title: 'Zrównoważony Trener',
    desc: 'Harmonijna periodyzacja, optymalne przeciążenie i uniwersalne wskazówki hipertroficzne.',
    icon: Flame,
    color: 'emerald'
  },
  {
    id: 'coach_hardcore',
    title: 'Trener Siłowy (Hardcore)',
    desc: 'Rygorystyczne podejście do intensywności, walka o kilogramy na sztandze i serie robocze do 1-2 RIR.',
    icon: Dumbbell,
    color: 'rose'
  },
  {
    id: 'sports_scientist',
    title: 'Naukowiec Sportowy',
    desc: 'Biomechanika, kontrola krzywej oporu, tempo fazy ekscentrycznej (3-1-1-0) i rekrutacja jednostek.',
    icon: Activity,
    color: 'sky'
  },
  {
    id: 'regenerative',
    title: 'Fizjoterapeuta & Regeneracja',
    desc: 'Profilaktyka aparatu ruchu, kontrola objętości minimalnej (MEV) i prewencja przeciążeń stawowych.',
    icon: Shield,
    color: 'teal'
  }
] as const;

export const AgentSettingsPanel: React.FC<AgentSettingsPanelProps> = ({
  settings,
  weeks,
  onUpdateSettings
}) => {
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);
  const [diagnosticReport, setDiagnosticReport] = useState<AgentFullDiagnosticReport | null>(null);
  const [testCopied, setTestCopied] = useState<boolean>(false);

  const handleRunDiagnostics = async () => {
    setIsRunningTest(true);
    try {
      const report = await runAiAgentDiagnostics(settings, weeks);
      setDiagnosticReport(report);
    } catch (e) {
      console.error('Diagnostic error:', e);
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleCopyTestReport = () => {
    if (!diagnosticReport) return;
    const text = `🧪 Raport Diagnostyki Agenta AI (${diagnosticReport.timestamp}):\nStatus ogólny: ${diagnosticReport.allPassed ? 'ZALICZONY (OK)' : 'WYKRYTO BŁĘDY'}\n\nTesty:\n${diagnosticReport.tests.map(t => `${t.passed ? '✅' : '❌'} ${t.name} (${t.durationMs}ms): ${t.details}`).join('\n')}\n\nPróbka analizy [Global]:\n${diagnosticReport.sampleAnalysis.summary}\n\nPróbka ćwiczenia [Wyciskanie]:\n${diagnosticReport.sampleExerciseAnalysis.summary}`;
    navigator.clipboard.writeText(text);
    setTestCopied(true);
    setTimeout(() => setTestCopied(false), 2000);
  };

  const currentPersona = settings.aiAgentPersona || 'balanced';

  return (
    <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-sm space-y-5" id="agent-settings-panel">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Dedykowany Panel Ustawień Agenta Analitycznego &amp; AI Coach
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Występuje w 2 widokach
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Konfiguracja persony trenerskiej, trybu odpowiedzi, heurystyki offline oraz zewnętrznych endpointów API serwera.
            </p>
          </div>
        </div>

        {/* Engine status indicator */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono flex items-center gap-1.5">
            {settings.aiAgentMode === 'server_endpoint' ? (
              <>
                <Server className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-sky-300 font-semibold">Tryb Serwer API</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">Silnik Heurystyczny (Offline)</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Global Visibility Toggle */}
      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-slate-200 block">Aktywność Agenta AI w aplikacji</span>
          <span className="text-[11px] text-slate-400">
            Wyświetla dedykowane moduły AI: w <strong>Raporcie Mezocyklu</strong> oraz w <strong>Wykresach Progresu Ćwiczeń (1RM)</strong>.
          </span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={settings.analysisShowAiAgent !== false}
            onChange={(e) => onUpdateSettings({ analysisShowAiAgent: e.target.checked })}
            className="w-4 h-4 accent-emerald-500 cursor-pointer"
          />
          <span className="text-xs font-bold text-emerald-400">Włączony</span>
        </label>
      </div>

      {/* 1. Wybór Persony Trenerskiej */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <span>1. Osobowość i Styl Trenera AI (Persona)</span>
          </label>
          <span className="text-[11px] text-slate-400">Wybierz styl generowanych zaleceń</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PERSONAS.map((p) => {
            const Icon = p.icon;
            const isSelected = currentPersona === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onUpdateSettings({ aiAgentPersona: p.id as AppSettings['aiAgentPersona'] })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex items-start gap-3 ${
                  isSelected
                    ? 'bg-emerald-950/30 border-emerald-500/60 shadow-xs ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                  isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-900 text-slate-400'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-emerald-300' : 'text-slate-200'}`}>
                      {p.title}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {p.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Format Odpowiedzi & Priorytety */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 block">
            2. Format i Długość Wskazówek
          </label>
          <select
            value={settings.aiAgentResponseLength || 'concise'}
            onChange={(e) => onUpdateSettings({ aiAgentResponseLength: e.target.value as AppSettings['aiAgentResponseLength'] })}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="concise">Krótka i zwięzła (2–3 esencjonalne zdania)</option>
            <option value="detailed">Szczegółowa z wytycznymi periodyzacji i biomechaniki</option>
            <option value="bullet_points">Lista punktowana (Wytyczne taktyczne)</option>
          </select>
          <span className="text-[10px] text-slate-500 block">Determinuje zwięzłość generowanych wniosków.</span>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 block">
            3. Główny Priorytet Analizy
          </label>
          <select
            value={settings.aiAgentFocus || 'all_muscles'}
            onChange={(e) => onUpdateSettings({ aiAgentFocus: e.target.value as AppSettings['aiAgentFocus'] })}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="all_muscles">Wszystkie partie równomiernie (Harmonia)</option>
            <option value="hypertrophy_volume">Hipertrofia i tonaż roboczy (Objętość)</option>
            <option value="strength_progression">Progresja siłowa &amp; 1RM (Siła maksymalna)</option>
            <option value="fatigue_management">Zarządzanie zmęczeniem &amp; Deload (Regeneracja)</option>
          </select>
          <span className="text-[10px] text-slate-500 block">Akcentuje wybrane parametry w wyciąganych wnioskach.</span>
        </div>
      </div>

      {/* 3. Konfiguracja Serwera API & Endpointów */}
      <div className="space-y-3 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <span>4. Konfiguracja Endpointu i Silnika Backendowego</span>
          </label>
          <span className="text-[11px] text-slate-400">Gotowość na własny serwer / mikroserwis</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => onUpdateSettings({ aiAgentMode: 'heuristic_local' })}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              settings.aiAgentMode !== 'server_endpoint'
                ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-bold block">Silnik Heurystyczny (Offline)</span>
                <span className="text-[10px] text-slate-500">Działa 100% lokalnie w przeglądarce</span>
              </div>
            </div>
            {settings.aiAgentMode !== 'server_endpoint' && <Check className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ aiAgentMode: 'server_endpoint' })}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              settings.aiAgentMode === 'server_endpoint'
                ? 'bg-sky-950/20 border-sky-500/50 text-sky-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-sky-400" />
              <div>
                <span className="font-bold block">Zewnętrzny Serwer API / Endpoint</span>
                <span className="text-[10px] text-slate-500">Wysyła JSON do Twojego serwera</span>
              </div>
            </div>
            {settings.aiAgentMode === 'server_endpoint' && <Check className="w-4 h-4 text-sky-400" />}
          </button>
        </div>

        {settings.aiAgentMode === 'server_endpoint' && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-fadeIn">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Adres URL Serwera API (POST):
              </label>
              <input
                type="url"
                placeholder="http://localhost:8000/api/analyze"
                value={settings.aiAgentServerUrl || ''}
                onChange={(e) => onUpdateSettings({ aiAgentServerUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-sky-500"
              />
              <span className="text-[10px] text-slate-500 block">
                Endpoint powinien przyjmować JSON z metrykami i zwracać schemat <code className="text-sky-300">AiAgentAnalysisResult</code>.
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Klucz Autoryzacyjny / Bearer Token (opcjonalny):
              </label>
              <input
                type="password"
                placeholder="Wpisz token autoryzacji serwera..."
                value={settings.aiAgentApiKey || ''}
                onChange={(e) => onUpdateSettings({ aiAgentApiKey: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Diagnostyka i Przykładowe Testy Logiki Agenta */}
      <div className="pt-3 border-t border-slate-800/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>5. Diagnostyka i Testy Spójności Logiki Agenta</span>
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Weryfikacja formuł e1RM, silnika 4 person, formatowania oraz łączności serwera.
            </span>
          </div>

          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={isRunningTest}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
            id="btn-run-agent-diagnostics"
          >
            {isRunningTest ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isRunningTest ? 'Wykonywanie testów...' : '🧪 Przeprowadź Test Logiki & Diagnostykę'}</span>
          </button>
        </div>

        {/* Live Diagnostic Results */}
        {diagnosticReport && (
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3.5 animate-fadeIn" id="agent-diagnostic-report">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                {diagnosticReport.allPassed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-amber-400" />
                )}
                <div>
                  <span className="text-xs font-bold text-white">
                    {diagnosticReport.allPassed 
                      ? 'Wszystkie testy zaliczone pomyślnie (100% OK)' 
                      : 'Wykryto ostrzeżenia w konfiguracji'}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Czas wykonania: {diagnosticReport.timestamp} • {diagnosticReport.tests.length} zweryfikowane moduły
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyTestReport}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Kopiuj raport diagnostyczny"
              >
                {testCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{testCopied ? 'Skopiowano' : 'Kopiuj Raport'}</span>
              </button>
            </div>

            {/* Test Items Breakdown */}
            <div className="space-y-2">
              {diagnosticReport.tests.map((test, idx) => (
                <div 
                  key={idx}
                  className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-start gap-2">
                    {test.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold text-slate-200 block">{test.name}</span>
                      <span className="text-[11px] text-slate-400 leading-snug">{test.details}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 shrink-0">
                    {test.durationMs} ms
                  </span>
                </div>
              ))}
            </div>

            {/* Sample Live Output Preview */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Próbka wygenerowanej analizy z bieżącą konfiguracją ({currentPersona}):
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">Raport Mezocyklu (Global):</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {diagnosticReport.sampleAnalysis.summary}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-sky-400 uppercase">Wykresy i 1RM (Ćwiczenie):</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {diagnosticReport.sampleExerciseAnalysis.summary}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
