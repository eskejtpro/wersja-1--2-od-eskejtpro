import { GymData, QuickAccessWidgetConfig, QuickAccessWidgetId } from '../types';
import { DEFAULT_CATALOG_EXERCISES } from './defaultCatalogExercises';

export interface CatalogWidgetDefinition {
  widgetType: QuickAccessWidgetId;
  defaultTitle: string;
  category: 'trening' | 'narzedzia' | 'kondycja' | 'zdrowie';
  defaultSize: 'full' | 'half' | 'compact';
  description: string;
  iconName: string;
}

export const AVAILABLE_WIDGET_CATALOG: CatalogWidgetDefinition[] = [
  {
    widgetType: 'active_workout',
    defaultTitle: 'Dzisiejszy Trening',
    category: 'trening',
    defaultSize: 'full',
    description: 'Podgląd aktualnego dnia treningowego, postęp serii, tonaż i szybkie przejście do ćwiczeń.',
    iconName: 'Dumbbell'
  },
  {
    widgetType: 'timer_quick',
    defaultTitle: 'Szybki Stoper Treningowy',
    category: 'trening',
    defaultSize: 'half',
    description: 'Stoper przerw między seriami z czasem reakcji, dźwiękiem i wibracją.',
    iconName: 'Clock'
  },
  {
    widgetType: 'one_rm_calc',
    defaultTitle: 'Kalkulator 1RM & Procenty',
    category: 'trening',
    defaultSize: 'half',
    description: 'Wyliczanie rekordu 1RM (Brzycki/Epley) oraz rozkładu intensywności (70%, 80%, 90%).',
    iconName: 'Calculator'
  },
  {
    widgetType: 'plate_calc_widget',
    defaultTitle: 'Kalkulator Talerzy na Gryf',
    category: 'narzedzia',
    defaultSize: 'half',
    description: 'Błyskawiczne obliczanie talerzy (25, 20, 15, 10, 5, 2.5, 1.25 kg) na stronę gryfu.',
    iconName: 'Sliders'
  },
  {
    widgetType: 'pr_tracker',
    defaultTitle: 'Najnowsze Rekordy 1RM',
    category: 'trening',
    defaultSize: 'half',
    description: 'Zestawienie najwyższych wyliczonych maksów w Twoim bieżącym planie treningowym.',
    iconName: 'Trophy'
  },
  {
    widgetType: 'muscle_volume_radar',
    defaultTitle: 'Balans Objętości Tygodnia',
    category: 'trening',
    defaultSize: 'half',
    description: 'Rozkład serii roboczych na klatkę, plecy, nogi, barki i ramiona.',
    iconName: 'Activity'
  },
  {
    widgetType: 'tabata_interval',
    defaultTitle: 'Stoper Interwałów & Tabata',
    category: 'trening',
    defaultSize: 'half',
    description: 'Rundy pracy i odpoczynku (np. 20s pracy / 10s przerwy) dla kondycji i brzucha.',
    iconName: 'Zap'
  },
  {
    widgetType: 'ai_coach_mini',
    defaultTitle: 'Trener AI Gemini 3.8 Pro',
    category: 'narzedzia',
    defaultSize: 'full',
    description: 'Inteligentny asystent treningowy zasilany Gemini 3.8 Pro – szybkie porady, periodyzacja i RPE.',
    iconName: 'Sparkles'
  },
  {
    widgetType: 'weight_trend',
    defaultTitle: 'Masa Ciała & Filtr EMA',
    category: 'kondycja',
    defaultSize: 'half',
    description: 'Dziennik wagi z filtrem wygładzającym EMA i szybkim dodawaniem porannego pomiaru.',
    iconName: 'Scale'
  },
  {
    widgetType: 'water_hydration',
    defaultTitle: 'Licznik Nawodnienia (H₂O)',
    category: 'kondycja',
    defaultSize: 'half',
    description: 'Szybkie dodawanie porcji wody (+250ml) i monitorowanie dziennego celu nawodnienia.',
    iconName: 'Droplet'
  },
  {
    widgetType: 'macro_calories',
    defaultTitle: 'Tracker Kalorii & Białka',
    category: 'kondycja',
    defaultSize: 'half',
    description: 'Podręczny licznik kalorii (kcal) oraz białka (g) na dzisiejszy dzień.',
    iconName: 'Flame'
  },
  {
    widgetType: 'quick_notes',
    defaultTitle: 'Szybki Notatnik Treningowy',
    category: 'narzedzia',
    defaultSize: 'full',
    description: 'Podręczne notatki z siłowni, uwagi do techniki i sprzętu.',
    iconName: 'FileText'
  },
  {
    widgetType: 'pharmacokinetics_summary',
    defaultTitle: 'Kalendarz Iniekcji & Środków',
    category: 'zdrowie',
    defaultSize: 'half',
    description: 'Przypomnienia o planowanych iniekcjach, suplementach i stężeniach substancji.',
    iconName: 'Syringe'
  },
  {
    widgetType: 'blood_test_alerts',
    defaultTitle: 'Monitor Badań Laboratoryjnych',
    category: 'zdrowie',
    defaultSize: 'half',
    description: 'Kluczowe wskaźniki zdrowotne, lipidogram, próby wątrobowe i morfologia.',
    iconName: 'CheckCircle2'
  }
];

export interface AiPresetLayout {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  description: string;
  widgets: QuickAccessWidgetConfig[];
}

