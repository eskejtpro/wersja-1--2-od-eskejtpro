import React, { useState } from 'react';
import { Scale, Plus, Trash2, TrendingDown, TrendingUp, Calendar, AlertCircle, Ruler, Activity, Sparkles, Layers } from 'lucide-react';
import { BodyWeightEntry, CircumferenceEntry, BodyPartMeasurement, BodyPartType, TrainingWeek } from '../types';
import { getTodayDateString } from '../utils/calculations';
import { CircumferenceProgressPanel } from './CircumferenceProgressPanel';
import { BodyPartMeasurementsPanel } from './BodyPartMeasurementsPanel';
import { CombinedBodyMetricsChart } from './CombinedBodyMetricsChart';

export type WeightSubcategoryType = 'all' | 'register' | 'combined' | 'parts' | 'circumferences';

interface BodyWeightViewProps {
  bodyWeights: BodyWeightEntry[];
  onAddBodyWeight: (entry: Omit<BodyWeightEntry, 'id'>) => void;
  onDeleteBodyWeight: (id: string) => void;
  circumferences: CircumferenceEntry[];
  bodyPartMeasurements?: BodyPartMeasurement[];
  onAddBodyMeasurement?: (entry: Omit<BodyPartMeasurement, 'id'>) => void;
  onDeleteBodyMeasurement?: (id: string) => void;
  weeks: TrainingWeek[];
  onAddCircumference: (entry: Omit<CircumferenceEntry, 'id'>) => void;
  onUpdateCircumference: (entry: CircumferenceEntry) => void;
  onDeleteCircumference: (id: string) => void;
  unit: 'kg' | 'lbs';
  activeSubcategory?: WeightSubcategoryType;
  onSelectSubcategory?: (sub: WeightSubcategoryType) => void;
}

