/**
 * PHARMACOKINETICS ENGINE (PK) & COMPOUND DATA
 * GymTracker Pro - Moduł farmakokinetyki i modelowania krzywych stężeń
 * 
 * Zasady:
 * 1. Każda substancja ma własną linię 0–100% własnego piku (nigdy nie sumuj różnych substancji ani mg).
 * 2. Model:
 *    - Przed tMax: płynne narastanie od 0 do dawki (narastanie liniowe / absorption phase)
 *    - Po tMax: spadek wykładniczy contribution = dose * 2 ** (-(hoursAfterPeak / halfLifeHours))
 *    - Brak tMax: contribution = dose * 2 ** (-(elapsedHours / halfLifeHours))
 * 3. Dla wielu podań: superpozycja wkładów tej samej substancji.
 * 4. Normalizacja: relativeExposure = (rawValue / maxValueInSelectedRange) * 100.
 * 5. Fluktuacja = ((peak - trough) / mean) * 100 (niższa fluktuacja = wyłącznie równiejsza krzywa modelowa).
 * 6. Logika estrogenowa wyłącznie opisowa. Brak automatycznych porad E2/PCT.
 */

export interface PKCompound {
  id: string;
  name: string;
  category: 'AAS' | 'AAS oral' | 'gonadotropina' | 'inhibitor aromatazy';
  halfLifeHours: number;
  halfLifeDays: number;
  tMaxHours: [number, number] | null;
  estrogenPath: 'direct' | 'indirect' | 'none' | 'inhibits';
  aromatization: 'bezpośrednia' | 'pośrednia' | 'brak' | 'hamuje';
  confidence: 'wysoka' | 'średnia' | 'niska';
  reversible?: boolean;
  unit: 'mg' | 'IU';
  description: string;
  note?: string;
  isOral: boolean;
  isDepot: boolean;
  defaultDose: number;
  defaultFrequency: StackFrequency;
  color: string;
}

