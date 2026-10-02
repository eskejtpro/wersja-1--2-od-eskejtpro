import { GymData, SyncServerConfig } from '../types';

export interface ServerDataEnvelope {
  schemaVersion: number;
  revision: number;
  updatedAt: string;
  contentHash: string;
  data: GymData;
}

const metadataByServer = new Map<string, Pick<ServerDataEnvelope, 'revision' | 'contentHash'>>();

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
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(body?.error || `server_http_${response.status}`) as Error & { status?: number; body?: unknown };
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body as T;
}

export async function checkServerHealth(serverUrl: string): Promise<{ status: string; version: string }> {
  return request({ serverUrl, authToken: '', port: 0, deviceId: '', deviceName: '', deviceType: 'windows_desktop', pairingCode: '', autoSync: false, conflictResolution: 'ask' }, '/api/health');
}

export async function getServerCapabilities(serverUrl: string): Promise<{ capabilities: string[] }> {
  const version = await request<{ capabilities?: string[] }>({ serverUrl, authToken: '', port: 0, deviceId: '', deviceName: '', deviceType: 'windows_desktop', pairingCode: '', autoSync: false, conflictResolution: 'ask' }, '/api/version');
  return { capabilities: Array.isArray(version.capabilities) ? version.capabilities : [] };
}

export async function pullServerData(syncConfig: SyncServerConfig): Promise<ServerDataEnvelope> {
  const envelope = await request<ServerDataEnvelope>(syncConfig, '/api/data');
  metadataByServer.set(baseUrl(syncConfig.serverUrl), envelope);
  return envelope;
}

export async function pushServerData(syncConfig: SyncServerConfig, data: GymData): Promise<ServerDataEnvelope> {
  const metadata = metadataByServer.get(baseUrl(syncConfig.serverUrl));
  const envelope = await request<ServerDataEnvelope>(syncConfig, '/api/data', {
    method: 'POST',
    body: JSON.stringify({
      schemaVersion: 1,
      revision: metadata?.revision,
      contentHash: metadata?.contentHash,
      data,
    }),
  });
  metadataByServer.set(baseUrl(syncConfig.serverUrl), envelope);
  return envelope;
}

// ==========================================
// GOOGLE CLOUD SERVER & GOOGLE SIGN-IN API
// ==========================================
export const GOOGLE_CLOUD_SERVER_URL = import.meta.env.VITE_GYMTRACKER_SERVER_URL?.trim().replace(/\/+$/, '') || '';
export const GOOGLE_CLOUD_SHARED_URL = import.meta.env.VITE_GYMTRACKER_SERVER_URL?.trim().replace(/\/+$/, '') || '';

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

