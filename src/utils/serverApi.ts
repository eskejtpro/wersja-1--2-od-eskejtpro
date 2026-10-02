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
export const GOOGLE_CLOUD_SERVER_URL = 'https://ais-dev-cnwnz67ertzudvxhqsflo5-244110052482.europe-west2.run.app';
export const GOOGLE_CLOUD_SHARED_URL = 'https://ais-pre-cnwnz67ertzudvxhqsflo5-244110052482.europe-west2.run.app';

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
  googleAuthAvailable: boolean;
  activeUser?: {
    email: string;
    displayName: string;
    photoURL?: string;
  } | null;
  timestamp: string;
}

export async function getGoogleCloudServerInfo(targetUrl?: string): Promise<GoogleServerInfo> {
  const url = baseUrl(targetUrl || window.location.origin);
  const res = await fetch(`${url}/api/server/google-info`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function loginWithGoogleAccount(options?: { email?: string; displayName?: string; photoURL?: string }): Promise<{
  success: boolean;
  token: string;
  user: { email: string; displayName: string; photoURL?: string; id: string; connectedAt: string };
  serverInfo: GoogleServerInfo;
}> {
  const res = await fetch('/api/auth/google/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options || {})
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getGoogleAuthStatus(): Promise<{ authenticated: boolean; user?: any }> {
  const res = await fetch('/api/auth/google/user');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function logoutGoogleAccount(): Promise<void> {
  await fetch('/api/auth/google/logout', { method: 'POST' });
}