export const GEMINI_AI_PRESET_LAYOUTS: AiPresetLayout[] = [
  {
    id: 'powerlifting',
    name: 'Trójbój & Maksymalna Siła',
    subtitle: 'Rekomendacja Gemini 3.8 Pro',
    icon: '🏋️‍♂️',
    description: 'Konfiguracja zoptymalizowana pod ciężkie boje, długie przerwy, kalkulację obciążenia i 1RM.',
    widgets: [
      { id: 'w-workout', widgetType: 'active_workout', title: 'Dzisiejszy Trening Siłowy', enabled: true, order: 1, size: 'full' },
      { id: 'w-timer', widgetType: 'timer_quick', title: 'Stoper Długich Przerw (3-5 min)', enabled: true, order: 2, size: 'half' },
      { id: 'w-plates', widgetType: 'plate_calc_widget', title: 'Talerze na Sztangę (20kg)', enabled: true, order: 3, size: 'half' },
      { id: 'w-onerm', widgetType: 'one_rm_calc', title: 'Kalkulator 1RM & Procenty', enabled: true, order: 4, size: 'half' },
      { id: 'w-pr', widgetType: 'pr_tracker', title: 'Rekordy Siłowe 1RM', enabled: true, order: 5, size: 'half' },
      { id: 'w-ai-coach', widgetType: 'ai_coach_mini', title: 'Trener AI Gemini 3.8 Pro', enabled: true, order: 6, size: 'full' },
      { id: 'w-notes', widgetType: 'quick_notes', title: 'Notatki Techniczne & Pas', enabled: true, order: 7, size: 'full' }
    ]
  },
  {
    id: 'hypertrophy',
    name: 'Kulturystyka & Hipertrofia',
    subtitle: 'Rekomendacja Gemini 3.8 Pro',
    icon: '🔱',
    description: 'Zbalansowany zestaw pod objętość partii mięśniowych, regenerację i nawodnienie.',
    widgets: [
      { id: 'w-workout', widgetType: 'active_workout', title: 'Dzisiejszy Trening Hipertroficzny', enabled: true, order: 1, size: 'full' },
      { id: 'w-radar', widgetType: 'muscle_volume_radar', title: 'Objętość Partii (Serie)', enabled: true, order: 2, size: 'half' },
      { id: 'w-timer', widgetType: 'timer_quick', title: 'Stoper Przerw (60-90s)', enabled: true, order: 3, size: 'half' },
      { id: 'w-macro', widgetType: 'macro_calories', title: 'Makroskładniki & Posiłki', enabled: true, order: 4, size: 'half' },
      { id: 'w-water', widgetType: 'water_hydration', title: 'Nawodnienie Mięśni', enabled: true, order: 5, size: 'half' },
      { id: 'w-ai-coach', widgetType: 'ai_coach_mini', title: 'Konsultacja Gemini 3.8 Pro', enabled: true, order: 6, size: 'full' },
      { id: 'w-weight', widgetType: 'weight_trend', title: 'Masa Ciała & Filtr EMA', enabled: true, order: 7, size: 'half' }
    ]
  },
  {
    id: 'fat_loss',
    name: 'Redukcja & Deficyt Kaloryczny',
    subtitle: 'Rekomendacja Gemini 3.8 Pro',
    icon: '🔥',
    description: 'Nacisk na kontrolę wagi EMA, deficyt kaloryczny, nawodnienie i interwały.',
    widgets: [
      { id: 'w-weight', widgetType: 'weight_trend', title: 'Masa Ciała & Trend EMA', enabled: true, order: 1, size: 'full' },
      { id: 'w-macro', widgetType: 'macro_calories', title: 'Licznik Kalorii & Białka', enabled: true, order: 2, size: 'half' },
      { id: 'w-water', widgetType: 'water_hydration', title: 'Nawodnienie H₂O', enabled: true, order: 3, size: 'half' },
      { id: 'w-tabata', widgetType: 'tabata_interval', title: 'Stoper Interwałów HIIT', enabled: true, order: 4, size: 'half' },
      { id: 'w-workout', widgetType: 'active_workout', title: 'Trening Dnia', enabled: true, order: 5, size: 'full' },
      { id: 'w-ai-coach', widgetType: 'ai_coach_mini', title: 'Wskazówki Dietetyczne Gemini', enabled: true, order: 6, size: 'full' }
    ]
  },
  {
    id: 'health_protocol',
    name: 'Zdrowie, Badania & Protokół',
    subtitle: 'Rekomendacja Gemini 3.8 Pro',
    icon: '💉',
    description: 'Kompletne monitorowanie dawek, iniekcji, parametrów krwi i odnowy biologicznej.',
    widgets: [
      { id: 'w-proto', widgetType: 'pharmacokinetics_summary', title: 'Kalendarz Iniekcji & Środków', enabled: true, order: 1, size: 'half' },
      { id: 'w-blood', widgetType: 'blood_test_alerts', title: 'Ostatnie Badania Krwi', enabled: true, order: 2, size: 'half' },
      { id: 'w-workout', widgetType: 'active_workout', title: 'Dzisiejszy Trening', enabled: true, order: 3, size: 'full' },
      { id: 'w-weight', widgetType: 'weight_trend', title: 'Waga Ciała (Retencja)', enabled: true, order: 4, size: 'half' },
      { id: 'w-water', widgetType: 'water_hydration', title: 'Płyny & Elektrolity', enabled: true, order: 5, size: 'half' },
      { id: 'w-ai-coach', widgetType: 'ai_coach_mini', title: 'Analiza Gemini 3.8 Pro', enabled: true, order: 6, size: 'full' }
    ]
  }
];

