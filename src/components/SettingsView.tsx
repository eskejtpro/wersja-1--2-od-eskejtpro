import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  Download, 
  Upload, 
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
  Shield, 
  Sparkles, 
  Info, 
  Monitor,
  Dumbbell,
  Flame,
  Trophy,
  Zap,
  Activity,
  Code2,
  ChevronDown,
  ChevronUp,
  FileCode,
  Terminal
} from 'lucide-react';
import { GymData, AppSettings, BackupEntry, SyncServerConfig } from '../types';
import { initialGymData } from '../data/initialData';
import { AgentSettingsPanel } from './AgentSettingsPanel';
import { LayoutCustomizerSettings } from './LayoutCustomizerSettings';
import { AppIntegrityDiagnosticRunner } from './AppIntegrityDiagnosticRunner';
import { AppUpdateServerPanel } from './AppUpdateServerPanel';
import { AppKnowledgeGuide } from './AppKnowledgeGuide';
import { BookOpen } from 'lucide-react';

interface SettingsViewProps {
  data: GymData;
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

export const SettingsView: React.FC<SettingsViewProps> = ({
  data,
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
  const [activeSettingsTab, setActiveSettingsTab] = useState<'all' | 'guide' | 'update' | 'google_server' | 'layout' | 'agent' | 'tests' | 'general' | 'backup'>('all');
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

  return (
    <div className="w-full flex-1 p-3 sm:p-6 space-y-6" id="view-settings">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <span>Centrum Ustawień &amp; Personalizacji GymTracker Pro</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Dostosuj układ funkcji, skalowanie czcionki, ekran Windows, agenta AI, persony, automatyczne testy i kopie zapasowe.
          </p>
        </div>

        {/* Quick Nav Tab Pills */}
        <div className="flex items-center gap-1.5 flex-wrap bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'all', label: 'Wszystko' },
            { id: 'google_server', label: '🌍 Serwer Google & Logowanie' },
            { id: 'update', label: 'Aktualizacja & Serwer' },
            { id: 'guide', label: '📖 Poradnik & Wzory' },
            { id: 'layout', label: 'Układ & Czcionki & Windows' },
            { id: 'agent', label: 'Agent & Persony' },
            { id: 'tests', label: 'Testy Integralności' },
            { id: 'general', label: 'Ogólne & Baza' },
            { id: 'backup', label: 'Auto-Backup & Kod' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSettingsTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSettingsTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 📖 0. KOMPLETNY PRZEWODNIK, PORADNIK & DOKUMENTACJA MATEMATYCZNA */}
      {(activeSettingsTab === 'all' || activeSettingsTab === 'guide') && (
        <div className="space-y-4">
          <AppKnowledgeGuide isDark={true} />
        </div>
      )}

      {/* 🌟 1. UKŁAD, CZCIONKI & ROZMIAR EKRANU POD WINDOWS */}
      {(activeSettingsTab === 'all' || activeSettingsTab === 'layout') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Dostosowanie Układu, Widoczności Funkcji &amp; Czcionki Windows</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
              Live Reorder &amp; Font Engine
            </span>
          </div>

          <LayoutCustomizerSettings
            settings={data.settings}
            onUpdateSettings={onUpdateSettings}
            isDark={true}
          />
        </div>
      )}

      {/* 🌟 2. CENTRUM TESTÓW INTEGRALNOŚCI & DIAGNOSTYKI FUNKCJI */}
      {(activeSettingsTab === 'all' || activeSettingsTab === 'tests') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Centrum Testów Działania i Integralności Wszystkich Funkcji</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
              100% Automated Test Suite
            </span>
          </div>

          <AppIntegrityDiagnosticRunner
            data={data}
            onUpdateSettings={onUpdateSettings}
            isDark={true}
          />
        </div>
      )}

      {/* 🌟 3. DEDYKOWANY PANEL AGENTA, PERSONY I TRYBY ODPOWIEDZI */}
      {(activeSettingsTab === 'all' || activeSettingsTab === 'agent') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Dedykowany Panel Ustawień Agenta &amp; AI Coach</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
              Persony: Trener / Analityk / Lekarz / Motywator
            </span>
          </div>

          <AgentSettingsPanel
            settings={data.settings}
            weeks={data.weeks}
            onUpdateSettings={onUpdateSettings}
          />
        </div>
      )}

      {/* 🚀 4. SERWER GOOGLE CLOUD & SYSTEM AKTUALIZACJI */}
      {(activeSettingsTab === 'all' || activeSettingsTab === 'update' || activeSettingsTab === 'google_server') && (
        <div className="space-y-4">
          <AppUpdateServerPanel
            settings={data.settings}
            onUpdateSettings={onUpdateSettings}
          />
        </div>
      )}

