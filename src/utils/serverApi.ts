import { GymData, SyncServerConfig } from '../types';

export interface ServerDataEnvelope {
  schemaVersion: number;
  revision: number;
  updatedAt: string;
  contentHash: string;
  data: GymData;
}

export interface SyncBaseline {
  revision: number;
  contentHash: string | null;
}

const metadataByServer = new Map<string, SyncBaseline>();

function baseUrl(serverUrl: string): string {
  return serverUrl.trim().replace(/\/+$/, '');
}

function authHeaders(syncConfig: SyncServerConfig): Record<string, string> {
  const token = syncConfig.authToken?.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(syncConfig: SyncServerConfig, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl(syncConfig.serverUrl)}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...authHeaders(syncConfig),
      ...(init.headers || {}),
    },
    signal: init.signal || AbortSignal.timeout(5000),
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error('server_invalid_json');
  }
  if (!response.ok) {
    const errorCode = isObject(body) && typeof body.error === 'string' ? body.error : `server_http_${response.status}`;
    const error = new Error(errorCode) as Error & { status?: number; body?: unknown };
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body as T;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function string(value: unknown): value is string { return typeof value === 'string'; }

function isLoggedSet(value: unknown): boolean {
  return isObject(value) && finite(value.setNumber) && finite(value.weight) && finite(value.reps) && typeof value.completed === 'boolean';
}

function isExerciseHistory(value: unknown): boolean {
  if (!isObject(value) || !string(value.date) || !finite(value.weight) || !finite(value.reps) || !finite(value.sets)) return false;
  if ('rpe' in value && !finite(value.rpe)) return false;
  return !('loggedSets' in value) || (Array.isArray(value.loggedSets) && value.loggedSets.every(isLoggedSet));
}

function isExercise(value: unknown): boolean {
  if (!isObject(value) || !string(value.id) || !string(value.name) || !finite(value.sets) || !finite(value.reps) ||
      !finite(value.weight) || !finite(value.rpe) || !string(value.notes) || !Array.isArray(value.history) ||
      !value.history.every(isExerciseHistory)) return false;
  if ('category' in value && value.category !== undefined && !['klatka', 'plecy', 'biceps', 'triceps', 'barki', 'nogi'].includes(value.category as string)) return false;
  if ('goalWeight' in value && value.goalWeight !== undefined && !finite(value.goalWeight)) return false;
  return !('loggedSets' in value) || (Array.isArray(value.loggedSets) && value.loggedSets.every(isLoggedSet));
}

function isBodyWeight(value: unknown): boolean {
  return isObject(value) && string(value.id) && string(value.date) && finite(value.weight) && string(value.notes);
}

function isBodyPartMeasurement(value: unknown): boolean {
  return isObject(value) && string(value.id) && string(value.date) &&
    ['biceps', 'triceps', 'klata', 'barki', 'nogi'].includes(value.part as string) && finite(value.value) &&
    (!('notes' in value) || value.notes === undefined || string(value.notes));
}

function isCircumference(value: unknown): boolean {
  const millimeters = value && isObject(value) ? value.millimeters : undefined;
  return isObject(value) && string(value.id) && string(value.date) &&
    ['klatka', 'talia', 'biodra', 'udo', 'łydka', 'ramię'].includes(value.bodyPart as string) &&
    (value.side === null || value.side === 'left' || value.side === 'right') &&
    (value.variant === 'standard' || value.variant === 'flexed' || value.variant === 'relaxed') &&
    finite(millimeters) && Number.isInteger(millimeters) && millimeters > 0 && string(value.notes);
}

function isGymData(value: unknown): value is GymData {
  if (!isObject(value) || !isObject(value.settings) || !Array.isArray(value.weeks) || !Array.isArray(value.bodyWeights) ||
      !value.bodyWeights.every(isBodyWeight)) return false;
  if ('circumferences' in value && (!Array.isArray(value.circumferences) || !value.circumferences.every(isCircumference))) return false;
  if ('bodyPartMeasurements' in value && (!Array.isArray(value.bodyPartMeasurements) || !value.bodyPartMeasurements.every(isBodyPartMeasurement))) return false;
  return value.weeks.every((week) => isObject(week) && typeof week.id === 'string' && typeof week.name === 'string' &&
    finite(week.number) && Array.isArray(week.days) && week.days.every((day) => isObject(day) &&
      string(day.id) && string(day.name) && typeof day.completed === 'boolean' && Array.isArray(day.exercises) && day.exercises.every(isExercise)));
}

function validateEnvelope(value: unknown): ServerDataEnvelope | null {
  if (value === null) return null;
  if (!isObject(value) || value.schemaVersion !== 1 || typeof value.revision !== 'number' || !Number.isSafeInteger(value.revision) || value.revision < 1 ||
      typeof value.updatedAt !== 'string' || !value.updatedAt || typeof value.contentHash !== 'string' || !value.contentHash ||
      !isGymData(value.data)) {
    throw new Error('server_invalid_data_envelope');
  }
  return value as unknown as ServerDataEnvelope;
}

function metadataKey(syncConfig: SyncServerConfig): string {
  return `${baseUrl(syncConfig.serverUrl)}\u0000${syncConfig.authToken?.trim() || ''}`;
}

export function clearServerSyncMetadata(syncConfig: SyncServerConfig): void {
  metadataByServer.delete(metadataKey(syncConfig));
}

async function validateContentHash(data: GymData, expectedHash: string): Promise<boolean> {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) return false;
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const digest = await cryptoApi.subtle.digest('SHA-256', bytes);
  const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return actual === expectedHash;
}