export const PK_COMPOUNDS: Record<string, PKCompound> = {
  testPropionate: {
    id: 'testPropionate',
    name: 'Testosteron propionat',
    halfLifeHours: 19.2,
    halfLifeDays: 0.8,
    unit: 'mg',
    tMaxHours: [12, 24],
    category: 'AAS',
    estrogenPath: 'direct',
    aromatization: 'bezpośrednia',
    confidence: 'średnia',
    description: 'Krótki ester. Szybko narasta, szybko spada; największa zmienność ekspozycji.',
    isDepot: false,
    isOral: false,
    defaultDose: 100,
    defaultFrequency: 'eod',
    color: '#f59e0b' // Amber
  },
  testEnanthate: {
    id: 'testEnanthate',
    name: 'Testosteron enantat',
    halfLifeHours: 108,
    halfLifeDays: 4.5,
    unit: 'mg',
    tMaxHours: [24, 48],
    category: 'AAS',
    estrogenPath: 'direct',
    aromatization: 'bezpośrednia',
    confidence: 'średnia',
    description: 'Ester depot. Wolniejsze narastanie i spadek; pełna kumulacja modelowa po około 4–5 okresach półtrwania.',
    isDepot: true,
    isOral: false,
    defaultDose: 250,
    defaultFrequency: '2x_week',
    color: '#10b981' // Emerald
  },
  testCypionate: {
    id: 'testCypionate',
    name: 'Testosteron cypionat',
    halfLifeHours: 192,
    halfLifeDays: 8.0,
    unit: 'mg',
    tMaxHours: [48, 72],
    category: 'AAS',
    estrogenPath: 'direct',
    aromatization: 'bezpośrednia',
    confidence: 'średnia',
    description: 'Długi ester depot. Powolniejszy spadek niż enantat; parametr zależy od formulacji i nośnika.',
    isDepot: true,
    isOral: false,
    defaultDose: 200,
    defaultFrequency: 'e5d',
    color: '#06b6d4' // Cyan
  },
  testUndecanoate: {
    id: 'testUndecanoate',
    name: 'Testosteron undekanian',
    halfLifeHours: 504,
    halfLifeDays: 21.0,
    unit: 'mg',
    tMaxHours: null,
    category: 'AAS',
    estrogenPath: 'direct',
    aromatization: 'bezpośrednia',
    confidence: 'średnia',
    description: 'Bardzo długi ester. Parametry są silnie zależne od konkretnego produktu.',
    note: 'Parametr zależy od konkretnej formulacji.',
    isDepot: true,
    isOral: false,
    defaultDose: 1000,
    defaultFrequency: 'e14d',
    color: '#3b82f6' // Blue
  },
  methenoloneEnanthate: {
    id: 'methenoloneEnanthate',
    name: 'Metenolon enantat (Primobolan)',
    halfLifeHours: 252,
    halfLifeDays: 10.5,
    unit: 'mg',
    tMaxHours: [60, 84],
    category: 'AAS',
    estrogenPath: 'none',
    aromatization: 'brak',
    confidence: 'niska',
    description: 'Nie aromatyzuje. Nie wyliczaj automatycznie działania antyestrogenowego ani nie traktuj go jako inhibitora aromatazy.',
    note: 'Nie traktować jako inhibitora aromatazy.',
    isDepot: true,
    isOral: false,
    defaultDose: 200,
    defaultFrequency: 'e5d',
    color: '#8b5cf6' // Purple
  },
  oxandrolone: {
    id: 'oxandrolone',
    name: 'Oksandrolon (Anavar)',
    halfLifeHours: 9.8,
    halfLifeDays: 0.41,
    unit: 'mg',
    tMaxHours: [1, 2],
    category: 'AAS oral',
    estrogenPath: 'none',
    aromatization: 'brak',
    confidence: 'średnia',
    description: 'Doustny, krótki profil. Szybki pik i szybki spadek ekspozycji.',
    isDepot: false,
    isOral: true,
    defaultDose: 30,
    defaultFrequency: 'ed',
    color: '#ec4899' // Pink
  },
  hcg: {
    id: 'hcg',
    name: 'HCG',
    halfLifeHours: 33,
    halfLifeDays: 1.38,
    unit: 'IU',
    tMaxHours: null,
    category: 'gonadotropina',
    estrogenPath: 'indirect',
    aromatization: 'pośrednia',
    confidence: 'średnia',
    description: 'Wykres pokazuje ekspozycję HCG, nie wyliczony testosteron ani E2. HCG może pośrednio zwiększać produkcję testosteronu i estradiolu.',
    note: 'Wykres pokazuje HCG, nie wyliczone testosteron/E2.',
    isDepot: false,
    isOral: false,
    defaultDose: 500,
    defaultFrequency: '2x_week',
    color: '#eab308' // Yellow
  },
  anastrozole: {
    id: 'anastrozole',
    name: 'Anastrozol',
    halfLifeHours: 46,
    halfLifeDays: 2.0,
    unit: 'mg',
    tMaxHours: [1, 2],
    category: 'inhibitor aromatazy',
    estrogenPath: 'inhibits',
    aromatization: 'hamuje',
    confidence: 'wysoka',
    reversible: true,
    description: 'Odwracalnie hamuje aromatazę. Wykres leku nie jest wykresem E2.',
    isDepot: false,
    isOral: true,
    defaultDose: 0.5,
    defaultFrequency: 'eod',
    color: '#ef4444' // Red
  },
  exemestane: {
    id: 'exemestane',
    name: 'Eksemestan',
    halfLifeHours: 27,
    halfLifeDays: 1.0,
    unit: 'mg',
    tMaxHours: [1, 2],
    category: 'inhibitor aromatazy',
    estrogenPath: 'inhibits',
    aromatization: 'hamuje',
    confidence: 'wysoka',
    reversible: false,
    description: 'Nieodwracalny inhibitor aromatazy. Czas wpływu na enzym może być dłuższy niż obecność leku w osoczu.',
    note: 'Nieodwracalny wpływ na enzym trwa dłużej niż stężenie leku.',
    isDepot: false,
    isOral: true,
    defaultDose: 12.5,
    defaultFrequency: 'ed',
    color: '#f97316' // Orange
  },
  letrozole: {
    id: 'letrozole',
    name: 'Letrozol',
    halfLifeHours: 48,
    halfLifeDays: 2.0,
    unit: 'mg',
    tMaxHours: [1, 2],
    category: 'inhibitor aromatazy',
    estrogenPath: 'inhibits',
    aromatization: 'hamuje',
    confidence: 'wysoka',
    reversible: true,
    description: 'Silny, odwracalny inhibitor aromatazy. Nie generuj automatycznej wartości E2.',
    isDepot: false,
    isOral: true,
    defaultDose: 1.25,
    defaultFrequency: 'eod',
    color: '#14b8a6' // Teal
  }
};