export const DEFAULT_QUICK_ACCESS_WIDGETS: QuickAccessWidgetConfig[] = [
  { id: 'w-workout', widgetType: 'active_workout', title: 'Dzisiejszy Trening', enabled: true, order: 1, size: 'full' },
  { id: 'w-timer', widgetType: 'timer_quick', title: 'Szybki Stoper Treningowy', enabled: true, order: 2, size: 'half' },
  { id: 'w-weight', widgetType: 'weight_trend', title: 'Masa Ciała & Filtr EMA', enabled: true, order: 3, size: 'half' },
  { id: 'w-ai-coach', widgetType: 'ai_coach_mini', title: 'Trener AI Gemini 3.8', enabled: true, order: 4, size: 'full' },
  { id: 'w-plates', widgetType: 'plate_calc_widget', title: 'Kalkulator Talerzy na Gryf', enabled: true, order: 5, size: 'half' },
  { id: 'w-water', widgetType: 'water_hydration', title: 'Licznik Nawodnienia (H₂O)', enabled: true, order: 6, size: 'half' },
  { id: 'w-radar', widgetType: 'muscle_volume_radar', title: 'Balans Objętości Tygodnia', enabled: true, order: 7, size: 'half' },
  { id: 'w-proto', widgetType: 'pharmacokinetics_summary', title: 'Kalendarz Iniekcji & Środków', enabled: true, order: 8, size: 'half' },
  { id: 'w-pr', widgetType: 'pr_tracker', title: 'Najnowsze Rekordy 1RM', enabled: true, order: 9, size: 'half' },
  { id: 'w-notes', widgetType: 'quick_notes', title: 'Szybki Notatnik Treningowy', enabled: true, order: 10, size: 'full' }
];

