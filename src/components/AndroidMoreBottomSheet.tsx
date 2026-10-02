import React, { useState } from 'react';
import { 
  Dumbbell, 
  UserCheck, 
  Settings, 
  RefreshCw, 
  Moon, 
  Sun, 
  X, 
  Scale, 
  Activity, 
  FileText, 
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Bot,
  Timer,
  Save,
  Calculator,
  Layers,
  Code2,
  Syringe,
  TrendingUp,
  Hand,
  Check,
  Zap,
  Sparkles,
  Plus,
  Minus,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { AppSettings, UserProfile, GymData } from '../types';
import { soundService } from '../utils/soundService';

interface AndroidMoreBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: string;
  onSelectView: (view: string) => void;
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  profile?: UserProfile;
  data?: GymData;
  onStartRestTimer?: (secs: number) => void;
  onCreateBackup?: () => void;
}

export const AndroidMoreBottomSheet: React.FC<AndroidMoreBottomSheetProps> = ({
  isOpen,
  onClose,
  activeView,
  onSelectView,
  settings,
  onUpdateSettings,
  profile,
  data,
  onStartRestTimer,
  onCreateBackup
}) => {
  if (!isOpen) return null;

  const isDark = settings.theme === 'dark';
  const isAmoled = settings.amoledBlack === true;
  const isLeftHanded = settings.handedness === 'left';
  const isWakeLock = settings.screenWakeLock !== false;
  const isGymDigits = settings.gymDigits !== false;
  const athleteName = profile?.name || settings.athleteName || 'Zawodnik';

  // Active embedded tools
  const [activeTool, setActiveTool] = useState<'none' | 'plate_calc' | 'one_rm_calc'>('none');
  
  // Plate Calc state
  const [targetPlateWeight, setTargetPlateWeight] = useState<number>(100);
  const [barWeight, setBarWeight] = useState<number>(20);

  // 1RM Calc state
  const [calcWeight, setCalcWeight] = useState<number>(100);
  const [calcReps, setCalcReps] = useState<number>(5);

  // Quick backup success feedback
  const [backupDone, setBackupDone] = useState(false);

  // Plate calculation math
  const calculatePlates = (target: number, bar: number) => {
    const weightPerSide = Math.max(0, (target - bar) / 2);
    const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
    const platesUsed: { weight: number; count: number }[] = [];
    let remainder = weightPerSide;

    availablePlates.forEach(plate => {
      const count = Math.floor(remainder / plate);
      if (count > 0) {
        platesUsed.push({ weight: plate, count });
        remainder -= count * plate;
      }
    });

    return { weightPerSide, platesUsed, remainder: Math.round(remainder * 100) / 100 };
  };

  const plateResult = calculatePlates(targetPlateWeight, barWeight);

  // 1RM calculation math (Brzycki & Epley average)
  const brzycki1RM = calcReps === 1 ? calcWeight : Math.round(calcWeight / (1.0278 - 0.0278 * calcReps));
  const epley1RM = calcReps === 1 ? calcWeight : Math.round(calcWeight * (1 + 0.0333 * calcReps));
  const estimated1RM = Math.round((brzycki1RM + epley1RM) / 2);

  const handleQuickRestTimer = (secs: number) => {
    if (onStartRestTimer) {
      onStartRestTimer(secs);
      soundService.triggerHaptic('medium');
      onClose();
    }
  };

  const handleQuickBackup = () => {
    if (onCreateBackup) {
      onCreateBackup();
      soundService.triggerHaptic('medium');
      setBackupDone(true);
      setTimeout(() => setBackupDone(false), 2000);
    }
  };

  const menuSections = [
    {
      title: 'Sztuczna Inteligencja',
      items: [
        {
          id: 'ai',
          label: 'Trener AI & Periodyzacja',
          description: 'Czat z modelem Gemini, analiza tonażu, regeneracji i periodyzacji',
          icon: Bot,
          badge: 'Gemini 3.8'
        }
      ]
    },
    {
      title: 'Baza i Narzędzia Treningowe',
      items: [
        {
          id: 'exercises',
          label: 'Katalog & Baza Wzorcowa Ćwiczeń',
          description: 'Słownik ćwiczeń, wzorce techniczne i warianty',
          icon: Dumbbell,
          badge: 'Baza'
        },
        {
          id: 'muscle',
          label: 'Rozkład Partii Mięśniowych',
          description: 'Analiza objętości serii na poszczególne mięśnie',
          icon: Activity
        },
        {
          id: 'stats',
          label: 'Progres & Wykresy 1RM',
          description: 'Wykresy siły, tonażu i rekordy życiowe PR',
          icon: TrendingUp
        },
        {
          id: 'weight',
          label: 'Dziennik Wagi & Obwodów',
          description: 'Pomiary sylwetki, waga poranna i średnie EMA',
          icon: Scale
        },
        {
          id: 'cycles',
          label: 'Kalendarz',
          description: 'Kalendarz iniekcji, badania krwi i kalkulator stężeń',
          icon: Syringe
        }
      ]
    },
    {
      title: 'Skrypty & Narzędzia PC',
      items: [
        {
          id: 'python',
          label: 'Skrypty Python & Paczka Windows',
          description: 'Natywna integracja .BAT, .EXE oraz skrypty analityczne',
          icon: Code2
        }
      ]
    },
    {
      title: 'Profil & Dane Zdrowotne',
      items: [
        {
          id: 'profile',
          label: 'Centrum Badań & Synchronizacja',
          description: 'Rejestr wyników krwi, profil i połączenie Windows ↔ Android',
          icon: UserCheck
        }
      ]
    },
    {
      title: 'Aplikacja & System',
      items: [
        {
          id: 'settings',
          label: 'Ustawienia & Kopie Bezpieczeństwa',
          description: 'Personalizacja układu, auto-backup, baza Room SQL i diagnostyka',
          icon: Settings
        }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden animate-fadeIn select-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Material 3 Bottom Sheet Container */}
      <div 
        className={`relative z-10 w-full max-h-[90vh] rounded-t-3xl border-t shadow-2xl flex flex-col overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))] animate-slideUp ${
          isAmoled
            ? 'bg-black border-zinc-800 text-slate-100'
            : isDark 
              ? 'bg-slate-900 border-slate-800 text-slate-100' 
              : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* M3 Drag Handle */}
        <div className="flex flex-col items-center pt-3 pb-1.5 shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-slate-500/40" />
        </div>

        {/* Sheet Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 pb-3 border-b border-slate-800/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold text-xs shadow-md border border-emerald-400/40">
              {athleteName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-extrabold text-sm leading-tight text-white">{athleteName}</h3>
              <p className="text-[11px] text-slate-400 font-mono">PlanPasika v3.0 • Xiaomi 14T</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick AMOLED Toggle */}
            <button
              type="button"
              onClick={() => onUpdateSettings({ amoledBlack: !isAmoled })}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                isAmoled 
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400 ring-1 ring-emerald-500/40' 
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Przełącznik True AMOLED Black"
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">AMOLED</span>
            </button>

            {/* Quick Theme Toggle */}
            <button
              type="button"
              onClick={() => onUpdateSettings({ theme: isDark ? 'light' : 'dark' })}
              className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center justify-center ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-amber-400' 
                  : 'bg-slate-100 border-slate-200 text-indigo-600'
              }`}
              title="Zmień motyw"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
              title="Zamknij menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Sheet Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 no-scrollbar">
          
          {/* ======================================================== */}
          {/* ⚡ 1. PASEK SZYBKICH AKCJI I NARZĘDZI (1-TAP QUICK TOOLS) */}
          {/* ======================================================== */}
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-1 font-mono flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Szybkie Akcje Treningowe:</span>
            </span>

            <div className="grid grid-cols-4 gap-2">
              {/* Quick Rest 90s */}
              <button
                type="button"
                onClick={() => handleQuickRestTimer(90)}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-all active:scale-95"
              >
                <Timer className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold text-slate-200">Stoper 90s</span>
              </button>

              {/* Quick Rest 180s */}
              <button
                type="button"
                onClick={() => handleQuickRestTimer(180)}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-all active:scale-95"
              >
                <Timer className="w-4 h-4 text-teal-400" />
                <span className="text-[10px] font-bold text-slate-200">Stoper 3m</span>
              </button>

              {/* Plate Loading Calc Tool */}
              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'plate_calc' ? 'none' : 'plate_calc')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-all active:scale-95 ${
                  activeTool === 'plate_calc'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                    : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                }`}
              >
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] font-bold">Talerze</span>
              </button>

              {/* 1RM Calc Tool */}
              <button
                type="button"
                onClick={() => setActiveTool(activeTool === 'one_rm_calc' ? 'none' : 'one_rm_calc')}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-all active:scale-95 ${
                  activeTool === 'one_rm_calc'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                    : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                }`}
              >
                <Calculator className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-bold">Kalk. 1RM</span>
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 🧮 2. EMBEDDED TOOL POPUPS (PLATE CALC & 1RM CALC) */}
          {/* ======================================================== */}
          {activeTool === 'plate_calc' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/50 shadow-xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 font-mono">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Kalkulator Obciążenia Gryfu (Talerze na stronę)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTool('none')}
                  className="text-slate-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-bold">Ciężar łączny:</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setTargetPlateWeight(w => Math.max(20, w - 2.5))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      step="2.5"
                      min="20"
                      value={targetPlateWeight}
                      onChange={(e) => setTargetPlateWeight(Number(e.target.value) || 20)}
                      className="w-16 h-8 text-center bg-slate-900 border border-slate-700 rounded-lg text-xs font-black text-emerald-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setTargetPlateWeight(w => w + 2.5)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-slate-400">kg</span>
                  </div>
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[11px] text-slate-400 font-bold">Gryf:</label>
                  <div className="flex items-center justify-end gap-1">
                    {[20, 15, 10].map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBarWeight(b)}
                        className={`px-2 py-1 rounded text-[11px] font-bold border cursor-pointer ${
                          barWeight === b ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        {b}kg
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Plate Results View */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Na jedną stronę sztangi:</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    {plateResult.weightPerSide} kg
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {plateResult.platesUsed.length === 0 ? (
                    <span className="text-xs text-slate-500">Sam pusty gryf ({barWeight} kg)</span>
                  ) : (
                    plateResult.platesUsed.map((p, idx) => (
                      <span key={idx} className="px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs">
                        {p.count}× {p.weight} kg
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTool === 'one_rm_calc' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/50 shadow-xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 font-mono">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  <span>Kalkulator Siły Maksymalnej 1RM (Epley &amp; Brzycki)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTool('none')}
                  className="text-slate-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-bold">Ciężar (kg):</label>
                  <input
                    type="number"
                    value={calcWeight}
                    onChange={(e) => setCalcWeight(Number(e.target.value) || 0)}
                    className="w-full h-8 text-center bg-slate-900 border border-slate-700 rounded-lg text-xs font-black text-amber-400 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-bold">Liczba powtórzeń:</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={calcReps}
                    onChange={(e) => setCalcReps(Math.min(15, Math.max(1, Number(e.target.value) || 1)))}
                    className="w-full h-8 text-center bg-slate-900 border border-slate-700 rounded-lg text-xs font-black text-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* 1RM Percentages Grid */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Szacowany Maks (1RM):</span>
                  <span className="text-base font-black font-mono text-amber-400">{estimated1RM} kg</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center font-mono text-[11px]">
                  <div className="p-1 rounded bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[9px]">90%</div>
                    <div className="font-bold text-white">{Math.round(estimated1RM * 0.9)}kg</div>
                  </div>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[9px]">80%</div>
                    <div className="font-bold text-white">{Math.round(estimated1RM * 0.8)}kg</div>
                  </div>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[9px]">70%</div>
                    <div className="font-bold text-white">{Math.round(estimated1RM * 0.7)}kg</div>
                  </div>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800">
                    <div className="text-slate-500 text-[9px]">60%</div>
                    <div className="font-bold text-white">{Math.round(estimated1RM * 0.6)}kg</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 🖐️ 3. SZYBKIE PRZEŁĄCZNIKI ERGONOMICZNE (QUICK TOGGLES) */}
          {/* ======================================================== */}
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-1 font-mono flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Szybkie Opcje Układu &amp; Ergonomii:</span>
            </span>

            <div className="grid grid-cols-2 gap-2">
              {/* Handedness Toggle */}
              <button
                type="button"
                onClick={() => {
                  onUpdateSettings({ handedness: isLeftHanded ? 'right' : 'left' });
                  soundService.triggerHaptic('light');
                }}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-left cursor-pointer transition-all ${
                  isLeftHanded
                    ? 'bg-slate-950 border-emerald-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1">
                    <Hand className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isLeftHanded ? 'Lewa ręka 👈' : 'Prawa ręka 👉'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">Pozycja [ ✓ ]</div>
                </div>
                {isLeftHanded ? <Check className="w-4 h-4 text-emerald-400" /> : <div className="w-2 h-2 rounded-full bg-slate-700" />}
              </button>

              {/* Gym-Digits Toggle */}
              <button
                type="button"
                onClick={() => {
                  onUpdateSettings({ gymDigits: !isGymDigits });
                  soundService.triggerHaptic('light');
                }}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-left cursor-pointer transition-all ${
                  isGymDigits
                    ? 'bg-slate-950 border-emerald-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div>
                  <div className="text-xs font-bold font-mono">Gym-Digits</div>
                  <div className="text-[10px] text-slate-500">Wielkie cyfry kg</div>
                </div>
                {isGymDigits ? <Check className="w-4 h-4 text-emerald-400" /> : <div className="w-2 h-2 rounded-full bg-slate-700" />}
              </button>

              {/* WakeLock Toggle */}
              <button
                type="button"
                onClick={() => {
                  onUpdateSettings({ screenWakeLock: !isWakeLock });
                  soundService.triggerHaptic('light');
                }}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-left cursor-pointer transition-all ${
                  isWakeLock
                    ? 'bg-slate-950 border-emerald-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WakeLock</span>
                  </div>
                  <div className="text-[10px] text-slate-500">Ekran nie gaśnie</div>
                </div>
                {isWakeLock ? <Check className="w-4 h-4 text-emerald-400" /> : <div className="w-2 h-2 rounded-full bg-slate-700" />}
              </button>

              {/* Quick Backup Trigger */}
              <button
                type="button"
                onClick={handleQuickBackup}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between text-left cursor-pointer transition-all active:scale-95"
              >
                <div>
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <Save className="w-3.5 h-3.5 text-teal-400" />
                    <span>{backupDone ? 'Zapisano ✓' : 'Szybki Backup'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">Migawka bazy JSON</div>
                </div>
                {backupDone && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 📋 4. SEKCJE MENU I NAWIGACJI */}
          {/* ======================================================== */}
          {menuSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1.5 pt-1">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 font-mono">
                {section.title}
              </h4>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      id={`bottom-sheet-item-${item.id}`}
                      onClick={() => {
                        onSelectView(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3.5 p-3 rounded-2xl transition-all cursor-pointer min-h-[52px] ${
                        isActive
                          ? isDark
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold'
                            : 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold'
                          : isDark
                            ? 'bg-slate-950/60 hover:bg-slate-800/80 text-slate-200 border border-slate-800/60'
                            : 'bg-slate-100/70 hover:bg-slate-100 text-slate-800 border border-transparent'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        isActive
                          ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-600 text-white'
                          : isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-600 shadow-xs'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold truncate">{item.label}</span>
                          {item.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.description}
                        </p>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
