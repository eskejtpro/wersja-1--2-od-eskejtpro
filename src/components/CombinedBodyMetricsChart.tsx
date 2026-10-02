import React, { useState, useMemo } from 'react';
import {
  BodyWeightEntry,
  BodyPartMeasurement,
  BodyPartType,
  BODY_PARTS
} from '../types';
import {
  BODY_PART_CONFIG,
  formatCm,
  formatSignedCm,
  sortBodyMeasurements,
  calculatePartProgressionStats
} from '../utils/bodyMeasurements';
import {
  Scale,
  Ruler,
  TrendingUp,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles
} from 'lucide-react';

export type ChartViewMode = 'correlation' | 'weight' | 'part' | 'all_parts';

interface CombinedBodyMetricsChartProps {
  bodyWeights: BodyWeightEntry[];
  bodyPartMeasurements: BodyPartMeasurement[];
  unit: 'kg' | 'lbs';
  selectedPart: BodyPartType;
  onSelectPart: (part: BodyPartType) => void;
}

export const CombinedBodyMetricsChart: React.FC<CombinedBodyMetricsChartProps> = ({
  bodyWeights,
  bodyPartMeasurements,
  unit,
  selectedPart,
  onSelectPart
}) => {
  const [mode, setMode] = useState<ChartViewMode>('correlation');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const activeConfig = BODY_PART_CONFIG[selectedPart];

  // Sort weights and measurements
  const sortedWeights = useMemo(() => {
    return [...bodyWeights].sort((a, b) => a.date.localeCompare(b.date));
  }, [bodyWeights]);

  const sortedParts = useMemo(() => {
    return sortBodyMeasurements(bodyPartMeasurements.filter((m) => m.part === selectedPart));
  }, [bodyPartMeasurements, selectedPart]);

  // Statistics for all parts
  const statsMap = useMemo(() => {
    const map: Record<BodyPartType, ReturnType<typeof calculatePartProgressionStats>> = {
      biceps: calculatePartProgressionStats(bodyPartMeasurements, 'biceps'),
      triceps: calculatePartProgressionStats(bodyPartMeasurements, 'triceps'),
      klata: calculatePartProgressionStats(bodyPartMeasurements, 'klata'),
      barki: calculatePartProgressionStats(bodyPartMeasurements, 'barki'),
      nogi: calculatePartProgressionStats(bodyPartMeasurements, 'nogi')
    };
    return map;
  }, [bodyPartMeasurements]);

  const activePartStats = statsMap[selectedPart];

  // Weight stats
  const weightValues = sortedWeights.map((w) => w.weight);
  const currentWeight = weightValues.length > 0 ? weightValues[weightValues.length - 1] : null;
  const firstWeight = weightValues.length > 0 ? weightValues[0] : null;
  const weightDelta = currentWeight && firstWeight ? Math.round((currentWeight - firstWeight) * 10) / 10 : 0;

  // Union of unique dates
  const timelineDates = useMemo(() => {
    const set = new Set<string>();
    if (mode === 'weight') {
      sortedWeights.forEach((w) => set.add(w.date));
    } else if (mode === 'part') {
      sortedParts.forEach((p) => set.add(p.date));
    } else if (mode === 'all_parts') {
      bodyPartMeasurements.forEach((m) => set.add(m.date));
    } else {
      // correlation mode: both weights and active part dates
      sortedWeights.forEach((w) => set.add(w.date));
      sortedParts.forEach((p) => set.add(p.date));
    }
    return Array.from(set).sort();
  }, [sortedWeights, sortedParts, bodyPartMeasurements, mode]);

  // Fast maps by date
  const weightsByDate = useMemo(() => {
    const map = new Map<string, number>();
    sortedWeights.forEach((w) => map.set(w.date, w.weight));
    return map;
  }, [sortedWeights]);

  const partsByDate = useMemo(() => {
    const map = new Map<string, number>();
    sortedParts.forEach((p) => map.set(p.date, p.value));
    return map;
  }, [sortedParts]);

  // SVG Chart Dimensions (Zmniejszone, kompaktowe wymiary)
  const chartW = 740;
  const chartH = 200;
  const pL = mode === 'correlation' ? 50 : 45;
  const pR = mode === 'correlation' ? 50 : 25;
  const pT = 25;
  const pB = 35;
  const innerW = chartW - pL - pR;
  const innerH = chartH - pT - pB;

  // Weight scale calculations
  const minW = weightValues.length > 0 ? Math.floor(Math.min(...weightValues) - 1) : 70;
  const maxW = weightValues.length > 0 ? Math.ceil(Math.max(...weightValues) + 1) : 90;
  const rangeW = maxW - minW || 1;

  // Selected part scale calculations
  const partValues = sortedParts.map((p) => p.value);
  const minP = partValues.length > 0 ? Math.floor(Math.min(...partValues) - 1) : 30;
  const maxP = partValues.length > 0 ? Math.ceil(Math.max(...partValues) + 1) : 45;
  const rangeP = maxP - minP || 1;

  // All parts min/max (for all_parts view)
  const allPartVals = bodyPartMeasurements.map((m) => m.value);
  const minAll = allPartVals.length > 0 ? Math.floor(Math.min(...allPartVals) - 2) : 25;
  const maxAll = allPartVals.length > 0 ? Math.ceil(Math.max(...allPartVals) + 2) : 130;
  const rangeAll = maxAll - minAll || 1;

  // Timeline points
  const timelinePoints = useMemo(() => {
    return timelineDates.map((date, idx) => {
      const x =
        timelineDates.length > 1
          ? pL + (idx / (timelineDates.length - 1)) * innerW
          : pL + innerW / 2;

      const weight = weightsByDate.get(date) ?? null;
      const partVal = partsByDate.get(date) ?? null;

      const yWeight =
        weight !== null ? pT + innerH - ((weight - minW) / rangeW) * innerH : null;

      const yPart =
        partVal !== null ? pT + innerH - ((partVal - minP) / rangeP) * innerH : null;

      return {
        date,
        idx,
        x,
        weight,
        yWeight,
        partVal,
        yPart
      };
    });
  }, [timelineDates, weightsByDate, partsByDate, pL, innerW, innerH, minW, rangeW, minP, rangeP]);

  // Build SVG path strings
  const weightPoints = timelinePoints.filter((p) => p.weight !== null && p.yWeight !== null);
  const weightLinePath = weightPoints.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.yWeight}` : `${acc} L ${pt.x},${pt.yWeight}`),
    ''
  );

  const partPoints = timelinePoints.filter((p) => p.partVal !== null && p.yPart !== null);
  const partLinePath = partPoints.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.yPart}` : `${acc} L ${pt.x},${pt.yPart}`),
    ''
  );

  // Correlation analysis insight
  const correlationInsight = useMemo(() => {
    if (activePartStats.currentValue === null || currentWeight === null) {
      return null;
    }
    const pChange = activePartStats.totalChange;
    const wChange = weightDelta;

    if (wChange > 0 && pChange > 0) {
      const ratio = Math.round((pChange / wChange) * 100) / 100;
      return {
        type: 'growth',
        text: `Czysta masa: +${pChange} cm (${activeConfig.label}) przy wzroście wagi o +${wChange} ${unit} (współczynnik: ${ratio} cm/${unit})`,
        color: 'text-emerald-400'
      };
    } else if (wChange < 0 && pChange >= 0) {
      return {
        type: 'recomp',
        text: `Rekompozycja: redukcja wagi o ${wChange} ${unit} przy zachowaniu/wzroście ${activeConfig.label} (${formatSignedCm(pChange)})`,
        color: 'text-cyan-400'
      };
    } else if (wChange < 0 && pChange < 0) {
      return {
        type: 'cut',
        text: `Redukcja: spadek wagi o ${wChange} ${unit} i obwodu ${activeConfig.label} o ${pChange} cm`,
        color: 'text-amber-400'
      };
    } else {
      return {
        type: 'stable',
        text: `Stabilizacja: ${activeConfig.label} ${formatCm(activePartStats.currentValue)} przy wadze ${currentWeight} ${unit}`,
        color: 'text-slate-300'
      };
    }
  }, [activePartStats, currentWeight, weightDelta, activeConfig, unit]);

  return (
    <div
      id="combined-body-metrics-chart-panel"
      className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3"
    >
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Activity className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-white">
              Zintegrowany Wykres Wagi i Wymiarów Mięśniowych
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Wspólna oś czasu: zobacz dokładną korelację między zmianą wagi ciała a rozwojem poszczególnych partii mięśni.
          </p>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="flex flex-wrap items-center gap-1 p-0.5 rounded-lg bg-slate-950/80 border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('correlation')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'correlation'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Korelacja</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('weight')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'weight'
                ? 'bg-slate-800 text-emerald-300 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-3 h-3 text-emerald-400" />
            <span>Tylko Waga</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('part')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'part'
                ? 'bg-slate-800 text-purple-300 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Ruler className="w-3 h-3 text-purple-400" />
            <span>Tylko {activeConfig.label}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('all_parts')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'all_parts'
                ? 'bg-slate-800 text-sky-300 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3 h-3 text-sky-400" />
            <span>Wszystkie Partie</span>
          </button>
        </div>
      </div>

      {/* 2. Part Selector Chips with live current cm and delta */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
          <Ruler className="w-3 h-3 text-emerald-400" />
          <span>Porównaj:</span>
        </span>
        {BODY_PARTS.map((part) => {
          const cfg = BODY_PART_CONFIG[part];
          const st = statsMap[part];
          const isSelected = selectedPart === part;

          return (
            <button
              key={part}
              type="button"
              onClick={() => onSelectPart(part)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-slate-800 border-emerald-500/60 text-white shadow-xs ring-1 ring-emerald-500/40 font-bold'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span className={isSelected ? 'text-emerald-300' : ''}>{cfg.label}</span>
              <span className="font-mono text-[10px] text-slate-300 font-bold">
                {st.currentValue !== null ? formatCm(st.currentValue) : '--'}
              </span>
              {st.totalChange !== 0 && (
                <span
                  className={`text-[9px] font-mono px-1 rounded ${
                    st.totalChange > 0
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {formatSignedCm(st.totalChange)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Correlation Insight Banner */}
      {mode === 'correlation' && correlationInsight && (
        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-semibold text-slate-300">Wniosek:</span>
            <span className={`font-mono text-[11px] font-bold ${correlationInsight.color}`}>
              {correlationInsight.text}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono hidden sm:block shrink-0">
            Waga: {currentWeight ? `${currentWeight} ${unit}` : '--'} ({weightDelta > 0 ? `+${weightDelta}` : weightDelta} {unit})
          </div>
        </div>
      )}

      {/* 4. The SVG Unified Chart Canvas */}
      <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3 overflow-x-auto">
        {timelineDates.length > 0 ? (
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="w-full h-auto select-none min-w-[500px]"
          >
            <defs>
              <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="partGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = pT + innerH - ratio * innerH;
              const wVal = Math.round((minW + ratio * rangeW) * 10) / 10;
              const pVal = Math.round((minP + ratio * rangeP) * 10) / 10;

              return (
                <g key={ratio}>
                  <line
                    x1={pL}
                    y1={y}
                    x2={chartW - pR}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  {/* Left Y-Axis: Weight (kg/lbs) */}
                  {(mode === 'correlation' || mode === 'weight') && (
                    <text
                      x={pL - 8}
                      y={y + 4}
                      fill="#10b981"
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {wVal}
                    </text>
                  )}
                  {/* Right Y-Axis: Body Part (cm) */}
                  {(mode === 'correlation' || mode === 'part') && (
                    <text
                      x={chartW - pR + 8}
                      y={y + 4}
                      fill="#a855f7"
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="start"
                    >
                      {pVal}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Left Axis Label */}
            {(mode === 'correlation' || mode === 'weight') && (
              <text
                x={pL}
                y={pT - 12}
                fill="#10b981"
                fontSize="10"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="start"
              >
                ⚖️ Waga [{unit}]
              </text>
            )}

            {/* Right Axis Label */}
            {(mode === 'correlation' || mode === 'part') && (
              <text
                x={chartW - pR}
                y={pT - 12}
                fill="#a855f7"
                fontSize="10"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="end"
              >
                📐 {activeConfig.label} [cm]
              </text>
            )}

            {/* Weight Line */}
            {(mode === 'correlation' || mode === 'weight') && weightPoints.length > 1 && (
              <path
                d={weightLinePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Body Part Line */}
            {(mode === 'correlation' || mode === 'part') && partPoints.length > 1 && (
              <path
                d={partLinePath}
                fill="none"
                stroke="#a855f7"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Multi-Part Lines for all_parts mode */}
            {mode === 'all_parts' &&
              BODY_PARTS.map((pKey) => {
                const cfg = BODY_PART_CONFIG[pKey];
                const pSorted = sortBodyMeasurements(
                  bodyPartMeasurements.filter((m) => m.part === pKey)
                );
                if (pSorted.length < 2) return null;

                const pts = pSorted.map((item) => {
                  const dateIdx = timelineDates.indexOf(item.date);
                  const x =
                    timelineDates.length > 1
                      ? pL + (dateIdx / (timelineDates.length - 1)) * innerW
                      : pL + innerW / 2;
                  const y = pT + innerH - ((item.value - minAll) / rangeAll) * innerH;
                  return { x, y };
                });

                const pathStr = pts.reduce(
                  (acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
                  ''
                );

                return (
                  <path
                    key={pKey}
                    d={pathStr}
                    fill="none"
                    stroke={cfg.stroke}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                );
              })}

            {/* Interactive Points on Timeline */}
            {timelinePoints.map((pt, idx) => {
              const isHovered = hoveredIdx === idx;

              return (
                <g
                  key={pt.date}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Vertical Guide Line */}
                  {isHovered && (
                    <line
                      x1={pt.x}
                      y1={pT}
                      x2={pt.x}
                      y2={pT + innerH}
                      stroke="#475569"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Weight Point Circle */}
                  {(mode === 'correlation' || mode === 'weight') && pt.weight !== null && pt.yWeight !== null && (
                    <g>
                      <circle
                        cx={pt.x}
                        cy={pt.yWeight}
                        r={isHovered ? 6 : 4}
                        fill="#020617"
                        stroke="#10b981"
                        strokeWidth="2"
                      />
                      <circle cx={pt.x} cy={pt.yWeight} r={isHovered ? 3 : 1.5} fill="#34d399" />
                    </g>
                  )}

                  {/* Part Point Diamond/Square */}
                  {(mode === 'correlation' || mode === 'part') && pt.partVal !== null && pt.yPart !== null && (
                    <g>
                      <circle
                        cx={pt.x}
                        cy={pt.yPart}
                        r={isHovered ? 6 : 4}
                        fill="#020617"
                        stroke="#a855f7"
                        strokeWidth="2"
                      />
                      <circle cx={pt.x} cy={pt.yPart} r={isHovered ? 3 : 1.5} fill="#c084fc" />
                    </g>
                  )}

                  {/* Date label on X axis */}
                  <text
                    x={pt.x}
                    y={pT + innerH + 18}
                    fill={isHovered ? '#38bdf8' : '#64748b'}
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                    fontWeight={isHovered ? 'bold' : 'normal'}
                  >
                    {pt.date.slice(5).replace('-', '.')}
                  </text>

                  {/* Hover Tooltip Box */}
                  {isHovered && (
                    <g>
                      <rect
                        x={Math.max(10, Math.min(chartW - 170, pt.x - 80))}
                        y={pT - 5}
                        width="160"
                        height="54"
                        rx="8"
                        fill="#020617"
                        stroke="#334155"
                        strokeWidth="1.2"
                        filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"
                      />
                      <text
                        x={Math.max(10, Math.min(chartW - 170, pt.x - 80)) + 80}
                        y={pT + 12}
                        fill="#94a3b8"
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        📅 {pt.date}
                      </text>
                      {pt.weight !== null ? (
                        <text
                          x={Math.max(10, Math.min(chartW - 170, pt.x - 80)) + 80}
                          y={pT + 27}
                          fill="#10b981"
                          fontSize="11"
                          fontFamily="monospace"
                          textAnchor="middle"
                          fontWeight="bold"
                        >
                          ⚖️ Waga: {pt.weight} {unit}
                        </text>
                      ) : (
                        <text
                          x={Math.max(10, Math.min(chartW - 170, pt.x - 80)) + 80}
                          y={pT + 27}
                          fill="#64748b"
                          fontSize="10"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          ⚖️ Brak wpisu wagi
                        </text>
                      )}
                      {pt.partVal !== null ? (
                        <text
                          x={Math.max(10, Math.min(chartW - 170, pt.x - 80)) + 80}
                          y={pT + 42}
                          fill="#c084fc"
                          fontSize="11"
                          fontFamily="monospace"
                          textAnchor="middle"
                          fontWeight="bold"
                        >
                          📐 {activeConfig.label}: {pt.partVal} cm
                        </text>
                      ) : (
                        <text
                          x={Math.max(10, Math.min(chartW - 170, pt.x - 80)) + 80}
                          y={pT + 42}
                          fill="#64748b"
                          fontSize="10"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          📐 Brak pomiaru partii
                        </text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        ) : (
          <div className="h-44 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Activity className="w-8 h-8 mb-2 opacity-40 text-emerald-400" />
            <p className="text-xs font-medium">Brak danych do wygenerowania połączonego wykresu</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Wprowadź co najmniej 1 pomiar wagi ciała i 1 pomiar partii mięśniowej.
            </p>
          </div>
        )}
      </div>

      {/* 5. Legend footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium text-emerald-400">
            <span className="w-3 h-1 rounded-full bg-emerald-400" />
            <span>Waga ciała ({unit})</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-purple-400">
            <span className="w-3 h-1 rounded-full bg-purple-400" />
            <span>{activeConfig.label} (cm)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Łącznie punktów na osi czasu: <span className="text-white font-bold">{timelineDates.length}</span>
        </div>
      </div>
    </div>
  );
};
