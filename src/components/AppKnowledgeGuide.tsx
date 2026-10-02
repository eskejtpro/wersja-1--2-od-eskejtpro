import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Calculator, 
  TrendingUp, 
  Scale, 
  Activity, 
  Database, 
  RefreshCw, 
  Bot, 
  Smartphone, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  Dumbbell, 
  Syringe, 
  Flame, 
  Zap, 
  HelpCircle,
  Cpu,
  Info,
  Sliders,
  Check
} from 'lucide-react';
import { calculate1RM } from '../utils/calculations';

interface AppKnowledgeGuideProps {
  isDark?: boolean;
}

interface GuideChapter {
  id: string;
  category: 'calculators' | 'analytics' | 'weight' | 'room' | 'sync' | 'ai' | 'hardware';
  title: string;
  subtitle: string;
  icon: any;
  badge: string;
  summary: string;
  formula?: string;
  details: string[];
  examples?: { label: string; formula: string; result: string }[];
  faq: { q: string; a: string }[];
}

export const GUIDE_CHAPTERS: GuideChapter[] = [
  {
    id: '1rm-calculators',
    category: 'calculators',
    title: '1. Formuły Szacowania Ciężaru Maksymalnego (1RM)',
    subtitle: 'Brzycki, Epley, Lombardi, Wathan, RPE & Tonaż',
    icon: Calculator,
    badge: 'Kalkulatory',
    summary: 'Aplikacja oblicza szacowany maksymalny ciężar na 1 powtórzenie (1RM) w oparciu o wybraną formułę matematyczną lub uśrednienie algorytmiczne.',
    formula: 'Brzycki: 1RM = Masa / (1.0278 - 0.0278 × Powtórzenia)\nEpley: 1RM = Masa × (1 + 0.0333 × Powtórzenia)\nLombardi: 1RM = Masa × Powtórzenia^0.10\nWathan: 1RM = (100 × Masa) / (48.8 + 53.8 × e^(-0.075 × Powtórzenia))',
    details: [
      'Formuła Brzyckiego: Najdokładniejsza dla zakresu 2–10 powtórzeń w ćwiczeniach wielostawowych (wyciskanie, przysiad, martwy ciąg).',
      'Formuła Epleya: Klasyczny wzór siłowy sprawdzający się przy średnich zakresach (4–8 powtórzeń).',
      'Formuła Lombardiego: Zastosowanie potęgowe (0.10), wygładzające wysokie zakresy powtórzeń (10–15).',
      'Tonaż Serii (Volume Load): Iloczyn Masa × Powtórzenia × Serie (np. 100 kg × 8 × 4 = 3200 kg).'
    ],
    examples: [
      { label: 'Wyciskanie 100 kg × 8 powt.', formula: '100 / (1.0278 - 0.0278 × 8)', result: '124.2 kg (Brzycki)' },
      { label: 'Wyciskanie 100 kg × 8 powt.', formula: '100 × (1 + 0.0333 × 8)', result: '126.6 kg (Epley)' },
      { label: 'Przysiad 140 kg × 5 powt.', formula: '140 / (1.0278 - 0.0278 × 5)', result: '157.5 kg (Brzycki)' }
    ],
    faq: [
      { q: 'Dlaczego nie testować 1RM na żywo na każdym treningu?', a: 'Testowanie rzeczywistego 1RM wyczerpuje centralny układ nerwowy (OUN) i zwiększa ryzyko kontuzji. Algorytm szacuje 1RM z bezpiecznych serii roboczych RPE 7-9.' },
      { q: 'Czy dla 1 powtórzenia wynik jest równy masie?', a: 'Tak, dla 1 powtórzenia wszystkie wzory zwracają dokładnie 100% podniesionego ciężaru.' }
    ]
  },
  {
    id: 'plate-calculator',
    category: 'calculators',
    title: '2. Kalkulator Obciążenia Gryfu (Plate Loading)',
    subtitle: 'Rozbicie ciężaru na talerze olimpijskie na stronę',
    icon: Layers,
    badge: 'Siłownia',
    summary: 'Algorytm zachłanny automatycznie dobiera minimalną liczbę talerzy (25, 20, 15, 10, 5, 2.5, 1.25 kg) do załadowania na każdą stronę sztangi.',
    formula: 'Masa Na Stronę = (Ciężar Docelowy - Waga Gryfu) / 2',
    details: [
      'Obsługa wag gryfów: Standard olimpijski (20 kg), damski/techniczny (15 kg), lekki/krótki (10 kg).',
      'Kolejność talerzy od wewnątrz: Najcięższe krążki (25/20 kg) trafiają najbliżej środka sztangi dla stabilizacji momentu bezwładności.',
      'Obsługa mikrotalerzy: 1.25 kg oraz 2.5 kg do precyzyjnego progresu liniowego.'
    ],
    examples: [
      { label: '100 kg na gryfie 20 kg', formula: '(100 - 20) / 2 = 40 kg / stronę', result: '2× 20 kg na stronę' },
      { label: '142.5 kg na gryfie 20 kg', formula: '(142.5 - 20) / 2 = 61.25 kg / stronę', result: '2× 25kg + 1× 10kg + 1× 1.25kg' }
    ],
    faq: [
      { q: 'Co jeśli ciężar docelowy jest mniejszy niż gryf?', a: 'Kalkulator informuje, że sam gryf waży więcej i blokuje ujemne wartości.' }
    ]
  },
  {
    id: 'analytics-progression',
    category: 'analytics',
    title: '3. Analityka Progresu, Periodyzacja & Wykrywanie Stagnacji',
    subtitle: 'Regresja liniowa OLS, Rolling Window & Rekordy PR',
    icon: TrendingUp,
    badge: 'Analityka',
    summary: 'Moduł analityczny monitoruje progresję tonażu, szacowanego 1RM i wykrywa plateau siłowe w ruchomym oknie treningowym.',
    formula: 'Regresja OLS: y = a·x + b | Nachylenie siły (Slope) = Cov(X,Y) / Var(X)\nStagnacja: Delta 1RM < 1.0% w oknie N kolejnych sesji',
    details: [
      'Wskaźnik Progresywnego Przeładowania: Porównanie serii roboczych z analogicznym dniem poprzedniego mikrocyklu (waga, powtórzenia, tonaż).',
      'Wykrywanie Plateau: System analizuje okno 3–5 ostatnich treningów danego ćwiczenia. Jeśli szacowany 1RM nie wzrasta, sugeruje deload lub zmianę zakresu powtórzeń.',
      'Wskaźnik PR (Personal Record): Oznaczenie koroną 👑 i powiadomienie o pobiciu historycznego maksa.'
    ],
    examples: [
      { label: 'Wzrost tonażu tygodniowego', formula: 'Tydzień 2 (18 500 kg) vs Tydzień 1 (17 000 kg)', result: '+1 500 kg (+8.8%)' }
    ],
    faq: [
      { q: 'Jak algorytm traktuje treningi ze statusem "nieukończony"?', a: 'W ustawieniach domyślnie włączona jest flaga "Analiza tylko ukończonych treningów", która chroni statystyki przed zniekształceniem przez opuszczone sesje.' }
    ]
  },
  {
    id: 'weight-ema-filters',
    category: 'weight',
    title: '4. Dziennik Wagi, Obwody Sylwetki & Filtr EMA',
    subtitle: 'Wykładnicza średnia krocząca (EMA) i eliminacja szumów',
    icon: Scale,
    badge: 'Waga & Ciało',
    summary: 'Filtr EMA usuwa codzienne wahania wody, sodu i glikogenu, wyliczając rzeczywisty trend masy ciała zawodnika.',
    formula: 'EMA_t = α · Waga_t + (1 - α) · EMA_{t-1}\nZalecana alfa: α = 0.3 (Standard), α = 0.2 (Wygładzona), α = 0.5 (Czuła)',
    details: [
      'Eliminacja skoków wagowych: Skok wagi o +2 kg po posiłku węglowodanowym nie oznacza przyrostu tłuszczu – filtr EMA zachowuje stabilną krzywą trendu.',
      'Pomiary obwodów (biceps, klatka, pas, udo, łydka): Zapis z dokładnością do 1 mm (0.1 cm), monitorowanie asymetrii lewa/prawa strona.',
      'Korelacja Pearsona (r): Analiza zależności między zmianą masy ciała a siłą maksymalną w głównych bojach.'
    ],
    examples: [
      { label: 'Waga bazowa 85.0 kg, odczyt 86.0 kg (α=0.3)', formula: '0.3 × 86.0 + 0.7 × 85.0', result: 'Trend EMA: 85.3 kg' }
    ],
    faq: [
      { q: 'Dlaczego pomiary są zapisywane w milimetrach?', a: 'Przechowywanie liczb całkowitych w milimetrach w bazie Room zapobiega błędom zaokrągleń zmiennoprzecinkowych IEEE-754.' }
    ]
  },
  {
    id: 'pharmacokinetics-cycles',
    category: 'analytics',
    title: '5. Kalendarz Środków, Farmakokinetyka & Krzywa Stężeń',
    subtitle: 'Kalkulator okresu półtrwania (Half-Life) i kumulacji dawek',
    icon: Syringe,
    badge: 'Kalendarz',
    summary: 'Symulator stężeń farmakokinetycznych oblicza poziom substancji w osoczu na podstawie okresu półtrwania ($t_{1/2}$) i regularności iniekcji.',
    formula: 'C(t) = C_0 · (1/2)^(t / t_{1/2}) = C_0 · e^(-k · t), gdzie k = ln(2) / t_{1/2}',
    details: [
      'Krzywa kumulacji (Steady-State): Wykres pokazuje stabilizację poziomu stężenia po 4–5 okresach półtrwania.',
      'Okresy półtrwania estrów: Propionate (~0.8-1.5 dnia), Enanthate/Cypionate (~4.5-5 dni), Decanoate (~7-10 dni).',
      'Powiadomienia i kalendarz: Terminarz iniekcji oraz integracja z badaniami krwi (morfologia, lipidogram, próby wątrobowe).'
    ],
    examples: [
      { label: 'Dawka 250 mg Enan po 5 dniach (t1/2=5d)', formula: '250 × (1/2)^(5/5)', result: 'Pozostałość: 125 mg' }
    ],
    faq: [
      { q: 'Czy symulacja zastępuje badania laboratoryjne?', a: 'Nie, kalkulator jest modelem matematycznym ułatwiającym planowanie. Rzeczywiste stężenia należy weryfikować badaniami krwi w Centrum Badań.' }
    ]
  },
  {
    id: 'room-database-architecture',
    category: 'room',
    title: '6. Architektura Room Database (SQLite) & 100% Offline-First',
    subtitle: 'Relacyjne tabele SQLite, DAO i nieblokująca kolejka zapisu',
    icon: Database,
    badge: 'Room SQL',
    summary: 'Aplikacja działa w oparciu o architekturę Android Room Database ze znormalizowanym schematem tabel SQLite i asynchronicznym zapisem.',
    formula: 'Architektura: UI (60 FPS) ──> StateFlow ──> Non-Blocking Queue (Debounce 100ms) ──> Room DAO ──> SQLite Partition',
    details: [
      'Znormalizowane tabele relacyjne: `weeks`, `days`, `exercises`, `logged_sets`, `body_weights`, `circumferences`, `blood_tests`.',
      'Transakcje atomowe ACID: Każda modyfikacja serii jest zapisywana w izolowanej transakcji, chroniącej przed uszkodzeniem danych przy nagłym zamknięciu aplikacji.',
      'Gwarancja 100% Offline: Wszystkie operacje wykonują się lokalnie na urządzeniu bez konieczności połączenia z internetem.'
    ],
    examples: [
      { label: 'Struktura relacyjna', formula: 'Week (1:N) Day (1:N) Exercise (1:N) LoggedSet', result: 'Spójność kluczy obcych i indeksów' }
    ],
    faq: [
      { q: 'Gdzie fizycznie znajdują się moje dane?', a: 'W pamięci wewnętrznej telefonu w bezpiecznym magazynie aplikacji Room SQLite oraz kopiach zapasowych JSON.' }
    ]
  },
  {
    id: 'windows-android-sync',
    category: 'sync',
    title: '7. Bezstratna Synchronizacja Windows ↔ Android & Auto-Backup',
    subtitle: 'Weryfikacja sum kontrolnych, migawki JSON i retencja kopii',
    icon: RefreshCw,
    badge: 'Sync',
    summary: 'System synchronizacji dwukierunkowej łączy instancję desktopową Windows z telefonem Android przez bezpieczny serwer lokalny REST/WebSocket.',
    formula: 'Fingerprint Checksum: SHA-256(Payload) | Retencja: 10 ostatnich kopii automatycznych + nielimitowane kopie manualne',
    details: [
      'Automatyczny Backup przed zapisem: Każda synchronizacja lub import tworzy punkt przywracania z datą i godziną.',
      'Algorytm antykolizyjny: Weryfikacja timestampu modyfikacji zabezpiecza przed nadpisaniem nowszych serii treningowych starszymi danymi.',
      'Eksport/Import JSON: Pełna przenośność bazy między dowolnymi urządzeniami w 1 pliku.'
    ],
    examples: [
      { label: 'Nazwa pliku kopii', formula: 'backup-auto-20261001-160000.json', result: 'Format ISO ze znacznikiem czasu' }
    ],
    faq: [
      { q: 'Co jeśli podczas synchronizacji stracę połączenie Wi-Fi?', a: 'Transakcja nie zostanie zatwierdzona, a baza lokalna pozostanie w 100% nienaruszona.' }
    ]
  },
  {
    id: 'ai-coach-engine',
    category: 'ai',
    title: '8. Silnik AI Trenera & Persony Modelu Gemini',
    subtitle: 'Asystent periodyzacji, analiza regeneracji i dobór obciążeń',
    icon: Bot,
    badge: 'Gemini AI',
    summary: 'Trener AI wykorzystuje model Gemini do interpretacji tonażu, zmęczenia RPE, parametrów badań krwi i periodyzacji mikrocykli.',
    formula: 'Kontekst: Prompty Systemowe + Dane Bazy Room + Historia PR + Wyniki Badań',
    details: [
      'Persona Trener Siłowy: Nastawiona na progresję ciężaru, periodyzację falową i optymalizację przerw.',
      'Persona Analityk Danych: Skupiona na wykresach tonażu, trendach EMA, objętości partii i statystyce.',
      'Persona Lekarz / Specjalista Zdrowia: Analizuje parametry krwi, lipidogram, próby wątrobowe i regenerację.',
      'Persona Motywator: Krótkie, dynamiczne wskazówki mentalne przed podejściem do ciężkich serii.'
    ],
    examples: [
      { label: 'Zapytanie o deload', formula: 'Wykryto 3 sesje bez progresu w przysiadzie', result: 'Propozycja 1 tygodnia -30% objętości' }
    ],
    faq: [
      { q: 'Czy moje dane treningowe są wysyłane bez mojej wiedzy?', a: 'Nie, zapytania do AI są wysyłane wyłącznie wtedy, gdy użytkownik zada pytanie na karcie Trenera AI.' }
    ]
  },
  {
    id: 'xiaomi-hardware-optimizations',
    category: 'hardware',
    title: '9. Optymalizacje Sprzętowe Xiaomi 14T & Android M3',
    subtitle: 'AMOLED Black (#000000), Screen WakeLock, WebAudio Haptyka',
    icon: Smartphone,
    badge: 'Xiaomi 14T',
    summary: 'Specjalny pakiet optymalizacji zaprojektowany z myślą o telefonie Xiaomi 14T, matrycy AMOLED oraz obsłudze jedną ręką.',
    formula: 'Optymalizacja: True Black (#000000) ──> Zerowy pobór prądu diod organicznych AMOLED',
    details: [
      'True AMOLED Black: Zastępuje odcienie szarości idealną czernią `#000000`, całkowicie wygaszając piksele i oszczędzając baterię.',
      'Screen WakeLock API: Blokuje wygaszanie ekranu telefonu podczas aktywnej sesji treningowej.',
      'WebAudio Syntezator Dźwięków: Realizuje sygnały dźwiękowe stopera (Gong, Beep) bez zewnętrznych plików audio, działając w 100% offline.',
      'Ergonomia Lewej/Prawej Ręki: Przenosi przyciski zatwierdzania serii `[ ✓ ]` bezpośrednio pod dominujący kciuk.'
    ],
    examples: [
      { label: 'Pobór energii na AMOLED', formula: 'Piksel czarny (#000000) = 0 mA', result: 'Maksymalny czas pracy baterii na treningu' }
    ],
    faq: [
      { q: 'Czy wibracje haptyczne działają w przeglądarce i aplikacji APK?', a: 'Tak, system korzysta z Navigator Vibrate API oraz syntezatora WebAudio.' }
    ]
  }
];

