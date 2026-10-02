/**
 * Dźwięki i wibracje dla aplikacji mobilnej na Androidzie (Web Audio API & Haptics)
 * Działa w 100% offline bez zewnętrznych plików audio.
 */

export type SoundType = 'bell' | 'beep' | 'silent';
export type HapticIntensity = 'off' | 'light' | 'medium' | 'strong';

export const soundService = {
  playTone(frequencies: number[], durationMs = 120, type: OscillatorType = 'sine'): void {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      let startTime = ctx.currentTime;

      frequencies.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationMs / 1000);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + durationMs / 1000);

        startTime += durationMs / 1000 + 0.04;
      });
    } catch {
      // Audio może być zablokowane przed pierwszą interakcją użytkownika - ignorujemy cicho
    }
  },

  playBellChime(): void {
    // Przyjemny sportowy trójdźwięk gongu
    this.playTone([523.25, 659.25, 783.99, 1046.50], 220, 'triangle');
  },

  playSuccess(): void {
    this.playTone([587.33, 739.99, 880, 1174.66], 180, 'triangle');
  },

  playSportBeep(): void {
    this.playTone([880, 1100], 100, 'sine');
  },

  triggerHaptic(intensity: HapticIntensity = 'medium', customPattern?: number[]): void {
    if (intensity === 'off') return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        if (customPattern) {
          navigator.vibrate(customPattern);
          return;
        }
        // Zoptymalizowane mikropulsy pod liniowy silnik haptyczny X-axis w Xiaomi 14T
        const patterns: Record<Exclude<HapticIntensity, 'off'>, number[]> = {
          light: [20], // Precyzyjny mikro-klik haptyczny
          medium: [45, 25, 40], // Satysfakcjonujące mechaniczne potwierdzenie serii
          strong: [85, 40, 110], // Wyraźny podwójny impuls ukończenia odliczania stopera
        };
        navigator.vibrate(patterns[intensity]);
      }
    } catch {
      // Ignorujemy na urządzeniach bez wsparcia wibracji
    }
  },

  notifyTimerWarning10s(soundType: SoundType = 'beep', intensity: HapticIntensity = 'medium'): void {
    if (soundType === 'beep') {
      this.playTone([659.25, 659.25], 60, 'sine');
    } else if (soundType === 'bell') {
      this.playTone([440], 80, 'triangle');
    }
    this.triggerHaptic(intensity === 'off' ? 'off' : 'light', [50, 40, 50]);
  },

  notifyTimerFinished(soundType: SoundType = 'bell', intensity: HapticIntensity = 'medium'): void {
    if (soundType === 'bell') {
      this.playBellChime();
    } else if (soundType === 'beep') {
      this.playTone([784, 988, 1175], 140, 'sine');
    }
    this.triggerHaptic(intensity, [150, 70, 200]);
  },

  playSuccessSound(soundType: SoundType = 'bell', intensity: HapticIntensity = 'medium'): void {
    if (soundType === 'bell') {
      this.playTone([523.25, 659.25, 783.99], 80, 'triangle');
    } else if (soundType === 'beep') {
      this.playTone([880], 70, 'sine');
    }
    this.triggerHaptic(intensity === 'off' ? 'off' : 'light', [35]);
  }
};

