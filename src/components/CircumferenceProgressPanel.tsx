import React, { useEffect, useMemo, useState } from 'react';
import { Dumbbell, LineChart, Pencil, Plus, Ruler, Trash2 } from 'lucide-react';
import { BodyWeightEntry, CIRCUMFERENCE_BODY_PARTS, CircumferenceBodyPart, CircumferenceEntry, CircumferenceSide, CircumferenceVariant, TrainingWeek } from '../types';
import { calculate1RM, getTodayDateString } from '../utils/calculations';
import { ANALYSIS_THRESHOLDS, analyzeCircumferenceTrend, calculateCircumferenceChange, calculateEma, circumferenceEntriesOrEmpty, interpretCircumferenceAndStrength, parseCircumferenceMillimeters, pearsonForSharedDates, regressionSlopePerWeek, sameCircumferenceSeries, sortCircumferences } from '../utils/circumference';

interface Props {
  circumferences: CircumferenceEntry[];
  bodyWeights: BodyWeightEntry[];
  weeks: TrainingWeek[];
  unit: 'kg' | 'lbs';
  onAdd: (entry: Omit<CircumferenceEntry, 'id'>) => void;
  onUpdate: (entry: CircumferenceEntry) => void;
  onDelete: (id: string) => void;
}

const sideParts: CircumferenceBodyPart[] = ['udo', 'łydka', 'ramię'];
const bodyPartLabel: Record<CircumferenceBodyPart, string> = { klatka: 'Klatka', talia: 'Talia', biodra: 'Biodra', udo: 'Udo', łydka: 'Łydka', ramię: 'Ramię' };
const sideLabel: Record<Exclude<CircumferenceSide, null>, string> = { left: 'L', right: 'P' };
const variantLabel: Record<CircumferenceVariant, string> = { standard: '', flexed: 'napięte', relaxed: 'rozluźnione' };
const seriesKey = (entry: Pick<CircumferenceEntry, 'bodyPart' | 'side' | 'variant'>) => `${entry.bodyPart}|${entry.side || 'none'}|${entry.variant}`;
const seriesLabel = (entry: Pick<CircumferenceEntry, 'bodyPart' | 'side' | 'variant'>) => [bodyPartLabel[entry.bodyPart], entry.side ? sideLabel[entry.side] : '', variantLabel[entry.variant]].filter(Boolean).join(' · ');
const formatCm = (millimeters: number) => (millimeters / 10).toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatSigned = (value: number, suffix: string) => `${value > 0 ? '+' : ''}${value.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}${suffix}`;