export async function checkServerHealth(serverUrl: string): Promise<{ status: string; version: string }> {
  return request({ serverUrl, authToken: '', port: 0, deviceId: '', deviceName: '', deviceType: 'windows_desktop', pairingCode: '', autoSync: false, conflictResolution: 'ask' }, '/api/health');
}

export async function getServerCapabilities(serverUrl: string): Promise<{ capabilities: string[] }> {
  const version = await request<{ capabilities?: string[] }>({ serverUrl, authToken: '', port: 0, deviceId: '', deviceName: '', deviceType: 'windows_desktop', pairingCode: '', autoSync: false, conflictResolution: 'ask' }, '/api/version');
  return { capabilities: Array.isArray(version.capabilities) ? version.capabilities : [] };
}

export async function pullServerData(syncConfig: SyncServerConfig): Promise<ServerDataEnvelope | null> {
  let raw: unknown;
  try {
    raw = await request<unknown>(syncConfig, '/api/data');
  } catch (error) {
    const httpError = error as Error & { status?: number; body?: { error?: string } };
    if (httpError.status === 404 && httpError.body?.error === 'data_unavailable') {
      metadataByServer.set(metadataKey(syncConfig), { revision: 0, contentHash: null });
      return null;
    }
    throw error;
  }
  const envelope = validateEnvelope(raw);
  if (!envelope) throw new Error('server_invalid_data_envelope');
  if (!(await validateContentHash(envelope.data, envelope.contentHash))) throw new Error('server_content_hash_mismatch');
  metadataByServer.set(metadataKey(syncConfig), { revision: envelope.revision, contentHash: envelope.contentHash });
  return envelope;
}

export async function pushServerData(syncConfig: SyncServerConfig, data: GymData, expected: SyncBaseline): Promise<ServerDataEnvelope> {
  if (!expected || !Number.isSafeInteger(expected.revision) || expected.revision < 0 ||
      (expected.contentHash !== null && (typeof expected.contentHash !== 'string' || !expected.contentHash))) {
    throw new Error('sync_baseline_required');
  }
  if (!isGymData(data)) throw new Error('invalid_gym_data');
  const current = metadataByServer.get(metadataKey(syncConfig));
  if (!current || current.revision !== expected.revision || current.contentHash !== expected.contentHash) {
    throw new Error('sync_baseline_mismatch');
  }
  const envelope = validateEnvelope(await request<unknown>(syncConfig, '/api/data', {
    method: 'POST',
    body: JSON.stringify({
      schemaVersion: 1,
      revision: expected.revision,
      contentHash: expected.contentHash,
      data,
    }),
  })) as ServerDataEnvelope;
  if (!(await validateContentHash(envelope.data, envelope.contentHash))) throw new Error('server_content_hash_mismatch');
  metadataByServer.set(metadataKey(syncConfig), { revision: envelope.revision, contentHash: envelope.contentHash });
  return envelope;
}

