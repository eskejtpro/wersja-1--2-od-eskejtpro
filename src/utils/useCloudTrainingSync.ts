import { useEffect, useMemo, useRef, useState } from 'react';
import type { GymData, SyncServerConfig } from '../types';
import { clearServerSyncMetadata, pullServerData, pushServerData } from './serverApi';
import { CloudSyncController, type CloudSyncState } from './cloudSyncController';
import { trainingFingerprint } from './cloudTrainingData';
import { runCloudFirestoreDiagnostic, type CloudDiagnosticReport } from './cloudDiagnostics';

interface Options {
  data: GymData;
  session: { token: string; serverUrl: string } | null;
  userId: string;
  isSessionCurrent: (session: { token: string; serverUrl: string }) => boolean;
  isWorkoutActive: boolean;
  backup: (data: GymData) => Promise<void>;
  apply: (data: GymData, expectedFingerprint: string, ensureCurrent: () => void) => Promise<void>;
}

const initial: CloudSyncState = { status: 'idle', message: 'Treningi są zapisane lokalnie. Zaloguj się i sprawdź kopię w chmurze.' };

export function useCloudTrainingSync(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const [state, setState] = useState<CloudSyncState>(initial);
  const [autoSync, setAutoSync] = useState(false);
  const [diagnostic, setDiagnostic] = useState<{ running: boolean; report?: CloudDiagnosticReport; error?: string }>({ running: false });
  const diagnosticRunning = useRef(false);
  const controller = useMemo(() => {
    if (!options.session || !options.userId) return null;
    const session = options.session;
    const userId = options.userId;
    const config: SyncServerConfig = {
      serverUrl: session.serverUrl, authToken: session.token, port: 0, deviceId: '', deviceName: '',
      deviceType: 'android_mobile', pairingCode: '', autoSync: false, conflictResolution: 'ask',
    };
    const current = () => latest.current.session?.token === session.token && latest.current.session?.serverUrl === session.serverUrl
      && latest.current.userId === userId && latest.current.isSessionCurrent(session);
    return { config, sync: new CloudSyncController({
      read: () => pullServerData(config),
      write: (data, expected) => pushServerData(config, data, expected),
      local: () => latest.current.data,
      current,
      restoringAllowed: () => !latest.current.isWorkoutActive,
      backup: (data) => latest.current.backup(data),
      apply: (data, fingerprint, ensureCurrent) => latest.current.apply(data, fingerprint, ensureCurrent),
      change: setState,
    }) };
  }, [options.session?.token, options.session?.serverUrl, options.userId]);

  useEffect(() => {
    setState(initial);
    setAutoSync(false);
    setDiagnostic({ running: false });
    return () => { if (controller) clearServerSyncMetadata(controller.config); };
  }, [controller]);

  useEffect(() => {
    if (state.status === 'conflict') setAutoSync(false);
  }, [state.status]);

  // Debounce edits; retries happen on reconnect and on a modest interval, never in a tight loop.
  const fingerprint = trainingFingerprint(options.data);
  useEffect(() => {
    if (!autoSync || !controller?.sync.established) return;
    const check = () => { if (navigator.onLine !== false) void controller.sync.reconcile(); };
    const debounce = setTimeout(check, 2000);
    const poll = setInterval(check, 30_000);
    window.addEventListener('online', check);
    window.addEventListener('focus', check);
    return () => {
      clearTimeout(debounce); clearInterval(poll);
      window.removeEventListener('online', check); window.removeEventListener('focus', check);
    };
  }, [autoSync, controller, fingerprint, options.isWorkoutActive]);

  const runDiagnostic = async () => {
    const session = options.session;
    const userId = options.userId;
    if (!session || !userId || diagnosticRunning.current) return;
    const current = () => latest.current.session?.token === session.token && latest.current.session?.serverUrl === session.serverUrl
      && latest.current.userId === userId && latest.current.isSessionCurrent(session);
    diagnosticRunning.current = true;
    setDiagnostic({ running: true });
    try {
      const report = await runCloudFirestoreDiagnostic(session);
      if (current()) setDiagnostic({ running: false, report });
    } catch (error) {
      if (current()) setDiagnostic({ running: false, error: error instanceof Error ? error.message : 'Test Firestore nie powiódł się.' });
    } finally { diagnosticRunning.current = false; }
  };

  return {
    ...state,
    available: Boolean(controller),
    canEnableAuto: Boolean(controller?.sync.established),
    autoSync,
    setAutoSync,
    inspect: (direction?: 'upload' | 'restore') => controller?.sync.inspect(direction),
    confirm: () => controller?.sync.confirm(),
    cancel: () => controller?.sync.cancel(),
    diagnostic,
    runDiagnostic,
  };
}

export type CloudTrainingSync = ReturnType<typeof useCloudTrainingSync>;
