import { Preferences } from '@capacitor/preferences';

const memoryStore = new Map<string, string>();

declare global {
  interface Window {
    gymDesktop?: {
      getItem: (key: string) => string | null;
      setItem: (key: string, value: string) => void;
      migrate: (raw: string) => unknown;
      validate: (raw: string) => unknown;
      prompt: (message: string, value: string) => string | null;
    };
  }
}

/**
 * Hybrydowa, automatyczna warstwa zapisu offline na Androidzie i przeglądarce:
 * 1. Synchronous localStorage (błyskawiczny odczyt/zapis LevelDB w WebView)
 * 2. Asynchronous @capacitor/preferences (natywne Android SharedPreferences XML na dysku telefonu)
 * 3. In-memory fallback
 */
export const persistence = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;

    if (window.gymDesktop) {
      const saved = window.gymDesktop.getItem(key);
      if (saved !== null) return saved;
      try {
        const legacy = localStorage.getItem(key);
        if (legacy && key === 'gymtracker_windows_data_v1') {
          window.gymDesktop.migrate(legacy);
          return window.gymDesktop.getItem(key);
        }
        return legacy;
      } catch {
        return memoryStore.get(key) ?? null;
      }
    }

    try {
      const val = localStorage.getItem(key);
      return val !== null ? val : (memoryStore.get(key) ?? null);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;

    if (window.gymDesktop) {
      window.gymDesktop.setItem(key, value);
      try {
        localStorage.setItem(key, value);
      } catch {
        /* Desktop authoritative */
      }
      return;
    }

    // 1. Zapis synchroniczny do localStorage (natychmiastowy)
    try {
      localStorage.setItem(key, value);
    } catch {
      memoryStore.set(key, value);
    }

    // 2. Równoległy zapis natywny do Android SharedPreferences (Capacitor Preferences)
    try {
      Preferences.set({ key, value }).catch(() => {
        // Ignoruj błędy poza środowiskiem mobilnym
      });
    } catch {
      // Ignoruj na platformach bez wsparcia wtyczki
    }
  },

  /**
   * Asynchroniczny odczyt z natywnych SharedPreferences Androida
   * używany jako awaryjne odzyskiwanie w razie wyczyszczenia cache WebView
   */
  async getNativePreference(key: string): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch {
      return null;
    }
  }
};

if (typeof window !== 'undefined' && window.gymDesktop) {
  window.prompt = (message = '', value = '') => window.gymDesktop!.prompt(message, value);
}
