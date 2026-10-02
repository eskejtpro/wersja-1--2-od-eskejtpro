import React, { useState, useMemo } from 'react';
import { 
  Syringe, 
  Calendar as CalendarIcon, 
  CalendarDays, 
  Clock, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  Info,
  CalendarCheck,
  CalendarX,
  Search,
  TrendingUp,
  Scale,
  Ruler,
  Sparkles,
  Layers,
  FileText,
  Bookmark,
  Star,
  Tag,
  Palette,
  Edit2,
  Check,
  Dumbbell
} from 'lucide-react';
import { 
  ProtocolEntry, 
  CalendarDayNote, 
  TrainingWeek, 
  AppSettings, 
  BodyWeightEntry, 
  BodyPartMeasurement 
} from '../types';
import { BloodConcentrationCalculator } from './BloodConcentrationCalculator';
import { BODY_PART_CONFIG } from '../utils/bodyMeasurements';

interface CycleProtocolViewProps {
  protocolEntries: ProtocolEntry[];
  calendarNotes?: CalendarDayNote[];
  weeks: TrainingWeek[];
  settings: AppSettings;
  bodyWeights?: BodyWeightEntry[];
  bodyPartMeasurements?: BodyPartMeasurement[];
  onAddProtocolEntry: (entry: Omit<ProtocolEntry, 'id'>) => void;
  onDeleteProtocolEntry: (id: string) => void;
  onAddCalendarNote?: (note: Omit<CalendarDayNote, 'id' | 'createdAt'>) => void;
  onUpdateCalendarNote?: (id: string, updatedFields: Partial<CalendarDayNote>) => void;
  onDeleteCalendarNote?: (id: string) => void;
  onUpdateWeekStartDate?: (weekId: string, startDate: string) => void;
  onAddWeekFromGap?: (startDate: string, weekNumber: number) => void;
}

