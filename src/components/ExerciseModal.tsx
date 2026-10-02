import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Check, 
  Dumbbell, 
  Sparkles, 
  Target, 
  Flame, 
  FileText, 
  Layers, 
  Edit3,
  HelpCircle,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { Exercise } from '../types';
import { getTodayDateString, calculate1RM, calculateVolume } from '../utils/calculations';

interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exercise: Omit<Exercise, 'id'>, exerciseId?: string) => void;
  exerciseToEdit?: Exercise | null;
  unit: string;
}

// Preset exercise library with categories and default suggested values
const PRESET_LIBRARY = [
  // Klatka
  { name: 'Wyciskanie sztangi leżąc (Bench Press)', category: 'klatka', sets: 4, reps: 8, weight: 80, notes: 'Pauza na klatce, stabilny mostek, łopatki ściągnięte' },
  { name: 'Wyciskanie hantli na skosie dodatnim', category: 'klatka', sets: 3, reps: 10, weight: 28, notes: 'Kąt ławki 30 stopni, pełne rozciągnięcie' },
  { name: 'Rozpiętki z hantlami na ławce płaskiej', category: 'klatka', sets: 3, reps: 12, weight: 14, notes: 'Lekkie ugięcie w łokciach, kontrolowana faza negatywna' },
  { name: 'Dipsy na poręczach (wersja na klatkę)', category: 'klatka', sets: 3, reps: 10, weight: 0, notes: 'Pochylenie tułowia do przodu, głęboki schód' },
  
  // Plecy
  { name: 'Martwy ciąg klasyczny (Deadlift)', category: 'plecy', sets: 4, reps: 5, weight: 130, notes: 'Proste plecy, spięcie brzucha przed ruchem, sztanga przy ciele' },
  { name: 'Podciąganie na drążku (nachwyt)', category: 'plecy', sets: 4, reps: 8, weight: 0, notes: 'Pełen zakres ruchu od wyprostu do brody nad drążkiem' },
  { name: 'Wiosłowanie sztangą w opadzie tułowia', category: 'plecy', sets: 4, reps: 8, weight: 70, notes: 'Opad tułowia 45 stopni, ciągnij do pępka' },
  { name: 'Wiosłowanie hantlem w oparciu o ławkę', category: 'plecy', sets: 3, reps: 10, weight: 32, notes: 'Rozciągnięcie najszerszego w dolnej fazie' },
  { name: 'Ściąganie drążka wyciągu górnego do klatki', category: 'plecy', sets: 3, reps: 12, weight: 60, notes: 'Nie odchylaj tułowia zbyt mocno w tył' },

  // Nogi
  { name: 'Przysiad ze sztangą na plecach (Back Squat)', category: 'nogi', sets: 4, reps: 6, weight: 110, notes: 'Głębokość poniżej równoległości, kolana w linii stóp' },
  { name: 'Rumuński martwy ciąg (RDL)', category: 'nogi', sets: 3, reps: 10, weight: 80, notes: 'Ruch biodrami w tył, proste plecy, mocny stretch dwugłowych' },
  { name: 'Wypychanie ciężaru na suwnicy (Leg Press)', category: 'nogi', sets: 4, reps: 10, weight: 160, notes: 'Stopy na szerokość bioder, nie blokuj kolan w stawie' },
  { name: 'Wykroki chodzone z hantlami', category: 'nogi', sets: 3, reps: 12, weight: 16, notes: 'Stabilne kolano z przodu, pionowy tułów' },
  { name: 'Wspięcia na palce stojąc (Łydki)', category: 'nogi', sets: 4, reps: 15, weight: 50, notes: 'Pauza 2 sekundy w pełnym wspięciu i dolnym rozciągnięciu' },

  // Barki
  { name: 'Wyciskanie żołnierskie sztangi (OHP)', category: 'barki', sets: 4, reps: 6, weight: 55, notes: 'Mocne spięcie pośladków i brzucha, blokada nad głową' },
  { name: 'Wznosy hantli bokiem stojąc', category: 'barki', sets: 4, reps: 12, weight: 12, notes: 'Ruch inicjowany łokciami, nie unosimy barków do uszu' },
  { name: 'Face pull na wyciągu (tył barku)', category: 'barki', sets: 3, reps: 15, weight: 25, notes: 'Ciągnij linkę do wysokości oczu, rotacja zewnętrzna' },

  // Biceps
  { name: 'Uginanie przedramion ze sztangą stojąc', category: 'biceps', sets: 3, reps: 10, weight: 35, notes: 'Łokcie nieruchomo przy tułowiu, brak bujania' },
  { name: 'Uginanie hantli z supinacją (zmienne)', category: 'biceps', sets: 3, reps: 12, weight: 14, notes: 'Mocny skręt nadgarstka na szczycie skurczu' },

  // Triceps
  { name: 'Dipsy na poręczach (wersja na triceps)', category: 'triceps', sets: 3, reps: 10, weight: 10, notes: 'Tułów pionowo, głębokie ugięcie w łokciach' },
  { name: 'Wyciskanie francuskie ze sztangą leżąc', category: 'triceps', sets: 3, reps: 10, weight: 35, notes: 'Łokcie skierowane do wewnątrz, powolna faza opuszczania' },
  { name: 'Prostowanie ramion na wyciągu prostym', category: 'triceps', sets: 3, reps: 12, weight: 30, notes: 'Mocne spięcie tricepsa na samym dole' }
];