export const PK_COMPOUND_LIST: PKCompound[] = Object.values(PK_COMPOUNDS);

// Częstotliwości podawania substancji w kalkulatorze
export type StackFrequency = 
  | 'ed'        // Codziennie (co 24h)
  | 'eod'       // Co 2 dni (co 48h)
  | 'e3d'       // Co 3 dni (co 72h) - DODANE NA PROŚBĘ UŻYTKOWNIKA
  | '3x_week'   // 3 razy w tygodniu: Pn, Czw, Nd - DODANE NA PROŚBĘ UŻYTKOWNIKA
  | '2x_week'   // 2 razy w tygodniu (co 3.5 dnia / 84h)
  | 'e4d'       // Co 4 dni (co 96h)
  | 'e5d'       // Co 5 dni (co 120h)
  | '1x_week'   // 1 raz w tygodniu (co 7 dni / 168h)
  | 'e10d'      // Co 10 dni (co 240h)
  | 'e14d';     // Co 14 dni (co 336h)

export interface FrequencyOption {
  id: StackFrequency;
  label: string;
  sublabel: string;
  intervalHours?: number;
}

export const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { id: 'ed', label: 'Codziennie (ED)', sublabel: 'Co 24 godziny', intervalHours: 24 },
  { id: 'eod', label: 'Co 2 dni (EOD)', sublabel: 'Co 48 godzin', intervalHours: 48 },
  { id: 'e3d', label: 'Co 3 dni (E3D)', sublabel: 'Co 72 godziny (np. D1, D4, D7...)', intervalHours: 72 },
  { id: '3x_week', label: '3 razy w tygodniu (Pn, Czw, Nd)', sublabel: 'Harmonogram 7-dniowy: Poniedziałek, Czwartek, Niedziela' },
  { id: '2x_week', label: '2 razy w tygodniu (np. Pn / Czw)', sublabel: 'Co 3.5 dnia (co 84h)', intervalHours: 84 },
  { id: 'e4d', label: 'Co 4 dni', sublabel: 'Co 96 godzin', intervalHours: 96 },
  { id: 'e5d', label: 'Co 5 dni', sublabel: 'Co 120 godzin', intervalHours: 120 },
  { id: '1x_week', label: '1 raz w tygodniu (E7D)', sublabel: 'Co 7 dni (co 168h)', intervalHours: 168 },
  { id: 'e10d', label: 'Co 10 dni', sublabel: 'Co 240 godzin', intervalHours: 240 },
  { id: 'e14d', label: 'Co 14 dni (co 2 tyg.)', sublabel: 'Co 336 godzin', intervalHours: 336 },
];

export interface StackItem {
  id: string;
  compoundKey: string;
  dose: number;
  frequency: StackFrequency;
  enabled: boolean;
  color: string;
}

export interface DoseEvent {
  compoundKey: string;
  dose: number;
  timeHours: number;
}

