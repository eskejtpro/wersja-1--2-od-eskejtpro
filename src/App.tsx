import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { ModernSidebar } from './components/ModernSidebar';
import { ModernHeader } from './components/ModernHeader';
import { AndroidBottomNav } from './components/AndroidBottomNav';
import { AndroidMoreBottomSheet } from './components/AndroidMoreBottomSheet';
import { WorkoutPlanView } from './components/WorkoutPlanView';
import { StatsView } from './components/StatsView';
import { MuscleProgressView } from './components/MuscleProgressView';
import { BodyWeightView, WeightSubcategoryType } from './components/BodyWeightView';
import { SettingsView } from './components/SettingsView';
import { ExerciseManagerView } from './components/ExerciseManagerView';
import { CycleProtocolView } from './components/CycleProtocolView';
import { UserProfileView } from './components/UserProfileView';
import { AiCoachView } from './components/AiCoachView';
import { QuickAccessDashboard } from './components/QuickAccessDashboard';
import { ExerciseModal } from './components/ExerciseModal';
import { ExerciseHistoryModal } from './components/ExerciseHistoryModal';
import { ActiveWorkoutBar } from './components/ActiveWorkoutBar';
import { WorkoutSummaryModal } from './components/WorkoutSummaryModal';
import { soundService } from './utils/soundService';
import { useWorkoutTimer } from './utils/useWorkoutTimer';
import { GymData, TrainingWeek, TrainingDay, Exercise, ExerciseHistoryPoint, BodyWeightEntry, CircumferenceEntry, BodyPartMeasurement, AppSettings, LoggedSet, BackupEntry, ProtocolEntry, CalendarDayNote, UserProfile, SyncServerConfig, SyncLogEntry, CatalogExercise, AiChatMessage, AiAgentMemory } from './types';
import { initialGymData } from './data/initialData';
import { DEFAULT_CATALOG_EXERCISES } from './data/defaultCatalogExercises';
import { getTodayDateString } from './utils/calculations';
import { persistence } from './utils/persistence';
import { appDatabase } from './data/db/AppDatabase';
import { roomDatabase } from './data/db/RoomDatabase';
import { initializeLocalDatabaseFlow } from './data/db/initializeLocalDatabase';
import { normalizeGymDataToRelational } from './domain/mappers';
import { shouldHoldWorkoutWakeLock } from './utils/workoutSessionStorage';
import { useCloudTrainingSync } from './utils/useCloudTrainingSync';
import { setAiRemoteSession } from './utils/aiRemoteClient';
import { trainingFingerprint } from './utils/cloudTrainingData';
import { beginCloudRestoreRecovery, finishCloudRestoreRecovery, readCloudRestoreRecovery, hasCloudRestoreRecovery } from './utils/cloudRestoreRecovery';

const STORAGE_KEY = 'gymtracker_windows_data_v1';
const BACKUPS_STORAGE_KEY = 'gymtracker_autobackups_v1';
function verifyCompleteLocalSnapshot(snapshot: GymData): void {
  const raw = JSON.stringify(snapshot);
  if (window.gymDesktop) {
    window.gymDesktop.setItem(STORAGE_KEY, raw);
    if (window.gymDesktop.getItem(STORAGE_KEY) !== raw) throw new Error('Odczyt lokalnego zapisu nie zgadza się z kopią.');
  } else {
    localStorage.setItem(STORAGE_KEY, raw);
    if (localStorage.getItem(STORAGE_KEY) !== raw) throw new Error('Odczyt lokalnego zapisu nie zgadza się z kopią.');
  }
  roomDatabase.verifyPersistedTables();
}
const normalizeGymData = (raw: GymData): GymData => {
  const rawSettings = raw.settings || {};
  const isMigrated = (rawSettings as { _analysisSectionsHiddenDefaultV2?: boolean })._analysisSectionsHiddenDefaultV2 === true;
  const migratedSettings: AppSettings = {
    ...initialGymData.settings,
    ...rawSettings,
    ...(isMigrated ? {} : {
      analysisShowWeeklyTonnage: false,
      analysisShowWeeklyMetrics: false,
      analysisShowRegularity: false,
      analysisShowMonthlyComparison: false,
      analysisShowPeriodComparison: false,
      _analysisSectionsHiddenDefaultV2: true,
    } as Partial<AppSettings>),
  };

  return {
    ...raw,
    settings: migratedSettings,
    circumferences: Array.isArray(raw.circumferences) ? raw.circumferences : [],
    bodyPartMeasurements: Array.isArray(raw.bodyPartMeasurements)
      ? raw.bodyPartMeasurements
      : (initialGymData.bodyPartMeasurements || []),
    profile: raw.profile || initialGymData.profile,
    profilesList: Array.isArray(raw.profilesList) && raw.profilesList.length > 0
      ? raw.profilesList
      : (initialGymData.profilesList || []),
    syncConfig: raw.syncConfig || initialGymData.syncConfig,
    syncLogs: Array.isArray(raw.syncLogs) ? raw.syncLogs : (initialGymData.syncLogs || []),
    catalogExercises: Array.isArray(raw.catalogExercises) && raw.catalogExercises.length > 0
      ? raw.catalogExercises
      : DEFAULT_CATALOG_EXERCISES
  };
};

