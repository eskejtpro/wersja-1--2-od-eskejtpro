import React from 'react';
import { 
  Menu, 
  Search, 
  Plus, 
  Calendar, 
  Download, 
  HardDrive, 
  ShieldCheck, 
  Sun, 
  Moon, 
  Dumbbell,
  Sparkles,
  Monitor,
  Maximize2,
  DownloadCloud
} from 'lucide-react';
import { AppSettings } from '../types';

interface ModernHeaderProps {
  activeView: string;
  onSelectView: (view: string) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  autoSaveStatus: string;
  onOpenAddExerciseModal?: () => void;
  onExportJson?: () => void;
  onCreateBackup?: () => void;
  onToggleMobileMenu?: () => void;
  currentWeekName?: string;
  currentDayName?: string;
}

export const ModernHeader: React.FC<ModernHeaderProps> = ({
  activeView,
  onSelectView,
  settings,
  onUpdateSettings,
  autoSaveStatus,
  onOpenAddExerciseModal,
  onExportJson,
  onCreateBackup,
  onToggleMobileMenu,
  currentWeekName,
  currentDayName
}) => {
  const isDark = settings.theme === 'dark';

  const viewTitles: Record<string, { title: string; subtitle: string }> = {
    quick_access: {
      title: 'Pulpit Szybkiego Dostępu',
      subtitle: 'Modułowy panel kontrolny, stoper, nawodnienie i szybki asystent'
    },
    plan: {
      title: 'Plan Treningowy & Rejestr Serii',
      subtitle: `${currentWeekName || 'Tydzień 1'} • ${currentDayName || 'Bieżący Trening'}`
    },
    stats: {
      title: 'Analityka & Progres Siły',
      subtitle: 'Szacowane 1RM, objętość tonażowa i wykresy progresji'
    },
    muscle: {
      title: 'Rozkład Partii Mięśniowych',
      subtitle: 'Analiza objętości serii i balansu sylwetki'
    },
    weight: {
      title: 'Dziennik Masy Ciała',
      subtitle: 'Monitorowanie wagi, średnie kroczące i trendy'
    },
    profile: {
      title: 'Centrum Synchronizacji & Badania Krwi',
      subtitle: 'Lokalna synchronizacja Windows ↔ Android oraz rejestr badań zdrowotnych z plikami JSON'
    },
    cycles: {
      title: 'Kalendarz',
      subtitle: 'Kalendarz iniekcji, historia tygodni oraz kalkulator stężeń modelowych'
    },
    exercises: {
      title: 'Katalog & Baza Wzorcowa Ćwiczeń',
      subtitle: 'Słownik szablonów ćwiczeń – baza referencyjna w 100% odizolowana od analiz i wykresów progresu'
    },
    ai: {
      title: 'Trener AI & Periodyzacja',
      subtitle: 'Inteligentna analiza planu, progresji ciężaru i periodyzacji z modelem Gemini'
    },
    settings: {
      title: 'Ustawienia & Auto-Backup JSON',
      subtitle: 'Kopie bezpieczeństwa, eksport i konfiguracja profilu'
    }
  };

  const currentViewMeta = viewTitles[activeView] || {
    title: 'GymTracker Pro',
    subtitle: 'Nowoczesny system treningowy'
  };

  return (
    <header
      className={`border-b select-none px-4 sm:px-6 pb-3.5 pt-[max(0.875rem,calc(0.65rem+env(safe-area-inset-top,0px)))] flex items-center justify-between gap-4 transition-colors z-10 ${
        isDark 
          ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/95 backdrop-blur-xl border-slate-800/80 text-slate-100' 
          : 'bg-white/95 backdrop-blur-xl border-slate-200/80 text-slate-900 shadow-sm'
      }`}
      style={{
        boxShadow: isDark ? '0 8px 24px -4px rgba(0, 0, 0, 0.5), inset 0 -1px 0 rgba(255, 255, 255, 0.06)' : undefined
      }}
      id="modern-app-header"
    >
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Mobile Menu Toggle (Left Side) */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className={`p-2 rounded-xl border md:hidden transition-all shrink-0 cursor-pointer ${
            isDark 
              ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white active:scale-95' 
              : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 active:scale-95'
          }`}
          title="Otwórz menu nawigacji"
          id="btn-mobile-menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2">
            <span>{currentViewMeta.title}</span>
            <button
              type="button"
              onClick={() => onSelectView('settings')}
              id="app-version-badge" 
              className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${isDark ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100'}`}
              title="Wersja aplikacji - kliknij, aby sprawdzić aktualizacje"
            >
              v{settings.installedAppVersion || '3.0.0'}
            </button>
          </h1>
          <p className={`text-xs font-medium truncate max-w-md ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {currentViewMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Quick Global Actions & Mobile Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Status Pill on Desktop */}
        <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
        }`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="truncate max-w-[200px]">{autoSaveStatus}</span>
        </div>

        {/* Quick Add Exercise when in Plan View */}
        {activeView === 'plan' && onOpenAddExerciseModal && (
          <button
            type="button"
            onClick={onOpenAddExerciseModal}
            className="px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-950/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            id="btn-header-add-exercise"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Dodaj Ćwiczenie</span>
            <span className="sm:hidden">Dodaj</span>
          </button>
        )}

        {/* Quick DPI & Resolution Scale Selector */}
        <div className="hidden md:flex items-center rounded-xl p-1 bg-slate-900/90 border border-slate-800 text-[11px] font-bold" title="Rozdzielczość, zagęszczenie pikseli i ostrość interfejsu (HiDPI)">
          <span className="flex items-center gap-1 text-slate-400 px-1.5 py-0.5 text-[10px]">
            <Monitor className="w-3 h-3 text-emerald-400" />
            <span className="hidden 2xl:inline">DPI:</span>
          </span>
          <button
            type="button"
            onClick={() => onUpdateSettings({ uiScale: 'compact' })}
            className={`px-1.5 py-0.5 rounded-lg transition-colors cursor-pointer ${
              settings.uiScale === 'compact'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Kompaktowe (90%) - maksymalne zagęszczenie informacji na ekranie"
          >
            90%
          </button>
          <button
            type="button"
            onClick={() => onUpdateSettings({ uiScale: 'standard' })}
            className={`px-1.5 py-0.5 rounded-lg transition-colors cursor-pointer ${
              settings.uiScale === 'standard'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Standardowa rozdzielczość (100% 1080p/1440p)"
          >
            100%
          </button>
          <button
            type="button"
            onClick={() => onUpdateSettings({ uiScale: 'high' })}
            className={`px-1.5 py-0.5 rounded-lg transition-colors cursor-pointer ${
              (settings.uiScale === 'high' || !settings.uiScale)
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Wysoka rozdzielczość i wyrazistość HiDPI (110% - ostre jak brzytwa)"
          >
            110%
          </button>
          <button
            type="button"
            onClick={() => onUpdateSettings({ uiScale: 'ultra' })}
            className={`px-1.5 py-0.5 rounded-lg transition-colors cursor-pointer ${
              settings.uiScale === 'ultra'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Ultra HD / 4K (125% - duża krystaliczna czcionka i elementy)"
          >
            125%
          </button>
        </div>

        {/* Quick Google Cloud Server Indicator */}
        <button
          type="button"
          onClick={() => onSelectView('settings')}
          className={`p-1.5 px-2.5 rounded-xl border transition-colors hidden sm:flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
            settings.googleUser
              ? 'bg-sky-500/10 border-sky-500/30 text-sky-300 hover:bg-sky-500/20'
              : isDark
              ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-sky-400 hover:border-sky-500/40'
              : 'bg-white border-slate-200 text-slate-700 hover:text-sky-600 shadow-xs'
          }`}
          title={settings.googleUser ? `Połączono z Google: ${settings.googleUser.email}` : "Połącz z serwerem Google Cloud"}
          id="btn-header-google-server"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span className="hidden xl:inline">{settings.googleUser ? 'Google Sync' : 'Serwer Google'}</span>
        </button>

        {/* Quick Server Update Button */}
        <button
          type="button"
          onClick={() => onSelectView('settings')}
          className={`p-2 rounded-xl border transition-colors hidden lg:flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
            isDark 
              ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40' 
              : 'bg-white border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 shadow-xs'
          }`}
          title="Centrum aktualizacji aplikacji przez serwer"
          id="btn-header-update-server"
        >
          <DownloadCloud className="w-4 h-4 text-emerald-400" />
          <span className="hidden 2xl:inline">Aktualizacje</span>
        </button>

        {/* Quick Backup Trigger */}
        {onCreateBackup && (
          <button
            type="button"
            onClick={onCreateBackup}
            className={`p-2 rounded-xl border transition-colors hidden sm:flex items-center gap-1.5 text-xs font-semibold ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40' 
                : 'bg-white border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 shadow-xs'
            }`}
            title="Utwórz natychmiastową kopię zapasową"
            id="btn-header-quick-backup"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden xl:inline">Szybki Backup</span>
          </button>
        )}

        {/* Export JSON Button */}
        {onExportJson && (
          <button
            type="button"
            onClick={onExportJson}
            className={`p-2 rounded-xl border transition-colors hidden sm:flex items-center gap-1.5 text-xs font-semibold ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' 
                : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs'
            }`}
            title="Pobierz plik danych workout_data.json"
            id="btn-header-export-json"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span className="hidden xl:inline">Eksport JSON</span>
          </button>
        )}
      </div>
    </header>
  );
};