/**
 * Oblicza wkład pojedynczej dawki w chwili czasu elapsedHours od podania.
 * Model matematyczny:
 * - Przed tMax: płynne narastanie od 0 do dawki (contribution = dose * (elapsedHours / tMax))
 * - Po tMax: contribution = dose * 2 ** (-(hoursAfterPeak / halfLifeHours))
 * - Bez tMax: contribution = dose * 2 ** (-(elapsedHours / halfLifeHours))
 */
export function calculateDoseContribution(
  dose: number,
  elapsedHours: number,
  halfLifeHours: number,
  tMaxHours: [number, number] | null
): number {
  if (elapsedHours < 0) return 0;

  if (tMaxHours && tMaxHours.length === 2) {
    const tMax = (tMaxHours[0] + tMaxHours[1]) / 2;
    if (elapsedHours < tMax) {
      return dose * (elapsedHours / Math.max(0.1, tMax));
    } else {
      const hoursAfterPeak = elapsedHours - tMax;
      return dose * Math.pow(2, -(hoursAfterPeak / halfLifeHours));
    }
  } else {
    return dose * Math.pow(2, -(elapsedHours / halfLifeHours));
  }
}

/**
 * Generuje harmonogram podania dawek w godzinach dla danej częstotliwości i horyzontu.
 */
export function generateAdministrationHours(
  frequency: StackFrequency,
  totalHours: number
): number[] {
  const hours: number[] = [];

  if (frequency === '3x_week') {
    // Harmonogram 3 razy w tygodniu: Pn (0h), Czw (72h), Nd (144h) w powtarzającym się oknie 168h
    let weekStart = 0;
    while (weekStart < totalHours) {
      if (weekStart + 0 <= totalHours) hours.push(weekStart + 0);
      if (weekStart + 72 <= totalHours) hours.push(weekStart + 72);
      if (weekStart + 144 <= totalHours) hours.push(weekStart + 144);
      weekStart += 168;
    }
    return hours;
  }

  const opt = FREQUENCY_OPTIONS.find((f) => f.id === frequency);
  const interval = opt?.intervalHours || 24;

  for (let h = 0; h <= totalHours; h += interval) {
    hours.push(h);
  }
  return hours;
}

export interface SimulationPoint {
  timeHours: number;
  timeDays: number;
  label: string;
  // Względna ekspozycja modelowa [% własnego piku] dla każdej substancji (osobna skala 0-100%!)
  relativeLevels: Record<string, number>;
  // Surowe wartości modelowe w dawkach
  rawLevels: Record<string, number>;
  isDoseEvent: Record<string, boolean>;
}

export interface CompoundMetrics {
  compoundKey: string;
  compound: PKCompound;
  peak: number; // 100% własnego piku
  trough: number; // % minimalny w fazie zbliżonej do stacjonarnej
  mean: number; // % średni w fazie zbliżonej do stacjonarnej
  peakToTrough: number; // Stosunek peak / trough
  fluctuationPercent: number; // ((peak - trough) / mean) * 100
  timeToSteadyStateDays: number; // ~4-5 * halfLifeDays
  isSteadyStateReached: boolean;
  color: string;
}

export interface SimulationResult {
  points: SimulationPoint[];
  metricsByCompound: Record<string, CompoundMetrics>;
  activeCompounds: PKCompound[];
  viewMode: 'days' | 'hours';
  totalDurationDays: number;
  totalDurationHours: number;
}

/**
 * Główna funkcja symulacji farmakokinetyki:
 * - Superpozycja dla dawek tej samej substancji
 * - Każda substancja ma OSOBNĄ linię 0-100% własnego piku
 * - Nigdy nie sumuje różnych substancji ani mg
 */
