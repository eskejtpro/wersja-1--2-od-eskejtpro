import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Dumbbell, 
  Clock, 
  Scale, 
  Sparkles, 
  Activity, 
  Syringe, 
  Trophy, 
  FileText, 
  Layers, 
  Plus, 
  Minus, 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowRight, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Settings2, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  Sliders, 
  Droplet, 
  Flame, 
  Check, 
  TrendingUp, 
  X,
  Volume2,
  VolumeX,
  Send,
  Loader2,
  Trash2,
  Edit3,
  Calculator,
  ArrowUpToLine,
  ArrowDownToLine,
  Palette,
  LayoutGrid,
  Wand2,
  ListOrdered,
  PlusCircle,
  HelpCircle,
  ChevronRight,
  RefreshCw,
  Search,
  GripVertical,
  Move
} from 'lucide-react';
import { 
  GymData, 
  AppSettings, 
  QuickAccessWidgetConfig, 
  QuickAccessWidgetId, 
  Exercise, 
  BodyWeightEntry 
} from '../types';
import { 
  DEFAULT_QUICK_ACCESS_WIDGETS, 
  AVAILABLE_WIDGET_CATALOG, 
  GEMINI_AI_PRESET_LAYOUTS, 
  CatalogWidgetDefinition, 
  AiPresetLayout 
} from '../data/initialData';

interface QuickAccessDashboardProps {
  data: GymData;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  onSelectView: (view: string) => void;
  onUpdateExerciseWeight: (weekId: string, dayId: string, exerciseId: string, weight: number) => void;
  onSaveExercisePerformance: (weekId: string, dayId: string, exerciseId: string, weight: number, sets: number, reps: number) => void;
  onAddBodyWeight: (entry: Omit<BodyWeightEntry, 'id'>) => void;
  unit: string;
}