export default function App() {
  const [data, setData] = useState<GymData>(() => {
    try {
      roomDatabase.initialize();
      try {
        const cloudRecovery = readCloudRestoreRecovery();
        if (cloudRecovery) return normalizeGymData(cloudRecovery);
      } catch { console.error('Kopia odzyskiwania wymaga sprawdzenia. Zachowano dane lokalne i dziennik.'); }
      if (roomDatabase.hasStructuredData()) {
        const fromRoom = roomDatabase.loadGymData();
        if (fromRoom && fromRoom.weeks && fromRoom.weeks.length > 0) {
          return normalizeGymData(fromRoom);
        }
      }

      appDatabase.initialize();
      const dbData = appDatabase.toGymData();
      if (dbData && dbData.weeks && dbData.weeks.length > 0) {
        return normalizeGymData(dbData);
      }

      const saved = persistence.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.weeks) {
          return normalizeGymData(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not load from DB, using initial data', e);
    }
    return normalizeGymData(initialGymData);
  });

  const [activeView, setActiveView] = useState<string>(data.settings.startupView || 'plan');
  const [weightSubcategory, setWeightSubcategory] = useState<WeightSubcategoryType>('all');

  const handleSelectView = useCallback((view: string) => {
    if (view.startsWith('weight:')) {
      const sub = view.slice(7) as WeightSubcategoryType;
      setWeightSubcategory(sub);
      setActiveView('weight');
    } else if (view === 'weight') {
      setActiveView('weight');
    } else {
      setActiveView(view);
    }
  }, []);

  useEffect(() => {
    const destinationToView: Record<string, string> = {
      plan: 'plan',
      hydration: 'quick_access',
      calendar: 'cycles',
      home: 'quick_access',
    };
    const handleWidgetNavigation = (event: Event) => {
      const destination = (event as CustomEvent<{ destination?: string }>).detail?.destination;
      const view = destination ? destinationToView[destination] : undefined;
      if (view) handleSelectView(view);
    };

    window.addEventListener('gymtracker-widget-navigation', handleWidgetNavigation);
    return () => window.removeEventListener('gymtracker-widget-navigation', handleWidgetNavigation);
  }, [handleSelectView]);

  useEffect(() => {
    if (data.settings.rememberLastView && data.settings.startupView !== activeView) {
      setData(prev => ({ ...prev, settings: { ...prev.settings, startupView: activeView as AppSettings['startupView'] } }));
    }
  }, [activeView, data.settings.rememberLastView, data.settings.startupView]);
  const [selectedWeekId, setSelectedWeekId] = useState<string>(data.weeks[0]?.id || 'week-1');
  const [selectedDayId, setSelectedDayId] = useState<string>(data.weeks[0]?.days[0]?.id || 'w1-d1');
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Dane lokalne');

  // Modern UI states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState<boolean>(false);

  // Backups state
  const [backups, setBackups] = useState<BackupEntry[]>(() => {
    try {
      const saved = persistence.getItem(BACKUPS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load backups from localStorage');
    }
    return [];
  });

  // Modals state
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyExercise, setHistoryExercise] = useState<Exercise | null>(null);

  // Live Workout & Rest Timer state (Persistent across windows/tabs)
  const workoutTimer = useWorkoutTimer();
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // Helper function to perform auto-backup
  const lastBackupStringRef = useRef<string>('');
  const createAutoBackup = (targetData: GymData, triggerReason: string = 'auto') => {
    try {
      const jsonStr = JSON.stringify(targetData);
      const fingerprint = JSON.stringify({...targetData, settings: {...targetData.settings, lastBackupTime: undefined}});
      if (triggerReason !== 'manual' && fingerprint === lastBackupStringRef.current) return;

      const now = new Date();
      const dateTag = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeTag = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const formattedTimestamp = `${now.toLocaleDateString('pl-PL')} ${now.toLocaleTimeString('pl-PL')}`;
      const fileName = `workout_backup_${dateTag}_${timeTag}.json`;
      const sizeBytes = new Blob([jsonStr]).size;

      const newBackup: BackupEntry = {
        id: `backup-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: formattedTimestamp,
        fileName,
        sizeBytes,
        weeksCount: targetData.weeks.length,
        data: JSON.parse(jsonStr)
      };

      const maxCount = targetData.settings.maxBackupFiles || 15;
      const updatedBackups = [newBackup, ...backups].slice(0, maxCount);
      persistence.setItem(BACKUPS_STORAGE_KEY, JSON.stringify(updatedBackups));
      lastBackupStringRef.current = fingerprint;
      setBackups(updatedBackups);

      // Update last backup time setting
      setData((prev) => prev.settings.lastBackupTime === formattedTimestamp ? prev : ({
        ...prev,
        settings: {
          ...prev.settings,
          lastBackupTime: formattedTimestamp
        }
      }));
    } catch (err) {
      console.error('Failed to create auto backup', err);
      throw err;
    }
  };

  // 1. Inicjalizacja podzielonego magazynu lokalnego z zachowaniem już wczytanych danych
  const [isDbReady, setIsDbReady] = useState<boolean>(false);
  const [googleSession, setGoogleSession] = useState<{ token: string; serverUrl: string } | null>(null);
  const googleSessionRef = useRef<{ token: string; serverUrl: string } | null>(null);
  const updateGoogleSession = useCallback((session: { token: string; serverUrl: string } | null) => {
    googleSessionRef.current = session;
    setAiRemoteSession(session);
    setGoogleSession(session);
  }, []);
  useEffect(() => () => setAiRemoteSession(null), []);

  useEffect(() => {
    let isCancelled = false;

    async function initializeLocalDatabase() {
      try {
        const interruptedRestore = readCloudRestoreRecovery();
        if (interruptedRestore) {
          const recovered = normalizeGymData(interruptedRestore);
          await roomDatabase.atomicWriteFromGymData(recovered);
          verifyCompleteLocalSnapshot(recovered);
          finishCloudRestoreRecovery();
        }
        const result = await initializeLocalDatabaseFlow(roomDatabase, data);
        if (!isCancelled) {
          setData(normalizeGymData(result.data));
          setAutoSaveStatus(
            `${result.source === 'structured-data' ? 'Dane lokalne gotowe' : 'Odtworzono dane lokalne'} (${new Date().toLocaleTimeString('pl-PL')})`
          );
          setIsDbReady(true);
        }
      } catch (err) {
        console.error('Błąd inicjalizacji lokalnego magazynu danych:', err);
        if (!isCancelled) {
          setAutoSaveStatus(hasCloudRestoreRecovery() ? 'Zapis wstrzymany: kopia odzyskiwania wymaga sprawdzenia' : 'Tryb awaryjny offline');
          setIsDbReady(!hasCloudRestoreRecovery());
        }
      }
    }

    initializeLocalDatabase();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Screen WakeLock na Androidzie podczas aktywnego treningu (blokada wygaszania ekranu)
  useEffect(() => {
    let wakeLockSentinel: any = null;
    let cancelled = false;
    const shouldHoldWakeLock = () => shouldHoldWorkoutWakeLock(
      data.settings.screenWakeLock !== false,
      activeView,
      workoutTimer.hasActiveSession,
      workoutTimer.isSessionActive,
      typeof document !== 'undefined' && !document.hidden,
      typeof navigator !== 'undefined' && 'wakeLock' in navigator
    );

    const releaseWakeLock = () => {
      const current = wakeLockSentinel;
      wakeLockSentinel = null;
      if (current) void current.release().catch(() => {});
    };
    const requestWakeLock = async () => {
      if (shouldHoldWakeLock() && !wakeLockSentinel) {
        try {
          const requested = await (navigator as any).wakeLock.request('screen');
          if (cancelled || !shouldHoldWakeLock()) {
            await requested.release().catch(() => {});
          } else {
            wakeLockSentinel = requested;
            requested.addEventListener('release', () => {
              if (wakeLockSentinel === requested) wakeLockSentinel = null;
            }, { once: true });
          }
        } catch {
          // WakeLock może być niedozwolony przez politykę oszczędzania energii systemu
        }
      }
    };
    const handleFocus = () => { void requestWakeLock(); };
    const handleVisibilityChange = () => {
      if (document.hidden) releaseWakeLock();
      else void requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    void requestWakeLock();
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      releaseWakeLock();
    };
  }, [activeView, data.settings.screenWakeLock, workoutTimer.hasActiveSession, workoutTimer.isSessionActive]);

  // 2. Atomowy, asynchroniczny zapis do bazy Room bez blokowania wątku UI (Non-Blocking Queue)
  const pendingDataRef = useRef<GymData>(data);
  const writeTimeoutRef = useRef<number | null>(null);
  const isWritingRef = useRef<boolean>(false);

  useEffect(() => {
    pendingDataRef.current = data;

    if (!isDbReady) return;

    if (writeTimeoutRef.current) {
      clearTimeout(writeTimeoutRef.current);
    }

    // Debounce 100ms chroni przed blokowaniem UI (60 FPS) przy szybkiej edycji serii lub notatek
    writeTimeoutRef.current = window.setTimeout(async () => {
      const toWrite = pendingDataRef.current;
      if (!toWrite || isWritingRef.current) return;

      isWritingRef.current = true;
      try {
        await roomDatabase.atomicWriteFromGymData(toWrite);

        // Zrzut do pamięci pomocniczej JSON w tle
        try {
          persistence.setItem(STORAGE_KEY, JSON.stringify(toWrite));
        } catch {}

        setAutoSaveStatus(`Zapis lokalny OK (${new Date().toLocaleTimeString('pl-PL')})`);

        // Trigger Auto Backup on Save if enabled
        if (toWrite.settings.autoBackupEnabled !== false && toWrite.settings.backupOnSave !== false) {
          createAutoBackup(toWrite, 'save');
        }
      } catch (e) {
        console.error('Błąd zapisu lokalnego magazynu danych:', e);
        setAutoSaveStatus('Błąd zapisu danych lokalnych');
      } finally {
        isWritingRef.current = false;
      }
    }, 100);

    return () => {
      if (writeTimeoutRef.current) {
        clearTimeout(writeTimeoutRef.current);
      }
    };
  }, [data, isDbReady]);

  // Pełny, automatyczny zapis przy dowolnej zmianie stanu Androida (lifecycle onPause/onStop/background)
  useEffect(() => {
    const flushDataToDisk = () => {
      if (!isDbReady || isWritingRef.current || hasCloudRestoreRecovery()) return;
      const current = pendingDataRef.current || data;
      try {
        roomDatabase.runInTransaction(() => {
          const schema = normalizeGymDataToRelational(current);
          roomDatabase.planDao.setAll(schema.plans);
          roomDatabase.weekDao.setAll(schema.weeks);
          roomDatabase.dayDao.setAll(schema.days);
          roomDatabase.exerciseDao.setAll(schema.exercises);
          roomDatabase.loggedSetDao.setAll(schema.loggedSets);
          roomDatabase.bodyWeightDao.setAll(current.bodyWeights || []);
          roomDatabase.circumferenceDao.setAll(current.circumferences || []);
          roomDatabase.bodyPartMeasurementDao.setAll(current.bodyPartMeasurements || []);
          roomDatabase.catalogDao.setAll(current.catalogExercises || []);
          roomDatabase.sessionDao.setAll(current.workoutSessionsHistory || []);
          if (current.activeSessionDraft) {
            roomDatabase.activeDraftDao.saveDraft(current.activeSessionDraft);
          }
          if (current.settings) {
            roomDatabase.storageDriver.writeTable('settings', current.settings);
          }
        });
        persistence.setItem(STORAGE_KEY, JSON.stringify(current));
      } catch (err) {
        console.error('Błąd natychmiastowego zrzutu Room do pamięci Androida:', err);
      }

      if (data.settings.autoBackupEnabled !== false && data.settings.backupOnClose !== false) {
        try {
          const jsonStr = JSON.stringify(data);
          const now = new Date();
          const dateTag = now.toISOString().slice(0, 10).replace(/-/g, '');
          const timeTag = now.toTimeString().slice(0, 8).replace(/:/g, '');
          const fileName = `workout_backup_exit_${dateTag}_${timeTag}.json`;
          const sizeBytes = new Blob([jsonStr]).size;

          const exitBackup: BackupEntry = {
            id: `backup-exit-${Date.now()}`,
            timestamp: `${now.toLocaleDateString('pl-PL')} ${now.toLocaleTimeString('pl-PL')} (Zminimalizowanie/Wyjście)`,
            fileName,
            sizeBytes,
            weeksCount: data.weeks.length,
            data
          };

          const existingBackups: BackupEntry[] = JSON.parse(persistence.getItem(BACKUPS_STORAGE_KEY) || '[]');
          const updated = [exitBackup, ...existingBackups].slice(0, data.settings.maxBackupFiles || 15);
          persistence.setItem(BACKUPS_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
          console.error('Error creating exit backup', e);
        }
      }
    };

    // 1. Zmiana widoczności karty / zminimalizowanie aplikacji na Androidzie
    const handleVisibilityChange = () => {
      if (document.hidden) {
        flushDataToDisk();
      }
    };

    // 2. Opuszczenie strony / schowanie WebView
    const handlePageHide = () => {
      flushDataToDisk();
    };

    // 3. Natywny listener stanu aplikacji Capacitor (onPause)
    let appStateHandle: PluginListenerHandle | null = null;
    CapacitorApp.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        flushDataToDisk();
      }
    }).then((handle) => {
      appStateHandle = handle;
    });

    window.addEventListener('beforeunload', flushDataToDisk);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', flushDataToDisk);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      appStateHandle?.remove();
    };
  }, [data]);

  // Android Native Hardware Back Button Handler
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backButtonHandle: PluginListenerHandle | null = null;
    let isMounted = true;

    CapacitorApp.addListener('backButton', () => {
      if (isExerciseModalOpen) {
        setIsExerciseModalOpen(false);
      } else if (isHistoryModalOpen) {
        setIsHistoryModalOpen(false);
      } else if (isSummaryModalOpen) {
        setIsSummaryModalOpen(false);
      } else if (isMoreSheetOpen) {
        setIsMoreSheetOpen(false);
      } else if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      } else if (activeView !== 'plan') {
        setActiveView('plan');
      } else {
        CapacitorApp.exitApp();
      }
    }).then((handle) => {
      if (isMounted) {
        backButtonHandle = handle;
      } else {
        handle?.remove();
      }
    }).catch((err) => {
      console.warn('Could not attach backButton listener:', err);
    });

    return () => {
      isMounted = false;
      if (backButtonHandle && typeof backButtonHandle.remove === 'function') {
        backButtonHandle.remove();
      }
    };
  }, [isExerciseModalOpen, isHistoryModalOpen, isMobileMenuOpen, activeView]);

  // Backup actions
  const handleCreateManualBackup = () => {
    try {
      createAutoBackup(data, 'manual');
      setAutoSaveStatus(`Utworzono kopię zapasową (${new Date().toLocaleTimeString('pl-PL')})`);
      soundService.playSuccessSound();
    } catch {
      setAutoSaveStatus('Błąd zapisu kopii zapasowej');
    }
  };

  const handleRestoreBackup = (backup: BackupEntry) => {
    if (backup && backup.data && Array.isArray(backup.data.weeks)) {
      if (window.gymDesktop) window.gymDesktop.validate(JSON.stringify(backup.data));
      createAutoBackup(data, 'manual');
      setData(backup.data);
      if (backup.data.weeks.length > 0) {
        setSelectedWeekId(backup.data.weeks[0].id);
        setSelectedDayId(backup.data.weeks[0].days[0]?.id || '');
      }
      setAutoSaveStatus(`Przywrócono kopię z ${backup.timestamp}`);
      soundService.playSuccessSound();
    }
  };

  const handleDownloadBackup = (backup: BackupEntry) => {
    const jsonStr = JSON.stringify(backup.data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backup.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteBackup = (backupId: string) => {
    const updated = backups.filter((b) => b.id !== backupId);
    persistence.setItem(BACKUPS_STORAGE_KEY, JSON.stringify(updated));
    setBackups(updated);
  };

  // Ensure selected week/day are valid
  useEffect(() => {
    const weekExists = data.weeks.some((w) => w.id === selectedWeekId);
    if (!weekExists && data.weeks.length > 0) {
      setSelectedWeekId(data.weeks[0].id);
      setSelectedDayId(data.weeks[0].days[0]?.id || '');
    } else {
      const currentWeek = data.weeks.find((w) => w.id === selectedWeekId);
      const dayExists = currentWeek?.days.some((d) => d.id === selectedDayId);
      if (!dayExists && currentWeek?.days && currentWeek.days.length > 0) {
        setSelectedDayId(currentWeek.days[0].id);
      }
    }
  }, [data.weeks, selectedWeekId, selectedDayId]);

  // Theme toggle
  const handleToggleTheme = () => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        theme: prev.settings.theme === 'dark' ? 'light' : 'dark'
      }
    }));
  };

  // Weeks management
  const handleAddWeek = () => {
    const newNum = data.weeks.length + 1;
    const newWeekId = `week-${Date.now()}`;
    const newWeek: TrainingWeek = {
      id: newWeekId,
      number: newNum,
      name: `Tydzień ${newNum} - Cykl Progresji`,
      days: [
        {
          id: `${newWeekId}-d1`,
          name: 'Poniedziałek - Push (Klatka / Barki)',
          completed: false,
          exercises: []
        },
        {
          id: `${newWeekId}-d2`,
          name: 'Środa - Pull (Plecy / Biceps)',
          completed: false,
          exercises: []
        },
        {
          id: `${newWeekId}-d3`,
          name: 'Piątek - Legs (Przysiad / Nogi)',
          completed: false,
          exercises: []
        }
      ]
    };

    setData((prev) => ({
      ...prev,
      weeks: [...prev.weeks, newWeek]
    }));
    setSelectedWeekId(newWeekId);
    setSelectedDayId(`${newWeekId}-d1`);
  };

  const handleDuplicateWeek = (weekId: string) => {
    const sourceWeek = data.weeks.find((w) => w.id === weekId);
    if (!sourceWeek) return;

    const newNum = data.weeks.length + 1;
    const newWeekId = `week-${Date.now()}`;
    const duplicatedWeek: TrainingWeek = {
      id: newWeekId,
      number: newNum,
      name: `Tydzień ${newNum} (+2.5kg progres)`,
      days: sourceWeek.days.map((d, dIdx) => ({
        id: `${newWeekId}-d${dIdx + 1}`,
        name: d.name,
        completed: false,
        exercises: d.exercises.map((ex) => {
          const updatedWeight = Math.round((ex.weight + 2.5) * 10) / 10;
          return {
            ...ex,
            id: `ex-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            weight: updatedWeight,
            // A duplicated week is a new, uncompleted session. Keep the
            // exercise history as reference, but never carry completed set
            // checkmarks into the new session's execution analysis.
            loggedSets: undefined,
            history: [...(ex.history || [])]
          };
        })
      }))
    };

    setData((prev) => ({
      ...prev,
      weeks: [...prev.weeks, duplicatedWeek]
    }));
    setSelectedWeekId(newWeekId);
    setSelectedDayId(duplicatedWeek.days[0]?.id || '');
  };

  const handleDeleteWeek = (weekId: string) => {
    if (data.weeks.length <= 1) return;
    if (data.settings.confirmBeforeDelete !== false && !window.confirm('Czy na pewno chcesz usunąć cały tydzień?')) return;
    setData((prev) => ({
      ...prev,
      weeks: prev.weeks.filter((w) => w.id !== weekId)
    }));
  };

  // Days management
  const handleAddDay = (weekId: string) => {
    const week = data.weeks.find((w) => w.id === weekId);
    if (!week) return;
    const dayNum = week.days.length + 1;
    const newDayId = `day-${Date.now()}`;
    const newDay: TrainingDay = {
      id: newDayId,
      name: `Dzień ${dayNum} - Dodatkowy Trening`,
      completed: false,
      exercises: []
    };

    setData((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) =>
        w.id === weekId ? { ...w, days: [...w.days, newDay] } : w
      )
    }));
    setSelectedDayId(newDayId);
  };

  const handleDeleteDay = (weekId: string, dayId: string) => {
    if (data.settings.confirmBeforeDelete !== false && !window.confirm('Czy na pewno chcesz usunąć dzień?')) return;
    setData((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) =>
        w.id === weekId ? { ...w, days: w.days.filter((d) => d.id !== dayId) } : w
      )
    }));
  };

  const handleToggleDayCompleted = (weekId: string, dayId: string) => {
    setData((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) => {
        if (w.id !== weekId) return w;
        return {
          ...w,
          days: w.days.map((d) => {
            if (d.id !== dayId) return d;
            const newCompleted = !d.completed;
            let updatedExercises = d.exercises;
            if (newCompleted) {
              // Never fabricate execution from planned values. History is created
              // only after the user explicitly saves performance.
              updatedExercises = d.exercises;
            }
            return {
              ...d,
              completed: newCompleted,
              exercises: updatedExercises
            };
          })
        };
      })
    }));
  };

  const handleUpdateDayNotes = (weekId: string, dayId: string, notes: string) => {
    setData((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) => {
        if (w.id !== weekId) return w;
        return {
          ...w,
          days: w.days.map((d) => (d.id === dayId ? { ...d, notes } : d))
        };
      })
    }));
  };

  // Exercise Performance Save (Sets, Reps, Weight + Logged Sets)
  const handleSaveExercisePerformance = (
    weekId: string,
    dayId: string,
    exerciseId: string,
    sets: number,
    reps: number,
    weight: number,
    loggedSets?: LoggedSet[]
  ) => {
    const today = getTodayDateString();
    setData((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) => {
        if (w.id !== weekId) return w;
        return {
          ...w,
          days: w.days.map((d) => {
            if (d.id !== dayId) return d;
            return {
              ...d,
              exercises: d.exercises.map((ex) => {
                if (ex.id !== exerciseId) return ex;
                const newPoint: ExerciseHistoryPoint = {
                  date: today,
                  weight,
                  reps,
                  sets,
                  rpe: ex.rpe,
                  loggedSets
                };
                return {
                  ...ex,
                  sets,
                  reps,
                  weight,
                  loggedSets: loggedSets ?? ex.loggedSets,
                  history: [...(ex.history || []), newPoint]
                };
              })
            };
          })
        };
      })
    }));

    // Uruchomienie inteligentnego rest timera po odhaczeniu serii
    if (loggedSets && loggedSets.some((s) => s.completed)) {
      if (!workoutTimer.hasActiveSession) workoutTimer.toggleSessionPause();
      workoutTimer.startRestTimer(90);
    }
  };

  const handleConfirmFinishWorkout = (summary: { rpe: number; notes: string }) => {
    const currentWeek = data.weeks.find((w) => w.id === selectedWeekId) || data.weeks[0];
    const currentDay = currentWeek?.days.find((d) => d.id === selectedDayId) || currentWeek?.days[0];
    if (!currentDay) return;

    // Oznacz dzień jako ukończony
    handleToggleDayCompleted(selectedWeekId, currentDay.id);

    // Zapisz notatkę do dnia jeśli podana
    if (summary.notes.trim()) {
      handleUpdateDayNotes(selectedWeekId, currentDay.id, summary.notes.trim());
    }

    // Reset stoperu sesji i odliczania przerwy
    workoutTimer.endSessionTimer();
    soundService.notifyTimerFinished();
  };

  // Exercise Weight Adjustment (+2.5 kg, -2.5 kg, etc.)
  const handleUpdateExerciseWeight = (
    weekId: string,
    dayId: string,
    exerciseId: string,
    newWeight: number
  ) => {
    const today = getTodayDateString();
    setData((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) => {
        if (w.id !== weekId) return w;
        return {
          ...w,
          days: w.days.map((d) => {
            if (d.id !== dayId) return d;
            return {
              ...d,
              exercises: d.exercises.map((ex) => {
                if (ex.id !== exerciseId) return ex;
                const newPoint: ExerciseHistoryPoint = {
                  date: today,
                  weight: newWeight,
                  reps: ex.reps,
                  sets: ex.sets,
                  rpe: ex.rpe
                };
                return {
                  ...ex,
                  weight: newWeight,
                  history: [...(ex.history || []), newPoint]
                };
              })
            };
          })
        };
      })
    }));
  };

  // Exercise Rename (Quick Inline or Modal)
  const handleRenameExercise = (
    weekId: string,
    dayId: string,
    exerciseId: string,
    newName: string
  ) => {
    if (!newName.trim()) return;
    setData((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) => {
        if (w.id !== weekId) return w;
        return {
          ...w,
          days: w.days.map((d) => {
            if (d.id !== dayId) return d;
            return {
              ...d,
              exercises: d.exercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, name: newName.trim() } : ex
              )
            };
          })
        };
      })
    }));
  };

  const handleRenameWeek = (weekId: string, newName: string) => {
    if (!newName.trim()) return;
    setData((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) => (w.id === weekId ? { ...w, name: newName.trim() } : w))
    }));
  };

  const handleRenameDay = (weekId: string, dayId: string, newName: string) => {
    if (!newName.trim()) return;
    setData((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) => {
        if (w.id !== weekId) return w;
        return {
          ...w,
          days: w.days.map((d) => (d.id === dayId ? { ...d, name: newName.trim() } : d))
        };
      })
    }));
  };

  // Exercise Add / Edit
  const handleSaveExercise = (exerciseData: Omit<Exercise, 'id'>, exerciseId?: string) => {
    const currentWeek = data.weeks.find((w) => exerciseId ? w.days.some(d => d.exercises.some(ex => ex.id === exerciseId)) : w.id === selectedWeekId);
    const currentDay = currentWeek?.days.find((d) => exerciseId ? d.exercises.some(ex => ex.id === exerciseId) : d.id === selectedDayId);
    if (!currentWeek || !currentDay) return;

    if (exerciseId) {
      // Edit existing
      setData((prev) => ({
        ...prev,
        weeks: prev.weeks.map((w) => {
          if (w.id !== currentWeek.id) return w;
          return {
            ...w,
            days: w.days.map((d) => {
              if (d.id !== currentDay.id) return d;
              return {
                ...d,
                exercises: d.exercises.map((ex) =>
                  ex.id === exerciseId ? { ...ex, ...exerciseData, id: exerciseId } : ex
                )
              };
            })
          };
        })
      }));
    } else {
      // Add new
      const newEx: Exercise = {
        ...exerciseData,
        id: `ex-${Date.now()}`
      };
      setData((prev) => ({
        ...prev,
        weeks: prev.weeks.map((w) => {
          if (w.id !== currentWeek.id) return w;
          return {
            ...w,
            days: w.days.map((d) => {
              if (d.id !== currentDay.id) return d;
              return {
                ...d,
                exercises: [...d.exercises, newEx]
              };
            })
          };
        })
      }));
    }
  };

  const handleAddExerciseToPlan = (weekId: string, dayId: string, exerciseData: Omit<Exercise, 'id'>) => {
    const newEx: Exercise = {
      ...exerciseData,
      id: `ex-${Date.now()}`
    };
    setData((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) => {
        if (w.id !== weekId) return w;
        return {
          ...w,
          days: w.days.map((d) => {
            if (d.id !== dayId) return d;
            return {
              ...d,
              exercises: [...d.exercises, newEx]
            };
          })
        };
      })
    }));
  };

  const handleDeleteExercise = (weekId: string, dayId: string, exerciseId: string) => {
    if (data.settings.confirmBeforeDelete !== false && !window.confirm('Czy na pewno chcesz usunąć ćwiczenie?')) return;
    setData((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) => {
        if (w.id !== weekId) return w;
        return {
          ...w,
          days: w.days.map((d) => {
            if (d.id !== dayId) return d;
            return {
              ...d,
              exercises: d.exercises.filter((ex) => ex.id !== exerciseId)
            };
          })
        };
      })
    }));
  };

  const handleUpdateExerciseHistory = (exerciseId: string, newHistory: ExerciseHistoryPoint[]) => {
    setData((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) => ({
        ...w,
        days: w.days.map((d) => ({
          ...d,
          exercises: d.exercises.map((ex) => {
            if (ex.id === exerciseId) {
              const lastPoint = newHistory[newHistory.length - 1];
              return {
                ...ex,
                history: newHistory,
                weight: lastPoint ? lastPoint.weight : ex.weight
              };
            }
            return ex;
          })
        }))
      }))
    }));
    // Update active modal exercise reference
    if (historyExercise && historyExercise.id === exerciseId) {
      setHistoryExercise((prev) => (prev ? { ...prev, history: newHistory } : null));
    }
  };

  // Standalone Exercise Catalog Handlers (100% Isolated from Analysis)
  const catalogExercises = data.catalogExercises || DEFAULT_CATALOG_EXERCISES;

  const handleAddCatalogExercise = (newCatalogEx: Omit<CatalogExercise, 'id'>) => {
    const item: CatalogExercise = {
      ...newCatalogEx,
      id: `cat-custom-${Date.now()}`
    };
    setData((prev) => ({
      ...prev,
      catalogExercises: [item, ...(prev.catalogExercises || DEFAULT_CATALOG_EXERCISES)]
    }));
  };

  const handleEditCatalogExercise = (id: string, updates: Partial<CatalogExercise>) => {
    setData((prev) => ({
      ...prev,
      catalogExercises: (prev.catalogExercises || DEFAULT_CATALOG_EXERCISES).map((ex) =>
        ex.id === id ? { ...ex, ...updates } : ex
      )
    }));
  };

  const handleDeleteCatalogExercise = (id: string) => {
    setData((prev) => ({
      ...prev,
      catalogExercises: (prev.catalogExercises || DEFAULT_CATALOG_EXERCISES).filter((ex) => ex.id !== id)
    }));
  };

  const handleResetCatalogToDefaults = () => {
    setData((prev) => ({
      ...prev,
      catalogExercises: DEFAULT_CATALOG_EXERCISES
    }));
  };

  const handleInsertCatalogToPlan = (catalogEx: CatalogExercise, weekId: string, dayId: string, initialWeight: number) => {
    const newEx: Exercise = {
      id: `ex-${Date.now()}`,
      name: catalogEx.name,
      category: catalogEx.category,
      sets: catalogEx.defaultSets,
      reps: catalogEx.defaultReps,
      weight: initialWeight,
      rpe: catalogEx.defaultRpe || 8,
      notes: catalogEx.notes || '',
      history: []
    };

    setData((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) => {
        if (w.id !== weekId) return w;
        return {
          ...w,
          days: w.days.map((d) => {
            if (d.id !== dayId) return d;
            return {
              ...d,
              exercises: [...d.exercises, newEx]
            };
          })
        };
      })
    }));
  };

  // Body weight entries
  const handleAddBodyWeight = (entry: Omit<BodyWeightEntry, 'id'>) => {
    const newEntry: BodyWeightEntry = {
      ...entry,
      id: `bw-${Date.now()}`
    };
    setData((prev) => ({
      ...prev,
      bodyWeights: [...prev.bodyWeights, newEntry]
    }));
  };

  const handleDeleteBodyWeight = (id: string) => {
    setData((prev) => ({
      ...prev,
      bodyWeights: prev.bodyWeights.filter((bw) => bw.id !== id)
    }));
  };

  const handleAddCircumference = (entry: Omit<CircumferenceEntry, 'id'>) => {
    const newEntry: CircumferenceEntry = { ...entry, id: `circ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
    setData((prev) => ({ ...prev, circumferences: [...(prev.circumferences || []), newEntry] }));
  };

  const handleUpdateCircumference = (entry: CircumferenceEntry) => {
    setData((prev) => ({ ...prev, circumferences: (prev.circumferences || []).map((item) => item.id === entry.id ? entry : item) }));
  };

  const handleDeleteCircumference = (id: string) => {
    setData((prev) => ({ ...prev, circumferences: (prev.circumferences || []).filter((item) => item.id !== id) }));
  };

  const handleAddBodyMeasurement = (entry: Omit<BodyPartMeasurement, 'id'>) => {
    const newEntry: BodyPartMeasurement = {
      ...entry,
      id: `bpm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    };
    setData((prev) => ({
      ...prev,
      bodyPartMeasurements: [...(prev.bodyPartMeasurements || []), newEntry]
    }));
  };

  const handleDeleteBodyMeasurement = (id: string) => {
    setData((prev) => ({
      ...prev,
      bodyPartMeasurements: (prev.bodyPartMeasurements || []).filter((item) => item.id !== id)
    }));
  };

  // Protocol entries (Sterydy, HCG, itp.)
  const handleUpdateWeeks = (newWeeks: TrainingWeek[]) => {
    setData((prev) => ({
      ...prev,
      weeks: newWeeks
    }));
    createAutoBackup({ ...data, weeks: newWeeks }, 'ai_action_update_weeks');
  };

  const handleAddProtocolEntry = (entry: Omit<ProtocolEntry, 'id'>) => {
    const newEntry: ProtocolEntry = {
      ...entry,
      id: `proto-${Date.now()}`
    };
    setData((prev) => ({
      ...prev,
      protocolEntries: [...(prev.protocolEntries || []), newEntry]
    }));
  };

  const handleDeleteProtocolEntry = (id: string) => {
    setData((prev) => ({
      ...prev,
      protocolEntries: (prev.protocolEntries || []).filter((p) => p.id !== id)
    }));
  };

  // Calendar Day Notes (Notatki, cele, przypomnienia i badania do daty)
  const handleAddCalendarNote = (note: Omit<CalendarDayNote, 'id' | 'createdAt'>) => {
    const newNote: CalendarDayNote = {
      ...note,
      id: `calnote-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setData((prev) => ({
      ...prev,
      calendarNotes: [...(prev.calendarNotes || []), newNote]
    }));
  };

  const handleUpdateCalendarNote = (id: string, updatedFields: Partial<CalendarDayNote>) => {
    setData((prev) => ({
      ...prev,
      calendarNotes: (prev.calendarNotes || []).map((n) => (n.id === id ? { ...n, ...updatedFields } : n))
    }));
  };

  const handleDeleteCalendarNote = (id: string) => {
    setData((prev) => ({
      ...prev,
      calendarNotes: (prev.calendarNotes || []).filter((n) => n.id !== id)
    }));
  };

  const handleUpdateWeekStartDate = (weekId: string, startDate: string) => {
    setData((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) => (w.id === weekId ? { ...w, startDate } : w))
    }));
  };

  const handleAddWeekFromGap = (startDate: string, weekNumber: number) => {
    const newWeek: TrainingWeek = {
      id: `week-${Date.now()}`,
      number: weekNumber,
      name: `Tydzień ${weekNumber} - Plan Treningowy`,
      startDate,
      days: [
        {
          id: `d-${Date.now()}-1`,
          name: 'Dzień 1 - Push / Klatka & Barki',
          completed: false,
          exercises: []
        },
        {
          id: `d-${Date.now()}-2`,
          name: 'Dzień 2 - Pull / Plecy & Biceps',
          completed: false,
          exercises: []
        },
        {
          id: `d-${Date.now()}-3`,
          name: 'Dzień 3 - Nogi / Siła & Hipertrofia',
          completed: false,
          exercises: []
        }
      ]
    };
    setData((prev) => ({
      ...prev,
      weeks: [...prev.weeks, newWeek].sort((a, b) => a.number - b.number)
    }));
  };

  // Settings & JSON
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...newSettings
      }
    }));
  };

  // User Profile & Android Sync handlers
  const handleUpdateProfile = (updatedProfile: Partial<UserProfile>) => {
    setData((prev) => {
      const currentProfile = prev.profile || initialGymData.profile!;
      const newProfile: UserProfile = { ...currentProfile, ...updatedProfile };
      const currentList = prev.profilesList || [currentProfile];
      const updatedList = currentList.some((p) => p.id === newProfile.id)
        ? currentList.map((p) => (p.id === newProfile.id ? newProfile : p))
        : [...currentList, newProfile];

      return {
        ...prev,
        profile: newProfile,
        profilesList: updatedList,
        settings: {
          ...prev.settings,
          athleteName: newProfile.name || prev.settings.athleteName
        }
      };
    });
  };

  const handleUpdateSyncConfig = (updatedSync: Partial<SyncServerConfig>) => {
    setData((prev) => ({
      ...prev,
      syncConfig: {
        ...(prev.syncConfig || initialGymData.syncConfig!),
        ...updatedSync
      }
    }));
  };

  const handleAddSyncLog = (log: SyncLogEntry) => {
    setData((prev) => ({
      ...prev,
      syncLogs: [log, ...(prev.syncLogs || [])].slice(0, 40)
    }));
  };

  const handleSwitchProfile = (profileId: string) => {
    setData((prev) => {
      const target = (prev.profilesList || []).find((p) => p.id === profileId);
      if (!target) return prev;
      return {
        ...prev,
        profile: target,
        settings: {
          ...prev.settings,
          athleteName: target.name
        }
      };
    });
  };

  const handleCreateProfile = (name: string) => {
    const newId = `prof-${Date.now()}`;
    const newProf: UserProfile = {
      id: newId,
      name,
      athleteTag: `${name} #${Math.floor(Math.random() * 900 + 100)}`,
      avatarUrl: '',
      bio: 'Zawodnik GymTracker Pro.',
      age: 28,
      heightCm: 180,
      experienceLevel: 'sredniozaawansowany',
      primaryGoal: 'masa',
      targetWeight: 85,
      activityLevel: 'aktywny',
      dailyCalories: 3100,
      proteinGrams: 180,
      carbsGrams: 390,
      fatsGrams: 70
    };

    setData((prev) => ({
      ...prev,
      profile: newProf,
      profilesList: [...(prev.profilesList || []), newProf],
      settings: {
        ...prev.settings,
        athleteName: newProf.name
      }
    }));
  };

  const handleDeleteProfile = (profileId: string) => {
    setData((prev) => {
      const currentList = prev.profilesList || [];
      if (currentList.length <= 1) return prev;
      const filtered = currentList.filter((p) => p.id !== profileId);
      const newActive = filtered[0];
      return {
        ...prev,
        profile: newActive,
        profilesList: filtered,
        settings: {
          ...prev.settings,
          athleteName: newActive.name
        }
      };
    });
  };

  const handleUpdateAiChatHistory = (history: AiChatMessage[]) => {
    setData((prev) => ({
      ...prev,
      aiChatHistory: history
    }));
  };

  const handleUpdateAiAgentMemories = (memories: AiAgentMemory[]) => {
    setData((prev) => ({
      ...prev,
      aiAgentMemories: memories
    }));
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workout_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (imported: GymData) => {
    if (window.gymDesktop) window.gymDesktop.validate(JSON.stringify(imported));
    createAutoBackup(data, 'manual');
    const normalized = normalizeGymData(imported);
    setData(normalized);
    if (normalized.weeks.length > 0) {
      setSelectedWeekId(normalized.weeks[0].id);
      setSelectedDayId(normalized.weeks[0].days[0]?.id || '');
    }
  };

  const handleResetData = () => {
    if (window.confirm('Czy na pewno chcesz przywrócić domyślny plan treningowy?')) {
      setData(initialGymData);
      setSelectedWeekId(initialGymData.weeks[0].id);
      setSelectedDayId(initialGymData.weeks[0].days[0].id);
    }
  };

  const cloudSync = useCloudTrainingSync({
    data,
    session: googleSession,
    userId: data.settings.googleUser?.id || '',
    isSessionCurrent: (session) => googleSessionRef.current?.token === session.token && googleSessionRef.current?.serverUrl === session.serverUrl,
    isWorkoutActive: workoutTimer.hasActiveSession || Boolean(data.activeSessionDraft),
    backup: async (current) => {
      createAutoBackup(current, 'manual');
      // The general persistence helper can fall back to memory. Recovery must have a real disk copy.
      const saved = window.gymDesktop ? window.gymDesktop.getItem(BACKUPS_STORAGE_KEY) : localStorage.getItem(BACKUPS_STORAGE_KEY);
      const copies = saved ? JSON.parse(saved) as BackupEntry[] : [];
      if (!copies[0]?.data || JSON.stringify(copies[0].data) !== JSON.stringify(current)) {
        throw new Error('Nie udało się zapisać lokalnej kopii zapasowej. Przywracanie zostało zatrzymane.');
      }
      if (Capacitor.isNativePlatform()) await Preferences.set({ key: BACKUPS_STORAGE_KEY, value: saved! });
    },
    apply: async (restored, expectedFingerprint, ensureCurrent) => {
      ensureCurrent();
      if (workoutTimer.hasActiveSession || pendingDataRef.current.activeSessionDraft) {
        throw new Error('Zakończ aktywny trening przed przywróceniem kopii.');
      }
      if (trainingFingerprint(pendingDataRef.current) !== expectedFingerprint) {
        throw new Error('Dane lokalne zmieniły się. Sprawdź kopię ponownie.');
      }
      if (isWritingRef.current) throw new Error('Trwa zapis lokalny. Spróbuj ponownie za chwilę.');
      if (writeTimeoutRef.current) clearTimeout(writeTimeoutRef.current);
      const normalized = normalizeGymData(restored);
      const previous = pendingDataRef.current;
      beginCloudRestoreRecovery(previous);
      isWritingRef.current = true;
      try {
        await roomDatabase.atomicWriteFromGymData(normalized);
        ensureCurrent();
        if (workoutTimer.hasActiveSession || pendingDataRef.current.activeSessionDraft) throw new Error('Rozpoczęto trening. Przywracanie cofnięto.');
        verifyCompleteLocalSnapshot(normalized);
        finishCloudRestoreRecovery();
        pendingDataRef.current = normalized;
        setData(normalized);
        setSelectedWeekId(normalized.weeks[0]?.id || '');
        setSelectedDayId(normalized.weeks[0]?.days[0]?.id || '');
        setAutoSaveStatus('Przywrócono kopię chmurową i zapisano lokalnie');
      } catch (error) {
        try {
          await roomDatabase.atomicWriteFromGymData(previous);
          verifyCompleteLocalSnapshot(previous);
          finishCloudRestoreRecovery();
        } catch { /* Startup recovery keeps the original snapshot if rollback cannot finish. */ }
        throw error;
      } finally { isWritingRef.current = false; }
    },
  });

  const isDark = data.settings.theme === 'dark';
  const currentWeek = data.weeks.find((w) => w.id === selectedWeekId) || data.weeks[0];
  const currentDay = currentWeek?.days.find((d) => d.id === selectedDayId) || currentWeek?.days[0];
  const currentDayExercises = currentDay?.exercises || [];
  const currentDayVolume = currentDayExercises.reduce(
    (acc, ex) => acc + (ex.sets || 3) * (ex.reps || 8) * (ex.weight || 0),
    0
  );
  const currentDayTotalSets = currentDayExercises.reduce((acc, ex) => acc + (ex.sets || 3), 0);
  const currentDayCompletedSets = currentDayExercises.reduce((acc, ex) => {
    return acc + (ex.loggedSets ? ex.loggedSets.filter((s) => s.completed).length : 0);
  }, 0);
  const uiScale = data.settings.uiScale || 'high';

  // Typography & Windows Layout Classes
  const fontFamilyClass = data.settings.fontFamilyChoice === 'segoe'
    ? 'font-windows-segoe'
    : data.settings.fontFamilyChoice === 'mono'
    ? 'font-mono-tech'
    : data.settings.fontFamilyChoice === 'condensed'
    ? 'font-condensed-pro'
    : 'font-sans-modern';

  const fontContrastClass = data.settings.fontContrast === 'high_contrast'
    ? 'high-contrast-text'
    : data.settings.fontContrast === 'bold_headings'
    ? 'bold-headings'
    : '';

  const windowsViewportClass = data.settings.windowsViewportMode === 'fhd_1080p'
    ? 'windows-frame-fhd'
    : data.settings.windowsViewportMode === 'laptop_768p'
    ? 'windows-frame-laptop'
    : data.settings.windowsViewportMode === 'wqhd_1440p'
    ? 'windows-frame-wqhd'
    : data.settings.windowsViewportMode === 'classic_1280x800'
    ? 'windows-frame-classic'
    : '';

  const fontSizeScale = data.settings.fontSizeScale || 100;

  const isAmoled = data.settings.amoledBlack === true;

  return (
    <div 
      data-ui-scale={uiScale}
      className={`h-screen h-[100dvh] w-full max-w-full overflow-hidden ${
        isAmoled ? 'bg-black text-slate-100' : isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      } ${data.settings.reducedMotion ? 'reduce-motion' : ''} ${fontFamilyClass} ${fontContrastClass} ${windowsViewportClass} flex flex-col font-sans antialiased crisp-pixel selection:bg-emerald-500 selection:text-white`}
      style={{
        fontSize: fontSizeScale !== 100 ? `${fontSizeScale}%` : undefined
      }}
    >
      <div className="flex-1 flex overflow-hidden">
        {/* Modern Desktop Sidebar (Left Side) */}
        <div className="hidden md:flex shrink-0">
          <ModernSidebar
            activeView={activeView}
            weightSubcategory={weightSubcategory}
            onSelectView={handleSelectView}
            settings={data.settings}
            onUpdateSettings={handleUpdateSettings}
            autoSaveStatus={autoSaveStatus}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            weeksCount={data.weeks.length}
            position="left"
            profile={data.profile}
            onUpdateProfile={handleUpdateProfile}
            syncConfig={data.syncConfig}
            onUpdateSyncConfig={handleUpdateSyncConfig}
            currentWeek={currentWeek}
            selectedDayId={selectedDayId}
            onSelectDay={setSelectedDayId}
          />
        </div>

        {/* Main Workspace Canvas */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <ModernHeader
            activeView={activeView}
            onSelectView={handleSelectView}
            settings={data.settings}
            onUpdateSettings={handleUpdateSettings}
            autoSaveStatus={autoSaveStatus}
            onOpenAddExerciseModal={() => {
              setExerciseToEdit(null);
              setIsExerciseModalOpen(true);
            }}
            onExportJson={handleExportJson}
            onCreateBackup={handleCreateManualBackup}
            onToggleMobileMenu={() => setIsMoreSheetOpen(true)}
            currentWeekName={currentWeek?.name}
            currentDayName={currentDay?.name}
          />

        {/* View Switcher Container */}
        <main className={`flex-1 overflow-y-auto flex flex-col pb-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom)))] md:pb-0 ${
          isAmoled ? 'bg-black' : isDark ? 'bg-slate-950 bg-mesh-3d' : 'bg-slate-50'
        }`}>
          {activeView === 'quick_access' && (
            <QuickAccessDashboard
              data={data}
              onUpdateSettings={handleUpdateSettings}
              onSelectView={handleSelectView}
              onUpdateExerciseWeight={handleUpdateExerciseWeight}
              onSaveExercisePerformance={handleSaveExercisePerformance}
              onAddBodyWeight={handleAddBodyWeight}
              unit={data.settings.unit}
            />
          )}

          {activeView === 'plan' && (
            <WorkoutPlanView
              weeks={data.weeks}
              selectedWeekId={selectedWeekId}
              selectedDayId={selectedDayId}
              onSelectWeek={setSelectedWeekId}
              onSelectDay={setSelectedDayId}
              onAddWeek={handleAddWeek}
              onDeleteWeek={handleDeleteWeek}
              onDuplicateWeek={handleDuplicateWeek}
              onAddDay={handleAddDay}
              onDeleteDay={handleDeleteDay}
              onToggleDayCompleted={handleToggleDayCompleted}
              onUpdateDayNotes={handleUpdateDayNotes}
              onUpdateExerciseWeight={handleUpdateExerciseWeight}
              onSaveExercisePerformance={handleSaveExercisePerformance}
              onRenameExercise={handleRenameExercise}
              onRenameWeek={handleRenameWeek}
              onUpdateWeekStartDate={handleUpdateWeekStartDate}
              onRenameDay={handleRenameDay}
              onOpenAddExerciseModal={() => {
                setExerciseToEdit(null);
                setIsExerciseModalOpen(true);
              }}
              onOpenEditExerciseModal={(ex) => {
                setExerciseToEdit(ex);
                setIsExerciseModalOpen(true);
              }}
              onOpenHistoryModal={(ex) => {
                setHistoryExercise(ex);
                setIsHistoryModalOpen(true);
              }}
              onDeleteExercise={handleDeleteExercise}
              unit={data.settings.unit}
              settings={data.settings}
            />
          )}

          {activeView === 'stats' && (
            <StatsView
              weeks={data.weeks}
              bodyWeights={data.bodyWeights || []}
              unit={data.settings.unit}
              analysisOnlyCompleted={data.settings.analysisOnlyCompleted !== false}
              analysisHideEmptyGroups={data.settings.analysisHideEmptyGroups !== false}
              analysisIncludePartialHistory={data.settings.analysisIncludePartialHistory === true}
              analysisStartWeek={data.settings.analysisStartWeek || 1}
              analysisEndWeek={data.settings.analysisEndWeek || 999}
              analysisDefaultMetric={data.settings.analysisDefaultMetric || 'progressPct'}
              analysisShowDataQualityWarnings={data.settings.analysisShowDataQualityWarnings !== false}
              analysisRequireHistoryForCompleted={data.settings.analysisRequireHistoryForCompleted !== false} analysisWarnVolumeJumpPct={data.settings.analysisWarnVolumeJumpPct || 30}
              analysisMinExecutedSets={data.settings.analysisMinExecutedSets || 1}
              analysisWarnMissingHistory={data.settings.analysisWarnMissingHistory !== false}
              analysisShowExecutionSummary={data.settings.analysisShowExecutionSummary !== false}
              analysisShowWeekComparison={data.settings.analysisShowWeekComparison !== false}
              analysisShowWeeklyTonnage={data.settings.analysisShowWeeklyTonnage === true}
              analysisShowWeeklyMetrics={data.settings.analysisShowWeeklyMetrics === true}
              analysisShowExecutedDays={data.settings.analysisShowExecutedDays !== false}
              analysisShowExecutedExercises={data.settings.analysisShowExecutedExercises !== false}
              analysisShowExecutedSets={data.settings.analysisShowExecutedSets !== false}
              analysisShowExecutedReps={data.settings.analysisShowExecutedReps !== false}
              analysisShowVolumeDelta={data.settings.analysisShowVolumeDelta !== false}
              analysisShowDataConfidence={data.settings.analysisShowDataConfidence !== false}
              analysisShowBestE1RM={data.settings.analysisShowBestE1RM !== false}
              analysisShowLatestResult={data.settings.analysisShowLatestResult !== false}
              analysisShowTrendLine={data.settings.analysisShowTrendLine !== false}
              analysisShowPRMarkers={data.settings.analysisShowPRMarkers !== false}
              analysisPRMetric={data.settings.analysisPRMetric || 'e1RM'}
              analysisStagnationWindow={data.settings.analysisStagnationWindow || 4}
              analysisStagnationMinSessions={data.settings.analysisStagnationMinSessions || 3}
              analysisShowRegularity={data.settings.analysisShowRegularity === true}
              analysisRegularityTargetPct={data.settings.analysisRegularityTargetPct || 80}
              analysisShowMonthlyComparison={data.settings.analysisShowMonthlyComparison === true}
              analysisMonthlyMetric={data.settings.analysisMonthlyMetric || 'volume'}
              analysisShowPeriodComparison={data.settings.analysisShowPeriodComparison === true}
              analysisPeriodComparisonMetric={data.settings.analysisPeriodComparisonMetric || 'volume'}
              analysisShowRollingVolume={data.settings.analysisShowRollingVolume === true}
              analysisReportLayout={data.settings.analysisReportLayout || 'bento_left'}
              analysisShowLayoutSwitcher={data.settings.analysisShowLayoutSwitcher === true}
              analysisShowAiAgent={data.settings.analysisShowAiAgent !== false}
              aiAgentMode={data.settings.aiAgentMode || 'heuristic_local'}
              aiAgentServerUrl={data.settings.aiAgentServerUrl || ''}
              aiAgentApiKey={data.settings.aiAgentApiKey || ''}
              aiAgentPersona={data.settings.aiAgentPersona || 'balanced'}
              aiAgentFocus={data.settings.aiAgentFocus || 'all_muscles'}
              aiAgentResponseLength={data.settings.aiAgentResponseLength || 'concise'}
            />
          )}

          {activeView === 'muscle' && (
              <MuscleProgressView weeks={data.weeks} unit={data.settings.unit} analysisOnlyCompleted={data.settings.analysisOnlyCompleted !== false} analysisHideEmptyGroups={data.settings.analysisHideEmptyGroups !== false} analysisIncludePartialHistory={data.settings.analysisIncludePartialHistory === true} analysisStartWeek={data.settings.analysisStartWeek || 1} analysisEndWeek={data.settings.analysisEndWeek || 999} analysisDefaultMetric={data.settings.analysisDefaultMetric || 'progressPct'} analysisShowDataQualityWarnings={data.settings.analysisShowDataQualityWarnings !== false} analysisRequireHistoryForCompleted={data.settings.analysisRequireHistoryForCompleted !== false} analysisMinExecutedSets={data.settings.analysisMinExecutedSets || 1} analysisWarnMissingHistory={data.settings.analysisWarnMissingHistory !== false} analysisShowExecutionSummary={data.settings.analysisShowExecutionSummary !== false} analysisShowMuscleFrequency={data.settings.analysisShowMuscleFrequency !== false} />
          )}

          {(activeView === 'weight' || activeView.startsWith('weight:')) && (
            <BodyWeightView
              bodyWeights={data.bodyWeights || []}
              onAddBodyWeight={handleAddBodyWeight}
              onDeleteBodyWeight={handleDeleteBodyWeight}
              circumferences={data.circumferences || []}
              bodyPartMeasurements={data.bodyPartMeasurements || []}
              onAddBodyMeasurement={handleAddBodyMeasurement}
              onDeleteBodyMeasurement={handleDeleteBodyMeasurement}
              weeks={data.weeks}
              onAddCircumference={handleAddCircumference}
              onUpdateCircumference={handleUpdateCircumference}
              onDeleteCircumference={handleDeleteCircumference}
              unit={data.settings.unit}
              activeSubcategory={weightSubcategory}
              onSelectSubcategory={setWeightSubcategory}
            />
          )}

          {activeView === 'cycles' && (
            <CycleProtocolView
              protocolEntries={data.protocolEntries || []}
              calendarNotes={data.calendarNotes || []}
              weeks={data.weeks}
              settings={data.settings}
              bodyWeights={data.bodyWeights || []}
              bodyPartMeasurements={data.bodyPartMeasurements || []}
              onAddProtocolEntry={handleAddProtocolEntry}
              onDeleteProtocolEntry={handleDeleteProtocolEntry}
              onAddCalendarNote={handleAddCalendarNote}
              onUpdateCalendarNote={handleUpdateCalendarNote}
              onDeleteCalendarNote={handleDeleteCalendarNote}
              onUpdateWeekStartDate={handleUpdateWeekStartDate}
              onAddWeekFromGap={handleAddWeekFromGap}
            />
          )}

          {activeView === 'exercises' && (
            <ExerciseManagerView
              catalogExercises={catalogExercises}
              weeks={data.weeks}
              onAddCatalogExercise={handleAddCatalogExercise}
              onEditCatalogExercise={handleEditCatalogExercise}
              onDeleteCatalogExercise={handleDeleteCatalogExercise}
              onResetCatalogToDefaults={handleResetCatalogToDefaults}
              onInsertToPlan={handleInsertCatalogToPlan}
              unit={data.settings.unit}
            />
          )}

          {activeView === 'profile' && (
            <UserProfileView
              data={data}
              onUpdateProfile={handleUpdateProfile}
              onUpdateSyncConfig={handleUpdateSyncConfig}
              onAddSyncLog={handleAddSyncLog}
              onSwitchProfile={handleSwitchProfile}
              onCreateProfile={handleCreateProfile}
              onDeleteProfile={handleDeleteProfile}
              unit={data.settings.unit}
            />
          )}

          {activeView === 'ai' && (
            <AiCoachView
              gymData={data}
              settings={data.settings}
              profile={data.profile}
              calendarNotes={data.calendarNotes || []}
              bodyWeights={data.bodyWeights || []}
              circumferences={data.circumferences || []}
              bodyPartMeasurements={data.bodyPartMeasurements || []}
              bloodTests={data.bloodTests || []}
              chatHistory={data.aiChatHistory || []}
              onUpdateChatHistory={handleUpdateAiChatHistory}
              agentMemories={data.aiAgentMemories || []}
              onUpdateAgentMemories={handleUpdateAiAgentMemories}
              onAddExercise={handleAddExerciseToPlan}
              onAddBodyWeight={handleAddBodyWeight}
              onAddCircumference={handleAddCircumference}
              onAddBodyMeasurement={handleAddBodyMeasurement}
              onAddProtocolEntry={handleAddProtocolEntry}
              onAddCalendarNote={handleAddCalendarNote}
              onUpdateProfile={handleUpdateProfile}
              onUpdateSettings={handleUpdateSettings}
              onUpdateWeeks={handleUpdateWeeks}
              onCreateBackup={handleCreateManualBackup}
            />
          )}

          {activeView === 'settings' && (
            <SettingsView
              data={data}
              cloudSync={cloudSync}
              onUpdateSettings={handleUpdateSettings}
              googleSession={googleSession}
              onGoogleSessionChange={updateGoogleSession}
              onExportJson={handleExportJson}
              onImportJson={handleImportJson}
              onResetData={handleResetData}
              backups={backups}
              onCreateBackup={handleCreateManualBackup}
              onRestoreBackup={handleRestoreBackup}
              onDownloadBackup={handleDownloadBackup}
              onDeleteBackup={handleDeleteBackup}
              onUpdateSyncConfig={handleUpdateSyncConfig}
              onNavigateToProfile={() => setActiveView('profile')}
            />
          )}
        </main>
        </div>
      </div>

      {/* Mobile Drawer Navigation (Left Side) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-start md:hidden animate-fadeIn">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72 h-full shadow-2xl">
            <ModernSidebar
              activeView={activeView}
              weightSubcategory={weightSubcategory}
              onSelectView={(v) => {
                handleSelectView(v);
                setIsMobileMenuOpen(false);
              }}
              settings={data.settings}
              onUpdateSettings={handleUpdateSettings}
              autoSaveStatus={autoSaveStatus}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileMenuOpen(false)}
              weeksCount={data.weeks.length}
              position="left"
              profile={data.profile}
              onUpdateProfile={handleUpdateProfile}
              syncConfig={data.syncConfig}
              onUpdateSyncConfig={handleUpdateSyncConfig}
              currentWeek={currentWeek}
              selectedDayId={selectedDayId}
              onSelectDay={setSelectedDayId}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <ExerciseModal
        isOpen={isExerciseModalOpen}
        onClose={() => setIsExerciseModalOpen(false)}
        onSave={handleSaveExercise}
        exerciseToEdit={exerciseToEdit}
        unit={data.settings.unit}
      />

      <ExerciseHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        exercise={historyExercise}
        onUpdateHistory={handleUpdateExerciseHistory}
        unit={data.settings.unit}
      />

      {/* Live Sticky Workout Bar (Mobile & Desktop) - Always persistent across views & tabs */}
      {currentDay && (activeView === 'plan' || workoutTimer.restTimerSeconds !== null) && (
        <ActiveWorkoutBar
          dayName={currentDay.name}
          totalVolume={currentDayVolume}
          completedSets={currentDayCompletedSets}
          totalSets={currentDayTotalSets}
          unit={data.settings.unit}
          onFinishWorkout={() => setIsSummaryModalOpen(true)}
          elapsedSeconds={workoutTimer.elapsedSeconds}
          isSessionActive={workoutTimer.isSessionActive}
          hasActiveSession={workoutTimer.hasActiveSession}
          onToggleSessionPause={workoutTimer.toggleSessionPause}
          restTimerSeconds={workoutTimer.restTimerSeconds}
          onStartRestTimer={workoutTimer.startRestTimer}
          onAdjustRestTimer={workoutTimer.adjustRestTimer}
          onCancelRestTimer={workoutTimer.cancelRestTimer}
          isDark={isDark}
        />
      )}

      {/* Workout Summary Modal */}
      {currentDay && (
        <WorkoutSummaryModal
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
          dayName={currentDay.name}
          totalVolume={currentDayVolume}
          completedSets={currentDayCompletedSets}
          totalSets={currentDayTotalSets}
          unit={data.settings.unit}
          onConfirmFinish={handleConfirmFinishWorkout}
          isDark={isDark}
        />
      )}

      {/* Android Floating Action Button (FAB) if enabled */}
      {activeView !== 'ai' && data.settings.floatingActionButton && data.settings.floatingActionButton !== 'none' && (
        <div className="fixed bottom-20 right-4 z-30 md:hidden animate-bounce-short">
          {data.settings.floatingActionButton === 'timer' && (
            <button
              type="button"
              onClick={() => {
                const restSec = data.settings.restTimeCompound || 180;
                workoutTimer.startRestTimer(restSec);
                soundService.playTone([880], 70, 'sine');
              }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl flex items-center justify-center border border-emerald-400/40 active:scale-95 cursor-pointer"
              title="Szybki Stoper"
            >
              <span className="text-xl">⏱️</span>
            </button>
          )}
          {data.settings.floatingActionButton === 'ai' && (
            <button
              type="button"
              onClick={() => handleSelectView('ai')}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-xl flex items-center justify-center border border-purple-400/40 active:scale-95 cursor-pointer"
              title="Trener AI"
            >
              <span className="text-xl">🤖</span>
            </button>
          )}
          {data.settings.floatingActionButton === 'weight' && (
            <button
              type="button"
              onClick={() => handleSelectView('weight')}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-xl flex items-center justify-center border border-cyan-400/40 active:scale-95 cursor-pointer"
              title="Waga i Pomiary"
            >
              <span className="text-xl">⚖️</span>
            </button>
          )}
        </div>
      )}

      {/* Android Mobile Touch Bottom Navigation (Material 3) */}
      <AndroidBottomNav
        activeView={activeView}
        onSelectView={handleSelectView}
        onOpenMoreSheet={() => setIsMoreSheetOpen(true)}
        isDark={isDark}
        profile={data.profile}
        syncConfig={data.syncConfig}
        settings={data.settings}
      />

      {/* Material 3 More Bottom Sheet */}
      <AndroidMoreBottomSheet
        isOpen={isMoreSheetOpen}
        onClose={() => setIsMoreSheetOpen(false)}
        activeView={activeView}
        onSelectView={handleSelectView}
        settings={data.settings}
        onUpdateSettings={handleUpdateSettings}
        profile={data.profile}
        data={data}
        onStartRestTimer={workoutTimer.startRestTimer}
        onCreateBackup={handleCreateManualBackup}
      />
    </div>
  );
}