export const CircumferenceProgressPanel: React.FC<Props> = ({ circumferences, bodyWeights, weeks, unit, onAdd, onUpdate, onDelete }) => {
  const entries = useMemo(() => sortCircumferences(circumferenceEntriesOrEmpty(circumferences)), [circumferences]);
  const [date, setDate] = useState(getTodayDateString());
  const [bodyPart, setBodyPart] = useState<CircumferenceBodyPart>('ramię');
  const [side, setSide] = useState<CircumferenceSide>('left');
  const [variant, setVariant] = useState<CircumferenceVariant>('flexed');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [selectedSeriesKey, setSelectedSeriesKey] = useState('');
  const [trendMode, setTrendMode] = useState<'raw' | 'ema'>('raw');

  const series = useMemo(() => {
    const unique = new Map<string, CircumferenceEntry>();
    entries.forEach((entry) => { if (!unique.has(seriesKey(entry))) unique.set(seriesKey(entry), entry); });
    return [...unique.values()];
  }, [entries]);

  useEffect(() => {
    if (series.length && !series.some((entry) => seriesKey(entry) === selectedSeriesKey)) setSelectedSeriesKey(seriesKey(series[0]));
    if (!series.length) setSelectedSeriesKey('');
  }, [series, selectedSeriesKey]);

  const selectedSeed = series.find((entry) => seriesKey(entry) === selectedSeriesKey) || null;
  const selectedEntries = selectedSeed ? entries.filter((entry) => sameCircumferenceSeries(entry, selectedSeed)) : [];
  const latest = selectedEntries.at(-1);
  const first = selectedEntries[0];
  const previous = selectedEntries.length > 1 ? selectedEntries.at(-2) : undefined;
  const sinceFirst = latest && first ? calculateCircumferenceChange(latest.millimeters, first.millimeters) : null;
  const sincePrevious = latest && previous ? calculateCircumferenceChange(latest.millimeters, previous.millimeters) : null;

  const exerciseHistory = useMemo(() => {
    const byName = new Map<string, { date: string; oneRm: number }[]>();
    weeks.forEach((week) => week.days.forEach((day) => day.exercises.forEach((exercise) => {
      const valid = (exercise.history || [])
        .filter((point) => point.date && point.weight > 0 && point.reps > 0)
        .map((point) => ({ date: point.date, oneRm: calculate1RM(point.weight, point.reps) }));
      if (valid.length) byName.set(exercise.name, [...(byName.get(exercise.name) || []), ...valid]);
    })));
    return [...byName.entries()].map(([name, points]) => ({ name, points: [...points].sort((a, b) => a.date.localeCompare(b.date)) }));
  }, [weeks]);
  const [selectedExercise, setSelectedExercise] = useState('');
  useEffect(() => { if (!exerciseHistory.some((item) => item.name === selectedExercise)) setSelectedExercise(exerciseHistory[0]?.name || ''); }, [exerciseHistory, selectedExercise]);
  const oneRmPoints = exerciseHistory.find((item) => item.name === selectedExercise)?.points || [];
  const circumferenceAnalysis = useMemo(() => analyzeCircumferenceTrend(selectedEntries), [selectedEntries]);
  const circumferenceLinePoints = trendMode === 'ema'
    ? circumferenceAnalysis.trendPoints.map((point, index) => ({ ...point, value: calculateEma(circumferenceAnalysis.trendPoints.map((item) => item.value))[index] }))
    : selectedEntries.map((entry) => ({ date: entry.date, value: entry.millimeters }));
  const oneRmLinePoints = trendMode === 'ema'
    ? oneRmPoints.map((point, index) => ({ ...point, oneRm: calculateEma(oneRmPoints.map((item) => item.oneRm))[index] }))
    : oneRmPoints;
  const strengthSlope = regressionSlopePerWeek(oneRmPoints.map((point) => ({ date: point.date, value: point.oneRm })));
  const correlation = pearsonForSharedDates(circumferenceAnalysis.trendPoints, oneRmPoints.map((point) => ({ date: point.date, value: point.oneRm })));
  const interpretation = interpretCircumferenceAndStrength(circumferenceAnalysis.slopePerWeek, strengthSlope);
  const bodyWeightContext = useMemo(() => {
    const sorted = [...bodyWeights].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length < 2) return null;
    return { change: Math.round((sorted.at(-1)!.weight - sorted[0].weight) * 10) / 10, latest: sorted.at(-1)!.weight };
  }, [bodyWeights]);

  const chartDates = [...selectedEntries.map((item) => item.date), ...oneRmPoints.map((item) => item.date)].sort();
  const rangeStart = chartDates[0];
  const rangeEnd = chartDates.at(-1);
  const toX = (itemDate: string, width = 550, left = 50) => {
    const start = Date.parse(`${rangeStart}T00:00:00Z`);
    const end = Date.parse(`${rangeEnd}T00:00:00Z`);
    const current = Date.parse(`${itemDate}T00:00:00Z`);
    return !rangeStart || !rangeEnd || start === end ? left + width / 2 : left + ((current - start) / (end - start)) * width;
  };
  const chart = (linePoints: { date: string; value: number }[], color: string, label: (value: number) => string, id: string, empty: string, rawPoints = linePoints, uncertainDates = new Set<string>()) => {
    if (!rawPoints.length) return <div id={id} className="h-44 flex items-center justify-center text-xs text-slate-500">{empty}</div>;
    const values = [...linePoints, ...rawPoints].map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const map = (points: { date: string; value: number }[]) => points.map((point) => ({ ...point, x: toX(point.date), y: 24 + 132 - ((point.value - min) / range) * 132 }));
    const mappedLine = map(linePoints);
    const mappedRaw = map(rawPoints);
    const line = mappedLine.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
    return <div className="w-full overflow-x-auto" id={id}><svg viewBox="0 0 625 200" className="w-full h-auto min-w-[520px]">
      {[0, 0.5, 1].map((ratio) => <line key={ratio} x1="50" x2="600" y1={24 + 132 * ratio} y2={24 + 132 * ratio} stroke="#334155" strokeDasharray="3 3" />)}
      {line && <path d={line} fill="none" stroke={color} strokeWidth="2.5" />}
      {mappedRaw.map((point, index) => <g key={`${point.date}-${point.value}-${index}`}><circle cx={point.x} cy={point.y} r="4" fill={uncertainDates.has(`${point.date}|${point.value}`) ? '#f43f5e' : color} stroke="#fff" strokeWidth="1" /><text x={point.x} y={point.y - 9} textAnchor="middle" fill="#f1f5f9" fontSize="10" fontFamily="monospace">{label(point.value)}{uncertainDates.has(`${point.date}|${point.value}`) ? ' ?' : ''}</text><text x={point.x} y="181" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">{point.date.slice(5)}</text></g>)}
      <text x="44" y="28" textAnchor="end" fill="#94a3b8" fontSize="9">{label(max)}</text><text x="44" y="156" textAnchor="end" fill="#94a3b8" fontSize="9">{label(min)}</text>
    </svg></div>;
  };

  const resetForm = () => { setEditingId(null); setValue(''); setNotes(''); setError(''); };
  const selectPart = (next: CircumferenceBodyPart) => {
    setBodyPart(next);
    if (!sideParts.includes(next)) { setSide(null); setVariant('standard'); }
    if (next === 'ramię') { setSide('left'); setVariant('flexed'); }
    if (next !== 'ramię' && sideParts.includes(next)) { setSide('left'); setVariant('standard'); }
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const millimeters = parseCircumferenceMillimeters(value);
    if (!millimeters) { setError('Podaj dodatni obwód w cm, maksymalnie z jednym miejscem po przecinku.'); return; }
    const entry = { date: date || getTodayDateString(), bodyPart, side: sideParts.includes(bodyPart) ? side : null, variant: bodyPart === 'ramię' ? variant : 'standard' as CircumferenceVariant, millimeters, notes: notes.trim() };
    if (editingId) onUpdate({ ...entry, id: editingId }); else onAdd(entry);
    setSelectedSeriesKey(seriesKey(entry));
    resetForm();
  };
  const edit = (entry: CircumferenceEntry) => { setEditingId(entry.id); setDate(entry.date); setBodyPart(entry.bodyPart); setSide(entry.side); setVariant(entry.variant); setValue(formatCm(entry.millimeters)); setNotes(entry.notes); setError(''); };

  return <section className="space-y-3.5" id="circumference-progress-panel">
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
      <div>
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Ruler className="w-4 h-4 text-sky-400" />
          <span>Obwody i progres</span>
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">Porównania dotyczą wyłącznie tej samej partii, strony i wariantu pomiaru.</p>
      </div>
      <span className="text-[10px] rounded-md px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-400 font-mono">Zapis w mm · prezentacja w cm</span>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5">
      <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2.5 text-xs">
        <h4 className="text-xs font-bold text-slate-200 flex gap-1.5 items-center">
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>{editingId ? 'Edytuj obwód' : 'Dodaj obwód'}</span>
        </h4>
        <label className="block text-slate-300 font-medium text-[11px]">
          Data
          <input id="input-circ-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="mt-0.5 w-full px-2.5 py-1 text-xs rounded-md bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500 font-mono" />
        </label>
        <label className="block text-slate-300 font-medium text-[11px]">
          Partia
          <select id="select-circ-body-part" value={bodyPart} onChange={(event) => selectPart(event.target.value as CircumferenceBodyPart)} className="mt-0.5 w-full px-2.5 py-1 text-xs rounded-md bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500">{CIRCUMFERENCE_BODY_PARTS.map((part) => <option key={part} value={part}>{bodyPartLabel[part]}</option>)}</select>
        </label>
        {sideParts.includes(bodyPart) && (
          <label className="block text-slate-300 font-medium text-[11px]">
            Strona
            <select id="select-circ-side" value={side || 'left'} onChange={(event) => setSide(event.target.value as Exclude<CircumferenceSide, null>)} className="mt-0.5 w-full px-2.5 py-1 text-xs rounded-md bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"><option value="left">Lewa</option><option value="right">Prawa</option></select>
          </label>
        )}
        {bodyPart === 'ramię' && (
          <label className="block text-slate-300 font-medium text-[11px]">
            Wariant
            <select id="select-circ-variant" value={variant} onChange={(event) => setVariant(event.target.value as CircumferenceVariant)} className="mt-0.5 w-full px-2.5 py-1 text-xs rounded-md bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"><option value="flexed">Napięte</option><option value="relaxed">Rozluźnione</option></select>
          </label>
        )}
        <label className="block text-slate-300 font-medium text-[11px]">
          Obwód (cm)
          <input id="input-circ-value" inputMode="decimal" required placeholder="np. 35,7" value={value} onChange={(event) => setValue(event.target.value)} className="mt-0.5 w-full px-2.5 py-1 text-xs rounded-md bg-slate-950 border border-slate-800 text-sky-300 font-mono font-bold focus:outline-none focus:border-sky-500" />
        </label>
        <label className="block text-slate-300 font-medium text-[11px]">
          Notatka
          <input id="input-circ-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcjonalnie..." className="mt-0.5 w-full px-2.5 py-1 text-xs rounded-md bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500" />
        </label>
        {error && <p className="text-rose-400 text-xs" role="alert">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button id="btn-submit-circumference" type="submit" className="flex-1 py-1 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs">{editingId ? 'Zapisz zmianę' : 'Zapisz obwód'}</button>
          {editingId && <button type="button" onClick={resetForm} className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs">Anuluj</button>}
        </div>
      </form>

      <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <LineChart className="w-3.5 h-3.5 text-sky-400" />
            <span>Progres obwodu</span>
          </h4>
          <div className="flex gap-1.5">
            <select id="select-circ-series" value={selectedSeriesKey} onChange={(event) => setSelectedSeriesKey(event.target.value)} className="px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200">{series.length === 0 ? <option value="">Brak serii pomiarów</option> : series.map((entry) => <option key={seriesKey(entry)} value={seriesKey(entry)}>{seriesLabel(entry)}</option>)}</select>
            <button id="btn-circ-trend-raw" type="button" onClick={() => setTrendMode('raw')} className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${trendMode === 'raw' ? 'bg-sky-500/20 text-sky-200 border border-sky-500/30' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}>Surowe</button>
            <button id="btn-circ-trend-ema" type="button" onClick={() => setTrendMode('ema')} className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${trendMode === 'ema' ? 'bg-sky-500/20 text-sky-200 border border-sky-500/30' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}>EMA 0,3</button>
          </div>
        </div>

        {latest && sinceFirst ? (
          <div id="circumference-series-summary" className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-slate-950/70 border border-slate-800/80 p-2.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Aktualny</span>
              <strong className="text-sky-300 font-mono text-sm font-bold">{formatCm(latest.millimeters)} cm</strong>
            </div>
            <div className="rounded-lg bg-slate-950/70 border border-slate-800/80 p-2.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Od pierwszego</span>
              <strong className="text-emerald-300 font-mono text-sm font-bold">{formatSigned(sinceFirst.centimeters, ' cm')} · {formatSigned(sinceFirst.percent, '%')}</strong>
            </div>
            <div className="rounded-lg bg-slate-950/70 border border-slate-800/80 p-2.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Od poprzedniego</span>
              <strong className="text-slate-200 font-mono text-sm font-bold">{sincePrevious ? `${formatSigned(sincePrevious.millimeters, ' mm')} · ${formatSigned(sincePrevious.centimeters, ' cm')}` : '--'}</strong>
            </div>
          </div>
        ) : (
          <div id="circumference-empty-series" className="h-16 flex items-center justify-center text-xs text-slate-500">Dodaj pomiary tej samej serii, aby zobaczyć porównanie.</div>
        )}

        {chart(circumferenceLinePoints, '#38bdf8', (item) => `${formatCm(item)} cm`, 'chart-circumference', 'Brak punktów obwodu dla wybranej serii.', selectedEntries.map((entry) => ({ date: entry.date, value: entry.millimeters })), new Set(circumferenceAnalysis.raw.filter((point) => point.uncertain).map((point) => `${point.entry.date}|${point.entry.millimeters}`)))}
        <div id="circumference-interpretation" className="rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-[10px] text-slate-400 space-y-0.5">
          <strong className="text-slate-200">Interpretacja orientacyjna:</strong> {interpretation}. <span>Trend obwodu: {circumferenceAnalysis.slopePerWeek === null ? 'potrzeba min. 3 pewnych dat' : `${formatSigned(circumferenceAnalysis.slopePerWeek, ' mm/tydz.')}`}; trend e1RM: {strengthSlope === null ? 'potrzeba min. 3 dat' : `${formatSigned(strengthSlope, ` ${unit}/tydz.`)}`}.</span>
          {circumferenceAnalysis.isConstant && <span className="block">Seria stała — Z-Score nie jest liczony.</span>}
          {circumferenceAnalysis.raw.some((point) => point.uncertain) && <span className="block text-rose-300">Punkty oznaczone „?” są niepewne: pozostają widoczne, ale są pomijane tylko w trendzie.</span>}
        </div>
      </div>
    </div>

    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="p-2.5 border-b border-slate-800 text-xs font-bold text-slate-200">Historia obwodów</div>
      <div className="max-h-56 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-950 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
            <tr>
              <th className="py-1.5 px-2.5">Data</th>
              <th className="py-1.5 px-2.5">Seria</th>
              <th className="py-1.5 px-2.5">Obwód</th>
              <th className="py-1.5 px-2.5">Notatka</th>
              <th className="py-1.5 px-2 text-right">Akcja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {[...entries].reverse().map((entry) => (
              <tr key={entry.id} data-circumference-id={entry.id} className="hover:bg-slate-800/30">
                <td className="py-1.5 px-2.5 font-mono text-[11px] text-slate-400">{entry.date}</td>
                <td className="py-1.5 px-2.5 font-medium">{seriesLabel(entry)}</td>
                <td className="py-1.5 px-2.5 font-mono font-bold text-sky-400">{formatCm(entry.millimeters)} cm</td>
                <td className="py-1.5 px-2.5 text-slate-400 text-[11px]">{entry.notes || '-'}</td>
                <td className="py-1.5 px-2 text-right">
                  <button id={`btn-edit-circumference-${entry.id}`} type="button" onClick={() => edit(entry)} className="p-1 text-slate-400 hover:text-sky-300" title="Edytuj"><Pencil className="w-3.5 h-3.5" /></button>
                  <button id={`btn-delete-circumference-${entry.id}`} type="button" onClick={() => onDelete(entry.id)} className="p-1 text-slate-400 hover:text-rose-400" title="Usuń"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
            <span>Szacowany 1RM wybranego ćwiczenia</span>
          </h4>
          <p className="text-[10px] text-slate-500">Ta sama oś dat co obwód, osobna jednostka {unit}; brakujące punkty nie są uzupełniane.</p>
        </div>
        <select id="select-circumference-exercise" value={selectedExercise} onChange={(event) => setSelectedExercise(event.target.value)} className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200">
          {exerciseHistory.length === 0 ? <option value="">Brak historii ćwiczeń</option> : exerciseHistory.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
        </select>
      </div>
      {rangeStart && <p className="text-[10px] text-slate-500 font-mono">Wspólny zakres dat: {rangeStart} — {rangeEnd}</p>}
      {chart(oneRmLinePoints.map((item) => ({ date: item.date, value: item.oneRm })), '#f59e0b', (item) => `${item.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} ${unit}`, 'chart-circumference-e1rm', 'Brak zapisanej historii dla wybranego ćwiczenia.', oneRmPoints.map((item) => ({ date: item.date, value: item.oneRm })))}
      <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-400">
        <span className="rounded-md bg-slate-950 border border-slate-800/80 px-2 py-0.5">Próg obwodu: {ANALYSIS_THRESHOLDS.circumferenceMillimetersPerWeek} mm/tydz.</span>
        <span className="rounded-md bg-slate-950 border border-slate-800/80 px-2 py-0.5">Próg siły: {ANALYSIS_THRESHOLDS.strengthKilogramsPerWeek} {unit}/tydz.</span>
        {bodyWeightContext && <span className="rounded-md bg-slate-950 border border-slate-800/80 px-2 py-0.5">Masa ciała: {formatSigned(bodyWeightContext.change, ` ${unit}`)} (ostatnio {bodyWeightContext.latest} {unit})</span>}
      </div>
      <p id="circumference-correlation" className="text-[10px] text-slate-500">{correlation.r === null ? `Korelacja: potrzeba min. 5 wspólnych dat (${correlation.count}).` : `Pearson r = ${correlation.r.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} dla ${correlation.count} wspólnych dat; korelacja nie oznacza przyczynowości.`}</p>
    </div>
  </section>;
};