export function simulatePharmacokinetics(
  stackItems: StackItem[],
  viewMode: 'days' | 'hours',
  customHorizon?: number,
  calendarEvents?: DoseEvent[]
): SimulationResult {
  const isDaysView = viewMode === 'days';
  
  // Domyślny horyzont: 56 dni (długie estry) lub 168 godzin / 7 dni (krótkie/oralne)
  const totalDurationDays = isDaysView ? (customHorizon || 56) : ((customHorizon || 168) / 24);
  const totalDurationHours = totalDurationDays * 24;

  // Krok czasowy: dla widoku dniowego co 4h (dokładność i płynność), dla godzinowego co 0.5h
  const stepHours = isDaysView ? 4 : 0.5;

  const enabledItems = stackItems.filter((item) => item.enabled && PK_COMPOUNDS[item.compoundKey]);
  const activeCompounds = enabledItems.map((item) => PK_COMPOUNDS[item.compoundKey]);

  // Przygotuj listę zdarzeń podania dawek dla każdego związku
  const doseEventsByCompound: Record<string, DoseEvent[]> = {};

  for (const item of enabledItems) {
    const cmp = PK_COMPOUNDS[item.compoundKey];
    if (!cmp) continue;

    if (calendarEvents && calendarEvents.length > 0) {
      // Użyj zdarzeń z kalendarza dla tego związku
      doseEventsByCompound[item.compoundKey] = calendarEvents.filter(
        (ev) => ev.compoundKey === item.compoundKey && ev.timeHours <= totalDurationHours
      );
    } else {
      // Wygeneruj automatyczny harmonogram ze stacku
      const adminHours = generateAdministrationHours(item.frequency, totalDurationHours);
      doseEventsByCompound[item.compoundKey] = adminHours.map((h) => ({
        compoundKey: item.compoundKey,
        dose: item.dose,
        timeHours: h
      }));
    }
  }

  // Oblicz surowe wartości stężeń (superpozycja dawek tej samej substancji)
  const rawPoints: { timeHours: number; rawByCompound: Record<string, number>; isDoseByCompound: Record<string, boolean> }[] = [];
  const maxRawByCompound: Record<string, number> = {};

  for (const item of enabledItems) {
    maxRawByCompound[item.compoundKey] = 0;
  }

  for (let h = 0; h <= totalDurationHours; h += stepHours) {
    const rawByCompound: Record<string, number> = {};
    const isDoseByCompound: Record<string, boolean> = {};

    for (const item of enabledItems) {
      const cmp = PK_COMPOUNDS[item.compoundKey];
      const events = doseEventsByCompound[item.compoundKey] || [];
      
      let sum = 0;
      let hasDoseAtThisHour = false;

      for (const ev of events) {
        if (h >= ev.timeHours) {
          sum += calculateDoseContribution(ev.dose, h - ev.timeHours, cmp.halfLifeHours, cmp.tMaxHours);
        }
        if (Math.abs(h - ev.timeHours) < stepHours / 2) {
          hasDoseAtThisHour = true;
        }
      }

      rawByCompound[item.compoundKey] = sum;
      isDoseByCompound[item.compoundKey] = hasDoseAtThisHour;

      if (sum > (maxRawByCompound[item.compoundKey] || 0)) {
        maxRawByCompound[item.compoundKey] = sum;
      }
    }

    rawPoints.push({
      timeHours: h,
      rawByCompound,
      isDoseByCompound
    });
  }

  // Znormalizuj do 0–100% własnego piku dla każdej substancji
  const points: SimulationPoint[] = rawPoints.map((pt) => {
    const relativeLevels: Record<string, number> = {};

    for (const item of enabledItems) {
      const max = maxRawByCompound[item.compoundKey] || 1;
      const raw = pt.rawByCompound[item.compoundKey] || 0;
      relativeLevels[item.compoundKey] = max > 0 ? Math.round((raw / max) * 1000) / 10 : 0;
    }

    const timeDays = Math.round((pt.timeHours / 24) * 10) / 10;
    const label = isDaysView ? `Dzień ${timeDays}` : `${pt.timeHours}h (${timeDays}d)`;

    return {
      timeHours: pt.timeHours,
      timeDays,
      label,
      relativeLevels,
      rawLevels: pt.rawByCompound,
      isDoseEvent: pt.isDoseByCompound
    };
  });

  // Oblicz metryki stabilności osobno dla każdej substancji
  const metricsByCompound: Record<string, CompoundMetrics> = {};

  for (const item of enabledItems) {
    const cmp = PK_COMPOUNDS[item.compoundKey];
    const timeToSteadyStateHours = 4.5 * cmp.halfLifeHours;
    const timeToSteadyStateDays = Math.round((4.5 * cmp.halfLifeDays) * 10) / 10;
    const isSteadyStateReached = totalDurationHours >= timeToSteadyStateHours;

    // Faza stacjonarna: bierzemy punkty od osiągnięcia ~4 okresów półtrwania, lub drugą połowę zakresu
    const steadyPoints = points.filter((p) => 
      isSteadyStateReached ? p.timeHours >= timeToSteadyStateHours * 0.8 : p.timeHours >= totalDurationHours * 0.4
    );

    const levels = (steadyPoints.length > 0 ? steadyPoints : points).map((p) => p.relativeLevels[item.compoundKey] || 0);

    const peak = levels.length > 0 ? Math.max(...levels) : 100;
    const trough = levels.length > 0 ? Math.min(...levels) : 50;
    const mean = levels.length > 0 ? levels.reduce((a, b) => a + b, 0) / levels.length : 75;

    const peakToTrough = trough > 0 ? Math.round((peak / trough) * 100) / 100 : 1;
    const fluctuationPercent = mean > 0 ? Math.round(((peak - trough) / mean) * 100) : 0;

    metricsByCompound[item.compoundKey] = {
      compoundKey: item.compoundKey,
      compound: cmp,
      peak,
      trough: Math.round(trough * 10) / 10,
      mean: Math.round(mean * 10) / 10,
      peakToTrough,
      fluctuationPercent,
      timeToSteadyStateDays,
      isSteadyStateReached,
      color: item.color || cmp.color
    };
  }

  return {
    points,
    metricsByCompound,
    activeCompounds,
    viewMode,
    totalDurationDays,
    totalDurationHours
  };
}