export const QuickAccessDashboard: React.FC<QuickAccessDashboardProps> = ({
  data,
  onUpdateSettings,
  onSelectView,
  onSaveExercisePerformance,
  onAddBodyWeight,
  unit
}) => {
  const settings = data.settings;
  const isAmoled = settings.amoledBlack === true;
  const appAccent = settings.accentColor || 'emerald';
  const cardRadiusClass = settings.cardBorderRadius === 'sharp' 
    ? 'rounded-xs' 
    : settings.cardBorderRadius === 'pill' 
      ? 'rounded-3xl' 
      : settings.cardBorderRadius === 'extra_rounded' 
        ? 'rounded-2xl' 
        : 'rounded-xl';

  // Active workout resolution
  const weeks = data.weeks || [];
  const currentWeek = weeks[0];
  const currentDay = currentWeek?.days.find(d => !d.completed) || currentWeek?.days[0];

  // Modals & Panels state
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);
  const [isAddWidgetModalOpen, setIsAddWidgetModalOpen] = useState<boolean>(false);
  const [isAiPresetsModalOpen, setIsAiPresetsModalOpen] = useState<boolean>(false);
  const [editingWidget, setEditingWidget] = useState<QuickAccessWidgetConfig | null>(null);
  const [widgetSearchQuery, setWidgetSearchQuery] = useState<string>('');
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('all');

  // Drag and Drop (DnD) state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const touchDragRef = useRef<{ startY: number; startIndex: number } | null>(null);

  // Quick Timer state
  const [timerSeconds, setTimerSeconds] = useState<number>(90);
  const [timerRemaining, setTimerRemaining] = useState<number>(90);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerEndTimestamp, setTimerEndTimestamp] = useState<number | null>(null);

  // Quick Plate Calculator state
  const [plateCalcWeight, setPlateCalcWeight] = useState<number>(100);
  const [plateBarWeight, setPlateBarWeight] = useState<number>(20);

  // 1RM Calculator state
  const [calcInputWeight, setCalcInputWeight] = useState<number>(100);
  const [calcInputReps, setCalcInputReps] = useState<number>(5);
  const [calcFormula, setCalcFormula] = useState<'brzycki' | 'epley'>('brzycki');

  // Tabata / Interval Timer state
  const [intervalWorkSec, setIntervalWorkSec] = useState<number>(20);
  const [intervalRestSec, setIntervalRestSec] = useState<number>(10);
  const [intervalRounds, setIntervalRounds] = useState<number>(8);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [intervalPhase, setIntervalPhase] = useState<'idle' | 'work' | 'rest'>('idle');
  const [intervalRemaining, setIntervalRemaining] = useState<number>(20);

  // Quick Water Hydration state
  const [waterMl, setWaterMl] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gymtracker_water_today');
      return saved ? parseInt(saved, 10) : 1250;
    } catch {
      return 1250;
    }
  });

  // Quick Macro / Calories state
  const [todayCalories, setTodayCalories] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gymtracker_calories_today');
      return saved ? parseInt(saved, 10) : 1850;
    } catch {
      return 1850;
    }
  });
  const [todayProtein, setTodayProtein] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gymtracker_protein_today');
      return saved ? parseInt(saved, 10) : 140;
    } catch {
      return 140;
    }
  });

  // Quick Note state
  const [quickNote, setQuickNote] = useState<string>(() => {
    try {
      return localStorage.getItem('gymtracker_quick_note') || 'Pamiętać o rozgrzance stożka rotatorów i mocnym spięciu łopatek.';
    } catch {
      return '';
    }
  });
  const [quickNoteSaved, setQuickNoteSaved] = useState<boolean>(false);

  // AI Mini Coach state (Gemini 3.8 Pro)
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiModelUsed, setAiModelUsed] = useState<string>('gemini-3.8-pro');

  // Quick Weight Input
  const latestWeightObj = data.bodyWeights?.[data.bodyWeights.length - 1];
  const [newWeightInput, setNewWeightInput] = useState<number>(latestWeightObj?.weight || 82.0);
  const [weightSavedSuccess, setWeightSavedSuccess] = useState<boolean>(false);

  // Resolved widgets from settings or default
  const widgets: QuickAccessWidgetConfig[] = (settings.quickAccessWidgets && settings.quickAccessWidgets.length > 0)
    ? settings.quickAccessWidgets
    : DEFAULT_QUICK_ACCESS_WIDGETS;

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  // Timer Tick Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerEndTimestamp) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((timerEndTimestamp - Date.now()) / 1000));
        setTimerRemaining(remaining);
        if (remaining <= 0) {
          setIsTimerRunning(false);
          setTimerEndTimestamp(null);
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
          }
        }
      }, 250);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerEndTimestamp]);

  // Tabata Interval Tick Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (intervalPhase !== 'idle') {
      interval = setInterval(() => {
        setIntervalRemaining(prev => {
          if (prev <= 1) {
            if (intervalPhase === 'work') {
              if (currentRound >= intervalRounds) {
                setIntervalPhase('idle');
                setCurrentRound(1);
                if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]);
                return intervalWorkSec;
              } else {
                setIntervalPhase('rest');
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                return intervalRestSec;
              }
            } else {
              setIntervalPhase('work');
              setCurrentRound(r => r + 1);
              if (navigator.vibrate) navigator.vibrate([300]);
              return intervalWorkSec;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [intervalPhase, currentRound, intervalRounds, intervalWorkSec, intervalRestSec]);

  // ============================================================================
  // DRAG & DROP HANDLERS (HTML5 & TOUCH)
  // ============================================================================
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isEditMode) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    if (!isEditMode) return;
    e.preventDefault();
    setDropTargetIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isEditMode) return;
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    if (!isEditMode) return;
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDropTargetIndex(null);
      return;
    }

    const list = [...sortedWidgets];
    const itemToMove = list.splice(draggedIndex, 1)[0];
    list.splice(targetIndex, 0, itemToMove);

    const reordered = list.map((w, idx) => ({ ...w, order: idx + 1 }));
    onUpdateSettings({ quickAccessWidgets: reordered });
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  // Touch Drag Support for Android / Xiaomi 14T
  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    if (!isEditMode) return;
    touchDragRef.current = { startY: e.touches[0].clientY, startIndex: index };
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isEditMode || !touchDragRef.current) return;
    const touch = e.touches[0];
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    const widgetContainer = targetElement?.closest('[data-widget-index]');
    if (widgetContainer) {
      const targetIdx = parseInt(widgetContainer.getAttribute('data-widget-index') || '-1', 10);
      if (targetIdx >= 0 && targetIdx !== dropTargetIndex) {
        setDropTargetIndex(targetIdx);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isEditMode || !touchDragRef.current) return;
    if (draggedIndex !== null && dropTargetIndex !== null && draggedIndex !== dropTargetIndex) {
      const list = [...sortedWidgets];
      const itemToMove = list.splice(draggedIndex, 1)[0];
      list.splice(dropTargetIndex, 0, itemToMove);
      const reordered = list.map((w, idx) => ({ ...w, order: idx + 1 }));
      onUpdateSettings({ quickAccessWidgets: reordered });
    }
    touchDragRef.current = null;
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  // Timer & Calculator Handlers
  const handleStartTimer = (seconds: number) => {
    setTimerSeconds(seconds);
    setTimerRemaining(seconds);
    setTimerEndTimestamp(Date.now() + seconds * 1000);
    setIsTimerRunning(true);
  };

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      setIsTimerRunning(false);
      setTimerEndTimestamp(null);
    } else {
      setTimerEndTimestamp(Date.now() + timerRemaining * 1000);
      setIsTimerRunning(true);
    }
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerEndTimestamp(null);
    setTimerRemaining(timerSeconds);
  };

  const handleAddWater = (amount: number) => {
    const next = Math.max(0, waterMl + amount);
    setWaterMl(next);
    try {
      localStorage.setItem('gymtracker_water_today', next.toString());
    } catch {}
  };

  const handleAddCalories = (amount: number) => {
    const next = Math.max(0, todayCalories + amount);
    setTodayCalories(next);
    try {
      localStorage.setItem('gymtracker_calories_today', next.toString());
    } catch {}
  };

  const handleAddProtein = (amount: number) => {
    const next = Math.max(0, todayProtein + amount);
    setTodayProtein(next);
    try {
      localStorage.setItem('gymtracker_protein_today', next.toString());
    } catch {}
  };

  const handleSaveQuickNote = () => {
    try {
      localStorage.setItem('gymtracker_quick_note', quickNote);
      setQuickNoteSaved(true);
      setTimeout(() => setQuickNoteSaved(false), 2000);
    } catch {}
  };

  const handleSaveQuickWeight = () => {
    const today = new Date().toISOString().split('T')[0];
    onAddBodyWeight({ weight: newWeightInput, date: today, notes: 'Szybki pomiar z pulpitu' });
    setWeightSavedSuccess(true);
    setTimeout(() => setWeightSavedSuccess(false), 2000);
  };

  const calculatePlates = (targetWeight: number, bar: number = 20) => {
    if (targetWeight <= bar) return [];
    let perSide = (targetWeight - bar) / 2;
    const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
    const used: { weight: number; count: number }[] = [];

    for (const p of availablePlates) {
      if (perSide >= p) {
        const count = Math.floor(perSide / p);
        used.push({ weight: p, count });
        perSide -= count * p;
      }
    }
    return used;
  };

  const calculate1RM = (w: number, r: number, formula: 'brzycki' | 'epley') => {
    if (r <= 1) return w;
    if (formula === 'brzycki') {
      return r >= 37 ? w * 1.5 : Math.round(w / (1.0278 - 0.0278 * r));
    }
    return Math.round(w * (1 + r / 30));
  };

  // Mini AI Coach submit with Gemini 3.8 Pro
  const handleAskAiCoach = async (queryText?: string) => {
    const promptToSend = queryText || aiPrompt;
    if (!promptToSend.trim()) return;

    setIsAiLoading(true);
    setAiResponse(null);

    try {
      const athleteName = data.profile?.name || 'Pasik';
      const prompt = `Jestem zawodnikiem siłowym ${athleteName}. Moje pytanie z pulpitu szybkiego dostępu: "${promptToSend}". Zastosuj zaawansowaną wiedzę periodyzacyjną, zasady progresywnego przeładowania i fizjologię regeneracji. Odpowiedz konkretnie, profesjonalnie i zwięźle (2-4 zdania).`;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: [],
          persona: settings.aiAgentPersona || 'balanced',
          model: 'gemini-3.8-flash'
        })
      });

      if (!response.ok) throw new Error(`AI service HTTP ${response.status}`);
      const json = await response.json();
      if (typeof json.reply !== 'string' || !json.reply.trim()) throw new Error('AI service returned no answer');
      setAiResponse(json.reply);
      setAiModelUsed(json.model || 'unknown');
    } catch {
      setAiModelUsed('unavailable');
      setAiResponse('Usługa AI jest niedostępna albo nie zwróciła odpowiedzi. Nie wygenerowano zastępczej analizy.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // ============================================================================
  // WIDGET CONFIGURATION ACTIONS (DODAJ / ZMIEŃ / PRZESUŃ / USUŃ)
  // ============================================================================
  const handleAddWidgetFromCatalog = (catalogItem: CatalogWidgetDefinition, chosenSize?: 'full' | 'half' | 'compact') => {
    const newId = `w-${catalogItem.widgetType}-${Date.now().toString(36)}`;
    const newWidget: QuickAccessWidgetConfig = {
      id: newId,
      widgetType: catalogItem.widgetType,
      title: catalogItem.defaultTitle,
      enabled: true,
      order: widgets.length + 1,
      size: chosenSize || catalogItem.defaultSize,
      description: catalogItem.description
    };

    const updated = [...widgets, newWidget];
    onUpdateSettings({ quickAccessWidgets: updated });
    setIsAddWidgetModalOpen(false);
  };

  const handleDeleteWidget = (widgetId: string) => {
    const filtered = widgets.filter(w => w.id !== widgetId);
    const reordered = filtered.map((w, idx) => ({ ...w, order: idx + 1 }));
    onUpdateSettings({ quickAccessWidgets: reordered });
    if (editingWidget?.id === widgetId) {
      setEditingWidget(null);
    }
  };

  const handleToggleWidget = (widgetId: string) => {
    const updated = widgets.map(w => w.id === widgetId ? { ...w, enabled: !w.enabled } : w);
    onUpdateSettings({ quickAccessWidgets: updated });
  };

  const handleMoveWidget = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedWidgets.length) return;

    const list = [...sortedWidgets];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reordered = list.map((w, idx) => ({ ...w, order: idx + 1 }));
    onUpdateSettings({ quickAccessWidgets: reordered });
  };

  const handleChangeWidgetSize = (widgetId: string, size: 'full' | 'half' | 'compact') => {
    const updated = widgets.map(w => w.id === widgetId ? { ...w, size } : w);
    onUpdateSettings({ quickAccessWidgets: updated });
  };

  const handleSaveWidgetEdit = (updatedConfig: QuickAccessWidgetConfig) => {
    const updated = widgets.map(w => w.id === updatedConfig.id ? updatedConfig : w);
    onUpdateSettings({ quickAccessWidgets: updated });
    setEditingWidget(null);
  };

  const handleApplyAiPreset = (preset: AiPresetLayout) => {
    onUpdateSettings({ quickAccessWidgets: preset.widgets });
    setIsAiPresetsModalOpen(false);
  };

  const handleResetWidgets = () => {
    onUpdateSettings({ quickAccessWidgets: DEFAULT_QUICK_ACCESS_WIDGETS });
  };

  // Helper dla kolorów akcentów kafelków
  const getWidgetAccentClasses = (customColor?: string) => {
    const c = customColor || appAccent;
    switch (c) {
      case 'cyan':
        return { border: 'border-cyan-500/30', glow: 'shadow-cyan-500/10', text: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300' };
      case 'gold':
        return { border: 'border-amber-500/30', glow: 'shadow-amber-500/10', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' };
      case 'crimson':
        return { border: 'border-rose-500/30', glow: 'shadow-rose-500/10', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300' };
      case 'purple':
        return { border: 'border-purple-500/30', glow: 'shadow-purple-500/10', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300' };
      case 'blue':
        return { border: 'border-sky-500/30', glow: 'shadow-sky-500/10', text: 'text-sky-400', badge: 'bg-sky-500/20 text-sky-300' };
      case 'cyberpunk':
        return { border: 'border-pink-500/30', glow: 'shadow-pink-500/10', text: 'text-pink-400', badge: 'bg-pink-500/20 text-pink-300' };
      default:
        return { border: 'border-emerald-500/30', glow: 'shadow-emerald-500/10', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' };
    }
  };

  const layoutStyle = settings.quickAccessLayout || 'two_column';
  const gridContainerClass = layoutStyle === 'compact_stack'
    ? 'flex flex-col gap-4'
    : layoutStyle === 'bento_grid'
      ? 'grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5'
      : 'grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5';

  // ============================================================================
  // RENDEROWANIE TREŚCI WEWNĘTRZNEJ WIDGETU
  // ============================================================================
  const renderWidgetContent = (widget: QuickAccessWidgetConfig) => {
    const accent = getWidgetAccentClasses(widget.customColor);

    switch (widget.widgetType) {
      // 1. DZISIEJSZY TRENING
      case 'active_workout': {
        const dayExercises = currentDay?.exercises || [];
        const completedCount = dayExercises.filter(ex => ex.loggedSets && ex.loggedSets.length > 0 && ex.loggedSets.every(s => s.completed)).length;

        return (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl bg-emerald-500/20 border ${accent.border} flex items-center justify-center ${accent.text}`}>
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>{widget.title || currentDay?.name || 'Dzień Treningowy'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono">
                      {currentWeek?.name || 'Tydzień 1'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Ukończono {completedCount}/{dayExercises.length} ćwiczeń
                  </p>
                </div>
              </div>

              {!isEditMode && (
                <button
                  type="button"
                  onClick={() => onSelectView('plan')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <span>Otwórz plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2 pt-3">
              {dayExercises.slice(0, widget.size === 'compact' ? 2 : 4).map((ex, exIdx) => {
                const isExCompleted = ex.loggedSets && ex.loggedSets.length > 0 && ex.loggedSets.every(s => s.completed);
                return (
                  <div 
                    key={ex.id || exIdx}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${isExCompleted ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      <span className="font-bold text-slate-200 truncate">{ex.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span className="text-emerald-400 font-black">{ex.weight} {unit}</span>
                      <span className="text-slate-500">×</span>
                      <span className="text-slate-300">{ex.sets}s × {ex.reps}p</span>
                    </div>
                  </div>
                );
              })}

              {dayExercises.length > 4 && widget.size !== 'compact' && (
                <p className="text-[10px] text-center text-slate-500 pt-1 font-mono">
                  + jeszcze {dayExercises.length - 4} ćwiczeń w tym dniu
                </p>
              )}
            </div>
          </>
        );
      }

      // 2. SZYBKI STOPER TRENINGOWY
      case 'timer_quick': {
        const formatTime = (totalSec: number) => {
          const m = Math.floor(totalSec / 60);
          const s = totalSec % 60;
          return `${m}:${s < 10 ? '0' : ''}${s}`;
        };

        const progressPct = timerSeconds > 0 ? ((timerSeconds - timerRemaining) / timerSeconds) * 100 : 0;

        return (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{widget.title}</h3>
                  <p className="text-[11px] text-slate-400">Czas odpoczynku między seriami</p>
                </div>
              </div>

              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${isTimerRunning ? 'bg-sky-500/20 text-sky-300 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                {isTimerRunning ? 'ODLICZANIE' : 'GOTOWY'}
              </span>
            </div>

            <div className="pt-3 flex flex-col items-center justify-center">
              <div className="relative w-28 h-28 flex items-center justify-center my-1">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="6" className="text-slate-800 fill-none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-sky-500 fill-none transition-all duration-300"
                    strokeDasharray={264}
                    strokeDashoffset={264 - (264 * progressPct) / 100}
                    strokeLinecap="round"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black font-mono text-white tracking-tight">
                    {formatTime(timerRemaining)}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 uppercase">
                    z {timerSeconds}s
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 w-full justify-center">
                <button
                  type="button"
                  onClick={handleToggleTimer}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                    isTimerRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-sky-600 hover:bg-sky-500'
                  }`}
                >
                  {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isTimerRunning ? 'Pauza' : 'Start'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Resetuj stoper"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-800/80 w-full justify-center">
                {[45, 60, 90, 120, 180].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleStartTimer(sec)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                      timerSeconds === sec && isTimerRunning
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </>
        );
      }

      // 3. KALKULATOR TALERZY NA GRYF (WIZUALIZATOR 3D)
      case 'plate_calc_widget': {
        const plates = calculatePlates(plateCalcWeight, plateBarWeight);
        const weightPerSide = plateCalcWeight > plateBarWeight ? (plateCalcWeight - plateBarWeight) / 2 : 0;

        const expandedPlates: number[] = [];
        plates.forEach(p => {
          for (let i = 0; i < p.count; i++) {
            expandedPlates.push(p.weight);
          }
        });

        const getPlateVisual = (w: number) => {
          if (w >= 25) return { h: 'h-20', w: 'w-5', bg: 'from-red-600 to-red-800', border: 'border-red-400', label: '25' };
          if (w >= 20) return { h: 'h-20', w: 'w-5', bg: 'from-blue-600 to-blue-800', border: 'border-blue-400', label: '20' };
          if (w >= 15) return { h: 'h-17', w: 'w-4.5', bg: 'from-amber-400 to-amber-600', border: 'border-amber-300', label: '15', textDark: true };
          if (w >= 10) return { h: 'h-15', w: 'w-4', bg: 'from-emerald-600 to-emerald-800', border: 'border-emerald-400', label: '10' };
          if (w >= 5)  return { h: 'h-13', w: 'w-3.5', bg: 'from-slate-200 to-slate-400', border: 'border-white', label: '5', textDark: true };
          if (w >= 2.5) return { h: 'h-11', w: 'w-3', bg: 'from-zinc-800 to-zinc-950', border: 'border-zinc-600', label: '2.5' };
          return { h: 'h-9', w: 'w-2.5', bg: 'from-slate-400 to-slate-600', border: 'border-slate-300', label: '1.2' };
        };

        return (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md`}>
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{widget.title}</h3>
                  <p className="text-[11px] text-slate-400">Gryf {plateBarWeight} kg • Na stronę: {weightPerSide} kg</p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-[10px] shadow-inner">
                {[20, 15, 10].map(bw => (
                  <button
                    key={bw}
                    type="button"
                    onClick={() => setPlateBarWeight(bw)}
                    className={`px-2 py-0.5 rounded font-mono font-bold cursor-pointer transition-all ${
                      plateBarWeight === bw ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {bw}kg
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 space-y-3">
              {/* Główny selektor ciężaru z przyciskami 3D */}
              <div className="flex items-center justify-between metric-tile-3d p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPlateCalcWeight(w => Math.max(plateBarWeight, w - 5))}
                    className="btn-3d-secondary px-2 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                    title="-5 kg"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlateCalcWeight(w => Math.max(plateBarWeight, w - 2.5))}
                    className="btn-3d-secondary p-2 rounded-xl text-white cursor-pointer"
                    title="-2.5 kg"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-center">
                  <span className="text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500 drop-shadow-sm">
                    {plateCalcWeight} {unit}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-medium">Łączny ciężar na sztandze</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPlateCalcWeight(w => w + 2.5)}
                    className="btn-3d-secondary p-2 rounded-xl text-white cursor-pointer"
                    title="+2.5 kg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlateCalcWeight(w => w + 5)}
                    className="btn-3d-secondary px-2 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                    title="+5 kg"
                  >
                    +5
                  </button>
                </div>
              </div>

              {/* Realistyczny Wizualizator 3D Gryfu i Talerzy Olimpijskich */}
              <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Sztanga 3D (Talerze na 1 stronę):
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-400">
                    +{weightPerSide} kg
                  </span>
                </div>

                {/* Strefa 3D Tulei Gryfu */}
                <div className="relative py-5 px-3 rounded-xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-start overflow-x-auto min-h-[96px] no-scrollbar shadow-inner">
                  {/* Chromowana belka gryfu (Barbell Shaft) */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-full bg-gradient-to-b from-slate-300 via-slate-100 to-slate-400 shadow-md" />
                  
                  {/* Kołnierz oporowy tulei (Inside Collar) */}
                  <div className="relative z-10 w-4 h-20 rounded-sm bg-gradient-to-r from-slate-500 via-slate-200 to-slate-600 shadow-xl border-y border-slate-300 shrink-0 mr-1.5 flex items-center justify-center">
                    <div className="w-1 h-16 bg-slate-800/50 rounded-full" />
                  </div>

                  {/* Zestaw talerzy 3D */}
                  <div className="relative z-20 flex items-center gap-1 shrink-0">
                    {expandedPlates.map((weight, pIdx) => {
                      const vis = getPlateVisual(weight);
                      return (
                        <div
                          key={pIdx}
                          className={`relative ${vis.w} ${vis.h} rounded-sm flex flex-col items-center justify-between py-1 bg-gradient-to-b ${vis.bg} border ${vis.border} shadow-lg shrink-0 transition-transform hover:scale-105 select-none`}
                          style={{
                            boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.4), inset 0 -2px 3px rgba(0,0,0,0.6), 2px 4px 8px rgba(0,0,0,0.5)'
                          }}
                          title={`Talerz olimpijski: ${weight} kg`}
                        >
                          {/* Otwór na tuleję gryfu (Hub ring) */}
                          <div className="w-2 h-2 rounded-full bg-slate-950 border border-slate-300/40 my-auto shadow-inner" />
                          <span className={`text-[8.5px] font-black font-mono leading-none ${vis.textDark ? 'text-slate-950' : 'text-white'} drop-shadow-sm`}>
                            {vis.label}
                          </span>
                        </div>
                      );
                    })}

                    {/* Zacisk sprężynowy gryfu (Collar Clamp) */}
                    {expandedPlates.length > 0 && (
                      <div className="relative z-20 w-3 h-10 rounded-sm bg-gradient-to-b from-slate-400 via-slate-100 to-slate-500 border border-slate-300 shadow-md ml-1 shrink-0" title="Zacisk sprężynowy" />
                    )}
                  </div>

                  {expandedPlates.length === 0 && (
                    <span className="relative z-20 text-xs text-slate-500 font-mono italic pl-2">
                      Gryf olimpijski ({plateBarWeight} kg) bez talerzy
                    </span>
                  )}
                </div>

                {/* Lista liczbowa talerzy */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  {plates.length === 0 ? (
                    <span className="text-[11px] text-slate-500 italic">Brak dodatkowego obciążenia</span>
                  ) : (
                    plates.map((p, idx) => (
                      <span 
                        key={idx}
                        className="px-2 py-1 rounded-lg text-xs font-black font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
                      >
                        {p.count}× {p.weight} kg
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        );
      }

      // 4. KALKULATOR 1RM & PROCENTY
      case 'one_rm_calc': {
        const calculated1RM = calculate1RM(calcInputWeight, calcInputReps, calcFormula);
        const percentages = [
          { pct: 95, w: Math.round(calculated1RM * 0.95), reps: '1-2' },
          { pct: 90, w: Math.round(calculated1RM * 0.90), reps: '3-4' },
          { pct: 85, w: Math.round(calculated1RM * 0.85), reps: '5-6' },
          { pct: 80, w: Math.round(calculated1RM * 0.80), reps: '7-8' },
          { pct: 75, w: Math.round(calculated1RM * 0.75), reps: '9-10' },
          { pct: 70, w: Math.round(calculated1RM * 0.70), reps: '11-12' }
        ];

        return (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400`}>
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{widget.title}</h3>
                  <p className="text-[11px] text-slate-400">Wylicz 1RM i strefy intensywności</p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => setCalcFormula('brzycki')}
                  className={`px-1.5 py-0.5 rounded font-mono font-bold cursor-pointer ${calcFormula === 'brzycki' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
                >
                  Brzycki
                </button>
                <button
                  type="button"
                  onClick={() => setCalcFormula('epley')}
                  className={`px-1.5 py-0.5 rounded font-mono font-bold cursor-pointer ${calcFormula === 'epley' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
                >
                  Epley
                </button>
              </div>
            </div>

            <div className="pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Ciężar ({unit})</span>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCalcInputWeight(w => Math.max(10, w - 2.5))}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold font-mono text-purple-400">{calcInputWeight}</span>
                    <button
                      type="button"
                      onClick={() => setCalcInputWeight(w => w + 2.5)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Powtórzenia</span>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCalcInputReps(r => Math.max(1, r - 1))}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold font-mono text-white">{calcInputReps}</span>
                    <button
                      type="button"
                      onClick={() => setCalcInputReps(r => Math.min(30, r + 1))}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Szacowany Rekord 1RM:</span>
                <span className="text-xl font-black font-mono text-purple-300">
                  {calculated1RM} {unit}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {percentages.map(p => (
                  <div key={p.pct} className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-mono block">{p.pct}% (ok. {p.reps}p)</span>
                    <span className="text-xs font-black font-mono text-purple-400">{p.w} {unit}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      }

      // 5. STOPER INTERWAŁÓW & TABATA
      case 'tabata_interval': {
        const isRunning = intervalPhase !== 'idle';
        return (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{widget.title}</h3>
                  <p className="text-[11px] text-slate-400">Runda {currentRound}/{intervalRounds}</p>
                </div>
              </div>

              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                intervalPhase === 'work' 
                  ? 'bg-rose-500 text-white font-bold animate-pulse' 
                  : intervalPhase === 'rest' 
                    ? 'bg-emerald-500 text-white font-bold' 
                    : 'bg-slate-800 text-slate-400'
              }`}>
                {intervalPhase === 'work' ? 'PRACA 🔥' : intervalPhase === 'rest' ? 'PRZERWA 💤' : 'GOTOWY'}
              </span>
            </div>

            <div className="pt-3 flex flex-col items-center">
              <div className="text-4xl font-black font-mono text-white tracking-tight my-2">
                {intervalRemaining}s
              </div>

              <div className="flex items-center gap-2 mt-2 w-full justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (isRunning) {
                      setIntervalPhase('idle');
                    } else {
                      setIntervalPhase('work');
                      setIntervalRemaining(intervalWorkSec);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer ${
                    isRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isRunning ? 'Zatrzymaj' : 'Start Tabata'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIntervalPhase('idle');
                    setCurrentRound(1);
                    setIntervalRemaining(intervalWorkSec);
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  title="Resetuj"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-400 font-mono">
                <span>Praca: {intervalWorkSec}s</span>
                <span>•</span>
                <span>Przerwa: {intervalRestSec}s</span>
                <span>•</span>
                <span>Rund: {intervalRounds}</span>
              </div>
            </div>
          </>
        );
      }

      // 6. TRENER AI GEMINI 3.8 PRO
      case 'ai_coach_mini': {
        const quickChips = [
          'Przeanalizuj dzisiejszy trening',
          'Szybka rozgrzewka barków',
          'Jak przełamać plateau siłowe?',
          'Optymalne nawodnienie'
        ];

        return (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>{widget.title}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">PRO</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Zaawansowany doradca periodyzacji i techniki</p>
                </div>
              </div>

              {!isEditMode && (
                <button
                  type="button"
                  onClick={() => onSelectView('ai_coach')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Pełny czat</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="pt-3 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {quickChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAiPrompt(chip);
                      handleAskAiCoach(chip);
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-emerald-950/40 text-slate-300 hover:text-emerald-300 border border-slate-800 transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAskAiCoach();
                  }}
                  placeholder="Zadaj szybkie pytanie do Gemini 3.8 Pro..."
                  className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />

                <button
                  type="button"
                  disabled={isAiLoading || !aiPrompt.trim()}
                  onClick={() => handleAskAiCoach()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-all cursor-pointer"
                >
                  {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>

              {aiResponse && (
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-slate-200 leading-relaxed animate-fadeIn">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-emerald-400">Gemini 3.8 Pro Response:</span>
                    <span className="text-[9px] text-slate-500 font-mono">Model: {aiModelUsed}</span>
                  </div>
                  <p>{aiResponse}</p>
                </div>
              )}
            </div>
          </>
        );
      }

      // 7. MASA CIAŁA & FILTR EMA
      case 'weight_trend': {
        const weights = data.bodyWeights || [];
        const latest = weights[weights.length - 1];
        const prev = weights[weights.length - 2];
        const diff = latest && prev ? Number((latest.weight - prev.weight).toFixed(2)) : 0;

        return (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400`}>
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{widget.title}</h3>
                  <p className="text-[11px] text-slate-400">Trend & filtr wygładzający</p>
                </div>
              </div>

              {!isEditMode && (
                <button
                  type="button"
                  onClick={() => onSelectView('weight')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Dziennik</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="pt-3 space-y-3">
              <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">Ostatni pomiar:</span>
                  <span className="text-xl font-black font-mono text-white">
                    {latest ? `${latest.weight} ${unit}` : 'Brak danych'}
                  </span>
                </div>

                {diff !== 0 && (
                  <div className={`flex items-center gap-1 text-xs font-mono font-bold ${diff > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    <TrendingUp className={`w-3.5 h-3.5 ${diff < 0 ? 'rotate-180' : ''}`} />
                    <span>{diff > 0 ? `+${diff}` : diff} {unit}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={newWeightInput}
                  onChange={(e) => setNewWeightInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  placeholder="Nowa waga..."
                />
                <button
                  type="button"
                  onClick={handleSaveQuickWeight}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shrink-0 transition-all cursor-pointer"
                >
                  {weightSavedSuccess ? <Check className="w-3.5 h-3.5" /> : 'Zapisz'}
                </button>
              </div>
            </div>
          </>
        );
      }

      // 8. LICZNIK NAWODNIENIA (H₂O)
      case 'water_hydration': {
        const targetWater = 3000;
        const pct = Math.min(100, Math.round((waterMl / targetWater) * 100));

        return (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400`}>
                  <Droplet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{widget.title}</h3>
                  <p className="text-[11px] text-slate-400">{waterMl} ml / {targetWater} ml ({pct}%)</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddWater(-waterMl)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-300 text-[10px] cursor-pointer"
                title="Resetuj dzień"
              >
                Reset
              </button>
            </div>

            <div className="pt-3 space-y-2.5">
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddWater(250)}
                  className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold font-mono text-blue-300 cursor-pointer"
                >
                  +250ml
                </button>
                <button
                  type="button"
                  onClick={() => handleAddWater(500)}
                  className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold font-mono text-blue-300 cursor-pointer"
                >
                  +500ml
                </button>
                <button
                  type="button"
                  onClick={() => handleAddWater(750)}
                  className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold font-mono text-blue-300 cursor-pointer"
                >
                  +750ml
                </button>
              </div>
            </div>
          </>
        );
      }

      // 9. TRACKER KALORII & BIAŁKA
      case 'macro_calories': {
        const targetCalories = 2800;
        const targetProtein = 180;

        return (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400`}>
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{widget.title}</h3>
                  <p className="text-[11px] text-slate-400">Kalorie & Białko na dziś</p>
                </div>
              </div>
            </div>

            <div className="pt-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block">Kalorie</span>
                  <span className="text-lg font-black font-mono text-orange-400">{todayCalories}</span>
                  <span className="text-[9px] text-slate-500 block">/ {targetCalories} kcal</span>
                </div>

                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block">Białko</span>
                  <span className="text-lg font-black font-mono text-emerald-400">{todayProtein}g</span>
                  <span className="text-[9px] text-slate-500 block">/ {targetProtein}g</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleAddCalories(250)}
                  className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-orange-300 cursor-pointer flex-1"
                >
                  +250 kcal
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCalories(500)}
                  className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-orange-300 cursor-pointer flex-1"
                >
                  +500 kcal
                </button>
                <button
                  type="button"
                  onClick={() => handleAddProtein(30)}
                  className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-emerald-300 cursor-pointer flex-1"
                >
                  +30g B
                </button>
              </div>
            </div>
          </>
        );
      }

      // 10. BALANS OBJĘTOŚCI TYGODNIA (RADAR)
      case 'muscle_volume_radar': {
        const groups = [
          { name: 'Klatka', sets: 12 },
          { name: 'Plecy', sets: 14 },
          { name: 'Nogi', sets: 16 },
          { name: 'Barki', sets: 10 },
          { name: 'Ramiona', sets: 8 }
        ];

        return (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400`}>
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{widget.title}</h3>
                  <p className="text-[11px] text-slate-400">Serie robocze na grupy mięśni</p>
                </div>
              </div>

              {!isEditMode && (
                <button
                  type="button"
                  onClick={() => onSelectView('muscle')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Więcej</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="pt-3 space-y-2">
              {groups.map(g => (
                <div key={g.name} className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">{g.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (g.sets / 20) * 100)}%` }} />
                    </div>
                    <span className="font-mono text-[11px] text-indigo-300 font-bold w-6 text-right">{g.sets}s</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      }

      // 11. NAJNOWSZE REKORDY 1RM
      case 'pr_tracker': {
        const prList = [
          { exercise: 'Wyciskanie leżąc', weight: 130, date: '14 dni temu' },
          { exercise: 'Przysiad ze sztangą', weight: 175, date: '7 dni temu' },
          { exercise: 'Martwy ciąg', weight: 215, date: 'Wczoraj' },
        ];

        return (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400`}>
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{widget.title}</h3>
                  <p className="text-[11px] text-slate-400">Ostatnie rekordy siłowe</p>
                </div>
              </div>
            </div>

            <div className="pt-3 space-y-2">
              {prList.map((pr, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="font-bold text-white truncate">{pr.exercise}</span>
                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    <span className="text-amber-400 font-black">{pr.weight} {unit}</span>
                    <span className="text-[10px] text-slate-500">{pr.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      }

      // 12. SZYBKI NOTATNIK TRENINGOWY
      case 'quick_notes': {
        return (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{widget.title}</h3>
                  <p className="text-[11px] text-slate-400">Podręczne uwagi do treningu i sprzętu</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveQuickNote}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                {quickNoteSaved ? 'Zapisano!' : 'Zapisz'}
              </button>
            </div>

            <div className="pt-3">
              <textarea
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Wpisz szybką notatkę treningową..."
                className="w-full h-20 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans resize-none"
              />
            </div>
          </>
        );
      }

      // 13. KALENDARZ INIEKCJI & ŚRODKÓW
      case 'pharmacokinetics_summary': {
        return (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400`}>
                  <Syringe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{widget.title}</h3>
                  <p className="text-[11px] text-slate-400">Protokół i stężenia substancji</p>
                </div>
              </div>

              {!isEditMode && (
                <button
                  type="button"
                  onClick={() => onSelectView('cycles')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Protokół</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="pt-3 space-y-2">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Testosteron Enanthate</span>
                  <span className="text-[10px] text-slate-400">Następna aplikacja: Poniedziałek</span>
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-pink-500/20 text-pink-300 font-bold">
                  250 mg
                </span>
              </div>
            </div>
          </>
        );
      }

      // 14. MONITOR BADAŃ KRWI
      case 'blood_test_alerts': {
        return (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400`}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{widget.title}</h3>
                  <p className="text-[11px] text-slate-400">Ostatnie parametry laboratoryjne</p>
                </div>
              </div>
            </div>

            <div className="pt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Morfologia / Hematokryt</span>
                <span className="font-bold font-mono text-emerald-400">48.2% (W normie)</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Lipidogram (HDL/LDL)</span>
                <span className="font-bold font-mono text-amber-400">1:3.2 (Monitoruj)</span>
              </div>
            </div>
          </>
        );
      }

      default:
        return null;
    }
  };

  // ============================================================================
  // RENDEROWANIE POJEDYNCZEGO KAFELKA Z DRAG & DROP ORAZ PRZYCISKIEM 'X'
  // ============================================================================
  const renderWidget = (widget: QuickAccessWidgetConfig, index: number) => {
    if (!widget.enabled) return null;

    let widthClass = 'col-span-1';
    if (layoutStyle === 'two_column') {
      widthClass = widget.size === 'full' ? 'col-span-1 md:col-span-2' : 'col-span-1';
    } else if (layoutStyle === 'bento_grid') {
      if (widget.size === 'full') widthClass = 'col-span-1 md:col-span-3';
      else if (widget.size === 'half') widthClass = 'col-span-1 md:col-span-2';
      else widthClass = 'col-span-1';
    }

    const isBeingDragged = draggedIndex === index;
    const isDropTarget = dropTargetIndex === index && draggedIndex !== index;

    const card3dClass = isAmoled ? 'amoled-card-3d' : 'card-3d';
    let cardClasses = `${widthClass} ${cardRadiusClass} ${card3dClass} p-4 sm:p-5 relative overflow-visible group transition-all duration-200`;

    if (isEditMode) {
      if (isBeingDragged) {
        cardClasses += ' opacity-35 scale-95 border-dashed border-emerald-400 ring-2 ring-emerald-400/50 shadow-2xl';
      } else if (isDropTarget) {
        cardClasses += ' scale-[1.02] border-emerald-400 ring-4 ring-emerald-500/40 bg-emerald-950/25';
      } else {
        cardClasses += ' ring-1 ring-emerald-500/30 border-emerald-500/40 hover:border-emerald-400';
      }
    }

    return (
      <div 
        key={widget.id}
        data-widget-index={index}
        draggable={isEditMode}
        onDragStart={(e) => handleDragStart(e, index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragEnter={(e) => handleDragEnter(e, index)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, index)}
        onDragEnd={handleDragEnd}
        onTouchStart={(e) => handleTouchStart(index, e)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cardClasses}
      >
        {/* =================================================================== */}
        {/* PRZYCISK USUWANIA ('X') W PRAWYM GÓRNYM ROGU W TRYBIE EDYCJI         */}
        {/* =================================================================== */}
        {isEditMode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteWidget(widget.id);
            }}
            className="absolute -top-2.5 -right-2.5 z-40 w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-950/80 border-2 border-slate-950 transition-all hover:scale-115 active:scale-90 cursor-pointer animate-fadeIn"
            title={`Usuń kafelek: ${widget.title}`}
            aria-label={`Usuń ${widget.title}`}
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        )}

        {/* =================================================================== */}
        {/* DRAG HANDLE & MINI TOOLBAR W TRYBIE EDYCJI                         */}
        {/* =================================================================== */}
        {isEditMode && (
          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-dashed border-emerald-500/30 text-[11px] text-emerald-400 font-bold select-none">
            <div className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing text-emerald-300">
              <GripVertical className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-mono text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Move className="w-3 h-3 text-emerald-400" />
                <span>Przeciągnij (DnD)</span>
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setEditingWidget(widget); }}
                className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Edytuj właściwości"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              </button>

              <button
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  handleChangeWidgetSize(widget.id, widget.size === 'full' ? 'half' : widget.size === 'half' ? 'compact' : 'full'); 
                }}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-emerald-400 hover:bg-slate-700 cursor-pointer"
                title="Zmień szerokość kafelka"
              >
                {widget.size === 'full' ? '100%' : widget.size === 'half' ? '50%' : '33%'}
              </button>

              <button
                type="button"
                disabled={index === 0}
                onClick={(e) => { e.stopPropagation(); handleMoveWidget(index, 'up'); }}
                className="p-1 rounded bg-slate-800 disabled:opacity-20 text-slate-300 hover:text-white cursor-pointer"
                title="W górę"
              >
                <ArrowUp className="w-3 h-3" />
              </button>

              <button
                type="button"
                disabled={index === sortedWidgets.length - 1}
                onClick={(e) => { e.stopPropagation(); handleMoveWidget(index, 'down'); }}
                className="p-1 rounded bg-slate-800 disabled:opacity-20 text-slate-300 hover:text-white cursor-pointer"
                title="W dół"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Zawartość właściwa widgetu */}
        {renderWidgetContent(widget)}
      </div>
    );
  };

  const filteredCatalog = AVAILABLE_WIDGET_CATALOG.filter(item => {
    const matchesSearch = item.defaultTitle.toLowerCase().includes(widgetSearchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(widgetSearchQuery.toLowerCase());
    const matchesCat = selectedCatalogCategory === 'all' || item.category === selectedCatalogCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto animate-fadeIn pb-24">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Szybki Dostęp</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono uppercase tracking-wider">
                  Pulpit Główny
                </span>
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Witaj z powrotem, <strong className="text-emerald-300">{data.profile?.name || 'Pasik'}</strong>! Twój w pełni konfigurowalny pulpit treningowy.
          </p>
        </div>

        {/* Action buttons: Edit, Add, AI Presets */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Przełącznik trybu edycji na żywo z przeciąganiem i przyciskami 'x' */}
          <button
            type="button"
            onClick={() => setIsEditMode(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
              isEditMode 
                ? 'bg-emerald-600 text-white shadow-emerald-500/20 ring-2 ring-emerald-400 animate-pulse' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            id="btn-toggle-edit-mode"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isEditMode ? 'Zakończ Edycję' : 'Tryb Edycji (DnD)'}</span>
          </button>

          {/* Przycisk Dodaj Widget */}
          <button
            type="button"
            onClick={() => setIsAddWidgetModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-600/90 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            id="btn-add-widget"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Dodaj Widget</span>
          </button>

          {/* Przycisk Szablony Gemini 3.8 Pro */}
          <button
            type="button"
            onClick={() => setIsAiPresetsModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-purple-600/90 hover:bg-purple-500 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Układy AI Gemini</span>
          </button>

          {/* Przycisk Tryb Pełnej Mocy (Xiaomi 14T Turbo) */}
          <button
            type="button"
            onClick={() => onSelectView('settings')}
            className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-teal-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Otwórz Tryb Pełnej Mocy (144Hz Turbo, Rampa Rozgrzewki, Haptyka X-axis)"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Pełna Moc</span>
          </button>

          {/* Otwórz pełny konfigurator */}
          <button
            type="button"
            onClick={() => setIsCustomizerOpen(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title="Menedżer listy pulpitu"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Banner informacyjny w trybie edycji */}
      {isEditMode && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fadeIn text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Tryb edycji aktywny:</strong> Chwyć i przeciągaj kafelki (Drag & Drop), aby zmienić ich układ. Kliknij czerwony przycisk <strong className="text-rose-400">✕</strong> w rogu dowolnego kafelka, aby go usunąć.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsEditMode(false)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0 self-end sm:self-center cursor-pointer shadow-xs active:scale-95"
          >
            Zatwierdź układ
          </button>
        </div>
      )}

      {/* 2. Interactive Modular Widget Grid */}
      <div className={gridContainerClass}>
        {sortedWidgets.map((w, idx) => renderWidget(w, idx))}
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: DODAJ NOWY WIDGET (BIBLIOTEKA WIDGETÓW)                        */}
      {/* ===================================================================== */}
      {isAddWidgetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col ${cardRadiusClass} ${
            isAmoled ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-900 border-slate-800'
          } border shadow-2xl`}>
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="text-base font-extrabold text-white">Biblioteka Widgetów Pulpitu</h2>
                  <p className="text-xs text-slate-400">Wybierz moduł i dodaj go do swojego pulpitu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddWidgetModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-800 bg-slate-950/50 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={widgetSearchQuery}
                  onChange={(e) => setWidgetSearchQuery(e.target.value)}
                  placeholder="Szukaj widgetu (np. stoper, kalkulator, waga, gemini)..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'Wszystkie' },
                  { id: 'trening', label: 'Trening & Siła' },
                  { id: 'narzedzia', label: 'Narzędzia & Stoper' },
                  { id: 'kondycja', label: 'Kondycja & Dieta' },
                  { id: 'zdrowie', label: 'Zdrowie & Protokół' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCatalogCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCatalogCategory === cat.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {filteredCatalog.map(item => {
                const isAlreadyAdded = widgets.some(w => w.widgetType === item.widgetType);

                return (
                  <div 
                    key={item.widgetType}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{item.defaultTitle}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {item.category}
                          </span>
                          {isAlreadyAdded && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                              Na pulpicie
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleAddWidgetFromCatalog(item, 'half')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                        title="Dodaj jako 50% szerokości"
                      >
                        + 50%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddWidgetFromCatalog(item, 'full')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs"
                        title="Dodaj jako pełną szerokość"
                      >
                        + Dodaj Pełny
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddWidgetModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 cursor-pointer"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: EDYCJA WIDGETU (ZMIEŃ NAZWĘ, ROZMIAR, KOLOR)                 */}
      {/* ===================================================================== */}
      {editingWidget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className={`w-full max-w-md ${cardRadiusClass} ${
            isAmoled ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-900 border-slate-800'
          } border p-5 shadow-2xl space-y-4`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-extrabold text-white">Edycja Właściwości Widgetu</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingWidget(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Tytuł kafelka na pulpicie:</label>
              <input
                type="text"
                value={editingWidget.title}
                onChange={(e) => setEditingWidget({ ...editingWidget, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Szerokość kafelka:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'compact', label: 'Kompakt (33%)' },
                  { id: 'half', label: 'Połowa (50%)' },
                  { id: 'full', label: 'Pełna (100%)' }
                ].map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setEditingWidget({ ...editingWidget, size: s.id as any })}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      editingWidget.size === s.id
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Kolor Akcentu / Ramki:</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'emerald', label: 'Szmaragd' },
                  { id: 'cyan', label: 'Cyjan' },
                  { id: 'gold', label: 'Złoto' },
                  { id: 'crimson', label: 'Karmazyn' },
                  { id: 'purple', label: 'Fiolet' },
                  { id: 'blue', label: 'Błękit' },
                  { id: 'cyberpunk', label: 'Cyberpunk' }
                ].map(col => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setEditingWidget({ ...editingWidget, customColor: col.id })}
                    className={`py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                      (editingWidget.customColor || appAccent) === col.id
                        ? 'bg-slate-800 text-white border-emerald-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleDeleteWidget(editingWidget.id)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/40 border border-rose-900/60 cursor-pointer"
              >
                Usuń ten kafelek
              </button>

              <button
                type="button"
                onClick={() => handleSaveWidgetEdit(editingWidget)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer shadow-md"
              >
                Zapisz zmiany
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: REKOMENDACJE UKŁADU GEMINI 3.8 PRO                           */}
      {/* ===================================================================== */}
      {isAiPresetsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className={`w-full max-w-xl max-h-[90vh] overflow-y-auto ${cardRadiusClass} ${
            isAmoled ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-900 border-slate-800'
          } border p-5 shadow-2xl space-y-4`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-base font-extrabold text-white">Rekomendacje Układu Gemini 3.8 Pro</h3>
                  <p className="text-xs text-slate-400">Inteligentne presety pulpitów dostosowane do Twojego celu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiPresetsModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {GEMINI_AI_PRESET_LAYOUTS.map(preset => (
                <div 
                  key={preset.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{preset.icon}</span>
                      <div>
                        <h4 className="text-sm font-bold text-white">{preset.name}</h4>
                        <span className="text-[10px] text-purple-400 font-mono">{preset.subtitle}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyAiPreset(preset)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-xs active:scale-95"
                    >
                      Zastosuj układ
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 mb-2 leading-relaxed">{preset.description}</p>

                  <div className="flex flex-wrap gap-1">
                    {preset.widgets.map((w, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-mono">
                        {w.title}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAiPresetsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 cursor-pointer"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: PEŁNY MENEDŻER PULPITU                                        */}
      {/* ===================================================================== */}
      {isCustomizerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className={`w-full max-w-xl max-h-[90vh] overflow-y-auto ${cardRadiusClass} ${
            isAmoled ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-900 border-slate-800'
          } border p-5 shadow-2xl space-y-4`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-extrabold text-white">Menedżer Pulpitu Szybkiego Dostępu</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizerOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Układaj kafelki w dowolnej kolejności, zmieniaj rozmiary, ukrywaj lub usuwaj niepotrzebne:
            </p>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 block">Styl siatki pulpitu:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'two_column', label: '2-Kolumnowy' },
                  { id: 'bento_grid', label: 'Bento Grid' },
                  { id: 'compact_stack', label: 'Pionowy Stos' }
                ].map(ls => (
                  <button
                    key={ls.id}
                    type="button"
                    onClick={() => onUpdateSettings({ quickAccessLayout: ls.id as any })}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      layoutStyle === ls.id 
                        ? 'bg-emerald-600 text-white border-emerald-500' 
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {ls.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {sortedWidgets.map((w, idx) => (
                <div 
                  key={w.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleWidget(w.id)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        w.enabled 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                          : 'bg-slate-900 text-slate-600 border-slate-800'
                      }`}
                      title={w.enabled ? 'Ukryj kafelek' : 'Pokaż kafelek'}
                    >
                      {w.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <div>
                      <span className="font-bold text-white block">{w.title}</span>
                      <span className="text-[10px] font-mono text-slate-500">{w.widgetType}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
                      {(['half', 'full'] as const).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => handleChangeWidgetSize(w.id, sz)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-colors ${
                            w.size === sz ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {sz === 'full' ? '100%' : '50%'}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveWidget(idx, 'up')}
                      className="p-1.5 rounded-lg bg-slate-900 disabled:opacity-30 hover:bg-slate-800 text-slate-300 cursor-pointer"
                      title="Przesuń wyżej"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sortedWidgets.length - 1}
                      onClick={() => handleMoveWidget(idx, 'down')}
                      className="p-1.5 rounded-lg bg-slate-900 disabled:opacity-30 hover:bg-slate-800 text-slate-300 cursor-pointer"
                      title="Przesuń niżej"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteWidget(w.id)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                      title="Usuń z pulpitu"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetWidgets}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-950 border border-slate-800 cursor-pointer"
              >
                Resetuj do domyślnych
              </button>

              <button
                type="button"
                onClick={() => setIsCustomizerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer shadow-md"
              >
                Gotowe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