export const CALENDAR_COLOR_PALETTE = [
  { id: 'emerald', label: 'Szmaragdowy', hex: '#10b981', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-300', dot: 'bg-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'cyan', label: 'Cyjan / Błękit', hex: '#06b6d4', bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', text: 'text-cyan-300', dot: 'bg-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { id: 'purple', label: 'Fiolet / Purpura', hex: '#a855f7', bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-300', dot: 'bg-purple-400', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { id: 'amber', label: 'Bursztyn / Złoto', hex: '#f59e0b', bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-300', dot: 'bg-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'rose', label: 'Róż / Karmazyn', hex: '#f43f5e', bg: 'bg-rose-500/20', border: 'border-rose-500/40', text: 'text-rose-300', dot: 'bg-rose-400', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { id: 'yellow', label: 'Żółty Słoneczny', hex: '#eab308', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-300', dot: 'bg-yellow-400', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  { id: 'blue', label: 'Błękit Królewski', hex: '#3b82f6', bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-300', dot: 'bg-blue-400', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: 'slate', label: 'Grafit / Neutralny', hex: '#64748b', bg: 'bg-slate-700/40', border: 'border-slate-600/50', text: 'text-slate-300', dot: 'bg-slate-400', badge: 'bg-slate-700/40 text-slate-300 border-slate-600/50' },
] as const;

export const NOTE_CATEGORIES = [
  { id: 'general', label: 'Ogólna', emoji: '📝', defaultColor: 'emerald' },
  { id: 'bloodwork', label: 'Badania krwi', emoji: '🩸', defaultColor: 'rose' },
  { id: 'supplement', label: 'Suplementy & Dieta', emoji: '💊', defaultColor: 'cyan' },
  { id: 'recovery', label: 'Regeneracja & Sen', emoji: '⚡', defaultColor: 'purple' },
  { id: 'goal', label: 'Cel & Priorytet', emoji: '🎯', defaultColor: 'amber' },
  { id: 'training', label: 'Trening & Cardio', emoji: '🏋️', defaultColor: 'blue' },
  { id: 'warning', label: 'Uwaga / Dyskomfort', emoji: '⚠️', defaultColor: 'yellow' },
] as const;

const PRESET_PROTOCOLS = [
  { name: 'Testosteron Enanthat', dosage: 250, unit: 'mg' as const, route: 'IM' as const, badge: 'Test 250mg', color: 'emerald' as const },
  { name: 'Testosteron Cypionat (TRT)', dosage: 125, unit: 'mg' as const, route: 'IM' as const, badge: 'TRT 125mg', color: 'emerald' as const },
  { name: 'HCG (Gonadotropina)', dosage: 500, unit: 'IU' as const, route: 'SC' as const, badge: 'HCG 500 IU', color: 'cyan' as const },
  { name: 'HCG (Dawka stała)', dosage: 250, unit: 'IU' as const, route: 'SC' as const, badge: 'HCG 250 IU', color: 'cyan' as const },
  { name: 'Masteron (Drostanolon)', dosage: 100, unit: 'mg' as const, route: 'IM' as const, badge: 'Masteron 100mg', color: 'purple' as const },
  { name: 'Primobolan (Methenolon)', dosage: 100, unit: 'mg' as const, route: 'IM' as const, badge: 'Primo 100mg', color: 'amber' as const },
  { name: 'Nandrolon NPP', dosage: 100, unit: 'mg' as const, route: 'IM' as const, badge: 'NPP 100mg', color: 'rose' as const },
  { name: 'Oxandrolon (Anavar)', dosage: 20, unit: 'mg' as const, route: 'Oral' as const, badge: 'Anavar 20mg', color: 'yellow' as const },
  { name: 'Clomifen (Clomid)', dosage: 50, unit: 'mg' as const, route: 'Oral' as const, badge: 'Clomid 50mg', color: 'blue' as const },
];

export const CycleProtocolView: React.FC<CycleProtocolViewProps> = ({
  protocolEntries = [],
  calendarNotes = [],
  weeks = [],
  settings,
  bodyWeights = [],
  bodyPartMeasurements = [],
  onAddProtocolEntry,
  onDeleteProtocolEntry,
  onAddCalendarNote,
  onUpdateCalendarNote,
  onDeleteCalendarNote,
  onUpdateWeekStartDate,
  onAddWeekFromGap
}) => {
  const isDark = settings.theme === 'dark';
  const [activeTab, setActiveTab] = useState<'calendar' | 'weeks' | 'calculator'>('calendar');

  // Calendar State
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => new Date().toISOString().split('T')[0]);

  // Calendar display filter: all vs doses vs notes vs measurements
  const [calendarFilter, setCalendarFilter] = useState<'all' | 'doses' | 'notes' | 'measurements'>('all');

  // Right action panel mode: 'dose' vs 'note'
  const [rightPanelMode, setRightPanelMode] = useState<'dose' | 'note'>('dose');

  // Bottom table mode: doses log vs notes log vs combined correlation log
  const [bottomTableMode, setBottomTableMode] = useState<'doses' | 'notes' | 'correlation'>('doses');

  // Form State: Protocol Entry
  const [substance, setSubstance] = useState('Testosteron Enanthat');
  const [dosage, setDosage] = useState('250');
  const [unit, setUnit] = useState<'mg' | 'IU' | 'mcg' | 'ml' | 'tab'>('mg');
  const [route, setRoute] = useState<'IM' | 'SC' | 'Oral'>('IM');
  const [time, setTime] = useState('08:00');
  const [notes, setNotes] = useState('');
  const [doseColor, setDoseColor] = useState<typeof CALENDAR_COLOR_PALETTE[number]['id']>('emerald');

  // Form State: Calendar Note
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<typeof NOTE_CATEGORIES[number]['id']>('general');
  const [noteColor, setNoteColor] = useState<typeof CALENDAR_COLOR_PALETTE[number]['id']>('emerald');
  const [noteIsImportant, setNoteIsImportant] = useState(false);

  // Search & Filter state
  const [searchFilter, setSearchFilter] = useState('');
  const [noteCategoryFilter, setNoteCategoryFilter] = useState<string>('all');

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];

  const daysOfWeek = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    // In Poland: Monday is 0, Sunday is 6
    const adjustedFirstDay = (firstDayIndex + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dayNumber: number; dateStr: string; isCurrentMonth: boolean }> = [];

    // Prev month filler
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      const str = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr: str, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const str = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr: str, isCurrentMonth: true });
    }

    // Next month filler to complete 35 or 42 cells
    const remaining = 42 - days.length;
    if (remaining > 0 && remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextDate = new Date(year, month + 1, d);
        const str = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        days.push({ dayNumber: d, dateStr: str, isCurrentMonth: false });
      }
    }

    return days;
  }, [year, month]);

  // Entries grouped by date
  const entriesByDate = useMemo(() => {
    const map = new Map<string, ProtocolEntry[]>();
    protocolEntries.forEach(entry => {
      const list = map.get(entry.date) || [];
      list.push(entry);
      map.set(entry.date, list);
    });
    return map;
  }, [protocolEntries]);

  // Calendar Notes grouped by date
  const notesByDate = useMemo(() => {
    const map = new Map<string, CalendarDayNote[]>();
    calendarNotes.forEach(note => {
      const list = map.get(note.date) || [];
      list.push(note);
      map.set(note.date, list);
    });
    return map;
  }, [calendarNotes]);

  // Body weights grouped by date
  const weightsByDate = useMemo(() => {
    const map = new Map<string, BodyWeightEntry>();
    bodyWeights.forEach(w => map.set(w.date, w));
    return map;
  }, [bodyWeights]);

  // Body part measurements grouped by date
  const measurementsByDate = useMemo(() => {
    const map = new Map<string, BodyPartMeasurement[]>();
    bodyPartMeasurements.forEach(m => {
      const list = map.get(m.date) || [];
      list.push(m);
      map.set(m.date, list);
    });
    return map;
  }, [bodyPartMeasurements]);

  // Training workouts correlation with calendar days
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, Array<{ weekName: string; dayName: string; completed: boolean; exercisesCount: number }>>();
    
    weeks.forEach(week => {
      if (!week.startDate) return;
      const start = new Date(week.startDate);
      if (isNaN(start.getTime())) return;

      week.days.forEach((day, index) => {
        const d = new Date(start);
        d.setDate(d.getDate() + index);
        const dateStr = d.toISOString().split('T')[0];
        
        const list = map.get(dateStr) || [];
        list.push({
          weekName: week.name || `Tydzień ${week.number}`,
          dayName: day.name,
          completed: !!day.completed,
          exercisesCount: day.exercises?.length || 0
        });
        map.set(dateStr, list);
      });
    });

    return map;
  }, [weeks]);

  const sortedWeights = useMemo(() => [...bodyWeights].sort((a, b) => a.date.localeCompare(b.date)), [bodyWeights]);
  const latestWeight = sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1] : null;
  const sortedParts = useMemo(() => [...bodyPartMeasurements].sort((a, b) => a.date.localeCompare(b.date)), [bodyPartMeasurements]);
  const latestPart = sortedParts.length > 0 ? sortedParts[sortedParts.length - 1] : null;

  // Selected date elements
  const selectedDateEntries = entriesByDate.get(selectedDateStr) || [];
  const selectedDateNotes = notesByDate.get(selectedDateStr) || [];
  const selectedDateWeight = weightsByDate.get(selectedDateStr);
  const selectedDateMeasurements = measurementsByDate.get(selectedDateStr) || [];
  const selectedDateWorkouts = workoutsByDate.get(selectedDateStr) || [];

  // Combined dates for cycle correlation table
  const combinedLogDates = useMemo(() => {
    const setOfDates = new Set<string>();
    protocolEntries.forEach(p => setOfDates.add(p.date));
    calendarNotes.forEach(n => setOfDates.add(n.date));
    bodyWeights.forEach(w => setOfDates.add(w.date));
    bodyPartMeasurements.forEach(m => setOfDates.add(m.date));
    return Array.from(setOfDates).sort((a, b) => b.localeCompare(a));
  }, [protocolEntries, calendarNotes, bodyWeights, bodyPartMeasurements]);

  // Handle Preset Apply
  const applyPreset = (preset: typeof PRESET_PROTOCOLS[0]) => {
    setSubstance(preset.name);
    setDosage(String(preset.dosage));
    setUnit(preset.unit);
    setRoute(preset.route);
    setDoseColor(preset.color);
  };

  // Submit new protocol entry
  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!substance.trim()) return;
    const numDosage = parseFloat(dosage) || 0;
    if (numDosage <= 0) return;

    onAddProtocolEntry({
      date: selectedDateStr,
      substance: substance.trim(),
      dosage: numDosage,
      unit,
      route,
      time,
      notes: notes.trim() || undefined,
      color: doseColor
    });

    setNotes('');
  };

  // Submit new calendar note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() && !noteTitle.trim()) return;

    onAddCalendarNote?.({
      date: selectedDateStr,
      title: noteTitle.trim() || undefined,
      content: noteContent.trim(),
      category: noteCategory,
      color: noteColor,
      isImportant: noteIsImportant
    });

    setNoteTitle('');
    setNoteContent('');
    setNoteIsImportant(false);
  };

  // Filtered entries for doses log
  const filteredEntries = useMemo(() => {
    return [...protocolEntries]
      .sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')))
      .filter(item => {
        if (!searchFilter) return true;
        const q = searchFilter.toLowerCase();
        return (
          item.substance.toLowerCase().includes(q) ||
          item.date.includes(q) ||
          (item.notes && item.notes.toLowerCase().includes(q))
        );
      });
  }, [protocolEntries, searchFilter]);

  // Filtered calendar notes
  const filteredNotes = useMemo(() => {
    return [...calendarNotes]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter(item => {
        if (noteCategoryFilter !== 'all' && item.category !== noteCategoryFilter) return false;
        if (!searchFilter) return true;
        const q = searchFilter.toLowerCase();
        return (
          (item.title && item.title.toLowerCase().includes(q)) ||
          item.content.toLowerCase().includes(q) ||
          item.date.includes(q)
        );
      });
  }, [calendarNotes, searchFilter, noteCategoryFilter]);

  // ==========================================
  // LOGIKA ANALIZY HISTORII TYGODNI I CYKLI
  // ==========================================
  interface WeekTimelineItem {
    type: 'completed' | 'in_progress' | 'gap_empty';
    weekId?: string;
    weekNumber?: number;
    weekName?: string;
    startDate: string;
    endDate: string;
    completedDays?: number;
    totalDays?: number;
    totalSets?: number;
    totalVolumeKg?: number;
  }

  const weekTimeline = useMemo(() => {
    const list: WeekTimelineItem[] = [];
    const sortedWeeks = [...weeks].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

    sortedWeeks.forEach((week, index) => {
      const start = week.startDate || new Date().toISOString().split('T')[0];
      const startDateObj = new Date(start);
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(startDateObj.getDate() + 6);
      const end = endDateObj.toISOString().split('T')[0];

      const completedDays = week.days.filter(d => d.completed).length;
      const totalDays = week.days.length;
      let totalSets = 0;
      let totalVolumeKg = 0;

      week.days.forEach(d => {
        d.exercises?.forEach(ex => {
          const setsCount = typeof ex.sets === 'number' ? ex.sets : 0;
          totalSets += setsCount;
          totalVolumeKg += (ex.weight || 0) * (ex.reps || 0) * (setsCount || 1);
        });
      });

      const type: 'completed' | 'in_progress' = completedDays === totalDays && totalDays > 0 ? 'completed' : 'in_progress';

      list.push({
        type,
        weekId: week.id,
        weekNumber: week.number,
        weekName: week.name || `Tydzień ${week.number}`,
        startDate: start,
        endDate: end,
        completedDays,
        totalDays,
        totalSets,
        totalVolumeKg
      });
    });

    return list;
  }, [weeks]);

  const getColorConfig = (colorId?: string) => {
    return CALENDAR_COLOR_PALETTE.find(c => c.id === colorId) || CALENDAR_COLOR_PALETTE[0];
  };

  const getCategoryConfig = (catId?: string) => {
    return NOTE_CATEGORIES.find(c => c.id === catId) || NOTE_CATEGORIES[0];
  };

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto" id="cycle-protocol-view">
      {/* Top Banner with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm tracking-wide">
            <CalendarDays className="w-5 h-5 text-emerald-400" />
            <span>KALENDARZ ZDARZEŃ, ŚRODKÓW & NOTATEK DNIA</span>
          </div>
          <h2 className="text-xl font-black text-white mt-1">
            Centrum Kalendarza & Dziennik Dnia
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Wizualny kalendarz iniekcji, przypisywanie notatek i celów do dat, personalizowane kolory oraz pełna korelacja z wagą i obwodami.
          </p>
        </div>

        {/* Quick KPI Stat Chips */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2">
            <Syringe className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-mono">Wpisy dawek</div>
              <div className="font-extrabold text-white text-sm">{protocolEntries.length} podań</div>
            </div>
          </div>

          <div className="px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-mono">Notatki do dat</div>
              <div className="font-extrabold text-amber-300 text-sm">{calendarNotes.length} notatek</div>
            </div>
          </div>

          {latestWeight && (
            <div className="px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2">
              <Scale className="w-4 h-4 text-sky-400" />
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-mono">Waga ciała</div>
                <div className="font-extrabold text-sky-300 text-sm">
                  {latestWeight.weight} {settings.unit}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Selection: Kalendarz vs Historia Tygodni vs Kalkulator */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
          id="tab-btn-calendar"
        >
          <CalendarDays className="w-4 h-4" />
          <span>Kalendarz Dnia</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {protocolEntries.length + calendarNotes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('weeks')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'weeks'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
          id="tab-btn-weeks-history"
        >
          <Clock className="w-4 h-4" />
          <span>Historia tygodni</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {weekTimeline.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calculator')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'calculator'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
          id="tab-btn-blood-concentration"
        >
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Kalkulator stężeń</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: KALENDARZ MIESIĘCZNY, NOTATKI & DAWKOWANIE */}
      {/* ======================================================== */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Smart Injections & Day Overview Strip */}
          <div className="card-3d p-4 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Syringe className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Ostatnia Zarejestrowana Dawka:</span>
                  {filteredEntries.length > 0 ? (
                    <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      {filteredEntries[0].substance} ({filteredEntries[0].dosage} {filteredEntries[0].unit})
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 italic">Brak zarejestrowanych dawek</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {filteredEntries.length > 0 ? (
                    <>
                      Data podania: <strong className="text-slate-200">{filteredEntries[0].date}</strong> {filteredEntries[0].time ? `o godz. ${filteredEntries[0].time}` : ''} • Wybrana data w kalendarzu: <strong className="text-emerald-400 font-mono">{selectedDateStr}</strong>
                    </>
                  ) : (
                    <>
                      Wybierz datę w kalendarzu poniżej, aby dodać pierwsze podanie lub notatkę. Wybrana data: <strong className="text-emerald-400 font-mono">{selectedDateStr}</strong>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleToday}
                className="btn-3d-secondary px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dzisiaj</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDateStr(new Date().toISOString().split('T')[0]);
                  setRightPanelMode('dose');
                }}
                className="btn-3d-emerald px-3.5 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dodaj dawkę dzisiaj</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Center: Interactive Month Calendar (7 cols on lg) */}
          <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-5 flex flex-col shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-white text-base">
                  {monthNames[month]} {year}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filter for Calendar Badges */}
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setCalendarFilter('all')}
                    className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      calendarFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Wszystko
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarFilter('doses')}
                    className={`px-2 py-1 rounded-md font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      calendarFilter === 'doses'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Syringe className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Dawki</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarFilter('notes')}
                    className={`px-2 py-1 rounded-md font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      calendarFilter === 'notes'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-2.5 h-2.5 text-amber-400" />
                    <span>Notatki</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarFilter('measurements')}
                    className={`px-2 py-1 rounded-md font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      calendarFilter === 'measurements'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Ruler className="w-2.5 h-2.5 text-purple-400" />
                    <span>Pomiary</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title="Poprzedni miesiąc"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToday}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold transition-colors cursor-pointer"
                  >
                    Dzisiaj
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title="Następny miesiąc"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center py-2 text-xs font-mono font-bold text-slate-400">
              {daysOfWeek.map((d, i) => (
                <div key={d} className={i >= 5 ? 'text-emerald-500/70' : ''}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 flex-1 min-h-[340px]">
              {calendarDays.map(({ dayNumber, dateStr, isCurrentMonth }) => {
                const isSelected = dateStr === selectedDateStr;
                const isToday = dateStr === new Date().toISOString().split('T')[0];
                const dayEntries = entriesByDate.get(dateStr) || [];
                const dayNotes = notesByDate.get(dateStr) || [];
                const dayWeight = weightsByDate.get(dateStr);
                const dayMeasurements = measurementsByDate.get(dateStr) || [];
                const dayWorkouts = workoutsByDate.get(dateStr) || [];
                const hasEntries = dayEntries.length > 0 || dayNotes.length > 0 || !!dayWeight || dayMeasurements.length > 0 || dayWorkouts.length > 0;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDateStr(dateStr)}
                    className={`min-h-[76px] p-1.5 rounded-xl text-left flex flex-col justify-between transition-all border cursor-pointer ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-500/15 shadow-sm ring-1 ring-emerald-400/40'
                        : isToday
                        ? 'border-emerald-500/40 bg-slate-950/80'
                        : isCurrentMonth
                        ? 'border-slate-800/80 bg-slate-950/40 hover:bg-slate-800/60 hover:border-slate-700'
                        : 'border-transparent bg-transparent opacity-35 hover:opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-bold rounded-md px-1 ${
                          isSelected
                            ? 'text-emerald-300 font-black'
                            : isToday
                            ? 'text-emerald-400 font-bold'
                            : 'text-slate-300'
                        }`}
                      >
                        {dayNumber}
                      </span>
                      <div className="flex items-center gap-1">
                        {dayNotes.some(n => n.isImportant) && (
                          <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                        )}
                        {hasEntries && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                      </div>
                    </div>

                    {/* Entry Badges inside cell */}
                    <div className="space-y-0.5 mt-1 overflow-hidden w-full">
                      {/* Doses Badges */}
                      {calendarFilter !== 'notes' && calendarFilter !== 'measurements' &&
                        dayEntries.slice(0, 2).map(entry => {
                          const col = getColorConfig(entry.color);
                          return (
                            <div
                              key={entry.id}
                              className={`text-[8.5px] px-1 py-0.2 rounded truncate font-medium border ${col.badge}`}
                              title={`${entry.substance} ${entry.dosage}${entry.unit} (${entry.route})`}
                            >
                              {entry.substance.split(' ')[0]} {entry.dosage}{entry.unit}
                            </div>
                          );
                        })}

                      {/* Day Notes Badges */}
                      {calendarFilter !== 'doses' && calendarFilter !== 'measurements' &&
                        dayNotes.slice(0, 2).map(n => {
                          const col = getColorConfig(n.color);
                          const cat = getCategoryConfig(n.category);
                          return (
                            <div
                              key={n.id}
                              className={`text-[8.5px] px-1 py-0.2 rounded truncate font-medium border flex items-center gap-0.5 ${col.badge}`}
                              title={`${cat.emoji} ${n.title ? `${n.title}: ` : ''}${n.content}`}
                            >
                              <span>{cat.emoji}</span>
                              <span className="truncate">{n.title || n.content}</span>
                            </div>
                          );
                        })}

                      {/* Weight Badge */}
                      {calendarFilter !== 'doses' && calendarFilter !== 'notes' && dayWeight && (
                        <div
                          className="text-[8.5px] px-1 py-0.2 rounded truncate font-medium bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1 font-mono"
                          title={`Waga ciała: ${dayWeight.weight} ${settings.unit}${dayWeight.notes ? ` (${dayWeight.notes})` : ''}`}
                        >
                          <span className="text-[7.5px]">⚖️</span>
                          <span className="truncate">{dayWeight.weight}{settings.unit}</span>
                        </div>
                      )}

                      {/* Muscle Circumferences Badge */}
                      {calendarFilter !== 'doses' && calendarFilter !== 'notes' && dayMeasurements.length > 0 && (
                        <div
                          className="text-[8.5px] px-1 py-0.2 rounded truncate font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 font-mono"
                          title={dayMeasurements.map(m => `${BODY_PART_CONFIG[m.part]?.label || m.part}: ${m.value} cm`).join(', ')}
                        >
                          <span className="text-[7.5px]">📐</span>
                          <span className="truncate">{dayMeasurements[0].value}cm</span>
                        </div>
                      )}

                      {/* Workout Session Badge */}
                      {dayWorkouts.length > 0 && (
                        <div
                          className="text-[8.5px] px-1 py-0.2 rounded truncate font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1"
                          title={`Trening: ${dayWorkouts.map(w => `${w.weekName} - ${w.dayName}`).join(', ')}`}
                        >
                          <span>🏋️</span>
                          <span className="truncate">{dayWorkouts[0].dayName.split(' ')[0]}</span>
                        </div>
                      )}

                      {dayEntries.length + dayNotes.length > 2 && (
                        <div className="text-[7.5px] text-slate-400 font-mono pl-0.5 leading-none">
                          +{dayEntries.length + dayNotes.length - 2} więcej
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend with rich color tags */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] text-slate-400 pt-3 border-t border-slate-800 mt-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>💉 Dawki & Środki</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>📝 Notatka / Cel</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span>🩸 Badania krwi</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span>⚖️ Waga ciała</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span>🏋️ Trening z planu</span>
              </span>
            </div>
          </div>

          {/* Right: Quick Entry Form & Day Details (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Box: Action Switcher (Add Dose vs Add Note) */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                    {rightPanelMode === 'dose' ? <Syringe className="w-4 h-4" /> : <FileText className="w-4 h-4 text-amber-400" />}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">
                      Zdarzenia dla: <span className="text-emerald-400 font-mono">{selectedDateStr}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">Zapisz dawkę lub przypisz notatkę do wybranej daty</p>
                  </div>
                </div>

                {/* Switcher Pills */}
                <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setRightPanelMode('dose')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      rightPanelMode === 'dose'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Dawka
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelMode('note')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      rightPanelMode === 'note'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Notatka
                  </button>
                </div>
              </div>

              {/* MODE 1: ADD PROTOCOL DOSE */}
              {rightPanelMode === 'dose' && (
                <div className="space-y-3.5">
                  {/* Quick Presets */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                      Szybkie szablony (1-klik):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_PROTOCOLS.map(preset => (
                        <button
                          key={preset.badge}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
                        >
                          {preset.badge}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form Inputs */}
                  <form onSubmit={handleAddEntry} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">Data</label>
                        <input
                          type="date"
                          value={selectedDateStr}
                          onChange={e => setSelectedDateStr(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">Godzina</label>
                        <input
                          type="time"
                          value={time}
                          onChange={e => setTime(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Nazwa Związku / Preparatu</label>
                      <input
                        type="text"
                        value={substance}
                        onChange={e => setSubstance(e.target.value)}
                        placeholder="np. Testosteron Enanthat, HCG, Masteron..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">Dawka</label>
                        <input
                          type="number"
                          step="any"
                          value={dosage}
                          onChange={e => setDosage(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">Jednostka</label>
                        <select
                          value={unit}
                          onChange={e => setUnit(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="mg">mg</option>
                          <option value="IU">IU</option>
                          <option value="mcg">mcg</option>
                          <option value="ml">ml</option>
                          <option value="tab">tab</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">Droga</label>
                        <select
                          value={route}
                          onChange={e => setRoute(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="IM">IM (Domięśniowo)</option>
                          <option value="SC">SC (Podskórnie)</option>
                          <option value="Oral">Doustnie</option>
                        </select>
                      </div>
                    </div>

                    {/* Color Tag Selector */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1.5 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Kolor wyróżnienia w kalendarzu:</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {CALENDAR_COLOR_PALETTE.map(col => (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => setDoseColor(col.id)}
                            className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all cursor-pointer ${col.dot} ${
                              doseColor === col.id
                                ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                                : 'opacity-70 hover:opacity-100'
                            }`}
                            title={col.label}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Notatki / Miejsce iniekcji</label>
                      <input
                        type="text"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="np. Prawy pośladek, igła 0.6x30, rano na czczo..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40 transition-all cursor-pointer active:scale-98"
                    >
                      <Check className="w-4 h-4" />
                      <span>Zapisz Podanie w Kalendarzu</span>
                    </button>
                  </form>
                </div>
              )}

              {/* MODE 2: ADD CALENDAR NOTE TO DATE */}
              {rightPanelMode === 'note' && (
                <form onSubmit={handleAddNote} className="space-y-3.5 animate-fadeIn">
                  {/* Szybkie Szablony Notatek */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                      Szybkie szablony wpisów dnia (1-klik):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { title: 'Badania krwi', content: 'Pobranie krwi na czczo (morfologia, lipidogram, próby wątrobowe, estradiol, testosteron)', cat: 'bloodwork' },
                        { title: 'Mocny trening PR', content: 'Świetna dyspozycja siłowa, rekord w boju głównym, energia 10/10', cat: 'training' },
                        { title: 'Czysta miska', content: 'Dieta i makroskładniki dopięte w 100%, odpowiednie nawodnienie', cat: 'supplement' },
                        { title: 'Dzień wolny', content: 'Pełna regeneracja, spacer, sen 8h, brak zmęczenia stawów', cat: 'recovery' },
                        { title: 'Zmęczenie OUN', content: 'Uczucie znużenia, zalecany lżejszy trening lub deload', cat: 'warning' },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setNoteTitle(preset.title);
                            setNoteContent(preset.content);
                            setNoteCategory(preset.cat as any);
                          }}
                          className="text-[10px] px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
                        >
                          {preset.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Data</label>
                      <input
                        type="date"
                        value={selectedDateStr}
                        onChange={e => setSelectedDateStr(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Kategoria</label>
                      <select
                        value={noteCategory}
                        onChange={e => {
                          const catId = e.target.value as any;
                          setNoteCategory(catId);
                          const cfg = getCategoryConfig(catId);
                          if (cfg) setNoteColor(cfg.defaultColor as any);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        {NOTE_CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.emoji} {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Tytuł notatki (opcjonalny)</label>
                    <input
                      type="text"
                      value={noteTitle}
                      onChange={e => setNoteTitle(e.target.value)}
                      placeholder="np. Badania krwi rano, Samopoczucie 10/10..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Treść notatki / Przypomnienia</label>
                    <textarea
                      rows={3}
                      value={noteContent}
                      onChange={e => setNoteContent(e.target.value)}
                      placeholder="Wpisz treść notatki, spostrzeżenia z treningu, wyniki badań, zalecenia dietetyczne..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                      required
                    />
                  </div>

                  {/* Color Palette Selector */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1.5 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-amber-400" />
                      <span>Kolor akcentu notatki:</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CALENDAR_COLOR_PALETTE.map(col => (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => setNoteColor(col.id)}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all cursor-pointer ${col.dot} ${
                            noteColor === col.id
                              ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                          title={col.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Important Toggle */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="note-important-chk"
                      checked={noteIsImportant}
                      onChange={e => setNoteIsImportant(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-950 border-slate-800 cursor-pointer"
                    />
                    <label htmlFor="note-important-chk" className="text-xs text-slate-300 font-semibold cursor-pointer flex items-center gap-1.5">
                      <Star className={`w-3.5 h-3.5 ${noteIsImportant ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
                      <span>Oznacz jako ważną / priorytet ⭐</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-950/40 transition-all cursor-pointer active:scale-98"
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>Zapisz Notatkę dla Daty</span>
                  </button>
                </form>
              )}
            </div>

            {/* Box: Events for Selected Date */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="font-extrabold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-emerald-400" />
                  <span>Wszystkie zdarzenia ({selectedDateStr})</span>
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  {selectedDateEntries.length + selectedDateNotes.length} wpisów
                </span>
              </div>

              {selectedDateEntries.length === 0 && selectedDateNotes.length === 0 && !selectedDateWeight && selectedDateMeasurements.length === 0 && selectedDateWorkouts.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Brak wpisów dla tego dnia. Wybierz szablon powyżej, aby dodać dawkę lub notatkę.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {/* Notes of selected date */}
                  {selectedDateNotes.map(n => {
                    const col = getColorConfig(n.color);
                    const cat = getCategoryConfig(n.category);
                    return (
                      <div
                        key={n.id}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${col.bg} ${col.border}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-xs">{cat.emoji}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${col.text}`}>
                              {cat.label}
                            </span>
                            {n.isImportant && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded font-bold">
                                ⭐ Ważne
                              </span>
                            )}
                          </div>
                          {n.title && (
                            <h5 className="font-extrabold text-xs text-white truncate">{n.title}</h5>
                          )}
                          <p className="text-xs text-slate-300 whitespace-pre-wrap mt-0.5 leading-relaxed">{n.content}</p>
                        </div>

                        {onDeleteCalendarNote && (
                          <button
                            type="button"
                            onClick={() => onDeleteCalendarNote(n.id)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                            title="Usuń notatkę"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Doses of selected date */}
                  {selectedDateEntries.map(entry => {
                    const col = getColorConfig(entry.color);
                    return (
                      <div
                        key={entry.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${col.bg} ${col.border}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${col.dot} text-slate-950 font-bold`}>
                            <Syringe className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white truncate">{entry.substance}</span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${col.text}`}>
                                {entry.dosage} {entry.unit}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>🕒 {entry.time || '08:00'}</span>
                              <span>•</span>
                              <span>{entry.route}</span>
                              {entry.notes && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[140px] italic">"{entry.notes}"</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onDeleteProtocolEntry(entry.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                          title="Usuń wpis dawki"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Workout of selected date */}
                  {selectedDateWorkouts.map((w, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-blue-400" />
                        <div>
                          <div className="text-xs font-bold text-blue-200">{w.dayName}</div>
                          <div className="text-[10px] text-slate-400">{w.weekName} ({w.exercisesCount} ćwiczeń)</div>
                        </div>
                      </div>
                      {w.completed && (
                        <span className="text-xs text-emerald-400 font-bold">✓ Wykonany</span>
                      )}
                    </div>
                  ))}

                  {/* Weight of selected date */}
                  {selectedDateWeight && (
                    <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-sky-400" />
                        <span className="font-bold text-sky-200">Waga ciała:</span>
                        <span className="font-mono font-black text-white">{selectedDateWeight.weight} {settings.unit}</span>
                      </div>
                      {selectedDateWeight.notes && (
                        <span className="text-[10px] text-slate-400 italic max-w-[120px] truncate">
                          "{selectedDateWeight.notes}"
                        </span>
                      )}
                    </div>
                  )}

                  {/* Measurements of selected date */}
                  {selectedDateMeasurements.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                      <div className="text-[10px] font-bold text-purple-300 flex items-center gap-1">
                        <Ruler className="w-3 h-3 text-purple-400" />
                        <span>Pomiary obwodów ({selectedDateMeasurements.length}):</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {selectedDateMeasurements.map(m => (
                          <span key={m.id} className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-mono text-[11px] border border-slate-800">
                            {BODY_PART_CONFIG[m.part]?.label || m.part}: <strong>{m.value} cm</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Full Past Entries Log Table & Correlation Table */}
          <div className="lg:col-span-12 bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              {/* Table Mode Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBottomTableMode('doses')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    bottomTableMode === 'doses'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Syringe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Historia Dawek</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {protocolEntries.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBottomTableMode('notes')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    bottomTableMode === 'notes'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rejestr Notatek Kalendarza</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {calendarNotes.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBottomTableMode('correlation')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    bottomTableMode === 'correlation'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Zestawienie: Dawki vs Pomiary</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {combinedLogDates.length}
                  </span>
                </button>
              </div>

              {/* Search filter for tables */}
              <div className="flex items-center gap-2">
                {bottomTableMode === 'notes' && (
                  <select
                    value={noteCategoryFilter}
                    onChange={e => setNoteCategoryFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">Wszystkie kategorie</option>
                    {NOTE_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.emoji} {cat.label}
                      </option>
                    ))}
                  </select>
                )}

                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="Filtruj wpisy..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* TAB CONTENT 1: DOSES LOG */}
            {bottomTableMode === 'doses' && (
              <>
                {filteredEntries.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    Brak wpisów dawek pasujących do filtra.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                          <th className="py-2.5 px-3">Data & Godzina</th>
                          <th className="py-2.5 px-3">Substancja</th>
                          <th className="py-2.5 px-3">Dawka</th>
                          <th className="py-2.5 px-3">Droga</th>
                          <th className="py-2.5 px-3">Kolor / Tag</th>
                          <th className="py-2.5 px-3">Notatki</th>
                          <th className="py-2.5 px-3 text-right">Akcja</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {filteredEntries.map(entry => {
                          const col = getColorConfig(entry.color);
                          return (
                            <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-2.5 px-3 font-mono text-slate-300">
                                {entry.date} {entry.time ? `• ${entry.time}` : ''}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-white">
                                {entry.substance}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-extrabold text-emerald-400">
                                {entry.dosage} {entry.unit}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                                  entry.route === 'IM'
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : entry.route === 'SC'
                                    ? 'bg-cyan-500/15 text-cyan-400'
                                    : 'bg-purple-500/15 text-purple-400'
                                }`}>
                                  {entry.route === 'IM' ? 'Domięśniowo (IM)' : entry.route === 'SC' ? 'Podskórnie (SC)' : 'Doustnie'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="flex items-center gap-1.5 text-xs text-slate-300">
                                  <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                                  <span>{col.label}</span>
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">
                                {entry.notes || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => onDeleteProtocolEntry(entry.id)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Usuń wpis"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* TAB CONTENT 2: NOTES LOG */}
            {bottomTableMode === 'notes' && (
              <>
                {filteredNotes.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    Brak notatek kalendarza pasujących do filtra.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                          <th className="py-2.5 px-3">Data</th>
                          <th className="py-2.5 px-3">Kategoria</th>
                          <th className="py-2.5 px-3">Tytuł</th>
                          <th className="py-2.5 px-3">Treść notatki</th>
                          <th className="py-2.5 px-3">Priorytet</th>
                          <th className="py-2.5 px-3 text-right">Akcja</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {filteredNotes.map(n => {
                          const col = getColorConfig(n.color);
                          const cat = getCategoryConfig(n.category);
                          return (
                            <tr key={n.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-2.5 px-3 font-mono text-slate-300 font-bold">
                                {n.date}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 w-fit ${col.badge}`}>
                                  <span>{cat.emoji}</span>
                                  <span>{cat.label}</span>
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-white max-w-[150px] truncate">
                                {n.title || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-300 max-w-sm whitespace-pre-wrap">
                                {n.content}
                              </td>
                              <td className="py-2.5 px-3">
                                {n.isImportant ? (
                                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">
                                    ⭐ Priorytet
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 font-mono">Normalny</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {onDeleteCalendarNote && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteCalendarNote(n.id)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                    title="Usuń notatkę"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* TAB CONTENT 3: CORRELATION TABLE */}
            {bottomTableMode === 'correlation' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Dawki & Środki</th>
                      <th className="py-2.5 px-3">Notatki Dnia</th>
                      <th className="py-2.5 px-3">Waga Ciała</th>
                      <th className="py-2.5 px-3">Obwody Partii</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {combinedLogDates.map(dateStr => {
                      const dEntries = entriesByDate.get(dateStr) || [];
                      const dNotes = notesByDate.get(dateStr) || [];
                      const dWeight = weightsByDate.get(dateStr);
                      const dParts = measurementsByDate.get(dateStr) || [];

                      return (
                        <tr key={dateStr} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-300 font-bold">
                            {dateStr}
                          </td>
                          <td className="py-2.5 px-3">
                            {dEntries.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {dEntries.map(e => {
                                  const col = getColorConfig(e.color);
                                  return (
                                    <span key={e.id} className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${col.badge}`}>
                                      {e.substance.split(' ')[0]} {e.dosage}{e.unit}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-slate-600 font-mono">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {dNotes.length > 0 ? (
                              <div className="space-y-0.5">
                                {dNotes.map(n => (
                                  <div key={n.id} className="text-xs text-slate-300 truncate max-w-[200px]">
                                    {getCategoryConfig(n.category).emoji} {n.title || n.content}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-600 font-mono">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-sky-400">
                            {dWeight ? `${dWeight.weight} ${settings.unit}` : '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            {dParts.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {dParts.map(p => (
                                  <span key={p.id} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/20 font-mono">
                                    {BODY_PART_CONFIG[p.part]?.label || p.part}: {p.value}cm
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-600 font-mono">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: HISTORIA TYGODNI (WEEK TIMELINE) */}
      {/* ======================================================== */}
      {activeTab === 'weeks' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-white text-base">Oś Czasu Tygodni Treningowych</h3>
              <p className="text-xs text-slate-400">Zarządzanie datami rozpoczęcia poszczególnych tygodni w mezocyklu</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              {weekTimeline.length} tygodni w planie
            </span>
          </div>

          <div className="space-y-3">
            {weekTimeline.map((item, idx) => (
              <div
                key={item.weekId || idx}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    item.type === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    T{item.weekNumber || idx + 1}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">{item.weekName}</h4>
                    <p className="text-xs text-slate-400 font-mono">
                      {item.startDate} → {item.endDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="text-right font-mono">
                    <div className="text-emerald-400 font-bold">{item.completedDays} / {item.totalDays} dni</div>
                    <div className="text-[11px] text-slate-500">{item.totalSets} serii • {item.totalVolumeKg?.toLocaleString()} kg</div>
                  </div>

                  {onUpdateWeekStartDate && item.weekId && (
                    <input
                      type="date"
                      value={item.startDate}
                      onChange={e => onUpdateWeekStartDate(item.weekId!, e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      title="Zmień datę rozpoczęcia tygodnia"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: KALKULATOR STĘŻEŃ FARMAKOKINETYCZNYCH */}
      {/* ======================================================== */}
      {activeTab === 'calculator' && (
        <BloodConcentrationCalculator
          protocolEntries={protocolEntries}
          theme={isDark ? 'dark' : 'light'}
        />
      )}
    </div>
  );
};
