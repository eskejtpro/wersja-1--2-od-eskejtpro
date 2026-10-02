import React, { useState } from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Type, 
  Monitor, 
  Sliders, 
  LayoutGrid, 
  Check, 
  Sparkles,
  Maximize2,
  Minimize2,
  Laptop,
  Tv,
  Smartphone,
  Calendar,
  TrendingUp,
  Activity,
  Scale,
  Syringe,
  Dumbbell,
  Code2,
  Settings as SettingsIcon,
  User,
  Bot,
  Palette,
  Timer,
  Volume2,
  VolumeX,
  Vibrate,
  Hand,
  Sun,
  Moon,
  Calculator,
  Plus,
  Minus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown
} from 'lucide-react';
import { AppSettings } from '../types';
import { soundService, SoundType, HapticIntensity } from '../utils/soundService';

interface LayoutCustomizerSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  isDark?: boolean;
}

export const ALL_NAV_MODULES = [
  { id: 'quick_access', label: 'Pulpit Szybkiego Dostępu', icon: Sparkles, description: 'Główny pulpit modułowy i szybkie funkcje' },
  { id: 'plan', label: 'Plan Treningowy & Rejestr', icon: Calendar, description: 'Dziennik serii, powtórzeń i ciężarów' },
  { id: 'stats', label: 'Progres & Wykresy 1RM', icon: TrendingUp, description: 'Wykresy siły, tonażu i rekordy PR' },
  { id: 'muscle', label: 'Analiza Partii Mięśniowych', icon: Activity, description: 'Balans objętości i zaangażowanie partii' },
  { id: 'weight', label: 'Dziennik Wagi & Obwodów', icon: Scale, description: 'Pomiary sylwetki i średnie kroczące' },
  { id: 'cycles', label: 'Kalendarz', icon: Syringe, description: 'Kalendarz iniekcji i kalkulator stężeń' },
  { id: 'exercises', label: 'Katalog & Baza Ćwiczeń', icon: Dumbbell, description: 'Słownik wzorcowy szablonów ćwiczeń' },
  { id: 'ai', label: 'Trener AI (Gemini)', icon: Bot, description: 'Inteligentny asystent treningu i periodyzacji' },
  { id: 'profile', label: 'Centrum Synchronizacji & Badania', icon: User, description: 'Badania krwi i połączenie Windows ↔ Android' },
  { id: 'settings', label: 'Ustawienia & Auto-Backup', icon: SettingsIcon, description: 'Konfiguracja kopii i parametrów bazy' },
];