      {/* 🌟 5. OGÓLNE USTAWIENIA, BAZA WINDOWS, ANNOTATIONS & KOPIE */}
      {(activeSettingsTab === 'all' || activeSettingsTab === 'general' || activeSettingsTab === 'backup') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: General Configuration */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
            Konfiguracja Środowiska Windows
          </h3>

          <div id="settings-diagnostics" className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-300"><HardDrive className="w-4 h-4" /> Diagnostyka danych</div>
            <div>Struktura JSON: <span className={diagnostics.jsonValid ? 'text-emerald-300' : 'text-red-300'}>{diagnostics.jsonValid ? 'poprawna' : 'błędna'}</span></div>
            <div>Zakres: {diagnostics.weeks} tyg. · {diagnostics.days} dni · {diagnostics.exercises} ćw.</div>
            {diagnostics.missingIds > 0 && <div className="text-amber-300">Ostrzeżenie: {diagnostics.missingIds} elementów bez identyfikatora.</div>}
            {diagnostics.missingIds === 0 && <div className="text-slate-500">Brak brakujących identyfikatorów.</div>}
          </div>

          <label className="flex items-center gap-3 text-xs font-semibold text-slate-300">
            <input type="checkbox" checked={data.settings.analysisOnlyCompleted !== false}
              onChange={(e) => onUpdateSettings({ analysisOnlyCompleted: e.target.checked })}
              className="accent-emerald-500" />
            Analiza tylko ukończonych treningów (zalecane)
          </label>
          <p className="text-[11px] text-slate-500 -mt-3">Wyłączenie uwzględnia także zaplanowane, niewykonane serie.</p>

          {/* Windows Local App Data Path */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Docelowa ścieżka pliku w systemie Windows:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={data.settings.windowsPath}
                onChange={(e) => onUpdateSettings({ windowsPath: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Domyślna lokalizacja na Windows 10/11: <code className="text-slate-400">%LOCALAPPDATA%\GymTracker\workout_data.json</code>
            </p>
          </div>

          {/* UI Scale and Pixel Density Engine */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-100">Rozdzielczość & Zagęszczenie Pikseli (HiDPI)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {data.settings.uiScale === 'compact' ? '90% (Kompakt)' : data.settings.uiScale === 'standard' ? '100% (Standard)' : data.settings.uiScale === 'ultra' ? '125% (Ultra HD)' : '110% (HiDPI Sharp)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Dopasuj zagęszczenie elementów, wielkość czcionki oraz ostrość renderowania tekstu i krawędzi (High-DPI / Retina / 4K).
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => onUpdateSettings({ uiScale: 'compact' })}
                className={`px-2.5 py-2 rounded-lg text-xs font-bold border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  data.settings.uiScale === 'compact'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <span>90%</span>
                <span className="text-[9px] font-normal opacity-80">Kompakt</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ uiScale: 'standard' })}
                className={`px-2.5 py-2 rounded-lg text-xs font-bold border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  data.settings.uiScale === 'standard'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <span>100%</span>
                <span className="text-[9px] font-normal opacity-80">Standard</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ uiScale: 'high' })}
                className={`px-2.5 py-2 rounded-lg text-xs font-bold border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  (data.settings.uiScale === 'high' || !data.settings.uiScale)
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <span>110%</span>
                <span className="text-[9px] font-normal opacity-80">HiDPI Ostre</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ uiScale: 'ultra' })}
                className={`px-2.5 py-2 rounded-lg text-xs font-bold border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  data.settings.uiScale === 'ultra'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <span>125%</span>
                <span className="text-[9px] font-normal opacity-80">Ultra 4K</span>
              </button>
            </div>
          </div>

          {/* Unit Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Jednostka ciężaru (kg / lbs):
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ unit: 'kg' })}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  data.settings.unit === 'kg'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                Kilogramy (kg)
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ unit: 'lbs' })}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  data.settings.unit === 'lbs'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                Funty (lbs)
              </button>
            </div>
          </div>

          {/* Athlete Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Imię / Pseudonim zawodnika:
            </label>
            <input
              type="text"
              value={data.settings.athleteName}
              onChange={(e) => onUpdateSettings({ athleteName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs"
            />
          </div>

          {/* Personalizacja Logo i Nazwy Aplikacji (Branding) */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
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
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs"
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
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Wybór Ikony */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                Ikona w nagłówku menu:
              </label>
              <div className="grid grid-cols-6 gap-1.5">
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
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                      title={item.label}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[9px] mt-1 truncate max-w-full font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Auto Save Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Automatyczny zapis</span>
              <span className="text-[11px] text-slate-500">
                Zapisuje zmiany w czasie rzeczywistym przy każdej modyfikacji
              </span>
            </div>
            <input
              type="checkbox"
              checked={data.settings.autoSave}
              onChange={(e) => onUpdateSettings({ autoSave: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 cursor-pointer"
            />
          </div>
          <label className="flex items-center gap-3 text-xs font-semibold text-slate-300"><input id="chk-reduced-motion" type="checkbox" checked={data.settings.reducedMotion === true} onChange={e=>onUpdateSettings({reducedMotion:e.target.checked})} className="accent-emerald-500" /> Ogranicz animacje i przejścia</label>

          <div className="pt-3 border-t border-slate-800 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Ustawienia analiz IBCA (v{__APP_VERSION__})</h4>
                <p className="text-[11px] text-slate-400">
                  Precyzyjna konfiguracja algorytmów obliczania tonażu, szacowania 1RM i wskaźników mezocyklu.
                </p>
              </div>
              <button
                type="button"
                id="btn-reset-analysis-settings"
                onClick={resetAnalysisSettings}
                data-annotation-title="Przywróć Domyślne Ustawienia Analiz"
                data-annotation-desc="Resetuje wszystkie wskaźniki i filtry analityczne do zalecanych wartości domyślnych."
                data-annotation-category="Ustawienia Analiz IBCA"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Przywróć domyślne analizy</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-[11px] text-slate-300 space-y-1">
              <p className="font-bold text-emerald-300">Jak działa silnik analiz GymTracker Pro?</p>
              <p>• <strong>Filtrowanie:</strong> Zlicza tylko zatwierdzone dni i faktycznie wykonane serie, zapobiegając zawyżaniu tonażu.</p>
              <p>• <strong>Izolacja Katalogu:</strong> Baza i katalog ćwiczeń to tylko słownik wzorcowy. Pozycje z katalogu nigdy nie są brane pod uwagę w analizach wykresów, 1RM ani tonażu.</p>
              <p>• <strong>Kalkulacja tonażu:</strong> Suma pracy mechanicznej: Ciężar × Powtórzenia dla każdej ukończonej serii.</p>
              <p>• <strong>Szacowanie 1RM:</strong> Wzór Epleya: Ciężar × (1 + Powtórzenia / 30) wyznaczany z najcięższej serii dnia.</p>
              <p>• <strong>Alerty balansu:</strong> Wykrywanie dysproporcji objętościowych pomiędzy ruchami Push, Pull i Legs.</p>
            </div>

            {/* Podgrupa 1: Filtry Serii i Dni Roboczych */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">1. Filtry Serii i Dni Roboczych</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <label
                  id="chk-analysis-only-completed"
                  data-annotation-title="Tylko Zatwierdzone Dni"
                  data-annotation-desc="Wyklucza z wykresów przyszłe, jeszcze nieodbyte treningi, zapobiegając zafałszowaniu realnego tonażu."
                  data-annotation-category="Filtry Danych"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
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
                  data-annotation-title="Częściowe Serie po Odhaczeniu"
                  data-annotation-desc="Gdy odznaczysz 2 z 4 serii, system natychmiast doliczy je do tonażu dnia bez czekania na koniec sesji."
                  data-annotation-category="Filtry Danych"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
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
                  data-annotation-title="Ukrywaj Puste Partie"
                  data-annotation-desc="Usuwa z wykresów grupy mięśniowe, dla których w danym okresie nie zarejestrowano żadnej serii."
                  data-annotation-category="Filtry Danych"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
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
                  data-annotation-title="Wymagaj Historii dla Dnia Ukończonego"
                  data-annotation-desc="Dzień treningowy uznawany jest za wykonany tylko wtedy, gdy zawiera faktycznie zapisane serie."
                  data-annotation-category="Filtry Danych"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
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
                  data-annotation-title="Minimum Wykonanych Serii"
                  data-annotation-desc="Próg serii roboczych w ćwiczeniu, aby sesja była uwzględniona w analizie (odrzuca rozgrzewki)."
                  data-annotation-category="Filtry Danych"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <span>Min. serii w ćwiczeniu</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={data.settings.analysisMinExecutedSets || 1}
                    onChange={(e) => onUpdateSettings({ analysisMinExecutedSets: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })}
                    className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-center text-xs text-slate-100"
                  />
                </label>
              </div>
            </div>

            {/* Podgrupa 2: Wskaźniki Siły i Wykresy Progresji */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">2. Wskaźniki Siły i Wykresy Progresji</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <label
                  id="chk-analysis-show-1rm"
                  data-annotation-title="Szacowany 1RM (Epley)"
                  data-annotation-desc="Pokazuje maksymalny teoretyczny ciężar na 1 powtórzenie wg formuły Epleya na podstawie najcięższej serii."
                  data-annotation-category="Wskaźniki Siły"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
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
                  data-annotation-title="Zmiana Masy Ciała"
                  data-annotation-desc="Nakłada wykres wagi ciała na wykresy siły, ułatwiając kalkulację siły względnej."
                  data-annotation-category="Korelacja Sylwetkowa"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
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
                  data-annotation-title="Wykres Tonażu Tygodniowego (Domyślnie ukryty)"
                  data-annotation-desc="Wizualizuje sumę podniesionych kilogramów w całym tygodniu w formie słupków. Opcja domyślnie ukryta w raporcie mezocyklu."
                  data-annotation-category="Wykresy Objętości"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={data.settings.analysisShowWeeklyTonnage === true}
                      onChange={(e) => onUpdateSettings({ analysisShowWeeklyTonnage: e.target.checked })}
                      className="accent-emerald-500 cursor-pointer"
                    />
                    <span>Pokaż / Przywróć tonaż tygodniowy</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">Domyślnie ukryte</span>
                </label>

                <label
                  id="chk-analysis-week-comparison"
                  data-annotation-title="Porównanie Tygodni"
                  data-annotation-desc="Włącza tabelę porównującą tonaż i serie pomiędzy dwoma dowolnymi tygodniami mezocyklu."
                  data-annotation-category="Porównania"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.analysisShowWeekComparison !== false}
                    onChange={(e) => onUpdateSettings({ analysisShowWeekComparison: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Pokaż porównanie tygodni</span>
                </label>

                <label
                  id="chk-analysis-trend-line"
                  data-annotation-title="Trend Siły"
                  data-annotation-desc="Wykreśla linię regresji liniowej pokazującą długoterminowy wektor wzrostu siły."
                  data-annotation-category="Wskaźniki Siły"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
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
                  data-annotation-title="Markery Rekordów PR"
                  data-annotation-desc="Wyróżnia na wykresach punkty, w których pobito dotychczasowy rekord życiowy."
                  data-annotation-category="Rekordy Życiowe"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
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
                  data-annotation-title="Metryka Rekordu PR"
                  data-annotation-desc="Kryterium uznawania rekordu: Szacowany 1RM, Ciężar bezwzględny czy Tonaż serii."
                  data-annotation-category="Kryteria Rekordów"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <span>Metryka PR</span>
                  <select
                    value={data.settings.analysisPRMetric || 'e1RM'}
                    onChange={(e) => onUpdateSettings({ analysisPRMetric: e.target.value as AppSettings['analysisPRMetric'] })}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200"
                  >
                    <option value="e1RM">Szacowany e1RM</option>
                    <option value="weight">Ciężar (kg)</option>
                    <option value="volume">Tonaż (kg)</option>
                  </select>
                </label>

                <label
                  id="chk-analysis-weekly-metrics"
                  data-annotation-title="Kafelki Metryk Tygodniowych (Domyślnie ukryte)"
                  data-annotation-desc="Wyświetla zbiorcze kafelki z liczbą sesji, zróżnicowaniem ćwiczeń i średnią objętością. Opcja domyślnie ukryta w raporcie mezocyklu."
                  data-annotation-category="Wskaźniki Tygodniowe"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={data.settings.analysisShowWeeklyMetrics === true}
                      onChange={(e) => onUpdateSettings({ analysisShowWeeklyMetrics: e.target.checked })}
                      className="accent-emerald-500 cursor-pointer"
                    />
                    <span>Pokaż / Przywróć metryki tygodniowe</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">Domyślnie ukryte</span>
                </label>
              </div>
            </div>

            {/* Podgrupa 3: Kolumny Tabeli Wykonania */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">3. Kolumny Tabeli Wykonania</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
                <label
                  id="chk-analysis-executed-days"
                  data-annotation-title="Kolumna: Wykonane Dni"
                  data-annotation-desc="Pokazuje w tabeli liczbę zaliczonych dni treningowych w danym tygodniu."
                  data-annotation-category="Kolumny Tabeli"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.analysisShowExecutedDays !== false}
                    onChange={(e) => onUpdateSettings({ analysisShowExecutedDays: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Kolumna wykonanych dni</span>
                </label>

                <label
                  id="chk-analysis-executed-exercises"
                  data-annotation-title="Kolumna: Liczba Ćwiczeń"
                  data-annotation-desc="Pokazuje w tabeli liczbę unikalnych ćwiczeń faktycznie wykonanych w tygodniu."
                  data-annotation-category="Kolumny Tabeli"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.analysisShowExecutedExercises !== false}
                    onChange={(e) => onUpdateSettings({ analysisShowExecutedExercises: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Kolumna ćwiczeń</span>
                </label>

                <label
                  id="chk-analysis-executed-sets"
                  data-annotation-title="Kolumna: Wykonane Serie"
                  data-annotation-desc="Pokazuje sumę zrealizowanych serii roboczych z wyłączeniem rozgrzewek."
                  data-annotation-category="Kolumny Tabeli"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.analysisShowExecutedSets !== false}
                    onChange={(e) => onUpdateSettings({ analysisShowExecutedSets: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Kolumna serii</span>
                </label>

                <label
                  id="chk-analysis-executed-reps"
                  data-annotation-title="Kolumna: Wykonane Powtórzenia"
                  data-annotation-desc="Prezentuje łączną sumę poprawnie zaliczonych powtórzeń w danym tygodniu."
                  data-annotation-category="Kolumny Tabeli"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.analysisShowExecutedReps !== false}
                    onChange={(e) => onUpdateSettings({ analysisShowExecutedReps: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Kolumna powtórzeń</span>
                </label>

                <label
                  id="chk-analysis-volume-delta"
                  data-annotation-title="Kolumna: Zmiana Tonażu (Δ)"
                  data-annotation-desc="Oblicza różnicę tonażu w stosunku do poprzedniego tygodnia (+/- kg)."
                  data-annotation-category="Kolumny Tabeli"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.analysisShowVolumeDelta !== false}
                    onChange={(e) => onUpdateSettings({ analysisShowVolumeDelta: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Zmiana tonażu (Volume Delta)</span>
                </label>

                <label
                  id="chk-analysis-data-confidence"
                  data-annotation-title="Kolumna: Wiarygodność Danych"
                  data-annotation-desc="Ocenia stopień kompletności wpisów treningowych w procentach."
                  data-annotation-category="Kolumny Tabeli"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.analysisShowDataConfidence !== false}
                    onChange={(e) => onUpdateSettings({ analysisShowDataConfidence: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Wiarygodność danych</span>
                </label>

                <label
                  id="chk-analysis-best-e1rm"
                  data-annotation-title="Kolumna: Najlepszy e1RM"
                  data-annotation-desc="Prezentuje najwyższy zarejestrowany wynik szacowanego 1RM w całym planie."
                  data-annotation-category="Kolumny Tabeli"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.analysisShowBestE1RM !== false}
                    onChange={(e) => onUpdateSettings({ analysisShowBestE1RM: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Najlepszy e1RM</span>
                </label>

                <label
                  id="chk-analysis-latest-result"
                  data-annotation-title="Kolumna: Ostatni Wynik"
                  data-annotation-desc="Prezentuje ostatni zarejestrowany wpis roboczy (ciężar × powtórzenia)."
                  data-annotation-category="Kolumny Tabeli"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.analysisShowLatestResult !== false}
                    onChange={(e) => onUpdateSettings({ analysisShowLatestResult: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Ostatni wynik roboczy</span>
                </label>

                <label
                  id="chk-analysis-show-execution-summary"
                  data-annotation-title="Podsumowanie Wykonania Mezocyklu"
                  data-annotation-desc="Karta syntetycznego podsumowania zrealizowanych jednostek i łącznego tonażu."
                  data-annotation-category="Podsumowanie"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.analysisShowExecutionSummary !== false}
                    onChange={(e) => onUpdateSettings({ analysisShowExecutionSummary: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Podsumowanie wykonania</span>
                </label>
              </div>
            </div>

            {/* Podgrupa 4: Prewencja, Alerty i Diagnostyka */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">4. Prewencja, Alerty i Diagnostyka</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <label
                  id="chk-analysis-show-alerts"
                  data-annotation-title="Alerty Balansu Objętości"
                  data-annotation-desc="Weryfikuje proporcje Push vs. Pull i zgłasza ostrzeżenie w razie dysbalansu mięśniowego."
                  data-annotation-category="Prewencja Kontuzji"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.analysisShowAlerts !== false}
                    onChange={(e) => onUpdateSettings({ analysisShowAlerts: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Pokazuj alerty balansu Push/Pull/Legs</span>
                </label>

                <label
                  id="chk-analysis-show-data-quality-warnings"
                  data-annotation-title="Ostrzeżenia Jakości Danych"
                  data-annotation-desc="Komunikaty diagnostyczne w razie wykrycia brakujących serii lub nietypowych skoków."
                  data-annotation-category="Diagnostyka"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.analysisShowDataQualityWarnings !== false}
                    onChange={(e) => onUpdateSettings({ analysisShowDataQualityWarnings: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Ostrzeżenia jakości i spójności danych</span>
                </label>

                <label
                  id="chk-analysis-warn-missing-history"
                  data-annotation-title="Ostrzegaj o Brakującej Historii"
                  data-annotation-desc="Wskazuje ćwiczenia zaplanowane w treningu, ale nieodznaczone seriami w historii."
                  data-annotation-category="Diagnostyka"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.analysisWarnMissingHistory !== false}
                    onChange={(e) => onUpdateSettings({ analysisWarnMissingHistory: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Ostrzegaj o brakującej historii ćwiczenia</span>
                </label>

                <label
                  id="input-analysis-warn-volume-jump-pct"
                  data-annotation-title="Próg Skoku Tonażu (%)"
                  data-annotation-desc="Ostrzega, gdy tonaż wzrośnie z tygodnia na tydzień powyżej zadanego procentu (ochrona ścięgien)."
                  data-annotation-category="Prewencja Kontuzji"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <span>Skok tonażu (%)</span>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={data.settings.analysisWarnVolumeJumpPct || 30}
                    onChange={(e) => onUpdateSettings({ analysisWarnVolumeJumpPct: Math.max(5, Math.min(300, Number(e.target.value) || 30)) })}
                    className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-center text-xs text-slate-100"
                  />
                </label>

                <label
                  id="input-analysis-stagnation-window"
                  data-annotation-title="Okno Stagnacji (Tygodnie)"
                  data-annotation-desc="Liczba kolejnych tygodni bez progresu, po których program sugeruje deload lub zmianę ćwiczenia."
                  data-annotation-category="Autoregulacja"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <span>Okno stagnacji (tyg.)</span>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={data.settings.analysisStagnationWindow || 4}
                    onChange={(e) => onUpdateSettings({ analysisStagnationWindow: Math.max(2, Math.min(20, Number(e.target.value) || 4)) })}
                    className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-center text-xs text-slate-100"
                  />
                </label>

                <label
                  id="input-analysis-stagnation-min"
                  data-annotation-title="Minimalna Liczba Sesji Stagnacji"
                  data-annotation-desc="Wymagana minimalna liczba powtórzonych sesji boju do potwierdzenia plateau."
                  data-annotation-category="Autoregulacja"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <span>Min. sesji stagnacji</span>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={data.settings.analysisStagnationMinSessions || 3}
                    onChange={(e) => onUpdateSettings({ analysisStagnationMinSessions: Math.max(2, Math.min(20, Number(e.target.value) || 3)) })}
                    className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-center text-xs text-slate-100"
                  />
                </label>
              </div>
            </div>

            {/* Podgrupa 5: Regularność, Częstotliwość i Długie Okresy */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">5. Regularność, Częstotliwość i Długie Okresy</span>
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({
                      analysisShowWeeklyTonnage: true,
                      analysisShowWeeklyMetrics: true,
                      analysisShowRegularity: true,
                      analysisShowMonthlyComparison: true,
                      analysisShowPeriodComparison: true,
                    })}
                    className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-[10px] font-bold transition-all"
                    title="Przywraca wszystkie ukryte wykresy i tabele w raporcie mezocyklu"
                  >
                    Pokaż wszystkie sekcje raportu
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({
                      analysisShowWeeklyTonnage: false,
                      analysisShowWeeklyMetrics: false,
                      analysisShowRegularity: false,
                      analysisShowMonthlyComparison: false,
                      analysisShowPeriodComparison: false,
                    })}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-[10px] font-medium transition-all"
                    title="Ukrywa sekcje periodyzacji i porównań zgodnie z domyślnym widokiem"
                  >
                    Schowaj sekcje (Domyślne)
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <label
                  id="chk-analysis-regularity"
                  data-annotation-title="Wykres Regularności Treningowej (Domyślnie ukryty)"
                  data-annotation-desc="Wykres systematyczności treningów w ujęciu tygodniowym (odbyte sesje vs zaplanowane). Domyślnie ukryty w raporcie mezocyklu."
                  data-annotation-category="Dyscyplina"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={data.settings.analysisShowRegularity === true}
                      onChange={(e) => onUpdateSettings({ analysisShowRegularity: e.target.checked })}
                      className="accent-emerald-500 cursor-pointer"
                    />
                    <span>Pokaż / Przywróć regularność</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">Domyślnie ukryte</span>
                </label>

                <label
                  id="input-analysis-regularity-target"
                  data-annotation-title="Docelowy Procent Regularności (%)"
                  data-annotation-desc="Poziom realizacji planu uważany za sukces (domyślnie 80% = np. 4 z 5 treningów)."
                  data-annotation-category="Dyscyplina"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <span>Cel regularności (%)</span>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={data.settings.analysisRegularityTargetPct || 80}
                    onChange={(e) => onUpdateSettings({ analysisRegularityTargetPct: Math.max(10, Math.min(100, Number(e.target.value) || 80)) })}
                    className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-center text-xs text-slate-100"
                  />
                </label>

                <label
                  id="chk-analysis-muscle-frequency"
                  data-annotation-title="Częstotliwość Trenowania Partii"
                  data-annotation-desc="Sprawdza ile razy w tygodniu każda grupa mięśniowa otrzymuje bodziec hipertroficzny."
                  data-annotation-category="Hipertrofia"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.analysisShowMuscleFrequency !== false}
                    onChange={(e) => onUpdateSettings({ analysisShowMuscleFrequency: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Częstotliwość partii mięśniowych</span>
                </label>

                <label
                  id="chk-analysis-monthly-comparison"
                  data-annotation-title="Zestawienie Miesięczne (Domyślnie ukryte)"
                  data-annotation-desc="Grupowanie wyników w ujęciu miesięcy kalendarzowych ułatwiające ewaluację makrocyklu. Domyślnie ukryte w raporcie."
                  data-annotation-category="Makrocykl"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={data.settings.analysisShowMonthlyComparison === true}
                      onChange={(e) => onUpdateSettings({ analysisShowMonthlyComparison: e.target.checked })}
                      className="accent-emerald-500 cursor-pointer"
                    />
                    <span>Pokaż / Przywróć por. miesięczne</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">Domyślnie ukryte</span>
                </label>

                <label
                  id="select-analysis-monthly-metric"
                  data-annotation-title="Metryka Zestawienia Miesięcznego"
                  data-annotation-desc="Wskaźnik porównywany między miesiącami: Tonaż (kg), Serie lub Powtórzenia."
                  data-annotation-category="Makrocykl"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <span>Metryka miesięczna</span>
                  <select
                    value={data.settings.analysisMonthlyMetric || 'volume'}
                    onChange={(e) => onUpdateSettings({ analysisMonthlyMetric: e.target.value as AppSettings['analysisMonthlyMetric'] })}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200"
                  >
                    <option value="volume">Tonaż (kg)</option>
                    <option value="executedSets">Serie</option>
                    <option value="executedReps">Powtórzenia</option>
                  </select>
                </label>

                <label
                  id="chk-analysis-period-comparison"
                  data-annotation-title="Porównanie Bloków Treningowych (Domyślnie ukryte)"
                  data-annotation-desc="Pozwala zestawić dowolne bloki mezocykli (np. blok objętościowy vs intensyfikacyjny). Domyślnie ukryte w raporcie."
                  data-annotation-category="Periodyzacja"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={data.settings.analysisShowPeriodComparison === true}
                      onChange={(e) => onUpdateSettings({ analysisShowPeriodComparison: e.target.checked })}
                      className="accent-emerald-500 cursor-pointer"
                    />
                    <span>Pokaż / Przywróć por. okresów/bloków</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">Domyślnie ukryte</span>
                </label>

                <label
                  id="select-analysis-period-metric"
                  data-annotation-title="Metryka Porównania Bloków"
                  data-annotation-desc="Wskaźnik porównawczy: Tonaż, Serie, Powtórzenia lub Dni Treningowe."
                  data-annotation-category="Periodyzacja"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <span>Metryka okresów</span>
                  <select
                    value={data.settings.analysisPeriodComparisonMetric || 'volume'}
                    onChange={(e) => onUpdateSettings({ analysisPeriodComparisonMetric: e.target.value as AppSettings['analysisPeriodComparisonMetric'] })}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200"
                  >
                    <option value="volume">Tonaż (kg)</option>
                    <option value="executedSets">Serie</option>
                    <option value="executedReps">Powtórzenia</option>
                    <option value="executedDays">Dni</option>
                  </select>
                </label>

                <label
                  id="chk-analysis-show-rolling-volume"
                  data-annotation-title="Średnia Krocząca Tonażu (4T)"
                  data-annotation-desc="Wygładza wahania tonażu obliczając średnią kroczącą z ostatnich 4 tygodni treningowych (funkcja do włączenia dla długich mezocykli)."
                  data-annotation-category="Zaawansowana Periodyzacja"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer sm:col-span-2"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.analysisShowRollingVolume === true}
                    onChange={(e) => onUpdateSettings({ analysisShowRollingVolume: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Średnia krocząca tonażu (4 tygodnie) — włącz tabelę średnich 4T w raporcie</span>
                </label>
              </div>
            </div>

            {/* Podgrupa 6: Zakres Czasowy & Formatowanie Wykresów */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">6. Zakres Czasowy & Formatowanie Wykresów</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <label
                  id="input-analysis-start-week"
                  data-annotation-title="Od Tygodnia (Początek Zakresu)"
                  data-annotation-desc="Numer pierwszego tygodnia branego pod uwagę w wykresach i statystykach."
                  data-annotation-category="Zakres Analizy"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <span>Od tygodnia:</span>
                  <input
                    type="number"
                    min="1"
                    value={data.settings.analysisStartWeek || 1}
                    onChange={(e) => onUpdateSettings({ analysisStartWeek: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-center text-xs text-slate-100"
                  />
                </label>

                <label
                  id="input-analysis-end-week"
                  data-annotation-title="Do Tygodnia (Koniec Zakresu)"
                  data-annotation-desc="Numer ostatniego tygodnia zakresu analizy (999 = wszystkie dostępne tygodnie)."
                  data-annotation-category="Zakres Analizy"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <span>Do tygodnia:</span>
                  <input
                    type="number"
                    min="1"
                    value={data.settings.analysisEndWeek || 999}
                    onChange={(e) => onUpdateSettings({ analysisEndWeek: Math.max(1, Number(e.target.value) || 999) })}
                    className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-center text-xs text-slate-100"
                  />
                </label>

                <label
                  id="select-analysis-default-metric"
                  data-annotation-title="Domyślna Metryka Wykresu"
                  data-annotation-desc="Główny parametr prezentowany na osi wykresu: Procent Progresu, Tonaż lub Serie."
                  data-annotation-category="Konfiguracja Wykresu"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <span>Domyślna metryka</span>
                  <select
                    value={data.settings.analysisDefaultMetric || 'progressPct'}
                    onChange={(e) => onUpdateSettings({ analysisDefaultMetric: e.target.value as AppSettings['analysisDefaultMetric'] })}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200"
                  >
                    <option value="progressPct">Procent progresu (%)</option>
                    <option value="volume">Tonaż (kg)</option>
                    <option value="executedSets">Wykonane serie</option>
                  </select>
                </label>

                <label
                  id="chk-analysis-round-values"
                  data-annotation-title="Zaokrąglaj Wartości Wyników"
                  data-annotation-desc="Zaokrągla wartości tonażu i procentów do liczb całkowitych, poprawiając przejrzystość."
                  data-annotation-category="Formatowanie"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.analysisRoundValues !== false}
                    onChange={(e) => onUpdateSettings({ analysisRoundValues: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Zaokrąglaj wartości wyników</span>
                </label>

                <label
                  id="chk-analysis-auto-refresh"
                  data-annotation-title="Automatyczne Odświeżanie"
                  data-annotation-desc="Automatycznie przelicza wykresy i statystyki w tle po każdej zapisanej serii."
                  data-annotation-category="Wydajność"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.analysisAutoRefresh !== false}
                    onChange={(e) => onUpdateSettings({ analysisAutoRefresh: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Odświeżaj po zmianie danych</span>
                </label>

                <label
                  id="input-analysis-trend-window-weeks"
                  data-annotation-title="Okno Ruchomego Trendu"
                  data-annotation-desc="Liczba ostatnich tygodni brana do wygładzania wahań i kalkulacji lokalnej średniej siły."
                  data-annotation-category="Wygładzanie Statystyczne"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <span>Okno trendu (tyg.)</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={data.settings.analysisTrendWindowWeeks || 4}
                    onChange={(e) => onUpdateSettings({ analysisTrendWindowWeeks: Math.max(1, Math.min(20, Number(e.target.value) || 4)) })}
                    className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-center text-xs text-slate-100"
                  />
                </label>
              </div>
            </div>

            {/* Podgrupa 7: Układ Kafelków i Propozycje Raportu Mezocyklu */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">7. Układ Kafelków i Propozycje Raportu Mezocyklu</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <label
                  id="select-analysis-report-layout"
                  data-annotation-title="Domyślny Układ Kafelków Raportu"
                  data-annotation-desc="Wybór głównej kompozycji wizualnej kafelków w Raporcie Mezocyklu (Bento Lewa, Dashboard Pro, Split 60/40, Wstęga KPI)."
                  data-annotation-category="Kompozycja UI"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <span>Układ kafelków raportu</span>
                  <select
                    value={data.settings.analysisReportLayout || 'bento_left'}
                    onChange={(e) => onUpdateSettings({ analysisReportLayout: e.target.value as AppSettings['analysisReportLayout'] })}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200"
                  >
                    <option value="bento_left">1. Bento Lewa (Domyślny)</option>
                    <option value="compact_dashboard">2. Dashboard Pro</option>
                    <option value="split_preview">3. Split 60/40</option>
                    <option value="executive_strip">4. Wstęga KPI</option>
                  </select>
                </label>

                <label
                  id="chk-analysis-layout-switcher"
                  data-annotation-title="Selektor Propozycji na Ekranie Raportu (Domyślnie ukryty)"
                  data-annotation-desc="Wyświetla 4 przyciski wyboru kompozycji bezpośrednio nad kafelkami raportu mezocyklu. Opcja schowana do ustawień."
                  data-annotation-category="Pasek Narzędziowy"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={data.settings.analysisShowLayoutSwitcher === true}
                      onChange={(e) => onUpdateSettings({ analysisShowLayoutSwitcher: e.target.checked })}
                      className="accent-emerald-500 cursor-pointer"
                    />
                    <span>Pokaż / Przywróć selektor propozycji</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">Domyślnie ukryte</span>
                </label>
              </div>
            </div>

            {/* Podgrupa 8: Dedykowany Panel Agenta Analitycznego & AI Coach */}
            <div className="pt-2 border-t border-slate-800/60">
              <AgentSettingsPanel
                settings={data.settings}
                weeks={data.weeks}
                onUpdateSettings={onUpdateSettings}
              />
            </div>

            {/* Podgrupa 9: Preferencje Ogólne i Nawigacja */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">9. Preferencje Ogólne i Nawigacja</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <label
                  id="chk-confirm-before-delete"
                  data-annotation-title="Wymagaj Potwierdzenia Przy Usuwaniu"
                  data-annotation-desc="Wyświetla okno dialogowe z pytaniem przed usunięciem ćwiczenia, serii lub tygodnia."
                  data-annotation-category="Bezpieczeństwo Danych"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.confirmBeforeDelete !== false}
                    onChange={(e) => onUpdateSettings({ confirmBeforeDelete: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Potwierdzaj usuwanie</span>
                </label>

                <label
                  id="chk-hover-annotations"
                  data-annotation-title="Adnotacje po Najechaniu Myszką"
                  data-annotation-desc="Włącza lub wyłącza wyskakujące karty informacyjne po najechaniu kursorem na dowolny element. Znika po 5 sekundach bezruchu."
                  data-annotation-category="Ustawienia Interfejsu"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.showHoverAnnotations !== false}
                    onChange={(e) => onUpdateSettings({ showHoverAnnotations: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Pokaż adnotacje po najechaniu myszką</span>
                </label>

                <label
                  id="chk-remember-last-view"
                  data-annotation-title="Zapamiętaj Ostatni Widok"
                  data-annotation-desc="Przywraca po ponownym uruchomieniu ekran, na którym zakończyłeś poprzednią sesję."
                  data-annotation-category="Wygoda Użytkowania"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data.settings.rememberLastView === true}
                    onChange={(e) => onUpdateSettings({ rememberLastView: e.target.checked })}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span>Zapamiętaj ostatni widok</span>
                </label>

                <label
                  id="select-startup-view"
                  data-annotation-title="Domyślny Widok Startowy"
                  data-annotation-desc="Ekran otwierany przy starcie aplikacji (jeśli nie włączono zapamiętywania ostatniego widoku)."
                  data-annotation-category="Uruchamianie Programu"
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <span>Widok startowy:</span>
                  <select
                    value={data.settings.startupView || 'plan'}
                    onChange={(e) => onUpdateSettings({ startupView: e.target.value as AppSettings['startupView'] })}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200"
                  >
                    <option value="plan">Plan Treningowy</option>
                    <option value="stats">Progres & Wykresy</option>
                    <option value="muscle">Partie Mięśniowe</option>
                    <option value="weight">Dziennik Wagi</option>
                    <option value="cycles">Kalendarz</option>
                    <option value="exercises">Katalog &amp; Baza Wzorcowa</option>
                    <option value="profile">Centrum Synchronizacji &amp; Badania</option>
                    <option value="settings">Ustawienia</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {/* 💡 HOVER ANNOTATIONS CONFIGURATION */}
          <div className="pt-3 border-t border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-400" />
                <span>Podpowiedzi / Adnotacje po Najechaniu Myszką</span>
              </h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[11px] text-slate-400 font-medium">Aktywne adnotacje:</span>
                <input
                  type="checkbox"
                  checked={data.settings.showHoverAnnotations !== false}
                  onChange={(e) => onUpdateSettings({ showHoverAnnotations: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  id="chk-hover-annotations-main"
                />
              </label>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex items-start gap-2 text-slate-300">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Gdy funkcja jest włączona, najechanie kursorem myszy na dowolny przycisk, parametr treningowy (RPE, e1RM, tonaż) lub opcję analiz natychmiast wyświetla kartę z precyzyjnym wyjaśnieniem do czego służy. <strong>Karta znika automatycznie po 5 sekundach braku ruchu myszki.</strong>
                </p>
              </div>
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-slate-800/60">
                <span>Czas zniknięcia: <strong className="text-emerald-400 font-mono">5 sekund bezruchu myszki</strong></span>
                <span className={data.settings.showHoverAnnotations !== false ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                  {data.settings.showHoverAnnotations !== false ? '● Podpowiedzi Włączone' : '○ Podpowiedzi Wyłączone'}
                </span>
              </div>
            </div>
          </div>

          {/* 🛡️ AUTOMATIC BACKUP CONFIGURATION */}
          <div className="pt-3 border-t border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Automatyczna Kopia Zapasowa (Auto-Backup JSON)</span>
              </h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[11px] text-slate-400 font-medium">Aktywuj Auto-Backup:</span>
                <input
                  type="checkbox"
                  checked={data.settings.autoBackupEnabled ?? true}
                  onChange={(e) => onUpdateSettings({ autoBackupEnabled: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  id="chk-autobackup-enabled"
                />
              </label>
            </div>

            {/* Folder ścieżki kopii zapasowej */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>Folder docelowy kopii zapasowych:</span>
              </label>
              <input
                type="text"
                value={data.settings.backupFolderPath || '%LOCALAPPDATA%\\GymTracker\\Backups'}
                onChange={(e) => onUpdateSettings({ backupFolderPath: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono"
                id="input-backup-folder"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Aplikacja utwórz tam podfolder i zapisze plik z datą np. <code className="text-slate-400">workout_backup_20260915_120000.json</code>.
              </p>
            </div>

            {/* Opcje wyzwalaczy backupu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 cursor-pointer hover:bg-slate-900">
                <input
                  type="checkbox"
                  checked={data.settings.backupOnSave ?? true}
                  onChange={(e) => onUpdateSettings({ backupOnSave: e.target.checked })}
                  className="w-3.5 h-3.5 accent-emerald-500"
                  id="chk-backup-onsave"
                />
                <span className="text-slate-300 text-[11px]">Kopia przy każdym zapisie</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 cursor-pointer hover:bg-slate-900">
                <input
                  type="checkbox"
                  checked={data.settings.backupOnClose ?? true}
                  onChange={(e) => onUpdateSettings({ backupOnClose: e.target.checked })}
                  className="w-3.5 h-3.5 accent-emerald-500"
                  id="chk-backup-onclose"
                />
                <span className="text-slate-300 text-[11px]">Kopia przy zamykaniu (WM_DELETE)</span>
              </label>
            </div>

            {/* Manual backup trigger button */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={onCreateBackup}
                className="w-full py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                id="btn-create-backup-now"
              >
                <Archive className="w-4 h-4" />
                <span>Utwórz Kopię Zapasową Teraz (Backup NOW)</span>
              </button>
            </div>

            {data.settings.lastBackupTime && (
              <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Ostatnia kopia: {data.settings.lastBackupTime}</span>
              </p>
            )}
          </div>

          {/* 📱 ANDROID SERVER & SYNC (ETAP 5) */}
          <div className="pt-3 border-t border-slate-800 space-y-3.5" id="settings-android-sync-section">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Serwer &amp; Synchronizacja Android (ETAP 5)</span>
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Gotowy do parowania</span>
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Lokalny Endpoint Serwera:</span>
                  </div>
                  <code className="text-emerald-400 font-mono text-[11px] block mt-0.5">
                    http://{data.syncConfig?.serverUrl || '192.168.1.100'}:{data.syncConfig?.port || 8080}/api/v1/sync
                  </code>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Kod parowania:</span>
                  <span className="font-mono font-bold text-amber-300 text-xs">{data.syncConfig?.pairingCode || 'GYM-2026-92'}</span>
                </div>
              </div>

              {/* Conflict resolution in Settings */}
              <div className="space-y-1 pt-1 border-t border-slate-800/60">
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span>Reguła bezpieczeństwa konfliktów danych:</span>
                </span>
                <select
                  value={data.syncConfig?.conflictResolution || 'ask'}
                  onChange={(e) => onUpdateSyncConfig?.({ conflictResolution: e.target.value as SyncServerConfig['conflictResolution'] })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold focus:border-emerald-500 focus:outline-hidden"
                  id="select-settings-conflict-resolution"
                >
                  <option value="ask">Zawsze pytaj użytkownika (Ochrona przed nadpisaniem)</option>
                  <option value="prefer_desktop">Preferuj dane Windows 10 (%LOCALAPPDATA%)</option>
                  <option value="prefer_mobile">Preferuj dane ze smartfona Android</option>
                  <option value="merge_newer">Scal nowsze rekordy (Timestamp)</option>
                </select>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-[11px] text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Bezpieczeństwo bazy danych Pasik92:</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Synchronizacja nigdy nie usunie ani nie zmieni danych użytkownika w tle bez wyraźnego potwierdzenia. Wszystkie operacje tworzą automatyczny snapshot bezpieczeństwa.
                </p>
              </div>

              {onNavigateToProfile && (
                <button
                  type="button"
                  onClick={onNavigateToProfile}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                  id="btn-navigate-to-profile-from-settings"
                >
                  <span>Otwórz Centrum Synchronizacji &amp; Badania Krwi</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Actions & Manual Operations */}
          <div className="pt-3 border-t border-slate-800 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-300">Zarządzanie Plikiem Danych</h4>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onExportJson}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                id="btn-export-json"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pobierz workout_data.json</span>
              </button>

              <label className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Wczytaj plik JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button type="button" id="btn-export-settings" onClick={handleExportSettings} className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700"><Download className="w-3.5 h-3.5 text-emerald-400" /> Eksportuj ustawienia</button>
              <label className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700"><Upload className="w-3.5 h-3.5 text-emerald-400" /> Importuj ustawienia<input id="input-import-settings" type="file" accept=".json" onChange={handleSettingsUpload} className="hidden" /></label>

              <button
                type="button"
                onClick={onResetData}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                id="btn-reset-demo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Przywróć domyślny plan</span>
              </button>
            </div>
            {importError && (
              <p className="text-xs text-red-400">{importError}</p>
            )}
          </div>
        </div>

        {/* Right Column: Backup History Log & Raw JSON Viewer */}
        <div className="space-y-6">
          {/* Backup History Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Historia Kopii Zapasowych Auto-Backup ({backups.length})</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Max 15 najnowszych kopii</span>
            </div>

            {backups.length === 0 ? (
              <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-lg text-center text-xs text-slate-500">
                Brak jeszcze automatycznych kopii. Kliknij "Utwórz Kopię Zapasową Teraz" lub dokonaj edycji planu.
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {backups.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="font-mono text-slate-200 font-semibold text-[11px] flex items-center gap-1.5">
                        <Archive className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{b.fileName}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 font-mono">
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
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 border border-slate-700"
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
                          className="px-2 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-[11px] font-bold flex items-center gap-1 border border-emerald-800/60"
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
                          className="p-1 rounded bg-slate-800 hover:bg-red-950/80 text-slate-400 hover:text-red-300 transition-colors border border-slate-700"
                          title="Usuń wpis kopii"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Raw JSON Viewer */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Podgląd aktualnej struktury JSON</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {data.weeks.length} tygodni, {data.bodyWeights.length} wpisów wagi
                </span>
              </h3>
              <button
                type="button"
                onClick={handleCopyJson}
                className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 font-medium border border-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Skopiowano!' : 'Kopiuj JSON'}</span>
              </button>
            </div>

            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-auto max-h-[300px] font-mono text-[11px] text-slate-300 leading-relaxed">
              <pre>{jsonString}</pre>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
