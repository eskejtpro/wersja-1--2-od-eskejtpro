import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Cpu, 
  Flame, 
  Sliders, 
  Check, 
  Sparkles, 
  Smartphone, 
  Gauge, 
  ShieldCheck, 
  Activity, 
  RotateCcw, 
  Dumbbell, 
  Vibrate, 
  Eye, 
  RefreshCw,
  Layers,
  ArrowRight,
  TrendingUp,
  BatteryCharging
} from 'lucide-react';
import { AppSettings, GymData } from '../types';
import { soundService } from '../utils/soundService';
import { calculatePlates } from '../utils/calculations';

interface TurboPowerSettingsPanelProps {
  settings: AppSettings;
  data: GymData;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  isDark?: boolean;
}

export const TurboPowerSettingsPanel: React.FC<TurboPowerSettingsPanelProps> = ({
  settings,
  data,
  onUpdateSettings,
  isDark = true
}) => {
  const isAmoled = settings.amoledBlack === true;
  const isTurbo = settings.turbo144HzMode !== false;

  // Symulator kalkulatora rozgrzewki na żywo
  const [warmupTargetWeight, setWarmupTargetWeight] = useState<number>(100);
  const [warmupBarWeight, setWarmupBarWeight] = useState<number>(settings.barbellCollarWeight || 20);

  // Status testu haptyki
  const [hapticTested, setHapticTested] = useState<boolean>(false);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [localDataSummary, setLocalDataSummary] = useState<string | null>(null);

  // Sprawdź wsparcie dla WakeLock
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && settings.screenWakeLock) {
      navigator.wakeLock.request('screen')
        .then(() => setWakeLockActive(true))
        .catch(() => setWakeLockActive(false));
    }
  }, [settings.screenWakeLock]);

  const handleTestHaptic = (intensity: 'light' | 'medium' | 'strong') => {
    soundService.triggerHaptic(intensity);
    setHapticTested(true);
    setTimeout(() => setHapticTested(false), 1200);
  };

  const handleShowLocalDataSummary = () => {
    const weeksCount = data.weeks?.length || 0;
    const daysCount = data.weeks?.reduce((acc, w) => acc + (w.days?.length || 0), 0) || 0;
    const exCount = data.weeks?.reduce((acc, w) => acc + (w.days?.reduce((a, d) => a + (d.exercises?.length || 0), 0) || 0), 0) || 0;
    setLocalDataSummary(`Dane lokalne: ${weeksCount} tygodni, ${daysCount} dni, ${exCount} ćwiczeń. To podsumowanie nie zmienia danych.`);
  };

  // Generowanie serii rozgrzewkowych
  const generateWarmupRamps = (target: number, bar: number) => {
    if (target <= bar) {
      return [
        { pct: 100, weight: bar, reps: '10-12', label: 'Ciężar roboczy (Sam gryf)' }
      ];
    }
    const delta = target - bar;
    const r1 = Math.round(bar);
    const r2 = Math.round((bar + delta * 0.4) / 2.5) * 2.5;
    const r3 = Math.round((bar + delta * 0.65) / 2.5) * 2.5;
    const r4 = Math.round((bar + delta * 0.85) / 2.5) * 2.5;

    return [
      { pct: Math.round((bar / target) * 100), weight: r1, reps: '10 powt.', label: 'Mobilizacja & Aktywacja (Sam gryf)' },
      { pct: 40, weight: Math.max(bar, r2), reps: '5 powt.', label: 'Rampa początkowa (40% obciążenia)' },
      { pct: 65, weight: Math.max(bar, r3), reps: '3 powt.', label: 'Prędkość & Trajektoria (65%)' },
      { pct: 85, weight: Math.max(bar, r4), reps: '1 powt.', label: 'Ostatnie przetarcie OUN (85%)' },
      { pct: 100, weight: target, reps: 'Serie robocze', label: 'Ciężar główny (100%)', isWorkSet: true },
    ];
  };

  const warmupSteps = generateWarmupRamps(warmupTargetWeight, warmupBarWeight);

  return (
    <div className="space-y-6" id="turbo-power-settings-panel">
      {/* 🚀 BANER GŁÓWNY: TRYB PEŁNEJ MOCY XIAOMI 14T */}
      <div className="card-3d p-4 sm:p-6 rounded-2xl relative overflow-hidden border border-emerald-500/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-500/15 via-cyan-500/10 to-transparent pointer-events-none rounded-full blur-2xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 shrink-0">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Tryb Pełnej Mocy (Xiaomi 14T Turbo Engine)
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  144Hz &amp; 480Hz Touch
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Maksymalna wydajność GPU, zerowe opóźnienia dotyku, asystent rozgrzewki i głęboka haptyka.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdateSettings({ turbo144HzMode: !isTurbo })}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-2 ${
                isTurbo 
                  ? 'btn-3d-emerald text-white' 
                  : 'btn-3d-secondary text-slate-300'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>{isTurbo ? 'Turbo 144Hz WŁĄCZONE' : 'Turbo WYŁĄCZONE'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 📊 SEKCJA 1: KALKULATOR ROZGRZEWKI & RAMPA TALERZY */}
      <div className="card-3d p-4 sm:p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Smart Warm-Up &amp; Auto-Rampa Rozgrzewki</h4>
              <p className="text-[11px] text-slate-400">Automatyczny dobór serii wprowadzających i rozkład talerzy na stronę</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px]">
            {[
              { id: 20, label: 'Męski 20kg' },
              { id: 15, label: 'Damski 15kg' },
              { id: 25, label: 'Hex 25kg' },
              { id: 10, label: 'Lekki 10kg' }
            ].map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setWarmupBarWeight(b.id);
                  onUpdateSettings({ barbellCollarWeight: b.id });
                }}
                className={`px-2 py-1 rounded-lg font-mono font-bold transition-all cursor-pointer ${
                  warmupBarWeight === b.id 
                    ? 'bg-amber-500 text-slate-950 shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Suwak i kontrolka ciężaru roboczego */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="sm:col-span-1 metric-tile-3d p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Ciężar serii głównej:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setWarmupTargetWeight(w => Math.max(warmupBarWeight, w - 5))}
                className="btn-3d-secondary px-2 py-1 rounded-lg text-xs font-bold text-white cursor-pointer"
              >
                -5
              </button>
              <span className="text-lg font-black font-mono text-amber-400 px-1">
                {warmupTargetWeight} kg
              </span>
              <button
                type="button"
                onClick={() => setWarmupTargetWeight(w => w + 5)}
                className="btn-3d-secondary px-2 py-1 rounded-lg text-xs font-bold text-white cursor-pointer"
              >
                +5
              </button>
            </div>
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <input 
              type="range"
              min={warmupBarWeight}
              max={300}
              step={2.5}
              value={warmupTargetWeight}
              onChange={(e) => setWarmupTargetWeight(Number(e.target.value))}
              className="w-full accent-amber-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Wygenerowane serie rozgrzewkowe z talerzami 3D */}
        <div className="space-y-2 pt-1">
          {warmupSteps.map((step, idx) => {
            const platesPerSide = calculatePlates(step.weight, warmupBarWeight);
            return (
              <div 
                key={idx}
                className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 transition-all ${
                  step.isWorkSet 
                    ? 'bg-gradient-to-r from-emerald-950/60 to-slate-900 border-emerald-500/40 shadow-sm' 
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-6 h-6 rounded-lg text-xs font-mono font-black flex items-center justify-center ${
                    step.isWorkSet ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {step.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {step.reps} • {step.weight} kg
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {platesPerSide.length === 0 ? (
                    <span className="text-[10px] text-slate-500 italic font-mono">Sam gryf</span>
                  ) : (
                    platesPerSide.map((p, pIdx) => (
                      <span 
                        key={pIdx}
                        className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 shadow-xs"
                      >
                        {p.count}×{p.weight}k
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ⚡ SEKCJA 2: ASYSTENT PROGRESJI & WIBRACJE HAPTYCZNE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Asystent Progresji */}
        <div className="card-3d p-4 rounded-2xl space-y-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Inteligentna Progresja Ciężaru</h4>
              <p className="text-[11px] text-slate-400">Automatyczna sugestia mikroskoków</p>
            </div>
          </div>

          <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
            <div>
              <span className="text-xs font-bold text-white block">Asystent Progresji Liniowej</span>
              <span className="text-[10px] text-slate-400">Sugeruj +2.5kg po zaliczeniu wszystkich serii</span>
            </div>
            <input 
              type="checkbox"
              checked={settings.autoProgressionAssistant !== false}
              onChange={(e) => onUpdateSettings({ autoProgressionAssistant: e.target.checked })}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
            <div>
              <span className="text-xs font-bold text-white block">Utrzymuj Ekran Wybudzony (WakeLock)</span>
              <span className="text-[10px] text-slate-400">Nie wygaszaj ekranu Xiaomi 14T w trakcie treningu</span>
            </div>
            <input 
              type="checkbox"
              checked={settings.screenWakeLock === true}
              onChange={(e) => onUpdateSettings({ screenWakeLock: e.target.checked })}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Haptyka Xiaomi 14T X-Axis */}
        <div className="card-3d p-4 rounded-2xl space-y-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Vibrate className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Silnik Haptyczny X-Axis (Xiaomi 14T)</h4>
              <p className="text-[11px] text-slate-400">Precyzyjne mechaniczne mikropulsy</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'light', label: 'Klik 20ms', desc: 'Mikro' },
              { id: 'medium', label: 'Podwójny 45ms', desc: 'Sport' },
              { id: 'strong', label: 'Alarm 85ms', desc: 'Mocny' },
            ].map(h => (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  onUpdateSettings({ hapticIntensity: h.id as any });
                  handleTestHaptic(h.id as any);
                }}
                className={`p-2 rounded-xl text-center border transition-all cursor-pointer active:scale-95 ${
                  settings.hapticIntensity === h.id 
                    ? 'btn-3d-emerald text-white border-emerald-400' 
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <span className="block text-xs font-bold leading-tight">{h.label}</span>
                <span className="text-[9px] text-slate-400 font-mono">{h.desc}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleTestHaptic(settings.hapticIntensity && settings.hapticIntensity !== 'off' ? settings.hapticIntensity : 'medium')}
            className="w-full py-2 rounded-xl text-xs font-bold btn-3d-secondary text-slate-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Vibrate className="w-3.5 h-3.5" />
            <span>{hapticTested ? 'Wysłano impuls haptyczny ✓' : 'Przetestuj wibrację na telefonie'}</span>
          </button>
        </div>
      </div>

      {/* 🛠️ SEKCJA 3: PODSUMOWANIE LOKALNYCH DANYCH */}
      <div className="card-3d p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Podsumowanie danych lokalnych</h4>
              <p className="text-[11px] text-slate-400">Pokaż liczbę zapisanych tygodni, dni i ćwiczeń; bez modyfikowania danych</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShowLocalDataSummary}
            className="btn-3d-secondary px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Pokaż podsumowanie</span>
          </button>
        </div>

        {localDataSummary && (
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn font-mono">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{localDataSummary}</span>
          </div>
        )}
      </div>
    </div>
  );
};