export const ExerciseModal: React.FC<ExerciseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  exerciseToEdit,
  unit
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'klatka' | 'plecy' | 'biceps' | 'triceps' | 'barki' | 'nogi' | ''>('');
  const [sets, setSets] = useState(4);
  const [reps, setReps] = useState(8);
  const [weight, setWeight] = useState(60);
  const [goalWeight, setGoalWeight] = useState<number | undefined>(undefined);
  const [rpe, setRpe] = useState(8);
  const [notes, setNotes] = useState('');
  
  // Active filter tab for library presets
  const [selectedFilterCat, setSelectedFilterCat] = useState<string>('all');
  const [showPresets, setShowPresets] = useState<boolean>(!exerciseToEdit);

  useEffect(() => {
    if (exerciseToEdit) {
      setName(exerciseToEdit.name);
      setCategory(exerciseToEdit.category || '');
      setSets(exerciseToEdit.sets);
      setReps(exerciseToEdit.reps);
      setWeight(exerciseToEdit.weight);
      setGoalWeight(exerciseToEdit.goalWeight);
      setRpe(exerciseToEdit.rpe || 8);
      setNotes(exerciseToEdit.notes || '');
      setShowPresets(false);
    } else {
      setName('');
      setCategory('');
      setSets(4);
      setReps(8);
      setWeight(60);
      setGoalWeight(undefined);
      setRpe(8);
      setNotes('');
      setShowPresets(true);
    }
  }, [exerciseToEdit, isOpen]);

  // Handle keyboard shortcuts (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESET_LIBRARY[0]) => {
    setName(preset.name);
    setCategory(preset.category as any);
    setSets(preset.sets);
    setReps(preset.reps);
    setWeight(preset.weight);
    setNotes(preset.notes);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const baseHistory = exerciseToEdit?.history || [
      {
        date: getTodayDateString(),
        weight: Number(weight),
        reps: Number(reps),
        sets: Number(sets),
        rpe: Number(rpe)
      }
    ];

    onSave(
      {
        name: name.trim(),
        category: category || undefined,
        sets: Math.max(1, Number(sets)),
        reps: Math.max(1, Number(reps)),
        weight: Math.max(0, Number(weight)),
        goalWeight: goalWeight && goalWeight > 0 ? goalWeight : undefined,
        rpe: Number(rpe),
        notes: notes.trim(),
        history: baseHistory
      },
      exerciseToEdit?.id
    );
    onClose();
  };

  const estimated1RM = calculate1RM(weight, reps);
  const projectedVolume = calculateVolume(sets, reps, weight);

  const filteredPresets = PRESET_LIBRARY.filter((p) => {
    if (selectedFilterCat === 'all') return true;
    return p.category === selectedFilterCat;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn"
      id="modal-exercise-window"
    >
      {/* Windows Dialog Shell Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all">
        
        {/* Window Bar Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              {exerciseToEdit ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>{exerciseToEdit ? 'Edycja i Parametry Ćwiczenia' : 'Dodaj Nowe Ćwiczenie do Planu'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {exerciseToEdit ? `Zmień parametry i wariant dla: ${exerciseToEdit.name}` : 'Wybierz szablon z bazy lub wpisz własne parametry'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
            title="Zamknij okno (Esc)"
            id="btn-close-exercise-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Workspace */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Quick Preset Library Accordion/Toggle */}
          {!exerciseToEdit && (
            <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Szybki Wybór z Bazy Ćwiczeń:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPresets(!showPresets)}
                  className="text-[11px] font-semibold text-emerald-400 hover:underline"
                >
                  {showPresets ? 'Ukryj podpowiedzi' : 'Pokaż gotowe szablony'}
                </button>
              </div>

              {showPresets && (
                <div className="space-y-2.5 animate-fadeIn">
                  {/* Category Filter Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
                    {[
                      { id: 'all', label: 'Wszystkie' },
                      { id: 'klatka', label: '🏋️ Klatka' },
                      { id: 'plecy', label: '🦅 Plecy' },
                      { id: 'nogi', label: '🦵 Nogi' },
                      { id: 'barki', label: '🛡️ Barki' },
                      { id: 'biceps', label: '🦾 Biceps' },
                      { id: 'triceps', label: '⚡ Triceps' }
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedFilterCat(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 ${
                          selectedFilterCat === cat.id
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Preset Buttons Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {filteredPresets.map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="text-left p-2 rounded-xl bg-slate-900/90 hover:bg-slate-850 hover:border-emerald-500/50 border border-slate-800 transition-all flex items-start justify-between gap-2 group cursor-pointer"
                      >
                        <div>
                          <span className="font-bold text-slate-200 group-hover:text-emerald-400 block text-xs truncate">
                            {preset.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {preset.sets} serie × {preset.reps} powt. @ {preset.weight} {unit}
                          </span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-mono shrink-0">
                          {preset.category}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 1: Exercise Name & Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label htmlFor="input-exercise-name" className="block font-bold text-slate-200">
                Nazwa Ćwiczenia: <span className="text-red-400">*</span>
              </label>
              <input
                id="input-exercise-name"
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Wyciskanie sztangi leżąc"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-hidden focus:border-emerald-500 font-bold text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="select-exercise-category" className="block font-bold text-slate-200">
                Partia Mięśniowa:
              </label>
              <select
                id="select-exercise-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 font-semibold focus:outline-hidden focus:border-emerald-500"
              >
                <option value="">Auto-wygrywanie</option>
                <option value="klatka">🏋️ Klatka Piersiowa</option>
                <option value="plecy">🦅 Plecy / Grzbiet</option>
                <option value="barki">🛡️ Barki / Naramienne</option>
                <option value="biceps">🦾 Biceps</option>
                <option value="triceps">⚡ Triceps</option>
                <option value="nogi">🦵 Nogi / Udowe & Łydki</option>
              </select>
            </div>
          </div>

          {/* Section 2: Parameters (Sets, Reps, Weight) & Live Projections */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
            <span className="font-extrabold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Parametry Treningowe & Kalkulator 1RM:</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Serie */}
              <div className="space-y-1.5">
                <label htmlFor="input-exercise-sets" className="block font-semibold text-slate-300">
                  Planowane Serie:
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSets(Math.max(1, sets - 1))}
                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
                  >
                    -
                  </button>
                  <input
                    id="input-exercise-sets"
                    type="number"
                    min="1"
                    max="25"
                    value={sets}
                    onChange={(e) => setSets(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full h-9 text-center font-mono font-black text-white bg-slate-900 border border-slate-700 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setSets(sets + 1)}
                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Powtórzenia */}
              <div className="space-y-1.5">
                <label htmlFor="input-exercise-reps" className="block font-semibold text-slate-300">
                  Powtórzenia w serii:
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setReps(Math.max(1, reps - 1))}
                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
                  >
                    -
                  </button>
                  <input
                    id="input-exercise-reps"
                    type="number"
                    min="1"
                    max="99"
                    value={reps}
                    onChange={(e) => setReps(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full h-9 text-center font-mono font-black text-white bg-slate-900 border border-slate-700 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setReps(reps + 1)}
                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Ciężar */}
              <div className="space-y-1.5">
                <label htmlFor="input-exercise-weight" className="block font-semibold text-slate-300">
                  Cężar Roboczy ({unit}):
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setWeight(Math.max(0, Math.round((weight - 2.5) * 10) / 10))}
                    className="px-2 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold"
                  >
                    -2.5
                  </button>
                  <input
                    id="input-exercise-weight"
                    type="number"
                    step="0.5"
                    min="0"
                    value={weight}
                    onChange={(e) => setWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full h-9 text-center font-mono font-black text-emerald-400 bg-slate-900 border border-emerald-500/60 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setWeight(Math.round((weight + 2.5) * 10) / 10)}
                    className="px-2 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold"
                  >
                    +2.5
                  </button>
                </div>
              </div>
            </div>

            <label className="block text-xs font-semibold text-slate-300">Cel ciężaru ({unit}, opcjonalnie)
              <input id="input-exercise-goal-weight" type="number" min="0" step="0.5" value={goalWeight ?? ''} onChange={e=>setGoalWeight(e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)||0))} className="ml-2 w-28 h-9 px-2 rounded-lg bg-slate-900 border border-emerald-500/40 text-emerald-300 font-mono" />
            </label>

            {/* Live KPI Indicators Pill Row */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-mono font-bold flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Szacowany 1RM:</span>
                </span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {estimated1RM} {unit}
                </span>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-mono font-bold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-sky-400" />
                  <span>Prognoza Tonażu:</span>
                </span>
                <span className="font-mono font-black text-sky-400 text-sm">
                  {projectedVolume.toLocaleString('pl-PL')} {unit}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: RPE & Technical Notes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="select-exercise-rpe" className="block font-bold text-slate-200">
                Skala Wysiłku RPE (1-10):
              </label>
              <select
                id="select-exercise-rpe"
                value={rpe}
                onChange={(e) => setRpe(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 font-semibold focus:outline-hidden focus:border-emerald-500"
              >
                <option value={6}>RPE 6 - Lekki zapas 4 powtórzeń</option>
                <option value={7}>RPE 7 - Zapas 3 powtórzeń</option>
                <option value={8}>RPE 8 - Zapas 2 powtórzeń (Optymalny)</option>
                <option value={8.5}>RPE 8.5 - Zapas 1-2 powtórzeń</option>
                <option value={9}>RPE 9 - Zapas tylko 1 powtórzenia</option>
                <option value={9.5}>RPE 9.5 - Blisko upadku</option>
                <option value={10}>RPE 10 - Maksymalny upadek mięśniowy</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label htmlFor="input-exercise-notes" className="block font-bold text-slate-200 flex items-center justify-between">
                <span>Wskazówki techniczne & Notatki:</span>
                <span className="text-[10px] text-slate-500 font-normal">Opcjonalnie</span>
              </label>
              <input
                id="input-exercise-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="np. Pauza 1 sekunda na dole, czucie najszerszego, spięty brzuch..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Dialog Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              id="btn-cancel-exercise-modal"
            >
              Anuluj
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-emerald-950/30 transition-all cursor-pointer"
              id="btn-submit-exercise-modal"
            >
              <Check className="w-4 h-4" />
              <span>{exerciseToEdit ? 'Zapisz Zmiany Ćwiczenia' : 'Dodaj Ćwiczenie do Planu'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