export interface SyncStatus {
  status: string;
  revision: number;
  updatedAt: string | null;
  contentHash: string | null;
  deviceId: string;
  offline: boolean;
  online: boolean;
}

export async function getServerSyncStatus(syncConfig: SyncServerConfig): Promise<SyncStatus> {
  const status = await request<unknown>(syncConfig, '/api/sync/status');
  if (!isObject(status) || !Number.isSafeInteger(status.revision) || typeof status.status !== 'string' ||
      (status.contentHash !== null && typeof status.contentHash !== 'string')) throw new Error('server_invalid_sync_status');
  return status as unknown as SyncStatus;
}

// ==========================================
// GOOGLE CLOUD SERVER & GOOGLE SIGN-IN API
// ==========================================
const configuredServerUrl = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_GYMTRACKER_SERVER_URL;
export const GOOGLE_CLOUD_SERVER_URL = configuredServerUrl?.trim().replace(/\/+$/, '') || '';
export const GOOGLE_CLOUD_SHARED_URL = configuredServerUrl?.trim().replace(/\/+$/, '') || '';

export interface GoogleServerInfo {
  status: string;
  provider: string;
  name: string;
  cloudRunUrl: string;
  sharedUrl: string;
  region: string;
  ssl: string;
  uptimeStatus: string;
  pairingCode: string;
  protocol?: string;
  host?: string;
  port?: number;
  googleAuthAvailable: boolean;
  activeUser?: {
    email: string;
    displayName: string;
    photoURL?: string;
  } | null;
  timestamp: string;
}

export async function getGoogleCloudServerInfo(targetUrl?: string): Promise<GoogleServerInfo> {
  const url = baseUrl(targetUrl || GOOGLE_CLOUD_SHARED_URL);
  if (!url) throw new Error('Serwer GymTracker nie został skonfigurowany.');
  if (!url.startsWith('https://') && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url)) throw new Error('Serwer logowania musi używać HTTPS (HTTP dozwolone tylko lokalnie).');
  return request({ serverUrl: url, authToken: '', port: 0, deviceId: '', deviceName: '', deviceType: 'windows_desktop', pairingCode: '', autoSync: false, conflictResolution: 'ask' }, '/api/server/google-info');
}

export async function loginWithGoogleAccount(options: { idToken: string; targetUrl?: string }): Promise<{
  success: boolean;
  token: string;
  user: { email: string; displayName: string; photoURL?: string; id: string; sub: string; connectedAt: string };
  serverInfo: GoogleServerInfo;
}> {
  const target = baseUrl(options.targetUrl || GOOGLE_CLOUD_SHARED_URL);
  if (!target) throw new Error('Serwer GymTracker nie został skonfigurowany.');
  if (!target.startsWith('https://') && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(target)) throw new Error('Serwer logowania musi używać HTTPS (HTTP dozwolone tylko lokalnie).');
  if (!options.idToken) throw new Error('Google nie zwrócił tokenu ID.');
  return request({ serverUrl: target, authToken: '', port: 0, deviceId: '', deviceName: '', deviceType: 'windows_desktop', pairingCode: '', autoSync: false, conflictResolution: 'ask' }, '/api/auth/google/login', {
    method: 'POST', body: JSON.stringify({ idToken: options.idToken }),
  });
}

export async function getGoogleAuthStatus(targetUrl: string, token: string): Promise<{ authenticated: boolean; user?: GoogleServerInfo['activeUser'] }> {
  return request({ serverUrl: targetUrl, authToken: token, port: 0, deviceId: '', deviceName: '', deviceType: 'windows_desktop', pairingCode: '', autoSync: false, conflictResolution: 'ask' }, '/api/auth/google/user');
}

export async function logoutGoogleAccount(targetUrl: string, token: string): Promise<void> {
  await request({ serverUrl: targetUrl, authToken: token, port: 0, deviceId: '', deviceName: '', deviceType: 'windows_desktop', pairingCode: '', autoSync: false, conflictResolution: 'ask' }, '/api/auth/google/logout', { method: 'POST' });
}

