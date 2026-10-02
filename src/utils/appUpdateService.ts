import { AppUpdateInfo, AppUpdateHistoryEntry } from '../types';

const UPDATE_HISTORY_STORAGE_KEY = 'gymtracker_update_history_v1';
export const CURRENT_APP_VERSION = '3.0.7';

export class AppUpdateService {
  static getUpdateHistory(): AppUpdateHistoryEntry[] {
    try {
      const saved = localStorage.getItem(UPDATE_HISTORY_STORAGE_KEY);
      const history: unknown = saved ? JSON.parse(saved) : [];
      return Array.isArray(history) ? history as AppUpdateHistoryEntry[] : [];
    } catch (error) {
      console.warn('Nie udało się odczytać historii aktualizacji:', error);
      return [];
    }
  }

  static saveHistoryEntry(entry: AppUpdateHistoryEntry): void {
    try {
      const history = this.getUpdateHistory();
      const updated = [entry, ...history.filter((item) => item.id !== entry.id)].slice(0, 20);
      localStorage.setItem(UPDATE_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Błąd zapisu historii aktualizacji:', error);
    }
  }

  static async checkForUpdates(
    serverBaseUrl = '',
    channel: 'stable' | 'beta' | 'nightly' = 'stable',
    currentVersion = CURRENT_APP_VERSION
  ): Promise<{ updateAvailable: boolean; update?: AppUpdateInfo; message?: string }> {
    const cleanUrl = serverBaseUrl.trim().replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/api/update/check?currentVersion=${encodeURIComponent(currentVersion)}&channel=${encodeURIComponent(channel)}`;

    try {
      const response = await fetch(endpoint, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) {
        return { updateAvailable: false, message: `Serwer aktualizacji niedostępny (HTTP ${response.status}).` };
      }

      const data = await response.json();
      if (data.status === 'unavailable_not_configured') {
        return { updateAvailable: false, message: 'Serwer nie ma skonfigurowanego katalogu wydań.' };
      }
      if (data.updateAvailable && data.update) {
        return { updateAvailable: true, update: { ...data.update, currentVersion } };
      }
      return { updateAvailable: false, message: data.message || 'Serwer potwierdza brak nowszej wersji.' };
    } catch {
      return { updateAvailable: false, message: 'Nie można połączyć się z serwerem aktualizacji.' };
    }
  }

  /** Package delivery and installation are deliberately unsupported by this web/Capacitor client. */
  static async downloadUpdatePackage(
    _update: AppUpdateInfo,
    _onProgress: (progress: { progressPct: number; bytesDownloaded: number; totalBytes: number; speedMbps: number }) => void
  ): Promise<boolean> {
    return false;
  }

  /** A checksum cannot be verified without the downloaded package bytes. */
  static async verifyChecksum(_update: AppUpdateInfo, _packageBytes?: ArrayBuffer): Promise<boolean> {
    return false;
  }

  static async applyUpdate(
    _update: AppUpdateInfo,
    _serverBaseUrl = ''
  ): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Automatyczne instalowanie aktualizacji nie jest obsługiwane. Zainstaluj wydanie ręcznie.' };
  }

  static async rollbackVersion(
    _targetVersion = CURRENT_APP_VERSION,
    _serverBaseUrl = ''
  ): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Przywracanie wersji nie jest obsługiwane przez tę aplikację.' };
  }
}