export const BodyWeightView: React.FC<BodyWeightViewProps> = ({
  bodyWeights,
  onAddBodyWeight,
  onDeleteBodyWeight,
  circumferences,
  bodyPartMeasurements = [],
  onAddBodyMeasurement,
  onDeleteBodyMeasurement,
  weeks,
  onAddCircumference,
  onUpdateCircumference,
  onDeleteCircumference,
  unit,
  activeSubcategory: controlledSubcategory,
  onSelectSubcategory: controlledOnSelectSubcategory
}) => {
  const activeSubcategory = controlledSubcategory ?? 'all';

  const [date, setDate] = useState(getTodayDateString());
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPart, setSelectedPart] = useState<BodyPartType>('biceps');

  const sortedEntries = [...bodyWeights].sort((a, b) => a.date.localeCompare(b.date));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weight.replace(',', '.'));
    if (isNaN(w) || w <= 0) return;

    onAddBodyWeight({
      date: date || getTodayDateString(),
      weight: Math.round(w * 10) / 10,
      notes: notes.trim()
    });

    setWeight('');
    setNotes('');
  };

  // Calculations
  const weights = sortedEntries.map((e) => e.weight);
  const currentWeight = weights.length > 0 ? weights[weights.length - 1] : 0;
  const initialWeight = weights.length > 0 ? weights[0] : 0;
  const totalChange = currentWeight && initialWeight ? Math.round((currentWeight - initialWeight) * 10) / 10 : 0;
  const averageWeight = weights.length > 0 ? Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10 : 0;

  // Compact SVG Line Chart for Body Weight
  const chartW = 580;
  const chartH = 160;
  const pL = 45;
  const pR = 20;
  const pT = 20;
  const pB = 30;
  const iW = chartW - pL - pR;
  const iH = chartH - pT - pB;

  const minBw = weights.length > 0 ? Math.max(0, Math.min(...weights) - 2) : 0;
  const maxBw = weights.length > 0 ? Math.max(...weights) + 2 : 100;
  const bwRange = maxBw - minBw || 1;

  const bwPoints = sortedEntries.map((item, idx) => {
    const x = sortedEntries.length > 1 ? pL + (idx / (sortedEntries.length - 1)) * iW : pL + iW / 2;
    const y = pT + iH - ((item.weight - minBw) / bwRange) * iH;
    return { ...item, x, y };
  });

  const bwPath = bwPoints.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
    ''
  );

  return (
    <div className="w-full max-w-full p-3 sm:p-4 space-y-3.5" id="view-body-weight">
      {/* 1. Header & Subcategories Bar (Zmniejszony wygląd i wyrównane czcionki) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Scale className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-100 leading-tight">
                Waga Ciała i Pomiary Partii Mięśniowych
              </h2>
              <p className="text-[11px] text-slate-400 leading-tight">
                Precyzyjna analityka masy ciała, obwodów sylwetki i ich korelacji z siłą
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800">
              Pomiary: <strong className="text-emerald-400">{sortedEntries.length}</strong>
            </span>
            {currentWeight > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800">
                Bieżąca: <strong className="text-emerald-400">{currentWeight} {unit}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. PODKATEGORIA: REJESTR WAGI & TRENDY */}
      {(activeSubcategory === 'all' || activeSubcategory === 'register') && (
        <div id="section-body-weight" className="space-y-3">
          {/* KPI Stats (Zmniejszone, wyrównane czcionki) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Bieżąca Waga
              </span>
              <div className="text-base font-bold text-emerald-400 font-mono">
                {currentWeight ? `${currentWeight} ${unit}` : '--'}
              </div>
              <span className="text-[10px] text-slate-500">Ostatni pomiar</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Całkowita Zmiana
              </span>
              <div
                className={`text-base font-bold font-mono flex items-center gap-1 ${
                  totalChange < 0 ? 'text-emerald-400' : totalChange > 0 ? 'text-amber-400' : 'text-slate-200'
                }`}
              >
                {totalChange > 0 ? `+${totalChange}` : totalChange} {unit}
              </div>
              <span className="text-[10px] text-slate-500">Względem startu</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Średnia Waga
              </span>
              <div className="text-base font-bold text-slate-200 font-mono">
                {averageWeight ? `${averageWeight} ${unit}` : '--'}
              </div>
              <span className="text-[10px] text-slate-500">Średnia arytmetyczna</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Wpisy Wagi
              </span>
              <div className="text-base font-bold text-slate-200 font-mono">
                {sortedEntries.length}
              </div>
              <span className="text-[10px] text-slate-500">Zarejestrowane dni</span>
            </div>
          </div>

          {/* Main Grid: Formularz + Wykres & Tabela */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Formularz wprowadzania wagi (Zmniejszony) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs space-y-2.5">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dodaj Pomiar Wagi</span>
              </h3>

              <form onSubmit={handleSubmit} className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Data:
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-hidden focus:border-emerald-500"
                    id="input-bw-date"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Waga ciała ({unit}):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="np. 81.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-emerald-400 font-mono text-sm font-bold focus:outline-hidden focus:border-emerald-500"
                    id="input-bw-weight"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Pora dnia / Notatka:
                  </label>
                  <input
                    type="text"
                    placeholder="np. Na czczo rano"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-hidden focus:border-emerald-500"
                    id="input-bw-notes"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors text-xs"
                  id="btn-submit-bw"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Zapisz pomiar wagi</span>
                </button>
              </form>
            </div>

            {/* Wykres trendu i tabela historii */}
            <div className="lg:col-span-2 space-y-3">
              {/* Wykres trendu */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Linia Trendu Wagi Ciała
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    Zakres: {minBw} - {maxBw} {unit}
                  </span>
                </div>

                {sortedEntries.length < 2 ? (
                  <div className="h-36 flex items-center justify-center text-xs text-slate-500">
                    Wprowadź co najmniej 2 pomiary wagi, aby zobaczyć wykres trendu.
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto select-none">
                      {/* Grid */}
                      {[0, 0.5, 1].map((r) => {
                        const y = pT + iH * r;
                        const val = Math.round(maxBw - bwRange * r);
                        return (
                          <g key={r}>
                            <line x1={pL} y1={y} x2={chartW - pR} y2={y} stroke="#334155" strokeDasharray="3 3" />
                            <text x={pL - 6} y={y + 3} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                              {val} {unit}
                            </text>
                          </g>
                        );
                      })}
                      {/* Line */}
                      <path d={bwPath} fill="none" stroke="#10b981" strokeWidth="2.5" />
                      {/* Points */}
                      {bwPoints.map((pt, i) => (
                        <g key={i}>
                          <circle cx={pt.x} cy={pt.y} r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                          <text x={pt.x} y={pt.y - 6} fill="#f1f5f9" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                            {pt.weight}
                          </text>
                          <text x={pt.x} y={chartH - pB + 14} fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="monospace">
                            {pt.date.slice(5)}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                )}
              </div>

              {/* Tabela historii pomiarów */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
                <div className="p-2.5 border-b border-slate-800 bg-slate-950 font-bold text-xs text-slate-200 flex items-center justify-between">
                  <span>Historia Pomiarów Wagi</span>
                  <span className="text-[10px] font-mono text-slate-400 font-normal">
                    Łącznie: {sortedEntries.length} wpisów
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase tracking-wider sticky top-0 font-bold">
                      <tr>
                        <th className="py-2 px-2.5">Data</th>
                        <th className="py-2 px-2.5">Waga</th>
                        <th className="py-2 px-2.5">Zmiana</th>
                        <th className="py-2 px-2.5">Notatki</th>
                        <th className="py-2 px-2.5 text-right">Akcja</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {sortedEntries.map((item, index) => {
                        const prev = index > 0 ? sortedEntries[index - 1].weight : null;
                        const delta = prev !== null ? Math.round((item.weight - prev) * 10) / 10 : null;

                        return (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-1.5 px-2.5 font-mono text-xs">{item.date}</td>
                            <td className="py-1.5 px-2.5 font-bold font-mono text-emerald-400 text-xs">
                              {item.weight} {unit}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono text-[11px]">
                              {delta !== null ? (
                                <span className={delta < 0 ? 'text-emerald-400 font-semibold' : delta > 0 ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
                                  {delta > 0 ? `+${delta}` : delta} {unit}
                                </span>
                              ) : (
                                <span className="text-slate-500">--</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-400 truncate max-w-[180px] text-xs">
                              {item.notes || '-'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => onDeleteBodyWeight(item.id)}
                                className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. PODKATEGORIA: WSPÓLNY WYKRES KORELACJI */}
      {(activeSubcategory === 'all' || activeSubcategory === 'combined') && (
        <div id="section-combined-chart">
          <CombinedBodyMetricsChart
            bodyWeights={bodyWeights}
            bodyPartMeasurements={bodyPartMeasurements}
            unit={unit}
            selectedPart={selectedPart}
            onSelectPart={setSelectedPart}
          />
        </div>
      )}

      {/* 4. PODKATEGORIA: POMIARY PARTII CIAŁA (BICEPS, TRICEPS, KLATA, BARKI, NOGI) */}
      {(activeSubcategory === 'all' || activeSubcategory === 'parts') && (
        <div id="section-body-parts">
          <BodyPartMeasurementsPanel
            measurements={bodyPartMeasurements}
            selectedPart={selectedPart}
            onSelectPart={setSelectedPart}
            onAddMeasurement={(entry) => onAddBodyMeasurement && onAddBodyMeasurement(entry)}
            onDeleteMeasurement={(id) => onDeleteBodyMeasurement && onDeleteBodyMeasurement(id)}
          />
        </div>
      )}

      {/* 5. PODKATEGORIA: ZAAWANSOWANE OBWODY & 1RM */}
      {(activeSubcategory === 'all' || activeSubcategory === 'circumferences') && (
        <div id="section-advanced-circumferences">
          <CircumferenceProgressPanel
            circumferences={circumferences}
            bodyWeights={bodyWeights}
            weeks={weeks}
            unit={unit}
            onAdd={onAddCircumference}
            onUpdate={onUpdateCircumference}
            onDelete={onDeleteCircumference}
          />
        </div>
      )}
    </div>
  );
};