/**
 * Mapowanie opisu ścieżki estrogenowej dla danego związku
 */
export function getEstrogenPathwayDescription(compound: PKCompound): {
  pathway: string;
  details: string;
  type: 'aromatizes' | 'indirect' | 'none' | 'inhibitor';
} {
  switch (compound.estrogenPath) {
    case 'direct':
      return {
        pathway: `${compound.name} → aromataza → możliwy wzrost E2`,
        details: 'Podlega bezpośredniej aromatyzacji do estradiolu (E2). Stopień konwersji zależy od indywidualnej aktywności aromatazy i tkanki tłuszczowej.',
        type: 'aromatizes'
      };
    case 'indirect':
      return {
        pathway: 'HCG → stymulacja komórek Leydiga → możliwy wzrost testosteronu i E2',
        details: 'HCG stymuluje gonady do endogennej produkcji testosteronu oraz wewnątrzjądrowej aromatyzacji do E2. Nie jest to syntetyczny steryd.',
        type: 'indirect'
      };
    case 'none':
      return {
        pathway: `${compound.name} → nie aromatyzuje`,
        details: 'Związek nie podlega konwersji do estrogenów przez aromatazę. Nie należy jednak przypisywać mu automatycznego działania antyestrogenowego ani mylić z inhibitorem.',
        type: 'none'
      };
    case 'inhibits':
      return {
        pathway: `${compound.name} → hamuje enzym aromatazy`,
        details: compound.reversible === false
          ? 'Nieodwracalny samobójczy inhibitor aromatazy (suicide inhibitor). Czas wyłączenia enzymu trwa dłużej niż obecność leku w osoczu.'
          : 'Odwracalny inhibitor aromatazy. Blokuje enzym w sposób zależny od aktualnego stężenia we krwi.',
        type: 'inhibitor'
      };
  }
}
