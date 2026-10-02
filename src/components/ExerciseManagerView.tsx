import React, { useState } from 'react';
import { 
  Dumbbell, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Info,
  Calendar,
  Layers,
  BookOpen,
  ArrowRight,
  Check,
  RotateCcw
} from 'lucide-react';
import { CatalogExercise, TrainingWeek } from '../types';
import { DEFAULT_CATALOG_EXERCISES } from '../data/defaultCatalogExercises';

interface ExerciseManagerViewProps {
  catalogExercises: CatalogExercise[];
  weeks: TrainingWeek[];
  onAddCatalogExercise: (exercise: Omit<CatalogExercise, 'id'>) => void;
  onEditCatalogExercise: (id: string, updates: Partial<CatalogExercise>) => void;
  onDeleteCatalogExercise: (id: string) => void;
  onResetCatalogToDefaults?: () => void;
  onInsertToPlan: (catalogEx: CatalogExercise, weekId: string, dayId: string, initialWeight: number) => void;
  unit: string;
}

export const ExerciseManagerView: React.FC<ExerciseManagerViewProps> = ({
  catalogExercises = [],
  weeks = [],
  onAddCatalogExercise,
  onEditCatalogExercise,
  onDeleteCatalogExercise,
  onResetCatalogToDefaults,
  onInsertToPlan,
  unit
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');

  // Modal State: Add/Edit in Catalog
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<CatalogExercise | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalCategory, setModalCategory] = useState<CatalogExercise['category']>('klatka');
  const [modalEquipment, setModalEquipment] = useState<CatalogExercise['equipment']>('sztanga');
  const [modalSets, setModalSets] = useState(3);
  const [modalReps, setModalReps] = useState(10);
  const [modalRpe, setModalRpe] = useState<number | undefined>(8);
  const [modalNotes, setModalNotes] = useState('');

  // Modal State: Insert into Workout Plan
  const [insertModalEx, setInsertModalEx] = useState<CatalogExercise | null>(null);
  const [targetWeekId, setTargetWeekId] = useState<string>(weeks[0]?.id || '');
  const [targetDayId, setTargetDayId] = useState<string>(weeks[0]?.days[0]?.id || '');
  const [targetInitialWeight, setTargetInitialWeight] = useState<number>(60);
  const [insertFeedback, setInsertFeedback] = useState<string>('');

  const effectiveCatalog = catalogExercises.length > 0 ? catalogExercises : DEFAULT_CATALOG_EXERCISES;

  const categories = [
    { id: 'all', label: 'Wszystkie partie' },
    { id: 'klatka', label: '🏋️ Klatka' },
    { id: 'plecy', label: '🦅 Plecy' },
    { id: 'nogi', label: '🦵 Nogi' },
    { id: 'barki', label: '🛡️ Barki' },
    { id: 'biceps', label: '🦾 Biceps' },
    { id: 'triceps', label: '⚡ Triceps' }
  ];

  const equipmentList = [
    { id: 'all', label: 'Wszystkie typy' },
    { id: 'sztanga', label: 'Sztanga' },
    { id: 'hantle', label: 'Hantle' },
    { id: 'maszyna', label: 'Maszyna' },
    { id: 'wyciag', label: 'Wyciąg' },
    { id: 'masa_ciala', label: 'Masa ciała' },
  ];

  const filtered = effectiveCatalog.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.notes && ex.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
    const matchesEquipment = selectedEquipment === 'all' || ex.equipment === selectedEquipment;
    return matchesSearch && matchesCategory && matchesEquipment;
  });

  const handleOpenAddModal = () => {
    setEditingExercise(null);
    setModalName('');
    setModalCategory('klatka');
    setModalEquipment('sztanga');
    setModalSets(3);
    setModalReps(10);
    setModalRpe(8);
    setModalNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ex: CatalogExercise) => {
    setEditingExercise(ex);
    setModalName(ex.name);
    setModalCategory(ex.category);
    setModalEquipment(ex.equipment || 'sztanga');
    setModalSets(ex.defaultSets);
    setModalReps(ex.defaultReps);
    setModalRpe(ex.defaultRpe ?? 8);
    setModalNotes(ex.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveModal = () => {
    if (!modalName.trim()) return;
    if (editingExercise) {
      onEditCatalogExercise(editingExercise.id, {
        name: modalName.trim(),
        category: modalCategory,
        equipment: modalEquipment,
        defaultSets: modalSets,
        defaultReps: modalReps,
        defaultRpe: modalRpe,
        notes: modalNotes.trim() || undefined,
      });
    } else {
      onAddCatalogExercise({
        name: modalName.trim(),
        category: modalCategory,
        equipment: modalEquipment,
        defaultSets: modalSets,
        defaultReps: modalReps,
        defaultRpe: modalRpe,
        notes: modalNotes.trim() || undefined,
        isCustom: true,
      });
    }
    setIsModalOpen(false);
  };

  const handleOpenInsertModal = (ex: CatalogExercise) => {
    setInsertModalEx(ex);
    const firstWeek = weeks[0];
    const firstDay = firstWeek?.days[0];
    setTargetWeekId(firstWeek?.id || '');
    setTargetDayId(firstDay?.id || '');
    setTargetInitialWeight(ex.category === 'plecy' || ex.category === 'nogi' ? 80 : 50);
    setInsertFeedback('');
  };

  const handleConfirmInsert = () => {
    if (!insertModalEx || !targetWeekId || !targetDayId) return;
    onInsertToPlan(insertModalEx, targetWeekId, targetDayId, targetInitialWeight);
    setInsertFeedback('Ćwiczenie zostało pomyślnie wstawione do wybranego dnia w planie treningowym!');
    setTimeout(() => {
      setInsertFeedback('');
      setInsertModalEx(null);
    }, 1200);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'klatka': return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'plecy': return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'nogi': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'barki': return 'bg-violet-500/15 text-violet-400 border-violet-500/30';
      case 'biceps': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'triceps': return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const selectedWeek = weeks.find(w => w.id === targetWeekId);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full animate-fadeIn" id="view-exercise-manager">
      
      {/* Top Header & Context Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>Katalog &amp; Baza Ćwiczeń (Wzorce)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                {effectiveCatalog.length} pozycji w bazie
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Przykładowa baza wzorcowa ćwiczeń i szablony. Służy wyłącznie jako słownik referencyjny do tworzenia planów.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onResetCatalogToDefaults && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Czy na pewno chcesz przywrócić domyślny katalog ćwiczeń?')) {
                  onResetCatalogToDefaults();
                }
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="Przywróć standardową bazę wzorcową"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Przywróć domyślne</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all shrink-0 cursor-pointer"
            id="btn-manager-add-exercise"
          >
            <Plus className="w-4 h-4" />
            <span>Dodaj do Katalogu</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Szukaj ćwiczenia w bazie po nazwie lub wskazówkach technicznych..."
              className="w-full pl-9.5 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Equipment Filter */}
          <select
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold focus:outline-hidden focus:border-emerald-500"
          >
            {equipmentList.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-850'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exercises Table / Card Grid */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
          <Dumbbell className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-300">Brak ćwiczeń w bazie dla wybranych filtrów</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Zmień kryteria wyszukiwania lub dodaj nowe ćwiczenie szablonowe do katalogu.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((ex) => (
            <div
              key={ex.id}
              className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-4 shadow-md flex flex-col justify-between transition-all group"
            >
              <div>
                {/* Header with badges */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-mono font-bold border ${getCategoryColor(ex.category)}`}>
                    {ex.category}
                  </span>
                  {ex.equipment && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400 font-mono">
                      {ex.equipment}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h4 className="font-extrabold text-sm text-white group-hover:text-emerald-300 transition-colors line-clamp-2 mb-2.5">
                  {ex.name}
                </h4>

                {/* Suggested template values (NOT executed performance!) */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/70 mb-3 text-center">
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono block">SUG. SERIE</span>
                    <span className="font-mono font-bold text-slate-200 text-xs">{ex.defaultSets}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono block">SUG. POWT.</span>
                    <span className="font-mono font-bold text-slate-200 text-xs">{ex.defaultReps}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono block">SUG. RPE</span>
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      {ex.defaultRpe ? `@${ex.defaultRpe}` : '—'}
                    </span>
                  </div>
                </div>

                {/* Technical notes / guidance */}
                {ex.notes && (
                  <div className="text-[11px] text-slate-400 bg-slate-950/50 p-2.5 rounded-lg border border-slate-850/60 mb-3 line-clamp-2">
                    <span className="text-slate-500 font-semibold mr-1">Technika:</span>
                    {ex.notes}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenInsertModal(ex)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 text-xs font-bold border border-emerald-800/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Wstaw to ćwiczenie z bazy do konkretnego dnia w planie treningowym"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Wstaw do planu</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(ex)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Edytuj parametry w bazie"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Czy na pewno chcesz usunąć ćwiczenie "${ex.name}" z katalogu?`)) {
                        onDeleteCatalogExercise(ex.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Usuń z katalogu"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Add / Edit Catalog Exercise */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-emerald-400" />
              <span>{editingExercise ? 'Edytuj Ćwiczenie w Katalogu' : 'Dodaj Nowe Ćwiczenie do Katalogu'}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nazwa ćwiczenia:</label>
                <input
                  type="text"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="np. Wyciskanie sztangi na skosie ujemnym"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Partia mięśniowa:</label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold focus:border-emerald-500 focus:outline-hidden"
                  >
                    <option value="klatka">Klatka piersiowa</option>
                    <option value="plecy">Plecy</option>
                    <option value="nogi">Nogi</option>
                    <option value="barki">Barki</option>
                    <option value="biceps">Biceps</option>
                    <option value="triceps">Triceps</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Sprzęt / Rodzaj:</label>
                  <select
                    value={modalEquipment}
                    onChange={(e) => setModalEquipment(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold focus:border-emerald-500 focus:outline-hidden"
                  >
                    <option value="sztanga">Sztanga</option>
                    <option value="hantle">Hantle</option>
                    <option value="maszyna">Maszyna</option>
                    <option value="wyciag">Wyciąg</option>
                    <option value="masa_ciala">Masa ciała</option>
                    <option value="inne">Inne</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Sugerowane serie:</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={modalSets}
                    onChange={(e) => setModalSets(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-bold focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Sugerowane powt.:</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={modalReps}
                    onChange={(e) => setModalReps(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-bold focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Sugerowany RPE:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="5"
                    max="10"
                    value={modalRpe || 8}
                    onChange={(e) => setModalRpe(Number(e.target.value) || 8)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-bold focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Wskazówki techniczne / uwagi:</label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="np. Pauza 1s na dole, kontrola toru ruchu..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-emerald-500 focus:outline-hidden resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={!modalName.trim()}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                Zapisz w Katalogu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Insert from Catalog into Training Plan */}
      {insertModalEx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>Wstaw Ćwiczenie do Planu Treningowego</span>
            </h3>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <span className="text-[11px] text-slate-400 block font-medium">Wybrane ćwiczenie z bazy:</span>
              <span className="text-sm font-extrabold text-white block">{insertModalEx.name}</span>
              <span className="text-[11px] text-emerald-400 font-mono font-bold block">
                Partia: {insertModalEx.category} • Domyślnie: {insertModalEx.defaultSets} x {insertModalEx.defaultReps}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Docelowy tydzień treningowy:</label>
                <select
                  value={targetWeekId}
                  onChange={(e) => {
                    setTargetWeekId(e.target.value);
                    const chosen = weeks.find(w => w.id === e.target.value);
                    if (chosen && chosen.days.length > 0) {
                      setTargetDayId(chosen.days[0].id);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold focus:border-emerald-500 focus:outline-hidden"
                >
                  {weeks.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Docelowy dzień w tygodniu:</label>
                <select
                  value={targetDayId}
                  onChange={(e) => setTargetDayId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold focus:border-emerald-500 focus:outline-hidden"
                >
                  {(selectedWeek?.days || []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Początkowy ciężar roboczy ({unit}):</label>
                <input
                  type="number"
                  step="2.5"
                  value={targetInitialWeight}
                  onChange={(e) => setTargetInitialWeight(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-bold focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            {insertFeedback && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{insertFeedback}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setInsertModalEx(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleConfirmInsert}
                disabled={!targetWeekId || !targetDayId}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <span>Wstaw do Planu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
