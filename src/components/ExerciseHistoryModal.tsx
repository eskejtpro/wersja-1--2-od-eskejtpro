import React, { useState, useMemo } from 'react';
import { 
  X, 
  TrendingUp, 
  Calendar, 
  Trash2, 
  Plus, 
  Sparkles, 
  Trophy, 
  Activity, 
  Layers, 
  Maximize2 
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  ComposedChart
} from 'recharts';
import { Exercise, ExerciseHistoryPoint } from '../types';
import { getTodayDateString, calculate1RM } from '../utils/calculations';

interface ExerciseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise | null;
  onUpdateHistory: (exerciseId: string, history: ExerciseHistoryPoint[]) => void;
  unit: string;
}

export const ExerciseHistoryModal: React.FC<ExerciseHistoryModalProps> = ({
  isOpen,
  onClose,
  exercise,
  onUpdateHistory,
  unit
}) => {
  const [newDate, setNewDate] = useState(getTodayDateString());
  const [newWeight, setNewWeight] = useState('');
  const [newReps, setNewReps] = useState('8');
  const [newSets, setNewSets] = useState('4');
  const [chartMetric, setChartMetric] = useState<'both' | 'weight' | '1rm' | 'volume'>('both');

  if (!isOpen || !exercise) return null;

  const history = exercise.history || [];

  // Transform historical points for Recharts
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    return [...history]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((point) => {
        const estimated1RM = point.reps > 1 
          ? Math.round(point.weight * (1 + point.reps / 30) * 10) / 10 
          : point.weight;
        const volume = Math.round((point.sets || 1) * point.reps * point.weight);

        // Format short date for display (e.g. 01.09)
        const dateParts = point.date.split('-');
        const shortDate = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}` : point.date;

        return {
          rawDate: point.date,
          displayDate: shortDate,
          weight: point.weight,
          reps: point.reps,
          sets: point.sets || 1,
          estimated1RM,
          volume,
        };
      });
  }, [history]);

  // Metric summaries
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const weights = chartData.map(d => d.weight);
    const ones = chartData.map(d => d.estimated1RM);
    const firstWeight = weights[0];
    const lastWeight = weights[weights.length - 1];
    const maxWeight = Math.max(...weights);
    const max1RM = Math.max(...ones);
    const deltaWeight = Math.round((lastWeight - firstWeight) * 10) / 10;
    const deltaPct = firstWeight > 0 ? Math.round((deltaWeight / firstWeight) * 1000) / 10 : 0;

    return {
      firstWeight,
      lastWeight,
      maxWeight,
      max1RM,
      deltaWeight,
      deltaPct,
      sessionsCount: chartData.length
    };
  }, [chartData]);

  const handleAddPoint = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(newWeight.replace(',', '.'));
    const r = parseInt(newReps, 10);
    const s = parseInt(newSets, 10);
    if (isNaN(w) || isNaN(r) || isNaN(s)) return;

    const newPoint: ExerciseHistoryPoint = {
      date: newDate || getTodayDateString(),
      weight: w,
      reps: r,
      sets: s
    };

    const updated = [...history, newPoint].sort((a, b) => a.date.localeCompare(b.date));
    onUpdateHistory(exercise.id, updated);
    setNewWeight('');
  };

  const handleDeletePoint = (index: number) => {
    const updated = history.filter((_, i) => i !== index);
    onUpdateHistory(exercise.id, updated);
  };

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 bg-slate-950/95 border border-emerald-500/60 rounded-xl shadow-2xl text-xs space-y-1 backdrop-blur-md">
          <div className="text-[11px] font-bold text-slate-400 font-mono border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
            <span>📅 {data.rawDate}</span>
            <span className="text-emerald-400 font-bold">{data.sets} serie × {data.reps} powt.</span>
          </div>
          <div className="flex items-center justify-between gap-4 font-mono">
            <span className="text-emerald-300 font-bold">Ciężar roboczy:</span>
            <span className="text-white font-black">{data.weight} {unit}</span>
          </div>
          <div className="flex items-center justify-between gap-4 font-mono">
            <span className="text-amber-400 font-bold">Szacowane 1RM:</span>
            <span className="text-white font-black">{data.estimated1RM} {unit}</span>
          </div>
          <div className="flex items-center justify-between gap-4 font-mono pt-1 border-t border-slate-800/80">
            <span className="text-cyan-400 text-[11px]">Tonaż łączny:</span>
            <span className="text-slate-300 font-bold">{data.volume} {unit}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white leading-tight">
                Wykres Progresu: {exercise.name}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Wizualizacja parametrów siłowych w czasie (Recharts)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs no-scrollbar">
          
          {/* Summary KPIs Strip */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Ciężar Aktualny</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-black text-white font-mono">{stats.lastWeight}</span>
                  <span className="text-[11px] text-slate-400">{unit}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Progres Ciężaru</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`text-lg font-black font-mono ${stats.deltaWeight >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stats.deltaWeight >= 0 ? `+${stats.deltaWeight}` : stats.deltaWeight}
                  </span>
                  <span className={`text-[10px] font-bold ${stats.deltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ({stats.deltaPct >= 0 ? `+${stats.deltaPct}` : stats.deltaPct}%)
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Rekord PR (Max)</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-black text-amber-400 font-mono">{stats.maxWeight}</span>
                  <span className="text-[11px] text-slate-400">{unit}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Najlepszy 1RM</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-black text-cyan-400 font-mono">{stats.max1RM}</span>
                  <span className="text-[11px] text-slate-400">{unit}</span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 📊 INTERAKTYWNY WYKRES RECHARTS */}
          {/* ======================================================== */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">
                  Wizualizacja Progresji Ciężaru na Osi Czasu:
                </span>
              </div>

              {/* Metric filter pills */}
              <div className="flex items-center gap-1">
                {[
                  { id: 'both', label: 'Ciężar + 1RM' },
                  { id: 'weight', label: 'Tylko Ciężar' },
                  { id: 'volume', label: 'Tonaż' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setChartMetric(m.id as any)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      chartMetric === m.id
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Canvas */}
            {chartData.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-slate-500 space-y-2">
                <TrendingUp className="w-8 h-8 text-slate-700" />
                <p className="text-xs">Brak wystarczającej ilości punktów do wyrenderowania wykresu.</p>
                <p className="text-[11px] text-slate-600">Dodaj co najmniej 1 punkt w poniższym formularzu.</p>
              </div>
            ) : (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="displayDate" 
                      stroke="#64748b" 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} 
                    />
                    <YAxis 
                      stroke="#64748b" 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                      domain={['dataMin - 5', 'dataMax + 5']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} 
                    />

                    {/* Weight Area / Line */}
                    {(chartMetric === 'both' || chartMetric === 'weight') && (
                      <Area
                        type="monotone"
                        dataKey="weight"
                        name={`Ciężar Roboczy (${unit})`}
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorWeight)"
                        dot={{ r: 4, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    )}

                    {/* 1RM Line */}
                    {chartMetric === 'both' && (
                      <Line
                        type="monotone"
                        dataKey="estimated1RM"
                        name={`Szacowane 1RM (${unit})`}
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ r: 3, fill: '#f59e0b', stroke: '#0f172a', strokeWidth: 1.5 }}
                      />
                    )}

                    {/* Volume Area */}
                    {chartMetric === 'volume' && (
                      <Area
                        type="monotone"
                        dataKey="volume"
                        name={`Tonaż Serii (${unit})`}
                        stroke="#06b6d4"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorVolume)"
                        dot={{ r: 4, fill: '#06b6d4' }}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Form to add historical log point */}
          <form onSubmit={handleAddPoint} className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dodaj punkt pomiarowy do osi czasu:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 block font-bold mb-0.5">Data:</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block font-bold mb-0.5">Ciężar ({unit}):</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  placeholder="85"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-bold font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block font-bold mb-0.5">Serie:</label>
                <input
                  type="number"
                  value={newSets}
                  onChange={(e) => setNewSets(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block font-bold mb-0.5">Powtórzenia:</label>
                <input
                  type="number"
                  value={newReps}
                  onChange={(e) => setNewReps(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 mt-1 cursor-pointer transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Zapisz Punkt Pomiarowy</span>
            </button>
          </form>

          {/* Table of historical entries */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
            <table className="w-full text-left">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Ciężar</th>
                  <th className="py-2.5 px-3">Serie × Powt.</th>
                  <th className="py-2.5 px-3">Szac. 1RM</th>
                  <th className="py-2.5 px-3 text-right">Akcja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-slate-200">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-5 text-center text-slate-500">
                      Brak wcześniejszej historii dla tego ćwiczenia.
                    </td>
                  </tr>
                ) : (
                  history.map((point, i) => {
                    const oneRm = point.reps > 1 ? (point.weight * (1 + point.reps / 30)).toFixed(1) : point.weight;
                    return (
                      <tr key={i} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-2 px-3 font-mono text-[11px]">{point.date}</td>
                        <td className="py-2 px-3 font-bold text-emerald-400 font-mono text-xs">
                          {point.weight} {unit}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-300 text-xs">
                          {point.sets} × {point.reps}
                        </td>
                        <td className="py-2 px-3 text-amber-400 font-mono font-bold text-xs">
                          {oneRm} {unit}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeletePoint(i)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg cursor-pointer transition-colors"
                            title="Usuń wpis"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold cursor-pointer transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