export const COLOR_ACCENTS = [
  { id: 'emerald', label: 'Szmaragdowy Neon', hex: '#10b981', ring: 'ring-emerald-500', bg: 'bg-emerald-600', text: 'text-emerald-400', border: 'border-emerald-500' },
  { id: 'cyan', label: 'Cyber Błękit', hex: '#06b6d4', ring: 'ring-cyan-500', bg: 'bg-cyan-600', text: 'text-cyan-400', border: 'border-cyan-500' },
  { id: 'gold', label: 'Złoty Mistrz', hex: '#f59e0b', ring: 'ring-amber-500', bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500' },
  { id: 'crimson', label: 'Karminowa Czerwień', hex: '#ef4444', ring: 'ring-rose-500', bg: 'bg-rose-600', text: 'text-rose-400', border: 'border-rose-500' },
  { id: 'purple', label: 'Ametystowy Fiolet', hex: '#a855f7', ring: 'ring-purple-500', bg: 'bg-purple-600', text: 'text-purple-400', border: 'border-purple-500' },
  { id: 'blue', label: 'Kobaltowy Błękit', hex: '#3b82f6', ring: 'ring-blue-500', bg: 'bg-blue-600', text: 'text-blue-400', border: 'border-blue-500' },
  { id: 'cyberpunk', label: 'Cyberpunk Glow', hex: '#ec4899', ring: 'ring-pink-500', bg: 'bg-pink-600', text: 'text-pink-400', border: 'border-pink-500' },
];

export const LayoutCustomizerSettings: React.FC<LayoutCustomizerSettingsProps> = ({
  settings,
  onUpdateSettings,
  isDark = true
}) => {
  // Accordion Expand/Collapse State
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    preview: true,
    colors: true,
    typography: true,
    ergonomics: true,
    timer: true,
    math: false,
    bottomNav: false,
    navOrder: false,
  });

  const toggleSection = (sectionKey: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const expandAll = () => {
    setOpenSections({
      preview: true,
      colors: true,
      typography: true,
      ergonomics: true,
      timer: true,
      math: true,
      bottomNav: true,
      navOrder: true,
    });
  };

  const collapseAll = () => {
    setOpenSections({
      preview: false,
      colors: false,
      typography: false,
      ergonomics: false,
      timer: false,
      math: false,
      bottomNav: false,
      navOrder: false,
    });
  };

  // Navigation order state
  const currentNavOrder = settings.navOrder || ALL_NAV_MODULES.map((m) => m.id);
  const hiddenItems = new Set(settings.hiddenNavItems || []);

  const orderedModules = currentNavOrder
    .map((id) => ALL_NAV_MODULES.find((m) => m.id === id))
    .filter(Boolean) as typeof ALL_NAV_MODULES;

  ALL_NAV_MODULES.forEach((m) => {
    if (!orderedModules.some((om) => om.id === m.id)) {
      orderedModules.push(m);
    }
  });

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...orderedModules.map((m) => m.id)];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    onUpdateSettings({ navOrder: newOrder });
  };

  const handleMoveDown = (index: number) => {
    if (index >= orderedModules.length - 1) return;
    const newOrder = [...orderedModules.map((m) => m.id)];
    const temp = newOrder[index + 1];
    newOrder[index + 1] = newOrder[index];
    newOrder[index] = temp;
    onUpdateSettings({ navOrder: newOrder });
  };

  const handleToggleVisibility = (id: string) => {
    const updated = new Set(hiddenItems);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      if (id === 'plan' && updated.has('settings')) return;
      if (id === 'settings' && updated.has('plan')) return;
      updated.add(id);
    }
    onUpdateSettings({ hiddenNavItems: Array.from(updated) });
  };

  // Preview interactive sample state
  const [sampleWeight, setSampleWeight] = useState(100);
  const [sampleReps, setSampleReps] = useState(8);
  const [sampleCompleted, setSampleCompleted] = useState(true);

  // Settings values with fallbacks
  const currentFontSize = settings.fontSizeScale || 100;
  const currentAccent = settings.accentColor || 'emerald';
  const isAmoled = settings.amoledBlack === true;
  const isHighContrast = settings.highContrastBorders === true;
  const isGymDigits = settings.gymDigits !== false;
  const currentBorderRadius = settings.cardBorderRadius || 'rounded';
  const currentCardDensity = settings.cardDensity || 'compact';
  const currentHandedness = settings.handedness || 'right';
  const isWakeLock = settings.screenWakeLock !== false;
  const isAutoFocus = settings.autoFocusNextSet !== false;
  const timerSound = settings.timerSoundType || 'bell';
  const hapticLevel = settings.hapticIntensity || 'medium';
  const timerAutoStart = settings.timerAutoStart !== false;
  const timerWarn10s = settings.timerWarning10s !== false;
  const oneRmFormula = settings.oneRmFormula || 'brzycki';
  const roundingStep = settings.weightRoundingStep ?? 0.5;
  const bottomNavHeight = settings.bottomNavHeight || 'standard';
  const bottomNavLabels = settings.bottomNavLabels || 'all';
  const fabMode = settings.floatingActionButton || 'timer';

  const accentDef = COLOR_ACCENTS.find(c => c.id === currentAccent) || COLOR_ACCENTS[0];

  const getRadiusClass = () => {
    if (currentBorderRadius === 'sharp') return 'rounded-xs';
    if (currentBorderRadius === 'pill') return 'rounded-3xl';
    return 'rounded-xl';
  };

  return (
    <div className="space-y-4" id="layout-customizer-root">
      
      {/* Top Global Expand/Collapse Bar */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <ChevronsUpDown className="w-4 h-4 text-emerald-400" />
          <span className="font-bold">Zwijane sekcje ustawień (kliknij nagłówek, aby rozwinąć)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-bold cursor-pointer transition-colors"
          >
            Rozwiń wszystkie
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-bold cursor-pointer transition-colors"
          >
            Zwiń wszystkie
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 0. INTERAKTYWNY SYMULATOR / LIVE PREVIEW */}
      {/* ======================================================== */}
      <div className={`border shadow-xl overflow-hidden transition-all ${
        isAmoled ? 'bg-black border-zinc-800' : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      } ${getRadiusClass()} ${isHighContrast ? 'border-2 border-emerald-500/80 shadow-emerald-950/40' : ''}`}>
        <button
          type="button"
          onClick={() => toggleSection('preview')}
          className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className={`w-5 h-5 ${accentDef.text}`} />
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
                <span>Podgląd Na Żywo (Wszystkie Opcje w Czasie Rzeczywistym)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
                  {currentHandedness === 'right' ? '👉 Prawa dłoń' : '👈 Lewa dłoń'} • {currentFontSize}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Sprawdź natychmiastową reakcję karty serii na zmiany kolorów, cyfr i wielkości</p>
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400">
            {openSections.preview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {openSections.preview && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/60 animate-fadeIn">
            {/* Dynamic Preview Exercise Box */}
            <div 
              className={`p-4 border transition-all ${
                isAmoled ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-950/80 border-slate-800'
              } ${getRadiusClass()} ${isHighContrast ? 'border-emerald-500/60' : ''}`}
              style={{ fontSize: `${(currentFontSize / 100) * 14}px` }}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${accentDef.bg}`} />
                  <span className="font-extrabold text-white">Wyciskanie sztangi leżąc</span>
                </div>
                <span className={`font-mono font-bold text-xs ${accentDef.text}`}>
                  Szacowane 1RM: {Math.round(sampleWeight * (1 + sampleReps / 30))} kg
                </span>
              </div>

              {/* Set Row with Left/Right Handedness layout */}
              <div className={`flex items-center gap-2 sm:gap-4 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 ${
                currentHandedness === 'left' ? 'flex-row-reverse' : 'flex-row'
              }`}>
                {/* Action Checkmark Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSampleCompleted(!sampleCompleted);
                    soundService.playSuccessSound(timerSound, hapticLevel);
                  }}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white transition-all shrink-0 cursor-pointer shadow-md ${
                    sampleCompleted ? accentDef.bg : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                  }`}
                  title="Zatwierdź serię (Podgląd)"
                >
                  <Check className="w-5 h-5" />
                </button>

                {/* Set Info & Gym-Digits */}
                <div className={`flex-1 flex items-center justify-between gap-2 ${
                  currentHandedness === 'left' ? 'text-right' : 'text-left'
                }`}>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">Seria #1 (Główna)</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-black text-white ${isGymDigits ? 'text-xl sm:text-2xl font-mono' : 'text-base'}`}>
                        {sampleWeight} <span className="text-xs font-normal text-slate-400">kg</span>
                      </span>
                      <span className="text-slate-500 font-bold">×</span>
                      <span className={`font-black text-white ${isGymDigits ? 'text-xl sm:text-2xl font-mono' : 'text-base'}`}>
                        {sampleReps} <span className="text-xs font-normal text-slate-400">powt.</span>
                      </span>
                    </div>
                  </div>

                  {/* Quick +/- Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSampleWeight(w => Math.max(0, w - 2.5));
                        soundService.triggerHaptic(hapticLevel);
                      }}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center cursor-pointer active:scale-95"
                      title="-2.5 kg"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSampleWeight(w => w + 2.5);
                        soundService.triggerHaptic(hapticLevel);
                      }}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center cursor-pointer active:scale-95"
                      title="+2.5 kg"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 1. KOLORYSTYKA, AKCENTY & EKRAN AMOLED */}
      {/* ======================================================== */}
      <div className={`border overflow-hidden transition-all ${
        isAmoled ? 'bg-black border-zinc-800' : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      } ${getRadiusClass()}`}>
        <button
          type="button"
          onClick={() => toggleSection('colors')}
          className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Palette className={`w-5 h-5 ${accentDef.text}`} />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Kolorystyka &amp; Oszczędzanie Baterii AMOLED</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold text-white ${accentDef.bg}`}>
                  {accentDef.label}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Wybór akcentu neonowego oraz głęboka czerń wygaszająca piksele na Xiaomi 14T</p>
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400">
            {openSections.colors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {openSections.colors && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/60 space-y-4 animate-fadeIn">
            {/* Accent Color Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Główny Akcent Kolorystyczny:</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {COLOR_ACCENTS.map((accent) => {
                  const isSelected = currentAccent === accent.id;
                  return (
                    <button
                      key={accent.id}
                      type="button"
                      onClick={() => onUpdateSettings({ accentColor: accent.id as any })}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-950 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${accent.bg} shrink-0`} />
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : ''}`}>
                        {accent.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AMOLED & Sunlight Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-slate-400" />
                    <span>True AMOLED Black (#000000)</span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Wygasza piksele na ekranie Xiaomi 14T i wydłuża czas pracy na baterii</p>
                </div>
                <input
                  type="checkbox"
                  checked={isAmoled}
                  onChange={(e) => onUpdateSettings({ amoledBlack: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tryb Pełnego Słońca (High Contrast)</span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Pogrubione, kontrastowe obramowania kart na mocno oświetlonej siłowni</p>
                </div>
                <input
                  type="checkbox"
                  checked={isHighContrast}
                  onChange={(e) => onUpdateSettings({ highContrastBorders: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. TYPOGRAFIA, ROZMIARY OKIEN & CYFRY GYM-DIGITS */}
      {/* ======================================================== */}
      <div className={`border overflow-hidden transition-all ${
        isAmoled ? 'bg-black border-zinc-800' : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      } ${getRadiusClass()}`}>
        <button
          type="button"
          onClick={() => toggleSection('typography')}
          className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Type className={`w-5 h-5 ${accentDef.text}`} />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Typografia, Wielkość Okien &amp; Cyfry Gym-Digits</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-slate-800 text-emerald-400">
                  {currentFontSize}%
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Dostosuj czytelność napisów, cyfr serii oraz zaokrąglenie kart pod własny wzrok</p>
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400">
            {openSections.typography ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {openSections.typography && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/60 space-y-4 animate-fadeIn">
            {/* Font Size Scaling */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Skalowanie Czcionki Interfejsu:</span>
                <span className={`font-mono font-bold ${accentDef.text}`}>{currentFontSize}%</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { val: 85, label: '85% Kompaktowa' },
                  { val: 100, label: '100% Standard' },
                  { val: 115, label: '115% Czytelna' },
                  { val: 130, label: '130% Duża' },
                  { val: 145, label: '145% Maksymalna' },
                ].map((fs) => (
                  <button
                    key={fs.val}
                    type="button"
                    onClick={() => onUpdateSettings({ fontSizeScale: fs.val })}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      currentFontSize === fs.val
                        ? `${accentDef.bg} text-white border-transparent shadow-xs`
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {fs.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Card Density / Układ Kompaktowy */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Gęstość &amp; Kompaktowość Kart (Density Mode):</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {currentCardDensity === 'ultra_dense' ? '🎛️ Ultra-Zagęszczony' : currentCardDensity === 'compact' ? '📱 Kompaktowy (Zalecany)' : '🛋️ Komfortowy'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Wybierz stopień zagęszczenia elementów, aby zmieścić więcej ćwiczeń na ekranie Xiaomi 14T bez konieczności przewijania:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {[
                  {
                    id: 'compact',
                    title: '📱 Kompaktowy (Zalecany)',
                    desc: 'Oszczędność ~35% wysokości. 3 ćwiczenia widoczne jednocześnie.',
                    badge: '-35% pionu'
                  },
                  {
                    id: 'ultra_dense',
                    title: '🎛️ Ultra-Zagęszczony',
                    desc: 'Płaskie mikro-karty dla maksymalnej ilości danych na ekranie.',
                    badge: 'Maks. danych'
                  },
                  {
                    id: 'standard',
                    title: '🛋️ Komfortowy',
                    desc: 'Przestronne odstępy, duże marginesy i wysokie kafelki.',
                    badge: 'Standard'
                  },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onUpdateSettings({ cardDensity: d.id as any })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                      currentCardDensity === d.id
                        ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${currentCardDensity === d.id ? 'text-white' : 'text-slate-300'}`}>
                        {d.title}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono">
                        {d.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {d.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Gym-Digits & Corner Radius */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-200">Wielkie Cyfry Ciężaru (Gym-Digits)</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Powiększa cyfry kg i powtórzeń, by były czytelne z odległości 2 metrów</p>
                </div>
                <input
                  type="checkbox"
                  checked={isGymDigits}
                  onChange={(e) => onUpdateSettings({ gymDigits: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-xs font-bold text-slate-200">Zaokrąglenia Okien &amp; Kart:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'sharp', label: 'Kanciaste (4px)' },
                    { id: 'rounded', label: 'Klasyczne (14px)' },
                    { id: 'pill', label: 'Pełne (24px)' },
                  ].map((br) => (
                    <button
                      key={br.id}
                      type="button"
                      onClick={() => onUpdateSettings({ cardBorderRadius: br.id as any })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        currentBorderRadius === br.id
                          ? `${accentDef.bg} text-white border-transparent`
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {br.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. ERGONOMIA JEDNEJ RĘKI & TRYB TRENINGOWY */}
      {/* ======================================================== */}
      <div className={`border overflow-hidden transition-all ${
        isAmoled ? 'bg-black border-zinc-800' : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      } ${getRadiusClass()}`}>
        <button
          type="button"
          onClick={() => toggleSection('ergonomics')}
          className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Hand className={`w-5 h-5 ${accentDef.text}`} />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Ergonomia Jednej Ręki &amp; Ułatwienia Treningowe</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-800 text-slate-300">
                  {currentHandedness === 'right' ? 'Prawa dłoń' : 'Lewa dłoń'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Dostosowanie pozycji przycisków zatwierdzania serii pod dominujący kciuk</p>
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400">
            {openSections.ergonomics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {openSections.ergonomics && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/60 space-y-4 animate-fadeIn">
            {/* Handedness selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onUpdateSettings({ handedness: 'right' })}
                className={`p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                  currentHandedness === 'right'
                    ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">👉 Układ dla Prawej Dłoni</div>
                  <div className="text-[11px] text-slate-500">Przycisk [ ✓ ] i skróty po prawej stronie</div>
                </div>
                {currentHandedness === 'right' && <Check className="w-4 h-4 text-emerald-400" />}
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ handedness: 'left' })}
                className={`p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                  currentHandedness === 'left'
                    ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">👈 Układ dla Lewej Dłoni</div>
                  <div className="text-[11px] text-slate-500">Przycisk [ ✓ ] i skróty po lewej stronie</div>
                </div>
                {currentHandedness === 'left' && <Check className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>

            {/* WakeLock & AutoFocus */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-200">Blokada Wygaszania Ekranu (WakeLock)</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Utrzymuje włączony ekran podczas aktywnego treningu</p>
                </div>
                <input
                  type="checkbox"
                  checked={isWakeLock}
                  onChange={(e) => onUpdateSettings({ screenWakeLock: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-200">Auto-Focus na Następną Serię</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Po odhaczeniu serii automatycznie podświetla i przewija do kolejnej</p>
                </div>
                <input
                  type="checkbox"
                  checked={isAutoFocus}
                  onChange={(e) => onUpdateSettings({ autoFocusNextSet: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. ZAAWANSOWANY STOPER PRZERW, DŹWIĘKI & HAPTYKA */}
      {/* ======================================================== */}
      <div className={`border overflow-hidden transition-all ${
        isAmoled ? 'bg-black border-zinc-800' : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      } ${getRadiusClass()}`}>
        <button
          type="button"
          onClick={() => toggleSection('timer')}
          className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Timer className={`w-5 h-5 ${accentDef.text}`} />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Stoper Treningowy, Dźwięki &amp; Haptyka Wibracji</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-800 text-emerald-400">
                  {timerSound} • {hapticLevel}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Konfiguracja automatycznego odliczania przerw między seriami i sygnalizacji</p>
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400">
            {openSections.timer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {openSections.timer && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/60 space-y-4 animate-fadeIn">
            {/* Default Rest times */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">Bój Wielostawowy:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.restTimeCompound ?? 180}
                    onChange={(e) => onUpdateSettings({ restTimeCompound: Number(e.target.value) || 180 })}
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold"
                  />
                  <span className="text-xs text-slate-400">sekund (3 min)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">Ćwiczenie Akcesoryjne:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.restTimeAccessory ?? 90}
                    onChange={(e) => onUpdateSettings({ restTimeAccessory: Number(e.target.value) || 90 })}
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold"
                  />
                  <span className="text-xs text-slate-400">sekund (1.5 min)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">Izolacja / Brzuch:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.restTimeIsolation ?? 60}
                    onChange={(e) => onUpdateSettings({ restTimeIsolation: Number(e.target.value) || 60 })}
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold"
                  />
                  <span className="text-xs text-slate-400">sekund (1 min)</span>
                </div>
              </div>
            </div>

            {/* Audio & Haptic selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Sound selector */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <span>Dźwięk Końca Przerwy:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => soundService.notifyTimerFinished(timerSound, hapticLevel)}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    Przetestuj dźwięk 🔊
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'bell', label: 'Dzwonek Gong' },
                    { id: 'beep', label: 'Sportowy Beep' },
                    { id: 'silent', label: 'Wyciszony' },
                  ].map((snd) => (
                    <button
                      key={snd.id}
                      type="button"
                      onClick={() => onUpdateSettings({ timerSoundType: snd.id as any })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        timerSound === snd.id
                          ? `${accentDef.bg} text-white border-transparent`
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {snd.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Haptic level selector */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Vibrate className="w-4 h-4 text-emerald-400" />
                    <span>Siła Wibracji (Haptyka):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => soundService.triggerHaptic(hapticLevel)}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    Przetestuj wibrację 📳
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'off', label: 'Brak' },
                    { id: 'light', label: 'Lekka' },
                    { id: 'medium', label: 'Średnia' },
                    { id: 'strong', label: 'Mocna' },
                  ].map((hp) => (
                    <button
                      key={hp.id}
                      type="button"
                      onClick={() => onUpdateSettings({ hapticIntensity: hp.id as any })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        hapticLevel === hp.id
                          ? `${accentDef.bg} text-white border-transparent`
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {hp.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AutoStart & Warning10s */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-200">Auto-Start Stopera po Serii</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Automatycznie rozpoczyna odliczanie po kliknięciu [ ✓ ]</p>
                </div>
                <input
                  type="checkbox"
                  checked={timerAutoStart}
                  onChange={(e) => onUpdateSettings({ timerAutoStart: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-200">Sygnał 10 Sekund Przed Końcem</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Delikatny impuls wibracji dający znać o podejściu do sztangi</p>
                </div>
                <input
                  type="checkbox"
                  checked={timerWarn10s}
                  onChange={(e) => onUpdateSettings({ timerWarning10s: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 5. MATEMATYKA, 1RM & ANALITYKA */}
      {/* ======================================================== */}
      <div className={`border overflow-hidden transition-all ${
        isAmoled ? 'bg-black border-zinc-800' : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      } ${getRadiusClass()}`}>
        <button
          type="button"
          onClick={() => toggleSection('math')}
          className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Calculator className={`w-5 h-5 ${accentDef.text}`} />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Matematyka 1RM, Zaokrąglenia Ciężarów &amp; EMA</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-800 text-slate-300 uppercase">
                  {oneRmFormula}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Wybór formuły szacowania siły maksymalnej i czułości wygładzania wagi ciała</p>
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400">
            {openSections.math ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {openSections.math && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/60 space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1RM Formula */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-xs font-bold text-slate-200">Formuła Szacowania 1RM:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'brzycki', label: 'Brzycki' },
                    { id: 'epley', label: 'Epley' },
                    { id: 'lombardi', label: 'Lombardi' },
                    { id: 'wathan', label: 'Wathan' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onUpdateSettings({ oneRmFormula: f.id as any })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        oneRmFormula === f.id
                          ? `${accentDef.bg} text-white border-transparent`
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight Rounding Step */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-xs font-bold text-slate-200">Krok Zaokrąglenia Ciężaru:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { val: 0, label: 'Brak (ułamek)' },
                    { val: 0.5, label: 'do 0.5 kg' },
                    { val: 1.25, label: 'do 1.25 kg' },
                    { val: 2.5, label: 'do 2.5 kg' },
                  ].map((wr) => (
                    <button
                      key={wr.val}
                      type="button"
                      onClick={() => onUpdateSettings({ weightRoundingStep: wr.val as any })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        roundingStep === wr.val
                          ? `${accentDef.bg} text-white border-transparent`
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {wr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* EMA Alpha */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-xs font-bold text-slate-200">Filtr Wagi EMA (Alfa):</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { val: 0.2, label: '0.2 Łagodny' },
                    { val: 0.3, label: '0.3 Standard' },
                    { val: 0.5, label: '0.5 Czuły' },
                  ].map((em) => (
                    <button
                      key={em.val}
                      type="button"
                      onClick={() => onUpdateSettings({ emaAlpha: em.val as any })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        settings.emaAlpha === em.val
                          ? `${accentDef.bg} text-white border-transparent`
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {em.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 6. PASEK DOLNY ANDROIDA & PŁYWAJĄCY PRZYCISK (FAB) */}
      {/* ======================================================== */}
      <div className={`border overflow-hidden transition-all ${
        isAmoled ? 'bg-black border-zinc-800' : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      } ${getRadiusClass()}`}>
        <button
          type="button"
          onClick={() => toggleSection('bottomNav')}
          className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Smartphone className={`w-5 h-5 ${accentDef.text}`} />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Dolny Pasek Nawigacji &amp; Pływający Przycisk FAB</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-800 text-slate-300">
                  {bottomNavHeight} • FAB: {fabMode}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Dostosuj wysokość paska nawigacji i wybierz podręczny przycisk szybkiej akcji</p>
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400">
            {openSections.bottomNav ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {openSections.bottomNav && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/60 space-y-4 animate-fadeIn">
            {/* Style Paska */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-200">Styl Paska Dolnego:</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'floating_dock', label: 'Pływający Dock 2.0', desc: 'Zaokrąglony dock nad dolną krawędzią' },
                  { id: 'classic_bar', label: 'Klasyczny Pasek', desc: 'Pełna szerokość przy krawędzi ekranu' },
                  { id: 'minimal_capsule', label: 'Kapsuła Minimal', desc: 'Owalna kapsuła z zaokrąglonymi rogami' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onUpdateSettings({ bottomNavStyle: st.id as any })}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      (settings.bottomNavStyle || 'floating_dock') === st.id
                        ? `${accentDef.bg} text-white border-transparent shadow-xs`
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold block">{st.label}</span>
                    <span className="text-[9.5px] opacity-80 block leading-tight">{st.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Nav Height */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-xs font-bold text-slate-200">Wysokość Paska Dolnego:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'compact', label: '42px' },
                    { id: 'standard', label: '48px' },
                    { id: 'large', label: '56px' },
                  ].map((bh) => (
                    <button
                      key={bh.id}
                      type="button"
                      onClick={() => onUpdateSettings({ bottomNavHeight: bh.id as any })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        bottomNavHeight === bh.id
                          ? `${accentDef.bg} text-white border-transparent`
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {bh.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nav Labels */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-xs font-bold text-slate-200">Podpisy pod Ikonami:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'all', label: 'Wszystkie' },
                    { id: 'active_only', label: 'Aktywne' },
                    { id: 'icons_only', label: 'Tylko ikony' },
                  ].map((bl) => (
                    <button
                      key={bl.id}
                      type="button"
                      onClick={() => onUpdateSettings({ bottomNavLabels: bl.id as any })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        bottomNavLabels === bl.id
                          ? `${accentDef.bg} text-white border-transparent`
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {bl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Floating Action Button */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-xs font-bold text-slate-200">Pływający Przycisk FAB:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'timer', label: '⏱️ Stoper' },
                    { id: 'ai', label: '🤖 Trener AI' },
                    { id: 'weight', label: '⚖️ Waga' },
                    { id: 'none', label: '🚫 Brak' },
                  ].map((fb) => (
                    <button
                      key={fb.id}
                      type="button"
                      onClick={() => onUpdateSettings({ floatingActionButton: fb.id as any })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        fabMode === fb.id
                          ? `${accentDef.bg} text-white border-transparent`
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {fb.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 7. KOLEJNOŚĆ I WIDOCZNOŚĆ MODUŁÓW NAWIGACJI */}
      {/* ======================================================== */}
      <div className={`border overflow-hidden transition-all ${
        isAmoled ? 'bg-black border-zinc-800' : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      } ${getRadiusClass()}`}>
        <button
          type="button"
          onClick={() => toggleSection('navOrder')}
          className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <LayoutGrid className={`w-5 h-5 ${accentDef.text}`} />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Kolejność &amp; Widoczność Modułów w Menu</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-800 text-slate-300">
                  {orderedModules.length} modułów
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Ustaw własną kolejność zakładek oraz ukryj nieużywane sekcje</p>
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400">
            {openSections.navOrder ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {openSections.navOrder && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/60 space-y-4 animate-fadeIn">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onUpdateSettings({
                  navOrder: ALL_NAV_MODULES.map((m) => m.id),
                  hiddenNavItems: []
                })}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Przywróć domyślne</span>
              </button>
            </div>

            {/* List of Modules */}
            <div className="space-y-2">
              {orderedModules.map((module, index) => {
                const Icon = module.icon;
                const isHidden = hiddenItems.has(module.id);
                const isFirst = index === 0;
                const isLast = index === orderedModules.length - 1;

                return (
                  <div
                    key={module.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      isHidden
                        ? 'bg-slate-950/40 border-slate-900 opacity-60'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        isHidden
                          ? 'bg-slate-900 text-slate-600'
                          : `${accentDef.bg}/20 ${accentDef.text} border border-emerald-500/30`
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold truncate ${isHidden ? 'text-slate-500' : 'text-slate-200'}`}>
                            {module.label}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-800 text-slate-400">
                            #{index + 1}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {module.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={isFirst}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Przesuń w górę"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={isLast}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Przesuń w dół"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(module.id)}
                        className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                          isHidden
                            ? 'bg-amber-950/40 text-amber-400 border border-amber-500/30 hover:bg-amber-900/50'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
                        }`}
                        title={isHidden ? 'Pokaż w menu' : 'Ukryj w menu'}
                      >
                        {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
