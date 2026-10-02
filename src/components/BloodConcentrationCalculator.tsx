import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Clock, 
  Layers, 
  Sliders, 
  Zap, 
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  GitMerge,
  Eye,
  EyeOff,
  Shield,
  HelpCircle,
  BarChart2,
  CalendarCheck
} from 'lucide-react';
import { ProtocolEntry } from '../types';
import { 
  PK_COMPOUNDS,
  PK_COMPOUND_LIST,
  PKCompound,
  StackFrequency,
  FREQUENCY_OPTIONS,
  StackItem,
  simulatePharmacokinetics,
  getEstrogenPathwayDescription,
  DoseEvent
} from '../utils/pharmacokinetics';

interface BloodConcentrationCalculatorProps {
  protocolEntries: ProtocolEntry[];
  theme?: 'dark' | 'light';
}

export const BloodConcentrationCalculator: React.FC<BloodConcentrationCalculatorProps> = ({
  protocolEntries = [],
  theme = 'dark'
}) => {
  // Widok wykresu: "days" (Długie estry - oś X w dniach) vs "hours" (Krótkie / oralne - oś X w godzinach)
  const [viewMode, setViewMode] = useState<'days' | 'hours'>('days');

  // Horyzont czasowy
  const [daysHorizon, setDaysHorizon] = useState<number>(56); // 8 tygodni domyślnie dla długich
  const [hoursHorizon, setHoursHorizon] = useState<number>(168); // 7 dni (168h) dla krótkich

  // Źródło danych: domyślnie "calendar" jeśli użytkownik ma wpisy w kalendarzu, w przeciwnym razie "theoretical"
  const [dataSource, setDataSource] = useState<'theoretical' | 'calendar'>(
    protocolEntries.length > 0 ? 'calendar' : 'theoretical'
  );

  // Aktywny stack substancji (wielo-składnikowy)
  const [stackItems, setStackItems] = useState<StackItem[]>([
    {
      id: 'stack-1',
      compoundKey: 'testEnanthate',
      dose: 250,
      frequency: '2x_week', // co 3.5 dnia
      enabled: true,
      color: '#10b981' // Emerald
    },
    {
      id: 'stack-2',
      compoundKey: 'methenoloneEnanthate',
      dose: 200,
      frequency: 'e3d', // Co 3 dni
      enabled: true,
      color: '#8b5cf6' // Purple
    }
  ]);

  // Hover na wykresie
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Metadane i mapowanie wpisów z kalendarza na zdarzenia PK
  const calendarMetadata = useMemo(() => {
    if (!protocolEntries || protocolEntries.length === 0) return null;

    // Sortuj wpisy według daty i godziny
    const sorted = [...protocolEntries].sort((a, b) => {
      const tA = new Date(`${a.date}T${a.time || '08:00'}`).getTime();
      const tB = new Date(`${b.date}T${b.time || '08:00'}`).getTime();
      return tA - tB;
    });

    if (sorted.length === 0) return null;
    const firstTimeMs = new Date(`${sorted[0].date}T${sorted[0].time || '08:00'}`).getTime();
    const nowMs = Date.now();
    const todayHours = (nowMs - firstTimeMs) / (1000 * 60 * 60);

    const events: (DoseEvent & { rawDate: string; rawSubstance: string; id: string })[] = [];
    const detectedKeys = new Set<string>();

    sorted.forEach((entry) => {
      const entryTimeMs = new Date(`${entry.date}T${entry.time || '08:00'}`).getTime();
      const elapsedHours = Math.max(0, (entryTimeMs - firstTimeMs) / (1000 * 60 * 60));

      const normSub = entry.substance.toLowerCase();
      let matchedKey: string | null = null;

      if (normSub.includes('propionat') || normSub.includes('prop')) matchedKey = 'testPropionate';
      else if (normSub.includes('cypionat') || normSub.includes('cyp')) matchedKey = 'testCypionate';
      else if (normSub.includes('undekanian') || normSub.includes('nebido')) matchedKey = 'testUndecanoate';
      else if (normSub.includes('enant') || normSub.includes('testosteron')) matchedKey = 'testEnanthate';
      else if (normSub.includes('primo') || normSub.includes('metenolon')) matchedKey = 'methenoloneEnanthate';
      else if (normSub.includes('anavar') || normSub.includes('oksandrolon') || normSub.includes('oxan')) matchedKey = 'oxandrolone';
      else if (normSub.includes('hcg') || normSub.includes('gonadotropina')) matchedKey = 'hcg';
      else if (normSub.includes('anastrozol') || normSub.includes('arimidex')) matchedKey = 'anastrozole';
      else if (normSub.includes('eksemestan') || normSub.includes('aromasin') || normSub.includes('symex')) matchedKey = 'exemestane';
      else if (normSub.includes('letrozol') || normSub.includes('femara')) matchedKey = 'letrozole';

      if (matchedKey) {
        detectedKeys.add(matchedKey);
        events.push({
          id: entry.id,
          compoundKey: matchedKey,
          dose: entry.dosage,
          timeHours: elapsedHours,
          rawDate: entry.date,
          rawSubstance: entry.substance
        });
      }
    });

    return {
      firstDate: sorted[0].date,
      lastDate: sorted[sorted.length - 1].date,
      totalEntries: sorted.length,
      todayHours,
      events,
      detectedKeys: Array.from(detectedKeys)
    };
  }, [protocolEntries]);

  // Efekt: jeśli tryb kalendarza jest aktywny, upewnij się że wykryte substancje są w stackItems
  React.useEffect(() => {
    if (dataSource === 'calendar' && calendarMetadata && calendarMetadata.detectedKeys.length > 0) {
      setStackItems((prev) => {
        const currentKeys = prev.map((item) => item.compoundKey);
        const newItems = [...prev];
        let hasChanges = false;

        calendarMetadata.detectedKeys.forEach((key) => {
          if (!currentKeys.includes(key)) {
            const cmp = PK_COMPOUNDS[key];
            if (cmp) {
              newItems.push({
                id: `cal-${key}`,
                compoundKey: key,
                dose: cmp.defaultDose,
                frequency: cmp.defaultFrequency,
                enabled: true,
                color: cmp.color
              });
              hasChanges = true;
            }
          }
        });

        return hasChanges ? newItems : prev;
      });
    }
  }, [dataSource, calendarMetadata]);

  // Uruchomienie symulacji farmakokinetycznej
  const simulation = useMemo(() => {
    const horizon = viewMode === 'days' ? daysHorizon : hoursHorizon;
    const events = dataSource === 'calendar' ? calendarMetadata?.events : undefined;
    return simulatePharmacokinetics(stackItems, viewMode, horizon, events);
  }, [stackItems, viewMode, daysHorizon, hoursHorizon, dataSource, calendarMetadata]);

  // Handlers do zarządzania stackiem
  const handleAddCompound = () => {
    if (stackItems.length >= 8) return;
    const existingKeys = stackItems.map((s) => s.compoundKey);
    const nextCompound = PK_COMPOUND_LIST.find((c) => !existingKeys.includes(c.id)) || PK_COMPOUND_LIST[0];

    const newItem: StackItem = {
      id: `stack-${Date.now()}`,
      compoundKey: nextCompound.id,
      dose: nextCompound.defaultDose,
      frequency: nextCompound.defaultFrequency,
      enabled: true,
      color: nextCompound.color
    };

    setStackItems([...stackItems, newItem]);
  };

  const handleRemoveCompound = (id: string) => {
    if (stackItems.length <= 1) return;
    setStackItems(stackItems.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<StackItem>) => {
    setStackItems(
      stackItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        if (updates.compoundKey && updates.compoundKey !== item.compoundKey) {
          const cmp = PK_COMPOUNDS[updates.compoundKey];
          if (cmp) {
            updated.dose = cmp.defaultDose;
            updated.frequency = cmp.defaultFrequency;
            updated.color = cmp.color;
          }
        }
        return updated;
      })
    );
  };

  const handleToggleEnable = (id: string) => {
    setStackItems(
      stackItems.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  // Presety stacków
  const applyPreset = (type: 'test_primo' | 'test_c_hcg' | 'short_cut' | 'test_ai') => {
    switch (type) {
      case 'test_primo':
        setStackItems([
          { id: 'p1', compoundKey: 'testEnanthate', dose: 250, frequency: '3x_week', enabled: true, color: '#10b981' },
          { id: 'p2', compoundKey: 'methenoloneEnanthate', dose: 200, frequency: '3x_week', enabled: true, color: '#8b5cf6' }
        ]);
        setViewMode('days');
        setDaysHorizon(56);
        break;
      case 'test_c_hcg':
        setStackItems([
          { id: 'p1', compoundKey: 'testCypionate', dose: 125, frequency: '2x_week', enabled: true, color: '#06b6d4' },
          { id: 'p2', compoundKey: 'hcg', dose: 250, frequency: '2x_week', enabled: true, color: '#eab308' }
        ]);
        setViewMode('days');
        setDaysHorizon(42);
        break;
      case 'short_cut':
        setStackItems([
          { id: 'p1', compoundKey: 'testPropionate', dose: 100, frequency: 'eod', enabled: true, color: '#f59e0b' },
          { id: 'p2', compoundKey: 'oxandrolone', dose: 30, frequency: 'ed', enabled: true, color: '#ec4899' }
        ]);
        setViewMode('hours');
        setHoursHorizon(168);
        break;
      case 'test_ai':
        setStackItems([
          { id: 'p1', compoundKey: 'testEnanthate', dose: 350, frequency: '2x_week', enabled: true, color: '#10b981' },
          { id: 'p2', compoundKey: 'exemestane', dose: 12.5, frequency: 'e3d', enabled: true, color: '#f97316' }
        ]);
        setViewMode('days');
        setDaysHorizon(56);
        break;
    }
  };

  // Generowanie ścieżek SVG dla wykresu (zmniejszona wysokość dla kompaktowości i czytelności)
  const chartWidth = 860;
  const chartHeight = 220;
  const padding = { top: 18, right: 24, bottom: 30, left: 48 };

  const usableWidth = chartWidth - padding.left - padding.right;
  const usableHeight = chartHeight - padding.top - padding.bottom;

  const pointsCount = simulation.points.length;
  const maxTime = simulation.points.length > 0 ? simulation.points[simulation.points.length - 1].timeHours : 1;

  // Funkcja mapująca punkt czasu (h) na współrzędną X na wykresie
  const getX = (timeHours: number) => {
    if (maxTime <= 0) return padding.left;
    return padding.left + (timeHours / maxTime) * usableWidth;
  };

  // Funkcja mapująca względną ekspozycję (0-100%) na współrzędną Y
  const getY = (levelPercent: number) => {
    const clamped = Math.max(0, Math.min(100, levelPercent));
    return padding.top + usableHeight - (clamped / 100) * usableHeight;
  };

  // Ścieżki SVG dla poszczególnych aktywnych substancji
  const pathsByCompound = useMemo(() => {
    const paths: Record<string, string> = {};

    simulation.activeCompounds.forEach((cmp) => {
      let d = '';
      simulation.points.forEach((pt, index) => {
        const x = getX(pt.timeHours);
        const y = getY(pt.relativeLevels[cmp.id] || 0);
        if (index === 0) {
          d += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
        } else {
          d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        }
      });
      paths[cmp.id] = d;
    });

    return paths;
  }, [simulation, maxTime, usableWidth, usableHeight]);

  const hoveredPoint = hoveredPointIndex !== null && simulation.points[hoveredPointIndex]
    ? simulation.points[hoveredPointIndex]
    : null;

  // Pozycja "Dzisiaj" w godzinach na osi X
  const isTodayVisible = dataSource === 'calendar' && 
    calendarMetadata && 
    calendarMetadata.todayHours >= 0 && 
    calendarMetadata.todayHours <= maxTime;

  return (
    <div className="space-y-4" id="blood-concentration-calculator">
      
      {/* GŁÓWNY WSKAŹNIK STANU: KTÓRY WYKRES JEST AKTUALNY WOBEC KALENDARZA */}
      {dataSource === 'calendar' ? (
        <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/60 rounded-2xl p-4 shadow-xl shadow-emerald-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-emerald-300 tracking-tight flex items-center gap-1.5">
                  <span>AKTYWNY WYKRES: RZECZYWISTE DAWKOWANIE Z TWOJEGO KALENDARZA</span>
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-extrabold border border-emerald-500/30">
                  REALNY STAN
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Wykres odzwierciedla <strong>{calendarMetadata?.totalEntries || 0}</strong> zaznaczonych iniekcji w Twoim kalendarzu ({calendarMetadata?.firstDate} → {calendarMetadata?.lastDate}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => setDataSource('theoretical')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              Przełącz na symulację teoretyczną
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-200 tracking-tight">
                  WYKRES: SYMULACJA TEORETYCZNA STACKU
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-bold border border-slate-700">
                  HARMONOGRAM PLANOWANY
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Prezentuje idealny, równomierny model laboratoryjny z konfiguratora poniżej.
              </p>
            </div>
          </div>

          {protocolEntries.length > 0 && (
            <button
              type="button"
              onClick={() => setDataSource('calendar')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer shrink-0"
            >
              <CalendarCheck className="w-4 h-4 text-emerald-200" />
              <span>Pokaż moje realne dawkowanie ({protocolEntries.length} iniekcji)</span>
            </button>
          )}
        </div>
      )}

      {/* PASEK KONTROLNY: TRYB OSI X, HORYZONT I PRZEŁĄCZNIK ŹRÓDŁA */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        
        {/* Widok w dniach vs w godzinach */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 mr-1">Oś X:</span>
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'days'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Długie estry (dni)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('hours')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'hours'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Krótkie / oralne (godziny)</span>
            </button>
          </div>
        </div>

        {/* Horyzont czasowy & Źródło danych */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Horyzont */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Horyzont:</span>
            {viewMode === 'days' ? (
              <select
                value={daysHorizon}
                onChange={(e) => setDaysHorizon(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-bold text-xs"
              >
                <option value={28}>4 tygodnie (28 dni)</option>
                <option value={56}>8 tygodni (56 dni)</option>
                <option value={84}>12 tygodni (84 dni)</option>
                <option value={112}>16 tygodni (112 dni)</option>
              </select>
            ) : (
              <select
                value={hoursHorizon}
                onChange={(e) => setHoursHorizon(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-bold text-xs"
              >
                <option value={48}>48 godzin (2 dni)</option>
                <option value={72}>72 godziny (3 dni)</option>
                <option value={168}>168 godzin (7 dni)</option>
                <option value={336}>336 godzin (14 dni)</option>
              </select>
            )}
          </div>

          {/* Źródło danych */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Dane:</span>
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setDataSource('calendar')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  dataSource === 'calendar'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Wczytaj daty i dawki zapisane w Kalendarzu iniekcji"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Z Kalendarza ({calendarMetadata?.totalEntries || protocolEntries.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDataSource('theoretical')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  dataSource === 'theoretical'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Kalkulator stacku
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* GŁÓWNY WYKRES FARMAKOKINETYCZNY (KOMPAKTOWY SVG) */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-extrabold text-white">
              Wykres Względnej Ekspozycji Modelowej (0–100% Własnego Piku)
            </h3>
            {dataSource === 'calendar' && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                Live Kalendarz
              </span>
            )}
          </div>

          {/* Legenda z przełącznikami widoczności */}
          <div className="flex flex-wrap items-center gap-1.5">
            {stackItems.map((item) => {
              const cmp = PK_COMPOUNDS[item.compoundKey];
              if (!cmp) return null;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleToggleEnable(item.id)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    item.enabled
                      ? 'bg-slate-950 border-slate-700 text-white shadow-xs'
                      : 'bg-slate-950/40 border-slate-850 text-slate-500 line-through'
                  }`}
                  style={{ borderLeftColor: item.color, borderLeftWidth: 3 }}
                >
                  {item.enabled ? <Eye className="w-2.5 h-2.5 text-slate-300" /> : <EyeOff className="w-2.5 h-2.5 text-slate-600" />}
                  <span>{cmp.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SVG Canvas (Kompaktowy) */}
        <div className="relative w-full overflow-x-auto bg-slate-950/90 rounded-xl p-2 border border-slate-850">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto select-none"
            style={{ minWidth: 600, maxHeight: 240 }}
            onMouseLeave={() => setHoveredPointIndex(null)}
          >
            {/* Siatka pozioma (0%, 25%, 50%, 75%, 100%) */}
            {[0, 25, 50, 75, 100].map((pct) => {
              const y = getY(pct);
              return (
                <g key={pct}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray={pct === 0 || pct === 100 ? 'none' : '3 3'}
                    strokeWidth={pct === 0 || pct === 100 ? 1.2 : 0.8}
                  />
                  <text
                    x={padding.left - 6}
                    y={y + 3}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {pct}%
                  </text>
                </g>
              );
            })}

            {/* Pionowe linie siatki czasowej */}
            {(() => {
              const ticks = 6;
              const step = maxTime / ticks;
              const gridLines = [];

              for (let i = 0; i <= ticks; i++) {
                const h = i * step;
                const x = getX(h);
                const dayVal = Math.round((h / 24) * 10) / 10;
                const label = viewMode === 'days' ? `D${dayVal}` : `${Math.round(h)}h`;

                gridLines.push(
                  <g key={i}>
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={padding.top + usableHeight}
                      stroke="#1e293b"
                      strokeDasharray="2 4"
                      strokeWidth={0.8}
                    />
                    <text
                      x={x}
                      y={padding.top + usableHeight + 14}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {label}
                    </text>
                  </g>
                );
              }
              return gridLines;
            })()}

            {/* Oznaczenie "DZISIAJ" (Stan aktualny z kalendarza) */}
            {isTodayVisible && calendarMetadata && (
              <g>
                <line
                  x1={getX(calendarMetadata.todayHours)}
                  y1={padding.top}
                  x2={getX(calendarMetadata.todayHours)}
                  y2={padding.top + usableHeight}
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />
                {/* Etykieta DZISIAJ */}
                <rect
                  x={getX(calendarMetadata.todayHours) - 24}
                  y={padding.top - 12}
                  width={48}
                  height={14}
                  rx={3}
                  fill="#10b981"
                />
                <text
                  x={getX(calendarMetadata.todayHours)}
                  y={padding.top - 2}
                  fill="#022c22"
                  fontSize="8.5"
                  fontWeight="900"
                  textAnchor="middle"
                >
                  DZISIAJ
                </text>
              </g>
            )}

            {/* Punkty iniekcji z kalendarza (Dose Events Pins) */}
            {dataSource === 'calendar' && calendarMetadata && calendarMetadata.events.map((ev, idx) => {
              if (ev.timeHours > maxTime) return null;
              const x = getX(ev.timeHours);
              const cmp = PK_COMPOUNDS[ev.compoundKey];
              const color = cmp?.color || '#38bdf8';

              return (
                <g key={`cal-event-${idx}`}>
                  <circle
                    cx={x}
                    cy={padding.top + usableHeight}
                    r={3.5}
                    fill={color}
                    stroke="#0f172a"
                    strokeWidth={1.5}
                  />
                  <line
                    x1={x}
                    y1={padding.top + usableHeight - 6}
                    x2={x}
                    y2={padding.top + usableHeight}
                    stroke={color}
                    strokeWidth={1}
                  />
                </g>
              );
            })}

            {/* Oznaczenia modelowej kumulacji (~4-5 t1/2) dla trybu teoretycznego */}
            {dataSource === 'theoretical' && simulation.activeCompounds.map((cmp) => {
              const steadyHours = 4.5 * cmp.halfLifeHours;
              if (steadyHours > maxTime) return null;
              const x = getX(steadyHours);

              return (
                <g key={`steady-${cmp.id}`} opacity={0.6}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + usableHeight}
                    stroke={cmp.color}
                    strokeDasharray="3 3"
                    strokeWidth={1.2}
                  />
                  <text
                    x={x + 2}
                    y={padding.top + 10}
                    fill={cmp.color}
                    fontSize="8"
                    fontWeight="bold"
                  >
                    ~4.5 t1/2: {cmp.name.split(' ')[0]}
                  </text>
                </g>
              );
            })}

            {/* Linie wykresu dla każdej aktywnej substancji */}
            {simulation.activeCompounds.map((cmp) => {
              const pathD = pathsByCompound[cmp.id];
              if (!pathD) return null;

              return (
                <g key={`curve-${cmp.id}`}>
                  {/* Poświata/cień */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={cmp.color}
                    strokeWidth={3}
                    strokeOpacity={0.15}
                  />
                  {/* Główna linia wykresu */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={cmp.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}

            {/* Wskaźnik interaktywny przy najechaniu myszką */}
            {hoveredPoint && (
              <g>
                <line
                  x1={getX(hoveredPoint.timeHours)}
                  y1={padding.top}
                  x2={getX(hoveredPoint.timeHours)}
                  y2={padding.top + usableHeight}
                  stroke="#38bdf8"
                  strokeWidth={1.2}
                  strokeDasharray="2 2"
                />
                {simulation.activeCompounds.map((cmp) => {
                  const val = hoveredPoint.relativeLevels[cmp.id] || 0;
                  return (
                    <circle
                      key={`hover-circle-${cmp.id}`}
                      cx={getX(hoveredPoint.timeHours)}
                      cy={getY(val)}
                      r={4}
                      fill={cmp.color}
                      stroke="#0f172a"
                      strokeWidth={1.5}
                    />
                  );
                })}
              </g>
            )}

            {/* Niewidoczne prostokąty do łapania hovera myszy */}
            {simulation.points.map((pt, index) => {
              const x = getX(pt.timeHours);
              const w = usableWidth / pointsCount;
              return (
                <rect
                  key={index}
                  x={x - w / 2}
                  y={padding.top}
                  width={w}
                  height={usableHeight}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredPointIndex(index)}
                />
              );
            })}
          </svg>

          {/* Tooltip ze szczegółami punktu czasu */}
          {hoveredPoint && (
            <div className="mt-2 p-2.5 bg-slate-900 border border-slate-700 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs shadow-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-bold text-white">{hoveredPoint.label}</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400 font-mono text-[11px]">{hoveredPoint.timeHours}h od startu</span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {simulation.activeCompounds.map((cmp) => (
                  <div key={cmp.id} className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cmp.color }} />
                    <span className="text-slate-300 font-semibold">{cmp.name}:</span>
                    <span className="font-bold text-white">{hoveredPoint.relativeLevels[cmp.id] || 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KONFIGURATOR SUBSTANCJI STACKU (ŁĄCZENIE SUBSTANCJI) */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-emerald-400" />
              <span>Konfigurator Stacku Substancji</span>
            </h3>
            <p className="text-xs text-slate-400">
              Wybierz substancje, dawki i częstotliwości (w tym <strong>co 3 dni</strong> oraz <strong>3 razy w tygodniu: Pn, Czw, Nd</strong>).
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddCompound}
            disabled={stackItems.length >= 8}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Dodaj substancję do stacku</span>
          </button>
        </div>

        {/* Lista pozycji w stacku */}
        <div className="space-y-3">
          {stackItems.map((item, index) => {
            const cmp = PK_COMPOUNDS[item.compoundKey] || PK_COMPOUND_LIST[0];

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  item.enabled
                    ? 'bg-slate-950 border-slate-800'
                    : 'bg-slate-950/40 border-slate-850 opacity-60'
                }`}
                style={{ borderLeftColor: item.color, borderLeftWidth: 4 }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  
                  {/* Wybór substancji z bazy */}
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Substancja #{index + 1}:
                    </label>
                    <select
                      value={item.compoundKey}
                      onChange={(e) => handleUpdateItem(item.id, { compoundKey: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-emerald-500 focus:outline-hidden"
                    >
                      {PK_COMPOUND_LIST.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.category}) – t1/2: {c.halfLifeDays}d
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dawka pojedyncza */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Dawka ({cmp.unit}):
                    </label>
                    <input
                      type="number"
                      min="1"
                      step={cmp.category === 'inhibitor aromatazy' ? '0.25' : '10'}
                      value={item.dose}
                      onChange={(e) => handleUpdateItem(item.id, { dose: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-emerald-500 focus:outline-hidden font-mono"
                    />
                  </div>

                  {/* Częstotliwość podawania */}
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Częstotliwość podania:
                    </label>
                    <select
                      value={item.frequency}
                      onChange={(e) => handleUpdateItem(item.id, { frequency: e.target.value as StackFrequency })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold focus:border-emerald-500 focus:outline-hidden"
                    >
                      {FREQUENCY_OPTIONS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label} – {f.sublabel}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Akcje / Usuń / Włącz */}
                  <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-1 sm:pt-4">
                    <button
                      type="button"
                      onClick={() => handleToggleEnable(item.id)}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
                      title={item.enabled ? 'Wyłącz linię z wykresu' : 'Włącz linię na wykresie'}
                    >
                      {item.enabled ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveCompound(item.id)}
                      disabled={stackItems.length <= 1}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-red-400 disabled:opacity-30 transition-colors cursor-pointer"
                      title="Usuń ze stacku"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Szybka stopka parametrów związku */}
                <div className="flex flex-wrap items-center gap-3 mt-2.5 pt-2 border-t border-slate-850 text-[11px] text-slate-400">
                  <span>
                    Typ: <strong className="text-slate-200">{cmp.category}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    t1/2: <strong className="text-slate-200">{cmp.halfLifeDays} dni</strong> ({cmp.halfLifeHours}h)
                  </span>
                  <span>•</span>
                  <span>
                    tMax: <strong className="text-slate-200">{cmp.tMaxHours ? `${cmp.tMaxHours[0]}–${cmp.tMaxHours[1]}h` : 'brak / depot'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Aromatyzacja: <strong className="text-slate-200">{cmp.aromatization}</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    Pewność danych:
                    <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                      cmp.confidence === 'wysoka'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : cmp.confidence === 'średnia'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {cmp.confidence}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* METRYKI STABILNOŚCI I SZCZEGÓŁOWA ANALIZA DLA KAŻDEJ SUBSTANCJI */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <span>Metryki Stabilności i Parametry Farmakokinetyczne (Osobno dla każdej substancji)</span>
          </h3>
          <span className="text-[11px] text-slate-500 italic">
            Niższa fluktuacja = wyłącznie równiejsza krzywa modelowa
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {simulation.activeCompounds.map((cmp) => {
            const metrics = simulation.metricsByCompound[cmp.id];
            if (!metrics) return null;

            return (
              <div
                key={cmp.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-md flex flex-col justify-between space-y-3"
                style={{ borderTopColor: cmp.color, borderTopWidth: 3 }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cmp.color }} />
                      <span>{cmp.name}</span>
                    </h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                      cmp.confidence === 'wysoka'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : cmp.confidence === 'średnia'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      Pewność: {cmp.confidence}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                    {cmp.description}
                  </p>

                  {/* Kafelki metryk matematycznych */}
                  <div className="grid grid-cols-4 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-center font-mono">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Peak</span>
                      <span className="text-xs font-bold text-white">{metrics.peak}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Trough</span>
                      <span className="text-xs font-bold text-slate-300">{metrics.trough}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">P/T Ratio</span>
                      <span className="text-xs font-bold text-sky-400">{metrics.peakToTrough}x</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Fluktuacja</span>
                      <span className="text-xs font-bold text-amber-400">{metrics.fluctuationPercent}%</span>
                    </div>
                  </div>
                </div>

                {/* Stopka z czasem kumulacji i uwagami */}
                <div className="space-y-1.5 pt-2 border-t border-slate-850 text-[11px] text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Stan stacjonarny (~4.5 t1/2):</span>
                    <strong className="text-slate-200">{metrics.timeToSteadyStateDays} dni ({metrics.timeToSteadyStateDays * 24}h)</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Aromatyzacja:</span>
                    <strong className="text-slate-200 capitalize">{cmp.aromatization}</strong>
                  </div>
                  {cmp.note && (
                    <div className="text-[10px] text-slate-500 italic pt-1">
                      Uwaga: {cmp.note}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DEDYKOWANY PANEL: LOGIKA ESTROGENOWA (TYLKO OPISOWA) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
          <Activity className="w-5 h-5" />
          <span>Logika Estrogenowa (Zależności Fizjologiczne — Wyłącznie Opisowe)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1">
            <span className="text-rose-300 font-bold block">1. Testosterony:</span>
            <p className="text-slate-300 text-[11px] font-mono">
              testosteron → enzym aromatazy → możliwy wzrost E2
            </p>
            <p className="text-[11px] text-slate-400 pt-1">
              Podlegają konwersji do estradiolu zależnie od indywidualnej ekspresji enzymu i poziomu tkanki tłuszczowej.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1">
            <span className="text-amber-300 font-bold block">2. Gonadotropina (HCG):</span>
            <p className="text-slate-300 text-[11px] font-mono">
              HCG → stymulacja jąder → wzrost T i E2
            </p>
            <p className="text-[11px] text-slate-400 pt-1">
              Wykres przedstawia ekspozycję HCG. HCG pobudza komórki Leydiga do produkcji testosteronu i aromatyzacji wewnątrzjądrowej.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1">
            <span className="text-purple-300 font-bold block">3. Anavar &amp; Primobolan:</span>
            <p className="text-slate-300 text-[11px] font-mono">
              pochodne DHT → brak aromatyzacji
            </p>
            <p className="text-[11px] text-slate-400 pt-1">
              Nie ulegają aromatyzacji. Nie należy jednak traktować ich jako inhibitorów aromatazy ani zakładać działania antyestrogenowego.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1">
            <span className="text-sky-300 font-bold block">4. Inhibitory aromatazy (AI):</span>
            <p className="text-slate-300 text-[11px] font-mono">
              AI → hamują enzym aromatazy
            </p>
            <p className="text-[11px] text-slate-400 pt-1">
              Anastrozol i Letrozol hamują enzym odwracalnie, a Eksemestan trwale (suicide). Krzywa leku nie jest krzywą E2.
            </p>
          </div>
        </div>

        <div className="bg-rose-950/20 border border-rose-900/40 p-3 rounded-xl text-xs text-rose-300 flex items-start gap-2">
          <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong>Ścisła zasada laboratoryjna:</strong> Wartości E2, ginekomastia czy libido <strong>NIE mogą być wyliczane z dawek leków</strong>. Wszelkie decyzje dotyczące gospodarki hormonalnej powinny bazować na <strong>rzeczywistych wynikach badań krwi</strong> wprowadzanych w Centrum Badań z podaniem daty, jednostki i metody pomiarowej.
          </div>
        </div>
      </div>
    </div>
  );
};