export const initialGymData: GymData = {
  settings: {
    unit: 'kg',
    theme: 'dark',
    autoSave: true,
    reducedMotion: false,
    athleteName: 'Zawodnik',
    windowsPath: '%LOCALAPPDATA%\\GymTracker\\workout_data.json',
    soundFeedback: true,
    autoBackupEnabled: true,
    backupFolderPath: '%LOCALAPPDATA%\\GymTracker\\Backups',
    backupOnSave: true,
    backupOnClose: true,
    maxBackupFiles: 15,
    analysisOnlyCompleted: true,
    analysisHideEmptyGroups: true,
    analysisIncludePartialHistory: false,
    analysisStartWeek: 1,
    analysisEndWeek: 999,
    analysisDefaultMetric: 'progressPct',
    analysisShowAlerts: true,
    analysisShowBodyWeight: true,
    analysisShow1RM: true,
    analysisRoundValues: true,
    analysisAutoRefresh: true,
    analysisShowDataQualityWarnings: true,
    analysisRequireHistoryForCompleted: true,
    analysisMinExecutedSets: 1,
    analysisWarnMissingHistory: true,
    analysisWarnVolumeJumpPct: 30,
    analysisTrendWindowWeeks: 4,
    confirmBeforeDelete: true,
    showHoverAnnotations: true,
    startupView: 'quick_access',
    rememberLastView: false,
    analysisShowExecutionSummary: true,
    analysisShowWeekComparison: true,
    analysisShowWeeklyTonnage: false,
    analysisShowWeeklyMetrics: false,
    analysisShowExecutedDays: true,
    analysisShowExecutedExercises: true,
    analysisShowExecutedSets: true,
    analysisShowExecutedReps: true,
    analysisShowVolumeDelta: true,
    analysisShowDataConfidence: true,
    analysisShowBestE1RM: true,
    analysisShowLatestResult: true,
    analysisShowTrendLine: true,
    analysisShowPRMarkers: true,
    analysisPRMetric: 'e1RM',
    analysisStagnationWindow: 4,
    analysisStagnationMinSessions: 3,
    analysisShowRegularity: false,
    analysisRegularityTargetPct: 80,
    analysisShowMuscleFrequency: true,
    analysisShowMonthlyComparison: false,
    analysisMonthlyMetric: 'volume',
    analysisShowPeriodComparison: false,
    analysisPeriodComparisonMetric: 'volume',
    analysisShowRollingVolume: false,
    analysisReportLayout: 'bento_left',
    analysisShowLayoutSwitcher: false,
    analysisShowAiAgent: true,
    aiAgentMode: 'heuristic_local',
    aiAgentServerUrl: '',
    aiAgentApiKey: '',
    aiAgentPersona: 'balanced',
    aiAgentFocus: 'all_muscles',
    aiAgentResponseLength: 'concise',
    accentColor: 'emerald',
    themeVariant: 'emerald',
    amoledBlack: false,
    highContrastBorders: false,
    cardGlowEffect: true,
    glassmorphism: true,
    activeCardAnimation: 'smooth',
    windowHeaderStyle: 'minimal',
    gymDigits: true,
    cardBorderRadius: 'rounded',
    cardDensity: 'compact',
    handedness: 'right',
    screenWakeLock: true,
    autoFocusNextSet: true,
    quickWeightIncrements: [1.25, 2.5, 5, 10],
    timerAutoStart: true,
    timerWarning10s: true,
    timerSoundType: 'bell',
    hapticIntensity: 'medium',
    restTimeCompound: 180,
    restTimeAccessory: 90,
    restTimeIsolation: 60,
    oneRmFormula: 'brzycki',
    weightRoundingStep: 0.5,
    emaAlpha: 0.3,
    bottomNavHeight: 'standard',
    bottomNavLabels: 'all',
    bottomNavStyle: 'floating_dock',
    bottomNavOrder: ['quick_access', 'plan', 'stats', 'muscle', 'weight', 'cycles', 'exercises', 'settings'],
    bottomNavVisibleTabs: ['quick_access', 'plan', 'stats', 'muscle', 'weight', 'cycles', 'exercises', 'settings'],
    floatingActionButton: 'timer',
    quickAccessWidgets: DEFAULT_QUICK_ACCESS_WIDGETS,
    quickAccessLayout: 'bento_grid',
    lastBackupTime: undefined
  },
  weeks: [
    {
      id: 'week-1',
      number: 1,
      name: 'Tydzień 1 - Rozpoczęcie Cyklu (Push / Pull / Legs)',
      startDate: '2026-09-01',
      days: [
        {
          id: 'w1-d1',
          name: 'Poniedziałek – Plan A: Push (Klatka, Barki Przód/Bok, Triceps)',
          completed: true,
          notes: 'Trening Push ukończony. Świetna pompa mięśniowa, dobre spięcie na klatce i barkach.',
          exercises: [
            {
              id: 'ex-push-1',
              name: 'Wyciskanie sztangi na ławce płaskiej',
              sets: 4,
              reps: 8,
              weight: 85,
              rpe: 8,
              notes: 'Pauza na klatce piersiowej, stabilny mostek',
              history: [
                { date: '2026-08-18', weight: 80, reps: 8, sets: 4, rpe: 7.5 },
                { date: '2026-08-25', weight: 82.5, reps: 8, sets: 4, rpe: 8 },
                { date: '2026-09-01', weight: 85, reps: 8, sets: 4, rpe: 8 }
              ]
            },
            {
              id: 'ex-push-2',
              name: 'Wyciskanie hantli na skosie dodatnim (30–45°)',
              sets: 3,
              reps: 10,
              weight: 30,
              rpe: 8.5,
              notes: 'Kąt ławki 30°, głębokie rozciągnięcie w fazie negatywnej',
              history: [
                { date: '2026-08-18', weight: 26, reps: 10, sets: 3 },
                { date: '2026-08-25', weight: 28, reps: 10, sets: 3 },
                { date: '2026-09-01', weight: 30, reps: 10, sets: 3 }
              ]
            },
            {
              id: 'ex-push-3',
              name: 'Rozpiętki na bramce / wyciągu',
              sets: 3,
              reps: 12,
              weight: 15,
              rpe: 8,
              notes: 'Spięcie mięśniowe w szczytowej fazie (1 sec holding)',
              history: [
                { date: '2026-08-18', weight: 12.5, reps: 12, sets: 3 },
                { date: '2026-08-25', weight: 13.5, reps: 12, sets: 3 },
                { date: '2026-09-01', weight: 15, reps: 12, sets: 3 }
              ]
            },
            {
              id: 'ex-push-4',
              name: 'OHP (Wyciskanie żołnierskie sztangi stojąc)',
              sets: 4,
              reps: 6,
              weight: 55,
              rpe: 8.5,
              notes: 'Napięty pośladek i brzuch, sztanga blisko twarzy',
              history: [
                { date: '2026-08-18', weight: 50, reps: 6, sets: 4 },
                { date: '2026-08-25', weight: 52.5, reps: 6, sets: 4 },
                { date: '2026-09-01', weight: 55, reps: 6, sets: 4 }
              ]
            },
            {
              id: 'ex-push-5',
              name: 'Wznosy bokiem z hantlami lub na wyciągu',
              sets: 4,
              reps: 12,
              weight: 12.5,
              rpe: 9,
              notes: 'Prowadzenie łokcia w górę, wolne opuszczanie',
              history: [
                { date: '2026-08-18', weight: 10, reps: 12, sets: 4 },
                { date: '2026-08-25', weight: 11.5, reps: 12, sets: 4 },
                { date: '2026-09-01', weight: 12.5, reps: 12, sets: 4 }
              ]
            },
            {
              id: 'ex-push-6',
              name: 'Prostowanie ramion z linką za głowy (French)',
              sets: 3,
              reps: 12,
              weight: 25,
              rpe: 8,
              notes: 'Akcent na długą głowę tricepsa',
              history: [
                { date: '2026-08-18', weight: 20, reps: 12, sets: 3 },
                { date: '2026-08-25', weight: 22.5, reps: 12, sets: 3 },
                { date: '2026-09-01', weight: 25, reps: 12, sets: 3 }
              ]
            },
            {
              id: 'ex-push-7',
              name: 'Prostowanie ramion na linkach wyciągu górnego',
              sets: 3,
              reps: 12,
              weight: 30,
              rpe: 8.5,
              notes: 'Rozchylenie linek w końcowej fazie ruchu',
              history: [
                { date: '2026-08-18', weight: 25, reps: 12, sets: 3 },
                { date: '2026-08-25', weight: 27.5, reps: 12, sets: 3 },
                { date: '2026-09-01', weight: 30, reps: 12, sets: 3 }
              ]
            },
            {
              id: 'ex-push-8',
              name: 'Plank (Deska)',
              sets: 3,
              reps: 60,
              weight: 0,
              rpe: 8,
              notes: 'Izometria brzucha 60 sekund',
              history: [
                { date: '2026-08-18', weight: 0, reps: 45, sets: 3 },
                { date: '2026-08-25', weight: 0, reps: 50, sets: 3 },
                { date: '2026-09-01', weight: 0, reps: 60, sets: 3 }
              ]
            }
          ]
        },
        {
          id: 'w1-d2',
          name: 'Wtorek – Plan B: Pull (Plecy, Tył Barku, Biceps)',
          completed: true,
          notes: 'Trening Pull ukończony. Plecy i biceps solidnie przepracowane.',
          exercises: [
            {
              id: 'ex-pull-1',
              name: 'Podciąganie na drążku (Nachwyt / Podchwyt)',
              sets: 4,
              reps: 8,
              weight: 0,
              rpe: 8,
              notes: 'Pełen zakres ruchu od wyprostu do brody nad drążek',
              history: [
                { date: '2026-08-19', weight: 0, reps: 6, sets: 4 },
                { date: '2026-08-26', weight: 0, reps: 7, sets: 4 },
                { date: '2026-09-02', weight: 0, reps: 8, sets: 4 }
              ]
            },
            {
              id: 'ex-pull-2',
              name: 'Wiosłowanie sztangą w opadzie tułowia',
              sets: 4,
              reps: 8,
              weight: 75,
              rpe: 8,
              notes: 'Przyciąganie sztangi do pępka, kąt opadu ok. 45°',
              history: [
                { date: '2026-08-19', weight: 70, reps: 8, sets: 4 },
                { date: '2026-08-26', weight: 72.5, reps: 8, sets: 4 },
                { date: '2026-09-02', weight: 75, reps: 8, sets: 4 }
              ]
            },
            {
              id: 'ex-pull-3',
              name: 'Wiosłowanie jednorącz na wyciągu dolnym do biodra',
              sets: 3,
              reps: 10,
              weight: 35,
              rpe: 8,
              notes: 'Prowadzenie łokcia tuż przy biodrze, głęboki rozciąg',
              history: [
                { date: '2026-08-19', weight: 30, reps: 10, sets: 3 },
                { date: '2026-08-26', weight: 32.5, reps: 10, sets: 3 },
                { date: '2026-09-02', weight: 35, reps: 10, sets: 3 }
              ]
            },
            {
              id: 'ex-pull-4',
              name: 'Pull-over (Przenoszenie drążka na wyciągu)',
              sets: 3,
              reps: 12,
              weight: 27.5,
              rpe: 8,
              notes: 'Izolacja najszerszego grzbietu na prostych ramionach',
              history: [
                { date: '2026-08-19', weight: 22.5, reps: 12, sets: 3 },
                { date: '2026-08-26', weight: 25, reps: 12, sets: 3 },
                { date: '2026-09-02', weight: 27.5, reps: 12, sets: 3 }
              ]
            },
            {
              id: 'ex-pull-5',
              name: 'Face Pulls (Przyciąganie linki do twarzy)',
              sets: 4,
              reps: 15,
              weight: 20,
              rpe: 8.5,
              notes: 'Akcent na rotatory i tył akromionu',
              history: [
                { date: '2026-08-19', weight: 15, reps: 15, sets: 4 },
                { date: '2026-08-26', weight: 17.5, reps: 15, sets: 4 },
                { date: '2026-09-02', weight: 20, reps: 15, sets: 4 }
              ]
            },
            {
              id: 'ex-pull-6',
              name: 'Wznosy hantli w opadzie leżąc przodem (30–45°)',
              sets: 3,
              reps: 12,
              weight: 10,
              rpe: 8.5,
              notes: 'Klatka oparta o ławkę skośną',
              history: [
                { date: '2026-08-19', weight: 8, reps: 12, sets: 3 },
                { date: '2026-08-26', weight: 9, reps: 12, sets: 3 },
                { date: '2026-09-02', weight: 10, reps: 12, sets: 3 }
              ]
            },
            {
              id: 'ex-pull-7',
              name: 'Uginanie ramion ze sztangą łamaną stojąc',
              sets: 3,
              reps: 10,
              weight: 35,
              rpe: 8.5,
              notes: 'Stabilny tułów bez cheatingu',
              history: [
                { date: '2026-08-19', weight: 30, reps: 10, sets: 3 },
                { date: '2026-08-26', weight: 32.5, reps: 10, sets: 3 },
                { date: '2026-09-02', weight: 35, reps: 10, sets: 3 }
              ]
            },
            {
              id: 'ex-pull-8',
              name: 'Uginanie hantli z supinacją na ławce skośnej',
              sets: 3,
              reps: 10,
              weight: 14,
              rpe: 8,
              notes: 'Pełny rozciąg w dolnej pozycji',
              history: [
                { date: '2026-08-19', weight: 12, reps: 10, sets: 3 },
                { date: '2026-08-26', weight: 13, reps: 10, sets: 3 },
                { date: '2026-09-02', weight: 14, reps: 10, sets: 3 }
              ]
            },
            {
              id: 'ex-pull-9',
              name: 'Uginanie młotkowe (Hantle / Linka)',
              sets: 3,
              reps: 12,
              weight: 16,
              rpe: 8.5,
              notes: 'Rozwój mięśnia ramiennego i ramienno-promieniowego',
              history: [
                { date: '2026-08-19', weight: 12, reps: 12, sets: 3 },
                { date: '2026-08-26', weight: 14, reps: 12, sets: 3 },
                { date: '2026-09-02', weight: 16, reps: 12, sets: 3 }
              ]
            },
            {
              id: 'ex-pull-10',
              name: 'Plank (Deska)',
              sets: 3,
              reps: 60,
              weight: 0,
              rpe: 8,
              notes: 'Deska po podciąganiu – stabilizacja gorsetu',
              history: [
                { date: '2026-08-19', weight: 0, reps: 50, sets: 3 },
                { date: '2026-08-26', weight: 0, reps: 55, sets: 3 },
                { date: '2026-09-02', weight: 0, reps: 60, sets: 3 }
              ]
            }
          ]
        },
        {
          id: 'w1-d3',
          name: 'Środa – Plan C: Legs & Abs (Nogi, Brzuch)',
          completed: false,
          notes: 'Mocny trening nóg i brzucha',
          exercises: [
            {
              id: 'ex-legs-1',
              name: 'Prostowanie nóg na maszynie siedząc',
              sets: 3,
              reps: 12,
              weight: 50,
              rpe: 8,
              notes: 'Wstępne zmęczenie czworogłowych ud',
              history: [
                { date: '2026-08-20', weight: 40, reps: 12, sets: 3 },
                { date: '2026-08-27', weight: 45, reps: 12, sets: 3 },
                { date: '2026-09-03', weight: 50, reps: 12, sets: 3 }
              ]
            },
            {
              id: 'ex-legs-2',
              name: 'Przysiady ze sztangą na plecach (Back Squat)',
              sets: 4,
              reps: 6,
              weight: 115,
              rpe: 8.5,
              notes: 'Głębokość poniżej linii kolan, kontrolowane schodzenie',
              history: [
                { date: '2026-08-20', weight: 105, reps: 6, sets: 4 },
                { date: '2026-08-27', weight: 110, reps: 6, sets: 4 },
                { date: '2026-09-03', weight: 115, reps: 6, sets: 4 }
              ]
            },
            {
              id: 'ex-legs-3',
              name: 'RDL – Rumuński Martwy Ciąg ze sztangą',
              sets: 4,
              reps: 8,
              weight: 95,
              rpe: 8,
              notes: 'Rozciągnięcie dwugłowych, biodra mocno w tył',
              history: [
                { date: '2026-08-20', weight: 85, reps: 8, sets: 4 },
                { date: '2026-08-27', weight: 90, reps: 8, sets: 4 },
                { date: '2026-09-03', weight: 95, reps: 8, sets: 4 }
              ]
            },
            {
              id: 'ex-legs-4',
              name: 'Wykroki chodzone z hantlami',
              sets: 3,
              reps: 10,
              weight: 18,
              rpe: 8.5,
              notes: '10 kroków na nogę (razem 20 kroków na serię)',
              history: [
                { date: '2026-08-20', weight: 14, reps: 10, sets: 3 },
                { date: '2026-08-27', weight: 16, reps: 10, sets: 3 },
                { date: '2026-09-03', weight: 18, reps: 10, sets: 3 }
              ]
            },
            {
              id: 'ex-legs-5',
              name: 'Wspięcia na palce stojąc',
              sets: 4,
              reps: 15,
              weight: 60,
              rpe: 9,
              notes: 'Pełen skok na palcach i przytrzymanie w szczycie 2 sec',
              history: [
                { date: '2026-08-20', weight: 50, reps: 15, sets: 4 },
                { date: '2026-08-27', weight: 55, reps: 15, sets: 4 },
                { date: '2026-09-03', weight: 60, reps: 15, sets: 4 }
              ]
            },
            {
              id: 'ex-legs-6',
              name: 'Unoszenie nóg w wiszeniu na drążku',
              sets: 3,
              reps: 12,
              weight: 0,
              rpe: 8.5,
              notes: 'Podwijanie miednicy do klatki bez bujania ciałem',
              history: [
                { date: '2026-08-20', weight: 0, reps: 10, sets: 3 },
                { date: '2026-08-27', weight: 0, reps: 12, sets: 3 },
                { date: '2026-09-03', weight: 0, reps: 12, sets: 3 }
              ]
            },
            {
              id: 'ex-legs-7',
              name: 'Allahy na bramce / wyciągu górnym',
              sets: 3,
              reps: 15,
              weight: 35,
              rpe: 8,
              notes: 'Mocny skurcz mięśnia prostego brzucha',
              history: [
                { date: '2026-08-20', weight: 27.5, reps: 15, sets: 3 },
                { date: '2026-08-27', weight: 30, reps: 15, sets: 3 },
                { date: '2026-09-03', weight: 35, reps: 15, sets: 3 }
              ]
            },
            {
              id: 'ex-legs-8',
              name: 'Plank (Deska)',
              sets: 3,
              reps: 60,
              weight: 0,
              rpe: 8,
              notes: 'Deska na zakończenie treningu nóg',
              history: [
                { date: '2026-08-20', weight: 0, reps: 50, sets: 3 },
                { date: '2026-08-27', weight: 0, reps: 55, sets: 3 },
                { date: '2026-09-03', weight: 0, reps: 60, sets: 3 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'week-2',
      number: 2,
      name: 'Tydzień 2 - Progresja Ciężaru (+2.5kg)',
      startDate: '2026-09-08',
      days: [
        {
          id: 'w2-d1',
          name: 'Poniedziałek - Push (Klatka / Barki / Triceps)',
          completed: true,
          notes: 'Dodane +2.5kg na klatę poszło gładko!',
          exercises: [
            {
              id: 'ex-10',
              name: 'Wyciskanie sztangi leżąc (Bench Press)',
              sets: 4,
              reps: 8,
              weight: 87.5,
              rpe: 8.5,
              notes: 'Pobity rekord z zeszłego tygodnia',
              history: [
                { date: '2026-08-25', weight: 82.5, reps: 8, sets: 4 },
                { date: '2026-09-01', weight: 85, reps: 8, sets: 4 },
                { date: '2026-09-08', weight: 87.5, reps: 8, sets: 4 }
              ]
            },
            {
              id: 'ex-11',
              name: 'Wyciskanie hantli na skosie dodatnim',
              sets: 3,
              reps: 10,
              weight: 32,
              rpe: 9,
              notes: 'Weszło 32kg',
              history: [
                { date: '2026-08-25', weight: 28, reps: 10, sets: 3 },
                { date: '2026-09-01', weight: 30, reps: 10, sets: 3 },
                { date: '2026-09-08', weight: 32, reps: 10, sets: 3 }
              ]
            }
          ]
        },
        {
          id: 'w2-d2',
          name: 'Środa - Pull (Plecy / Biceps)',
          completed: false,
          notes: 'Cel: 145kg na martwym ciągu',
          exercises: [
            {
              id: 'ex-12',
              name: 'Martwy ciąg klasyczny (Deadlift)',
              sets: 4,
              reps: 5,
              weight: 145,
              rpe: 9,
              notes: 'Cel: 145kg',
              history: [
                { date: '2026-08-27', weight: 135, reps: 5, sets: 4 },
                { date: '2026-09-03', weight: 140, reps: 5, sets: 4 },
                { date: '2026-09-10', weight: 145, reps: 5, sets: 4 }
              ]
            }
          ]
        }
      ]
    }
  ],
  bodyWeights: [
    { id: 'bw-1', date: '2026-08-15', weight: 82.0, notes: 'Początek pomiarów rano' },
    { id: 'bw-2', date: '2026-08-22', weight: 81.6, notes: 'Na czczo po cardio' },
    { id: 'bw-3', date: '2026-08-29', weight: 81.2, notes: 'Lekki spadek retencji wody' },
    { id: 'bw-4', date: '2026-09-05', weight: 80.8, notes: 'Świetna forma, lepsza definicja' },
    { id: 'bw-5', date: '2026-09-12', weight: 80.4, notes: 'Waga stabilna, siła w górę' }
  ],
  bodyPartMeasurements: [
    { id: 'bpm-1', date: '2026-08-15', part: 'biceps', value: 37.5, notes: 'Początek mezocyklu' },
    { id: 'bpm-2', date: '2026-08-29', part: 'biceps', value: 38.0, notes: 'Dobra pompa po treningu' },
    { id: 'bpm-3', date: '2026-09-12', part: 'biceps', value: 38.5, notes: 'Na czczo rano, pełna regeneracja' },
    { id: 'bpm-4', date: '2026-08-15', part: 'triceps', value: 35.0, notes: 'Początek pomiarów' },
    { id: 'bpm-5', date: '2026-08-29', part: 'triceps', value: 35.5, notes: 'Postęp w wyciskaniu wąsko' },
    { id: 'bpm-6', date: '2026-09-12', part: 'triceps', value: 36.0, notes: 'Widoczna separacja bocznej głowy' },
    { id: 'bpm-7', date: '2026-08-15', part: 'klata', value: 106.0, notes: 'Na spokojnym wydechu' },
    { id: 'bpm-8', date: '2026-08-29', part: 'klata', value: 107.2, notes: 'Wzrost siły w wyciskaniu leżąc' },
    { id: 'bpm-9', date: '2026-09-12', part: 'klata', value: 108.5, notes: 'Wzrost obwodu klatki piersiowej' },
    { id: 'bpm-10', date: '2026-08-15', part: 'barki', value: 121.0, notes: 'Obwód obręczy barkowej' },
    { id: 'bpm-11', date: '2026-08-29', part: 'barki', value: 122.2, notes: 'Progres wznosów bokiem' },
    { id: 'bpm-12', date: '2026-09-12', part: 'barki', value: 123.5, notes: 'Poprawa proporcji V-taper' },
    { id: 'bpm-13', date: '2026-08-15', part: 'nogi', value: 60.5, notes: 'Najszerszy punkt uda rano' },
    { id: 'bpm-14', date: '2026-08-29', part: 'nogi', value: 61.2, notes: 'Po przysiadach i RDL' },
    { id: 'bpm-15', date: '2026-09-12', part: 'nogi', value: 62.0, notes: 'Gęstość czwórogłowych' }
  ],
  circumferences: [
    { id: 'circ-1', date: '2026-08-15', bodyPart: 'ramię', side: 'left', variant: 'flexed', millimeters: 375, notes: 'Start mezocyklu' },
    { id: 'circ-2', date: '2026-08-29', bodyPart: 'ramię', side: 'left', variant: 'flexed', millimeters: 380, notes: 'Po 2 tyg.' },
    { id: 'circ-3', date: '2026-09-12', bodyPart: 'ramię', side: 'left', variant: 'flexed', millimeters: 385, notes: 'Bieżący wynik' },
    { id: 'circ-4', date: '2026-08-15', bodyPart: 'klatka', side: null, variant: 'relaxed', millimeters: 1060, notes: 'Na wydechu' },
    { id: 'circ-5', date: '2026-09-12', bodyPart: 'klatka', side: null, variant: 'relaxed', millimeters: 1085, notes: 'Progres klatki' }
  ],
  protocolEntries: [
    {
      id: 'proto-1',
      date: '2026-09-01',
      time: '08:00',
      substance: 'Testosteron Enanthat',
      dosage: 250,
      unit: 'mg',
      route: 'IM',
      notes: 'Prawy pośladek, brak dyskomfortu'
    },
    {
      id: 'proto-2',
      date: '2026-09-04',
      time: '09:30',
      substance: 'HCG',
      dosage: 500,
      unit: 'IU',
      route: 'SC',
      notes: 'Podskórnie fałd brzuszny'
    },
    {
      id: 'proto-3',
      date: '2026-09-08',
      time: '08:00',
      substance: 'Testosteron Enanthat',
      dosage: 250,
      unit: 'mg',
      route: 'IM',
      notes: 'Lewy pośladek'
    },
    {
      id: 'proto-4',
      date: '2026-09-11',
      time: '09:00',
      substance: 'HCG',
      dosage: 500,
      unit: 'IU',
      route: 'SC',
      notes: 'Podskórnie brzuch'
    },
    {
      id: 'proto-5',
      date: '2026-09-15',
      time: '08:30',
      substance: 'Testosteron Enanthat',
      dosage: 250,
      unit: 'mg',
      route: 'IM',
      notes: 'Prawy pośladek'
    }
  ],
  calendarNotes: [
    {
      id: 'note-1',
      date: '2026-09-01',
      title: 'Start nowego mezocyklu',
      content: 'Rozpoczęcie bloku siłowego, regeneracja na wysokim poziomie.',
      category: 'goal',
      color: 'emerald',
      isImportant: true,
      createdAt: '2026-09-01T07:30:00.000Z'
    },
    {
      id: 'note-2',
      date: '2026-09-15',
      title: 'Badania krwi rano',
      content: 'Morfologia, lipidogram, próby wątrobowe, testosteron i estradiol na czczo.',
      category: 'bloodwork',
      color: 'rose',
      isImportant: true,
      createdAt: '2026-09-15T06:45:00.000Z'
    }
  ],
  profile: {
    id: 'prof-default',
    name: 'Pasik92',
    athleteTag: 'Pasik92 #001',
    avatarUrl: '',
    bio: 'Trening siłowy & periodyzacja falowa. Budowanie gęstości mięśniowej i czystej siły.',
    age: 32,
    heightCm: 182,
    experienceLevel: 'zaawansowany',
    primaryGoal: 'masa',
    targetWeight: 88.0,
    activityLevel: 'aktywny',
    dailyCalories: 3350,
    proteinGrams: 205,
    carbsGrams: 420,
    fatsGrams: 75,
    manualPRs: [
      {
        id: 'pr-1',
        exerciseName: 'Wyciskanie sztangi na ławce płaskiej',
        weight: 125,
        reps: 1,
        date: '2026-08-15',
        estimated1RM: 125,
        notes: 'Zatwierdzony PR z pauzą na klatce'
      },
      {
        id: 'pr-2',
        exerciseName: 'Przysiady ze sztangą na plecach (Back Squat)',
        weight: 165,
        reps: 1,
        date: '2026-08-20',
        estimated1RM: 165,
        notes: 'Głęboki przysiad poniżej kąta prostego'
      },
      {
        id: 'pr-3',
        exerciseName: 'RDL – Rumuński Martwy Ciąg ze sztangą',
        weight: 180,
        reps: 2,
        date: '2026-08-28',
        estimated1RM: 191,
        notes: 'Chwyt z paskami, kontrola fazy ekscentrycznej'
      },
      {
        id: 'pr-4',
        exerciseName: 'OHP (Wyciskanie żołnierskie sztangi stojąc)',
        weight: 80,
        reps: 3,
        date: '2026-09-02',
        estimated1RM: 85,
        notes: 'Ścisły lockout'
      }
    ],
    healthBloodworkEntries: [
      {
        id: 'hb-1',
        date: '2026-08-10',
        notes: 'Komplet badań krwi: profil hormonalny, próby wątrobowe ALT/AST i morfologia w normie.',
        jsonFileName: 'badania_krwi_2026_08_10.json',
        jsonData: '{\n  "data": "2026-08-10",\n  "testosteron": "1150 ng/dl",\n  "estradiol": "38.4 pg/ml",\n  "alt": "31 U/l",\n  "ast": "28 U/l",\n  "hematokryt": "47.8%"\n}'
      }
    ]
  },
  profilesList: [
    {
      id: 'prof-default',
      name: 'Pasik92',
      athleteTag: 'Pasik92 #001',
      avatarUrl: '',
      bio: 'Trening siłowy & periodyzacja falowa. Budowanie gęstości mięśniowej i czystej siły.',
      age: 32,
      heightCm: 182,
      experienceLevel: 'zaawansowany',
      primaryGoal: 'masa',
      targetWeight: 88.0,
      activityLevel: 'aktywny',
      dailyCalories: 3350,
      proteinGrams: 205,
      carbsGrams: 420,
      fatsGrams: 75
    }
  ],
  syncConfig: {
    serverUrl: 'http://192.168.1.100:8000',
    port: 8000,
    deviceId: 'WIN10-PASIK92-DESKTOP-MAIN',
    deviceName: 'Windows 10 Desktop (Główna stacja)',
    deviceType: 'windows_desktop',
    pairingCode: '749-182',
    authToken: 'gtp_win_sec_89df204e9c1',
    autoSync: false,
    conflictResolution: 'ask',
    lastSyncStatus: 'connected',
    lastSyncAt: '2026-09-17 08:30',
    lastSyncDetails: 'Połączono z węzłem lokalnym. Gotowość do przesyłania danych.',
    lastPingMs: 14
  },
  syncLogs: [
    {
      id: 'synclog-1',
      timestamp: '2026-09-17 08:30:12',
      direction: 'handshake',
      recordsAffected: 0,
      status: 'success',
      summary: 'Handshake nawiązany z węzłem http://192.168.1.100:8000 (Ping 14ms)'
    },
    {
      id: 'synclog-2',
      timestamp: '2026-09-16 21:15:00',
      direction: 'push_to_server',
      recordsAffected: 14,
      status: 'success',
      summary: 'Wysłano stan 6 tygodni i 12 pomiarów wagi do synchronizacji z Androidem'
    }
  ],
  catalogExercises: DEFAULT_CATALOG_EXERCISES
};

export const commonExerciseLibrary = [
  'Wyciskanie sztangi na ławce płaskiej',
  'Wyciskanie hantli na skosie dodatnim (30–45°)',
  'Rozpiętki na bramce / wyciągu',
  'OHP (Wyciskanie żołnierskie sztangi stojąc)',
  'Wznosy bokiem z hantlami lub na wyciągu',
  'Prostowanie ramion z linką za głowy (French)',
  'Prostowanie ramion na linkach wyciągu górnego',
  'Podciąganie na drążku (Nachwyt / Podchwyt)',
  'Wiosłowanie sztangą w opadzie tułowia',
  'Wiosłowanie jednorącz na wyciągu dolnym do biodra',
  'Pull-over (Przenoszenie drążka na wyciągu)',
  'Face Pulls (Przyciąganie linki do twarzy)',
  'Wznosy hantli w opadzie leżąc przodem (30–45°)',
  'Uginanie ramion ze sztangą łamaną stojąc',
  'Uginanie hantli z supinacją na ławce skośnej',
  'Uginanie młotkowe (Hantle / Linka)',
  'Prostowanie nóg na maszynie siedząc',
  'Przysiady ze sztangą na plecach (Back Squat)',
  'RDL – Rumuński Martwy Ciąg ze sztangą',
  'Wykroki chodzone z hantlami',
  'Wspięcia na palce stojąc',
  'Unoszenie nóg w wiszeniu na drążku',
  'Allahy na bramce / wyciągu górnym',
  'Plank (Deska)'
];
