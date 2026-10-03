import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  RotateCcw, 
  Folder, 
  Check, 
  Copy, 
  ShieldCheck, 
  Archive, 
  Clock, 
  RefreshCw, 
  Trash2, 
  HardDrive, 
  Smartphone, 
  Wifi, 
  ArrowRight, 
  ArrowLeft,
  Shield, 
  Sparkles, 
  Info, 
  Monitor,
  Dumbbell,
  Flame,
  Trophy,
  Zap,
  Activity,
  Sliders,
  ChevronRight,
  Globe,
  Palette,
  Search,
  BookOpen,
  User,
  Database,
  FileJson,
  Upload,
  Download,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { GymData, AppSettings, BackupEntry, SyncServerConfig } from '../types';
import { initialGymData } from '../data/initialData';
import { AgentSettingsPanel } from './AgentSettingsPanel';
import { LayoutCustomizerSettings } from './LayoutCustomizerSettings';
import { AppIntegrityDiagnosticRunner } from './AppIntegrityDiagnosticRunner';
import { AppUpdateServerPanel } from './AppUpdateServerPanel';
import { CloudTrainingSyncPanel } from './CloudTrainingSyncPanel';
import type { CloudTrainingSync } from '../utils/useCloudTrainingSync';
import { AppKnowledgeGuide } from './AppKnowledgeGuide';
import { TurboPowerSettingsPanel } from './TurboPowerSettingsPanel';
import { GOOGLE_CLOUD_SHARED_URL } from '../utils/serverApi';

interface SettingsViewProps {
  data: GymData;
  cloudSync: CloudTrainingSync;
  googleSession: { token: string; serverUrl: string } | null;
  onGoogleSessionChange: (session: { token: string; serverUrl: string } | null) => void;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  onExportJson: () => void;
  onImportJson: (imported: GymData) => void;
  onResetData: () => void;
  backups?: BackupEntry[];
  onCreateBackup?: () => void;
  onRestoreBackup?: (backup: BackupEntry) => void;
  onDownloadBackup?: (backup: BackupEntry) => void;
  onDeleteBackup?: (id: string) => void;
  onUpdateSyncConfig?: (config: Partial<SyncServerConfig>) => void;
  onNavigateToProfile?: () => void;
}

type SettingsCategory = 
  | 'turbo'
  | 'google' 
  | 'layout' 
  | 'agent' 
  | 'analysis' 
  | 'backup' 
  | 'general' 
  | 'tests' 
  | 'guide';

const GoogleGIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const SettingsView: React.FC<SettingsViewProps> = ({
  data,
  cloudSync,
  googleSession,
  onGoogleSessionChange,
  onUpdateSettings,
  onExportJson,
  onImportJson,
  onResetData,
  backups = [],
  onCreateBackup,
  onRestoreBackup,
  onDownloadBackup,
  onDeleteBackup,
  onUpdateSyncConfig,
  onNavigateToProfile
}) => {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const configuredGoogleServer = (data.settings.updateServerUrl || GOOGLE_CLOUD_SHARED_URL).trim().replace(/\/+$/, '');
  const hasGoogleSession = Boolean(data.settings.googleUser && googleSession?.token &&
    googleSession.serverUrl.trim().replace(/\/+$/, '') === configuredGoogleServer);
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState('');

  const jsonString = JSON.stringify(data, null, 2);
  const diagnostics = (() => {
    const weeks = Array.isArray(data.weeks) ? data.weeks : [];
    const days = weeks.flatMap(w => Array.isArray(w.days) ? w.days : []);
    const exercises = days.flatMap(d => Array.isArray(d.exercises) ? d.exercises : []);
    const missingIds = [...weeks, ...days, ...exercises].filter(item => !item?.id).length;
    let jsonValid = false;
    try { JSON.parse(jsonString); jsonValid = true; } catch { jsonValid = false; }
    return { weeks: weeks.length, days: days.length, exercises: exercises.length, missingIds, jsonValid };
  })();

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAnalysisSettings = () => {
    const defaults = initialGymData.settings;
    const keys = Object.keys(defaults).filter(key => key.startsWith('analysis')) as Array<keyof AppSettings>;
    onUpdateSettings(Object.fromEntries(keys.map(key => [key, defaults[key]])) as Partial<AppSettings>);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.weeks)) {
          onImportJson(parsed as GymData);
          setImportError('');
        } else {
          setImportError('Nieprawidłowy format pliku. Brak sekcji "weeks".');
        }
      } catch (err) {
        setImportError('Błąd parsowania pliku JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleExportSettings = () => {
    const blob = new Blob([JSON.stringify({ schema: 'gymtracker-settings-v1', settings: data.settings }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'gymtracker-settings.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleSettingsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(String(event.target?.result || '{}'));
        if (!parsed.settings || typeof parsed.settings !== 'object' || Array.isArray(parsed.settings)) throw new Error('invalid');
        onUpdateSettings(parsed.settings as Partial<AppSettings>); setImportError('');
      } catch { setImportError('Błędny plik konfiguracji ustawień.'); }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  // Definicje głównych kafelków ustawień
  const categoriesList = useMemo(() => [
    {
      id: 'turbo' as SettingsCategory,
      title: 'Tryb Pełnej Mocy (Xiaomi 14T Turbo)',
      shortTitle: 'Pełna Moc (Turbo)',
      description: '144Hz silnik GPU, rampa rozgrzewki z talerzami, asystent progresji i haptyka X-axis',
      badge: data.settings.turbo144HzMode !== false ? '⚡ 144Hz Turbo' : 'Standard',
      badgeColor: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40',
      icon: Zap,
      accentColor: 'from-emerald-500 via-teal-600 to-cyan-600',
      iconBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      keywords: ['turbo', 'moc', 'xiaomi', '14t', '144hz', 'rozgrzewka', 'rampa', 'progresja', 'haptyka', 'wibracje', 'wakelock', 'gpu']
    },
    {
      id: 'google' as SettingsCategory,
      title: 'Serwer Google & Logowanie',
      shortTitle: 'Serwer Google',
      description: 'Logowanie przez Google i skonfigurowany serwer API',
      badge: hasGoogleSession ? `● ${data.settings.googleUser?.displayName}` : data.settings.googleUser ? 'Zaloguj ponownie' : 'Google OAuth',
      badgeColor: hasGoogleSession ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' : 'text-sky-300 bg-sky-500/15 border-sky-500/30',
      icon: GoogleGIcon,
      accentColor: 'from-sky-500 to-blue-600',
      iconBg: 'bg-white text-slate-900 border-slate-300 shadow-sm',
      keywords: ['google', 'cloud', 'serwer', 'logowanie', 'run', 'konto', 'auth', 'synchronizacja', 'hub']
    },
    {
      id: 'layout' as SettingsCategory,
      title: 'Układ & Wygląd',
      shortTitle: 'Układ & Wygląd',
      description: 'Zagęszczenie HiDPI, czcionka Segoe/Mono, ekran Windows/Android, branding',
      badge: `${data.settings.uiScale || '110%'} • ${data.settings.fontFamilyChoice || 'Segoe'}`,
      badgeColor: 'text-purple-300 bg-purple-500/15 border-purple-500/30',
      icon: Palette,
      accentColor: 'from-purple-500 to-indigo-600',
      iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
      keywords: ['uklad', 'czcionka', 'font', 'widok', 'ekran', 'windows', 'hidpi', 'rozdzielczosc', 'skala', 'kolory', 'motyw']
    },
    {
      id: 'agent' as SettingsCategory,
      title: 'Trener AI & Persony',
      shortTitle: 'Trener AI',
      description: 'Agent analityczny, persony trenerskie (Trener, Analityk, Lekarz), heurystyka',
      badge: data.settings.aiAgentPersona ? `Persona: ${data.settings.aiAgentPersona}` : 'Aktywny Trener AI',
      badgeColor: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
      icon: Activity,
      accentColor: 'from-amber-500 to-orange-600',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
      keywords: ['ai', 'agent', 'trener', 'coach', 'persona', 'doradca', 'analiza', 'heurystyka']
    },
    {
      id: 'analysis' as SettingsCategory,
      title: 'Algorytmy & Analizy IBCA',
      shortTitle: 'Analizy IBCA',
      description: 'Formuła Epleya 1RM, filtry serii, tonaż, alerty balansu i periodyzacja',
      badge: `${data.settings.analysisPRMetric || 'e1RM'} • Filtry serii`,
      badgeColor: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
      icon: Sliders,
      accentColor: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
      keywords: ['analizy', 'ibca', 'tonaz', '1rm', 'epley', 'rekordy', 'filtry', 'wykresy', 'alerty', 'plateau', 'stagnacja']
    },
    {
      id: 'backup' as SettingsCategory,
      title: 'Kopie Zapasowe & Baza JSON',
      shortTitle: 'Kopie & Baza',
      description: 'Automatyczne kopie, przywracanie, pobieranie i wczytywanie pliku bazy',
      badge: `${backups.length} kopii zapasowych`,
      badgeColor: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
      icon: Archive,
      accentColor: 'from-cyan-500 to-blue-600',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
      keywords: ['kopia', 'backup', 'json', 'baza', 'przywroc', 'eksport', 'import', 'autobackup']
    },
    {
      id: 'general' as SettingsCategory,
      title: 'Ustawienia Ogólne & Zawodnik',
      shortTitle: 'Ogólne & Zawodnik',
      description: 'Imię zawodnika, jednostki (kg/lbs), autozapis, widok startowy i bezpieczeństwo',
      badge: `${data.settings.athleteName || 'Zawodnik'} • ${data.settings.unit || 'kg'}`,
      badgeColor: 'text-slate-300 bg-slate-800 border-slate-700',
      icon: User,
      accentColor: 'from-slate-600 to-slate-800',
      iconBg: 'bg-slate-800 text-slate-300 border-slate-700',
      keywords: ['ogolne', 'zawodnik', 'imie', 'kg', 'lbs', 'jednostka', 'autozapis', 'startowy', 'usun']
    },
    {
      id: 'tests' as SettingsCategory,
      title: 'Testy Integralności & Diagnostyka',
      shortTitle: 'Testy & Diagnostyka',
      description: 'Wybrane kontrole logiki aplikacji i integralności danych lokalnych',
      badge: '100% Zautomatyzowane',
      badgeColor: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
      icon: ShieldCheck,
      accentColor: 'from-emerald-600 to-green-700',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
      keywords: ['testy', 'diagnostyka', 'integralnosc', 'runner', 'weryfikacja', 'room', 'sql']
    },
    {
      id: 'guide' as SettingsCategory,
      title: 'Poradnik & Wzory Treningowe',
      shortTitle: 'Poradnik & Wzory',
      description: 'Kompletne kompendium wiedzy o mezocyklu, wzorach obliczeniowych i periodyzacji',
      badge: 'Baza Wiedzy',
      badgeColor: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
      icon: BookOpen,
      accentColor: 'from-amber-600 to-yellow-600',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
      keywords: ['poradnik', 'wzory', 'wiedza', 'instrukcja', 'przewodnik', 'dokumentacja', 'kalkulator']
    }
  ], [data.settings, backups.length, hasGoogleSession]);

  // Filtrowanie kafelków według zapytania wyszukiwania
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categoriesList;
    const q = searchQuery.toLowerCase().trim();
    return categoriesList.filter(cat => 
      cat.title.toLowerCase().includes(q) ||
      cat.description.toLowerCase().includes(q) ||
      cat.keywords.some(k => k.includes(q))
    );
  }, [categoriesList, searchQuery]);

  const activeCategoryInfo = useMemo(() => {
    return categoriesList.find(c => c.id === activeCategory);
  }, [categoriesList, activeCategory]);

  return (
    <div className="w-full flex-1 p-3 sm:p-6 space-y-5" id="view-settings">
      {/* 🧭 HEADER: Kompaktowy nagłówek Centrum Ustawień */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  {activeCategory ? activeCategoryInfo?.title : 'Centrum Ustawień'}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  v3.0 • Room &amp; Google Cloud
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeCategory 
                  ? activeCategoryInfo?.description 
                  : 'Wybierz kafelek ustawień, aby przejść do szczegółowej konfiguracji modułu'}
              </p>
            </div>
          </div>

          {/* Akcje nagłówka: Przycisk Powrotu (gdy w kafelku) LUB Wyszukiwarka (gdy w menu) */}
          <div className="flex items-center gap-2.5">
            {activeCategory ? (
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span>Wróć do wszystkich kafelków</span>
              </button>
            ) : (
              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Szukaj opcji (np. google, 1rm)..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pasek szybkiego przeskakiwania między kafelkami (dostępny w widoku szczegółowym) */}
        {activeCategory && (
          <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <span className="text-[11px] text-slate-400 font-medium shrink-0 mr-1 flex items-center gap-1">
              <span>Szybki skok:</span>
            </span>
            {categoriesList.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.shortTitle}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 📱 GŁÓWNY HUB KAFELKÓW (WIDOK PRZEJRZYSTY, KOMPAKTOWY)                     */}
      {/* Pokazuje się, gdy użytkownik nie wszedł jeszcze w żaden konkretny kafelek */}
      {/* ========================================================================= */}
      {!activeCategory && (
        <div className="space-y-4 animate-fadeIn">
          {/* 🌟 BANER INFRASTRUKTURY GOOGLE CLOUD & LOGOWANIA */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-sky-500/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-white border border-slate-300 shadow-sm flex items-center justify-center shrink-0">
                <GoogleGIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-slate-100 uppercase tracking-wider">
                    Logowanie Google
                  </span>
                  {hasGoogleSession ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Sesja API aktywna: {data.settings.googleUser?.displayName}
                    </span>
                  ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                      {data.settings.googleUser ? 'Konto zapamiętane — zaloguj ponownie' : 'Niezalogowany'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {hasGoogleSession
                    ? `Połączono z kontem: ${data.settings.googleUser?.email}`
                    : data.settings.googleUser
                      ? 'Dane konta są zapamiętane. Zaloguj się ponownie, aby korzystać z serwera.'
                      : 'Zaloguj się kontem Google, aby połączyć się z serwerem API.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveCategory('google')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 shadow-xs active:scale-95 ${
                data.settings.googleUser
                  ? 'bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700'
                  : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-md'
              }`}
            >
              {data.settings.googleUser ? (
                <>
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  <span>Zarządzaj połączeniem Google</span>
                </>
              ) : (
                <>
                  <GoogleGIcon className="w-3.5 h-3.5" />
                  <span>Zaloguj się przez konto Google</span>
                </>
              )}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Siatka Głównych Kafelków */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {filteredCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="group relative bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between"
                >
                  {/* Górna belka kafelka: Ikona + Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-transform duration-200 group-hover:scale-105 ${cat.iconBg}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold truncate max-w-[140px] ${cat.badgeColor}`}>
                        {cat.badge}
                      </span>
                    </div>

                    {/* Tytuł i krótki opis */}
                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                      <span>{cat.title}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  {/* Dolny pasek: Wskaźnik "Otwórz" */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">
                      Konfiguruj moduł
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-slate-800 group-hover:bg-emerald-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-all">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCategories.length === 0 && (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <p className="text-sm text-slate-300 font-bold">Nie znaleziono ustawień pasujących do "{searchQuery}"</p>
              <p className="text-xs text-slate-500">Wpisz inną frazę lub wyczyść wyszukiwanie, aby zobaczyć wszystkie 8 kategorii.</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                Wyczyść filtr
              </button>
            </div>
          )}

          {/* Kompaktowa karta szybkiego stanu zawodnika i bazy na dole hubu */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-200 block">Aktywny profil: {data.settings.athleteName || 'Zawodnik'}</span>
                <span className="text-[11px] text-slate-400">
                  Jednostka: <strong>{data.settings.unit || 'kg'}</strong> • Dane lokalne: {data.weeks.length} tygodni • Auto-backup: {data.settings.autoBackupEnabled !== false ? 'Włączony' : 'Wyłączony'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveCategory('general')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium cursor-pointer"
              >
                Zmień profil zawodnika
              </button>
              {onCreateBackup && (
                <button
                  type="button"
                  id="btn-create-backup-now"
                  onClick={onCreateBackup}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Szybka kopia</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⚡ 0. KAFELEK: TRYB PEŁNEJ MOCY & TURBO XIAOMI 14T                        */}
      {/* ========================================================================= */}
      <div className={activeCategory === 'turbo' ? 'space-y-4 animate-fadeIn' : 'hidden'}>
        <TurboPowerSettingsPanel
          settings={data.settings}
          data={data}
          onUpdateSettings={onUpdateSettings}
          isDark={true}
        />
      </div>

      {/* ========================================================================= */}
      {/* 🚀 1. KAFELEK: SERWER GOOGLE & LOGOWANIE                                  */}
      {/* ========================================================================= */}
      <div className={activeCategory === 'google' ? 'space-y-4 animate-fadeIn' : 'hidden'}>
        <AppUpdateServerPanel
          settings={data.settings}
          onUpdateSettings={onUpdateSettings}
          googleSession={googleSession}
          onGoogleSessionChange={onGoogleSessionChange}
        />
        <CloudTrainingSyncPanel data={data} sync={cloudSync} />
      </div>

      {/* ========================================================================= */}
      {/* 🎨 2. KAFELEK: UKŁAD, CZCIONKI & EKRAN WINDOWS/ANDROID                    */}
      {/* ========================================================================= */}
      <div className={activeCategory === 'layout' ? 'space-y-5 animate-fadeIn' : 'hidden'}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Układ, Czcionki &amp; Renderowanie Interfejsu</span>
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono">
            Live Reorder &amp; Font Engine
          </span>
        </div>

        {/* Customizer Layout Component */}
        <LayoutCustomizerSettings
          settings={data.settings}
          onUpdateSettings={onUpdateSettings}
          isDark={true}
        />

        {/* Rozdzielczość HiDPI i Zagęszczenie */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-100">Rozdzielczość &amp; Zagęszczenie Pikseli (HiDPI)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {data.settings.uiScale === 'compact' ? '90% (Kompakt)' : data.settings.uiScale === 'standard' ? '100% (Standard)' : data.settings.uiScale === 'ultra' ? '125% (Ultra HD)' : '110% (HiDPI Sharp)'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Dopasuj zagęszczenie elementów, wielkość czcionki oraz ostrość renderowania tekstu i krawędzi (High-DPI / Retina / 4K).
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {[
              { id: 'compact', pct: '90%', label: 'Kompakt' },
              { id: 'standard', pct: '100%', label: 'Standard' },
              { id: 'high', pct: '110%', label: 'HiDPI Ostre' },
              { id: 'ultra', pct: '125%', label: 'Ultra 4K' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => onUpdateSettings({ uiScale: item.id as any })}
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  (data.settings.uiScale === item.id || (!data.settings.uiScale && item.id === 'high'))
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span>{item.pct}</span>
                <span className="text-[10px] font-normal opacity-80">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <label className="flex items-center gap-3 text-xs font-semibold text-slate-300 cursor-pointer">
              <input 
                id="chk-reduced-motion" 
                type="checkbox" 
                checked={data.settings.reducedMotion === true} 
                onChange={e => onUpdateSettings({ reducedMotion: e.target.checked })} 
                className="accent-emerald-500" 
              /> 
              Ogranicz animacje i przejścia (Reduce Motion)
            </label>
          </div>
        </div>

        {/* Personalizacja Logo i Nazwy Aplikacji */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">Personalizacja Logo &amp; Nazwy Programu</span>
            </div>
            {(data.settings.customAppName || data.settings.customAppSubtitle || data.settings.customAppIcon) && (
              <button
                type="button"
                onClick={() => onUpdateSettings({ customAppName: undefined, customAppSubtitle: undefined, customAppIcon: undefined })}
                className="text-[10px] text-slate-400 hover:text-emerald-400 underline transition-colors"
              >
                Przywróć domyślne
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Tytuł programu w menu:
              </label>
              <input
                type="text"
                placeholder="np. GYMTRACKER"
                value={data.settings.customAppName || ''}
                onChange={(e) => onUpdateSettings({ customAppName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Podtytuł programu:
              </label>
              <input
                type="text"
                placeholder="np. Workspace Treningowy"
                value={data.settings.customAppSubtitle || ''}
                onChange={(e) => onUpdateSettings({ customAppSubtitle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Wybór Ikony */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-2">
              Ikona w nagłówku menu:
            </label>
            <div className="grid grid-cols-6 gap-2">
              {[
                { id: 'dumbbell' as const, label: 'Hantel', icon: Dumbbell },
                { id: 'flame' as const, label: 'Ogień', icon: Flame },
                { id: 'trophy' as const, label: 'Puchar', icon: Trophy },
                { id: 'zap' as const, label: 'Błysk', icon: Zap },
                { id: 'activity' as const, label: 'Puls', icon: Activity },
                { id: 'shield' as const, label: 'Tarcza', icon: Shield },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = (data.settings.customAppIcon || 'dumbbell') === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onUpdateSettings({ customAppIcon: item.id })}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-slate-200'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] mt-1 truncate max-w-full font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🤖 3. KAFELEK: TRENER AI & PERSONY                                        */}
      {/* ========================================================================= */}
      <div className={activeCategory === 'agent' ? 'space-y-4 animate-fadeIn' : 'hidden'}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Dedykowany Panel Ustawień Agenta &amp; AI Coach</span>
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
            Persony: Trener / Analityk / Lekarz / Motywator
          </span>
        </div>

        <AgentSettingsPanel
          settings={data.settings}
          weeks={data.weeks}
          onUpdateSettings={onUpdateSettings}
        />
      </div>

      {/* ========================================================================= */}
      {/* 📊 4. KAFELEK: ALGORYTMY & ANALIZY IBCA                                   */}
      {/* ========================================================================= */}
      <div className={activeCategory === 'analysis' ? 'space-y-5 animate-fadeIn' : 'hidden'}>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Ustawienia Algorytmów Analiz IBCA</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Konfiguracja kalkulacji tonażu, szacowania 1RM i wskaźników mezocyklu.
              </p>
            </div>
            <button
              type="button"
              id="btn-reset-analysis-settings"
              onClick={resetAnalysisSettings}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer shrink-0 border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Przywróć domyślne analizy</span>
            </button>
          </div>

          <div id="settings-diagnostics" className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-300"><HardDrive className="w-4 h-4" /> Diagnostyka danych</div>
            <div>Struktura JSON: <span className={diagnostics.jsonValid ? 'text-emerald-300' : 'text-red-300'}>{diagnostics.jsonValid ? 'poprawna' : 'błędna'}</span></div>
            <div>Zakres: {diagnostics.weeks} tyg. · {diagnostics.days} dni · {diagnostics.exercises} ćw.</div>
            {diagnostics.missingIds > 0 && <div className="text-amber-300">Ostrzeżenie: {diagnostics.missingIds} elementów bez identyfikatora.</div>}
            {diagnostics.missingIds === 0 && <div className="text-slate-500">Brak brakujących identyfikatorów.</div>}
          </div>

          {/* Podgrupa 1: Filtry Serii i Dni Roboczych */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">1. Filtry Serii i Dni Roboczych</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label
                id="chk-analysis-only-completed"
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={data.settings.analysisOnlyCompleted !== false}
                  onChange={(e) => onUpdateSettings({ analysisOnlyCompleted: e.target.checked })}
                  className="accent-emerald-500 cursor-pointer"
                />
                <span>Tylko zatwierdzone dni</span>
              </label>

              <label
                id="chk-analysis-include-partial-history"
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={data.settings.analysisIncludePartialHistory === true}
                  onChange={(e) => onUpdateSettings({ analysisIncludePartialHistory: e.target.checked })}
                  className="accent-emerald-500 cursor-pointer"
                />
                <span>Uwzględniaj częściowe serie po odhaczeniu</span>
              </label>

              <label
                id="chk-analysis-hide-empty"
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={data.settings.analysisHideEmptyGroups !== false}
                  onChange={(e) => onUpdateSettings({ analysisHideEmptyGroups: e.target.checked })}
                  className="accent-emerald-500 cursor-pointer"
                />
                <span>Ukrywaj puste partie mięśniowe</span>
              </label>

              <label
                id="chk-analysis-require-history-for-completed"
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={data.settings.analysisRequireHistoryForCompleted !== false}
                  onChange={(e) => onUpdateSettings({ analysisRequireHistoryForCompleted: e.target.checked })}
                  className="accent-emerald-500 cursor-pointer"
                />
                <span>Wymagaj historii dla dnia ukończonego</span>
              </label>

              <label
                id="input-analysis-min-executed-sets"
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <span>Min. serii w ćwiczeniu</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={data.settings.analysisMinExecutedSets || 1}
                  onChange={(e) => onUpdateSettings({ analysisMinExecutedSets: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })}
                  className="w-14 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-center text-xs text-slate-100"
                />
              </label>
            </div>
          </div>

          {/* Podgrupa 2: Wskaźniki Siły i Wykresy Progresji */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">2. Wskaźniki Siły i Wykresy Progresji</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label
                id="chk-analysis-show-1rm"
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={data.settings.analysisShow1RM !== false}
                  onChange={(e) => onUpdateSettings({ analysisShow1RM: e.target.checked })}
                  className="accent-emerald-500 cursor-pointer"
                />
                <span>Pokazuj szacowany 1RM (Epley)</span>
              </label>

              <label
                id="chk-analysis-show-bodyweight"
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={data.settings.analysisShowBodyWeight !== false}
                  onChange={(e) => onUpdateSettings({ analysisShowBodyWeight: e.target.checked })}
                  className="accent-emerald-500 cursor-pointer"
                />
                <span>Pokazuj zmianę masy ciała</span>
              </label>

              <label
                id="chk-analysis-weekly-tonnage"
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={data.settings.analysisShowWeeklyTonnage === true}
                    onChange={(e) => onUpdateSettings({ analysisShowWeeklyTonnage: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Tonaż tygodniowy</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">Domyślnie ukryte</span>
              </label>

              <label
                id="chk-analysis-trend-line"
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={data.settings.analysisShowTrendLine !== false}
                  onChange={(e) => onUpdateSettings({ analysisShowTrendLine: e.target.checked })}
                  className="accent-emerald-500 cursor-pointer"
                />
                <span>Trend siły (linia regresji)</span>
              </label>

              <label
                id="chk-analysis-pr-markers"
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={data.settings.analysisShowPRMarkers !== false}
                  onChange={(e) => onUpdateSettings({ analysisShowPRMarkers: e.target.checked })}
                  className="accent-emerald-500 cursor-pointer"
                />
                <span>Markery rekordów PR</span>
              </label>

              <label
                id="select-analysis-pr-metric"
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <span>Metryka PR</span>
                <select
                  value={data.settings.analysisPRMetric || 'e1RM'}
                  onChange={(e) => onUpdateSettings({ analysisPRMetric: e.target.value as AppSettings['analysisPRMetric'] })}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200"
                >
                  <option value="e1RM">Szacowany e1RM</option>
                  <option value="weight">Ciężar (kg)</option>
                  <option value="volume">Tonaż (kg)</option>
                </select>
              </label>
            </div>
          </div>

          {/* Podgrupa 3: Zakres Czasowy & Formatowanie Wykresów */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">3. Zakres Czasowy &amp; Formatowanie Wykresów</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label
                id="input-analysis-start-week"
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <span>Od tygodnia:</span>
                <input
                  type="number"
                  min="1"
                  value={data.settings.analysisStartWeek || 1}
                  onChange={(e) => onUpdateSettings({ analysisStartWeek: Math.max(1, Number(e.target.value) || 1) })}
                  className="w-14 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-center text-xs text-slate-100"
                />
              </label>

              <label
                id="input-analysis-end-week"
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <span>Do tygodnia:</span>
                <input
                  type="number"
                  min="1"
                  value={data.settings.analysisEndWeek || 999}
                  onChange={(e) => onUpdateSettings({ analysisEndWeek: Math.max(1, Number(e.target.value) || 999) })}
                  className="w-14 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-center text-xs text-slate-100"
                />
              </label>

              <label
                id="select-analysis-default-metric"
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <span>Domyślna metryka</span>
                <select
                  value={data.settings.analysisDefaultMetric || 'progressPct'}
                  onChange={(e) => onUpdateSettings({ analysisDefaultMetric: e.target.value as AppSettings['analysisDefaultMetric'] })}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200"
                >
                  <option value="progressPct">Procent progresu (%)</option>
                  <option value="volume">Tonaż (kg)</option>
                  <option value="executedSets">Wykonane serie</option>
                </select>
              </label>

              <label
                id="chk-analysis-round-values"
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={data.settings.analysisRoundValues !== false}
                  onChange={(e) => onUpdateSettings({ analysisRoundValues: e.target.checked })}
                  className="accent-emerald-500 cursor-pointer"
                />
                <span>Zaokrąglaj wartości wyników</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 💾 5. KAFELEK: KOPIE ZAPASOWE & BAZA JSON                                 */}
      {/* ========================================================================= */}
      <div className={activeCategory === 'backup' ? 'space-y-5 animate-fadeIn' : 'hidden'}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Lewa kolumna: Konfiguracja auto-backupu i operacje na plikach */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Archive className="w-4 h-4 text-cyan-400" />
                <span>Automatyczna Kopia Zapasowa (Auto-Backup)</span>
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.settings.autoBackupEnabled ?? true}
                  onChange={(e) => onUpdateSettings({ autoBackupEnabled: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  id="chk-autobackup-enabled"
                />
                <span className="text-xs text-slate-300 font-semibold">Włączona</span>
              </label>
            </div>

            {/* Folder docelowy */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>Ścieżka zapisu kopii:</span>
              </label>
              <input
                type="text"
                value={data.settings.backupFolderPath || '%LOCALAPPDATA%\\GymTracker\\Backups'}
                onChange={(e) => onUpdateSettings({ backupFolderPath: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
                id="input-backup-folder"
              />
            </div>

            {/* Opcje wyzwalaczy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:bg-slate-850">
                <input
                  type="checkbox"
                  checked={data.settings.backupOnSave ?? true}
                  onChange={(e) => onUpdateSettings({ backupOnSave: e.target.checked })}
                  className="w-3.5 h-3.5 accent-emerald-500"
                  id="chk-backup-onsave"
                />
                <span className="text-slate-300">Kopia przy zapisie</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:bg-slate-850">
                <input
                  type="checkbox"
                  checked={data.settings.backupOnClose ?? true}
                  onChange={(e) => onUpdateSettings({ backupOnClose: e.target.checked })}
                  className="w-3.5 h-3.5 accent-emerald-500"
                  id="chk-backup-onclose"
                />
                <span className="text-slate-300">Kopia przy wyjściu</span>
              </label>
            </div>

            {/* Przycisk utworzenia kopii */}
            {onCreateBackup && (
              <button
                type="button"
                onClick={onCreateBackup}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Archive className="w-4 h-4" />
                <span>Utwórz Kopię Zapasową Teraz</span>
              </button>
            )}

            {data.settings.lastBackupTime && (
              <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Ostatnia kopia: {data.settings.lastBackupTime}</span>
              </p>
            )}

            {/* Eksport / Import pliku JSON */}
            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-300">Import / Eksport Całej Bazy</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onExportJson}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  id="btn-export-json"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pobierz workout_data.json</span>
                </button>

                <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Wczytaj plik JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  id="btn-export-settings"
                  onClick={handleExportSettings}
                  className="px-3 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-slate-800 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-cyan-400" />
                  <span>Eksportuj same ustawienia</span>
                </button>
                <label className="px-3 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer border border-slate-800">
                  <Upload className="w-3 h-3 text-cyan-400" />
                  <span>Importuj ustawienia</span>
                  <input id="input-import-settings" type="file" accept=".json" onChange={handleSettingsUpload} className="hidden" />
                </label>
              </div>
              {importError && <p className="text-xs text-red-400">{importError}</p>}
            </div>
          </div>

          {/* Prawa kolumna: Historia kopii zapasowych */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Historia Kopii Zapasowych ({backups.length})</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Max 15 kopii</span>
            </div>

            {backups.length === 0 ? (
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                Brak jeszcze automatycznych kopii. Kliknij "Utwórz Kopię Zapasową Teraz" lub dokonaj edycji planu.
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {backups.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="font-mono text-slate-200 font-semibold text-xs flex items-center gap-1.5">
                        <Archive className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{b.fileName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 font-mono">
                        <span>{b.timestamp}</span>
                        <span>•</span>
                        <span>{b.weeksCount} tyg.</span>
                        <span>•</span>
                        <span>{(b.sizeBytes / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onDownloadBackup && (
                        <button
                          type="button"
                          onClick={() => onDownloadBackup(b)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 border border-slate-700 cursor-pointer"
                          title="Pobierz ten plik backupu"
                        >
                          <Download className="w-3 h-3 text-emerald-400" />
                          <span>Pobierz</span>
                        </button>
                      )}
                      {onRestoreBackup && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Czy na pewno chcesz przywrócić kopię zapasową z ${b.timestamp}?`)) {
                              onRestoreBackup(b);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-bold flex items-center gap-1 border border-emerald-800/60 cursor-pointer"
                          title="Przywróć stan z tej kopii"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Przywróć</span>
                        </button>
                      )}
                      {onDeleteBackup && (
                        <button
                          type="button"
                          onClick={() => onDeleteBackup(b.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/80 text-slate-400 hover:text-red-300 transition-colors border border-slate-700 cursor-pointer"
                          title="Usuń wpis kopii"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Podgląd JSON */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Podgląd struktury bazy JSON</span>
              <button
                type="button"
                onClick={handleCopyJson}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 font-medium border border-slate-700 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Skopiowano!' : 'Kopiuj JSON'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ⚙️ 6. KAFELEK: USTAWIENIA OGÓLNE & ZAWODNIK                              */}
      {/* ========================================================================= */}
      <div className={activeCategory === 'general' ? 'space-y-4 animate-fadeIn' : 'hidden'}>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 max-w-3xl">
          <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2.5 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            <span>Profil Zawodnika &amp; Preferencje Aplikacji</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Athlete Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Imię / Pseudonim zawodnika:
              </label>
              <input
                type="text"
                value={data.settings.athleteName}
                onChange={(e) => onUpdateSettings({ athleteName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold"
                placeholder="np. Pasik92"
              />
            </div>

            {/* Unit Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Jednostka ciężaru (kg / lbs):
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ unit: 'kg' })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    data.settings.unit === 'kg'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-850'
                  }`}
                >
                  Kilogramy (kg)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ unit: 'lbs' })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    data.settings.unit === 'lbs'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-850'
                  }`}
                >
                  Funty (lbs)
                </button>
              </div>
            </div>
          </div>

          {/* Widok startowy */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Domyślny ekran po uruchomieniu programu:
            </label>
            <select
              value={data.settings.startupView || 'plan'}
              onChange={(e) => onUpdateSettings({ startupView: e.target.value as AppSettings['startupView'] })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-medium"
            >
              <option value="plan">Plan Treningowy (Główny)</option>
              <option value="quick_access">Pulpit Szybki Dostęp</option>
              <option value="stats">Progres &amp; Wykresy</option>
              <option value="muscle">Partie Mięśniowe</option>
              <option value="weight">Dziennik Wagi &amp; Pomiary</option>
              <option value="cycles">Kalendarz &amp; Protokoły</option>
              <option value="exercises">Katalog Ćwiczeń</option>
              <option value="profile">Profil Zawodnika &amp; Badania</option>
              <option value="settings">Centrum Ustawień</option>
            </select>
          </div>

          {/* Opcje autozapisu i wygody */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={data.settings.autoSave}
                onChange={(e) => onUpdateSettings({ autoSave: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Automatyczny zapis w czasie rzeczywistym</span>
                <span className="text-[11px] text-slate-500">Natychmiast zapisuje serię po odhaczeniu bez czekania na zamknięcie</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={data.settings.confirmBeforeDelete !== false}
                onChange={(e) => onUpdateSettings({ confirmBeforeDelete: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
                id="chk-confirm-before-delete"
              />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Potwierdzaj usuwanie elementów</span>
                <span className="text-[11px] text-slate-500">Wyświetla ostrzeżenie przed skasowaniem ćwiczenia lub tygodnia</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={data.settings.rememberLastView === true}
                onChange={(e) => onUpdateSettings({ rememberLastView: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
                id="chk-remember-last-view"
              />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Zapamiętaj ostatnio otwarty ekran</span>
                <span className="text-[11px] text-slate-500">Po ponownym otwarciu wraca do ekranu, na którym zakończyłeś sesję</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={data.settings.showHoverAnnotations !== false}
                onChange={(e) => onUpdateSettings({ showHoverAnnotations: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
                id="chk-hover-annotations-main"
              />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Podpowiedzi po najechaniu myszką</span>
                <span className="text-[11px] text-slate-500">Karty wyjaśniające znikające po 5 sekundach</span>
              </div>
            </label>
          </div>

          {/* Reset do domyślnego planu */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-red-300 block">Przywrócenie domyślnego planu</span>
              <span className="text-[11px] text-slate-500">Resetuje tygodnie i ćwiczenia do stanu początkowego</span>
            </div>
            <button
              type="button"
              onClick={onResetData}
              className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              id="btn-reset-demo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Przywróć domyślny plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🛡️ 7. KAFELEK: TESTY INTEGRALNOŚCI & DIAGNOSTYKA                          */}
      {/* ========================================================================= */}
      <div className={activeCategory === 'tests' ? 'space-y-4 animate-fadeIn' : 'hidden'}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Centrum Testów Działania i Integralności Wszystkich Funkcji</span>
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
            100% Automated Test Suite
          </span>
        </div>

        <AppIntegrityDiagnosticRunner
          data={data}
          onUpdateSettings={onUpdateSettings}
          isDark={true}
        />
      </div>

      {/* ========================================================================= */}
      {/* 📖 8. KAFELEK: PORADNIK & WZORY TRENINGOWE                                */}
      {/* ========================================================================= */}
      <div className={activeCategory === 'guide' ? 'space-y-4 animate-fadeIn' : 'hidden'}>
        <AppKnowledgeGuide isDark={true} />
      </div>
    </div>
  );
};
