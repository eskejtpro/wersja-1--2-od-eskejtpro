/**
 * Calculation utilities for strength progression and gym statistics
 */

export function calculate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  // Epley formula: 1RM = weight * (1 + reps / 30)
  const oneRepMax = weight * (1 + reps / 30);
  return Math.round(oneRepMax * 10) / 10;
}

export function calculateVolume(sets: number, reps: number, weight: number): number {
  if (sets <= 0 || reps <= 0 || weight <= 0) return 0;
  return Math.round(sets * reps * weight);
}

export function formatWeight(weight: number, unit: 'kg' | 'lbs' = 'kg'): string {
  return `${weight.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} ${unit}`;
}

export function convertWeight(weight: number, fromUnit: 'kg' | 'lbs', toUnit: 'kg' | 'lbs'): number {
  if (fromUnit === toUnit) return weight;
  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return Math.round(weight * 2.20462 * 10) / 10;
  }
  return Math.round((weight / 2.20462) * 10) / 10;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
