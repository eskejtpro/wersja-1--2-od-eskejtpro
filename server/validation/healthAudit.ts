export interface HealthAuditTestInput {
  testName: string;
  value: number | string;
  unit?: string;
  minNormal?: number;
  maxNormal?: number;
  date?: string;
}

export interface ValidHealthAuditInput {
  bodyWeight: number;
  bloodTests: HealthAuditTestInput[];
}

type ValidationResult =
  | { ok: true; data: ValidHealthAuditInput }
  | { ok: false };

const MAX_TESTS = 50;
const MAX_SERIALIZED_LENGTH = 12_000;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function optionalBoundedNumber(record: Record<string, unknown>, key: string): number | undefined | null {
  if (!(key in record) || record[key] === undefined || record[key] === null || record[key] === '') return undefined;
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1_000_000_000 ? value : null;
}

function validIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateHealthAuditInput(input: unknown): ValidationResult {
  if (!isRecord(input)) return { ok: false };

  const bodyWeight = input.bodyWeight === undefined ? 85 : input.bodyWeight;
  if (typeof bodyWeight !== 'number' || !Number.isFinite(bodyWeight) || bodyWeight <= 0 || bodyWeight > 1_000) {
    return { ok: false };
  }

  const sourceTests = input.bloodTests === undefined ? [] : input.bloodTests;
  if (!Array.isArray(sourceTests) || sourceTests.length > MAX_TESTS) return { ok: false };

  const bloodTests: HealthAuditTestInput[] = [];
  for (const entry of sourceTests) {
    if (!isRecord(entry)) return { ok: false };
    const name = typeof entry.testName === 'string' ? entry.testName : entry.name;
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 || CONTROL_CHARACTERS.test(name)) {
      return { ok: false };
    }

    const rawValue = entry.value;
    const value = typeof rawValue === 'number' && Number.isFinite(rawValue)
      ? rawValue
      : typeof rawValue === 'string' && rawValue.trim().length > 0 && rawValue.trim().length <= 80 && !CONTROL_CHARACTERS.test(rawValue)
        ? rawValue.trim()
        : null;
    if (value === null) return { ok: false };

    let unit: string | undefined;
    if (entry.unit !== undefined && entry.unit !== null && entry.unit !== '') {
      if (typeof entry.unit !== 'string' || entry.unit.trim().length > 24 || CONTROL_CHARACTERS.test(entry.unit)) return { ok: false };
      unit = entry.unit.trim();
    }

    const minNormal = optionalBoundedNumber(entry, 'minNormal');
    const maxNormal = optionalBoundedNumber(entry, 'maxNormal');
    if (minNormal === null || maxNormal === null || (minNormal !== undefined && maxNormal !== undefined && minNormal > maxNormal)) {
      return { ok: false };
    }

    let date: string | undefined;
    if (entry.date !== undefined && entry.date !== null && entry.date !== '') {
      if (!validIsoDate(entry.date)) return { ok: false };
      date = entry.date;
    }

    bloodTests.push({
      testName: name.trim(),
      value,
      ...(unit ? { unit } : {}),
      ...(minNormal !== undefined ? { minNormal } : {}),
      ...(maxNormal !== undefined ? { maxNormal } : {}),
      ...(date ? { date } : {}),
    });
  }

  const data = { bodyWeight, bloodTests };
  if (JSON.stringify(data).length > MAX_SERIALIZED_LENGTH) return { ok: false };
  return { ok: true, data };
}
