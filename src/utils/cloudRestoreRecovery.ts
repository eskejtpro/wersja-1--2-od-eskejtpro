import type { GymData } from '../types';

export const CLOUD_RESTORE_RECOVERY_KEY = 'gymtracker_cloud_restore_recovery_v1';

export function hasCloudRestoreRecovery(): boolean {
  try { return localStorage.getItem(CLOUD_RESTORE_RECOVERY_KEY) !== null; }
  catch { return true; } // Unavailable storage cannot be assumed safely recovered.
}

// Partitioned local storage has no cross-key transaction. This journal is committed first.
export function readCloudRestoreRecovery(): GymData | null {
  const raw = localStorage.getItem(CLOUD_RESTORE_RECOVERY_KEY);
  if (!raw) return null;
  const journal = JSON.parse(raw);
  if (journal.version !== 1 || !journal.data || !Array.isArray(journal.data.weeks) || !journal.data.settings) {
    throw new Error('Nieprawidłowa kopia odzyskiwania zapisu chmurowego.');
  }
  return journal.data;
}

export function beginCloudRestoreRecovery(data: GymData): void {
  const raw = JSON.stringify({ version: 1, data });
  localStorage.setItem(CLOUD_RESTORE_RECOVERY_KEY, raw);
  if (localStorage.getItem(CLOUD_RESTORE_RECOVERY_KEY) !== raw) throw new Error('Nie udało się zabezpieczyć danych przed przywracaniem.');
}

export function finishCloudRestoreRecovery(): void {
  localStorage.removeItem(CLOUD_RESTORE_RECOVERY_KEY);
}