export const AppKnowledgeGuide: React.FC<AppKnowledgeGuideProps> = ({ isDark = true }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({
    '1rm-calculators': true,
    'plate-calculator': true
  });

  // Interactive Live Sandbox State
  const [sandboxWeight, setSandboxWeight] = useState(100);
  const [sandboxReps, setSandboxReps] = useState(8);
  const [sandboxBarWeight, setSandboxBarWeight] = useState(20);

  // Math calculations for live sandbox
  const brzyckiCalc = sandboxReps === 1 ? sandboxWeight : Math.round((sandboxWeight / (1.0278 - 0.0278 * sandboxReps)) * 10) / 10;
  const epleyCalc = sandboxReps === 1 ? sandboxWeight : Math.round((sandboxWeight * (1 + 0.0333 * sandboxReps)) * 10) / 10;
  const lombardiCalc = sandboxReps === 1 ? sandboxWeight : Math.round((sandboxWeight * Math.pow(sandboxReps, 0.10)) * 10) / 10;
  const wathanCalc = sandboxReps === 1 ? sandboxWeight : Math.round(((100 * sandboxWeight) / (48.8 + 53.8 * Math.exp(-0.075 * sandboxReps))) * 10) / 10;

  // Plate math
  const weightPerSide = Math.max(0, (sandboxWeight - sandboxBarWeight) / 2);
  const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
  const platesResult: { weight: number; count: number }[] = [];
  let rem = weightPerSide;
  availablePlates.forEach(p => {
    const c = Math.floor(rem / p);
    if (c > 0) {
      platesResult.push({ weight: p, count: c });
      rem -= c * p;
    }
  });

  const toggleChapter = (id: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const expandAll = () => {
    const allOpen = Object.fromEntries(GUIDE_CHAPTERS.map(c => [c.id, true]));
    setExpandedChapters(allOpen);
  };

  const collapseAll = () => {
    setExpandedChapters({});
  };

  // Filtered chapters
  const filteredChapters = useMemo(() => {
    return GUIDE_CHAPTERS.filter(ch => {
      const matchesCategory = activeCategory === 'all' || ch.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const matchesSearch = 
        ch.title.toLowerCase().includes(q) ||
        ch.subtitle.toLowerCase().includes(q) ||
        ch.summary.toLowerCase().includes(q) ||
        ch.details.some(d => d.toLowerCase().includes(q)) ||
        ch.faq.some(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className="space-y-6" id="app-knowledge-guide-root">
      
      {/* Banner / Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-inner">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Kompletny Przewodnik, Matematyka &amp; Poradnik Aplikacji</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  v3.0.0 Pro
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Szczegółowa dokumentacja wszystkich algorytmów, wzorów 1RM, filtrów EMA, bazy Room i optymalizacji Xiaomi 14T.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
            >
              Rozwiń wszystko
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
            >
              Zwiń wszystko
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj w poradniku: Brzycki, Epley, EMA, Tonaż, Room SQL, Talerze, Xiaomi, WakeLock..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition-all font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {[
            { id: 'all', label: 'Wszystkie Rozdziały' },
            { id: 'calculators', label: '🧮 Kalkulatory 1RM & Talerzy' },
            { id: 'analytics', label: '📈 Analityka & Stagnacja' },
            { id: 'weight', label: '⚖️ Waga & Filtr EMA' },
            { id: 'room', label: '🗄️ Baza Room SQLite' },
            { id: 'sync', label: '🔄 Synchronizacja PC' },
            { id: 'ai', label: '🤖 Trener AI' },
            { id: 'hardware', label: '📱 Xiaomi 14T & AMOLED' },
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                activeCategory === cat.id
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : 'bg-slate-900/90 text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🧪 INTERAKTYWNY TESTER / PIASKOWNICA WZORÓW NA ŻYWO */}
      {/* ======================================================== */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider font-mono">
              Piaskownica Matematyczna (Live Formula Sandbox)
            </h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
            Kalkulator Porównawczy
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Wpisz ciężar roboczy i liczbę powtórzeń, aby natychmiast zobaczyć wyniki wszystkich 4 formuł szacowania siły 1RM oraz rozbicie talerzy:
        </p>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300">Ciężar Roboczy (kg):</label>
            <input
              type="number"
              step="2.5"
              min="1"
              value={sandboxWeight}
              onChange={(e) => setSandboxWeight(Number(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-emerald-400 font-mono font-black"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300">Powtórzenia (reps):</label>
            <input
              type="number"
              min="1"
              max="20"
              value={sandboxReps}
              onChange={(e) => setSandboxReps(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-emerald-400 font-mono font-black"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300">Waga Gryfu (kg):</label>
            <div className="flex items-center gap-1.5 pt-0.5">
              {[20, 15, 10].map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSandboxBarWeight(b)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    sandboxBarWeight === b
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {b} kg
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Math Results Comparison Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase font-mono">
              <span>Brzycki</span>
              <span className="text-emerald-400">Zalecany</span>
            </div>
            <div className="text-base sm:text-lg font-black text-white font-mono">{brzyckiCalc} kg</div>
            <div className="text-[10px] text-slate-500 font-mono">Masa / (1.0278 - 0.0278×R)</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">Epley</div>
            <div className="text-base sm:text-lg font-black text-white font-mono">{epleyCalc} kg</div>
            <div className="text-[10px] text-slate-500 font-mono">Masa × (1 + 0.0333×R)</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">Lombardi</div>
            <div className="text-base sm:text-lg font-black text-white font-mono">{lombardiCalc} kg</div>
            <div className="text-[10px] text-slate-500 font-mono">Masa × R^0.10</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">Wathan</div>
            <div className="text-base sm:text-lg font-black text-white font-mono">{wathanCalc} kg</div>
            <div className="text-[10px] text-slate-500 font-mono">100M / (48.8 + 53.8e^-0.075R)</div>
          </div>
        </div>

        {/* Live Plate Breakdown */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-300 font-bold">
              Talerze na stronę sztangi ({weightPerSide} kg/stronę):
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {platesResult.length === 0 ? (
              <span className="text-xs text-slate-500">Pusty gryf ({sandboxBarWeight} kg)</span>
            ) : (
              platesResult.map((p, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold">
                  {p.count}× {p.weight}kg
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 📚 LISTA ROZDZIAŁÓW PORADNIKA (AKORDEON DOKUMENTACJI) */}
      {/* ======================================================== */}
      <div className="space-y-3">
        {filteredChapters.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
            <HelpCircle className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">Brak wyników dla szukanej frazy</h4>
            <p className="text-xs text-slate-500">Spróbuj wpisać inną nazwę algorytmu, np. "1RM", "EMA", "Room" lub "Tonaż".</p>
          </div>
        ) : (
          filteredChapters.map((chapter) => {
            const Icon = chapter.icon;
            const isExpanded = expandedChapters[chapter.id] === true;

            return (
              <div
                key={chapter.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-md transition-all"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleChapter(chapter.id)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                          {chapter.title}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-800 text-emerald-400 border border-emerald-500/20">
                          {chapter.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {chapter.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400 shrink-0 ml-2">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Expanded Chapter Details */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/80 space-y-4 animate-fadeIn">
                    
                    {/* Summary */}
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                      {chapter.summary}
                    </p>

                    {/* Formula Box */}
                    {chapter.formula && (
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                          Wzór Matematyczny / Algorytm:
                        </span>
                        <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                          {chapter.formula}
                        </pre>
                      </div>
                    )}

                    {/* Bullet Points */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-200">Zasada Działania &amp; Szczegóły:</span>
                      <ul className="space-y-1.5">
                        {chapter.details.map((detail, dIdx) => (
                          <li key={dIdx} className="text-xs text-slate-300 flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Concrete Examples Table */}
                    {chapter.examples && chapter.examples.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-200">Przykłady Praktyczne:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {chapter.examples.map((ex, exIdx) => (
                            <div key={exIdx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                              <div className="font-bold text-slate-300">{ex.label}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{ex.formula}</div>
                              <div className="font-mono font-bold text-emerald-400">{ex.result}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mini FAQ */}
                    {chapter.faq && chapter.faq.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Najczęstsze Pytania (FAQ):</span>
                        </span>
                        <div className="space-y-2">
                          {chapter.faq.map((item, fIdx) => (
                            <div key={fIdx} className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1 text-xs">
                              <div className="font-bold text-amber-300">P: {item.q}</div>
                              <div className="text-slate-300 leading-relaxed">O: {item.a}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
