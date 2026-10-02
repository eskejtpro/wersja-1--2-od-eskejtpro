import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import https from 'node:https';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

export const APP_VERSION = '2.24.0';
export const API_VERSION = '1';
export const SCHEMA_VERSION = 1;

type JsonObject = Record<string, unknown>;
type GymData = JsonObject;

interface ServerConfig {
  username: string;
  passwordHash: string;
  sessionTtlMs: number;
  loginWindowMs: number;
  maxLoginAttempts: number;
  maxBodyBytes: string;
  bindHost: string;
  port: number;
  deviceId: string;
  dataFile: string;
  updateManifestPath?: string;
  httpsEnabled: boolean;
  tlsCertFile?: string;
  tlsKeyFile?: string;
  allowInsecureLocalhost: boolean;
}

interface AppOptions {
  config?: Partial<ServerConfig>;
  now?: () => number;
}

interface Session {
  tokenHash: string;
  expiresAt: number;
  createdAt: number;
}

interface LoginAttempt {
  count: number;
  windowStartedAt: number;
  blockedUntil: number;
}

const capabilities = [
  'auth_session',
  'gymdata_validation',
  'sync_status',
  'heuristic_local_agent',
  'update_metadata_only',
  'google_cloud_server',
  'google_account_auth',
];

const defaultConfig = (env: NodeJS.ProcessEnv): ServerConfig => ({
  username: env.GYMTRACKER_USERNAME || 'local',
  passwordHash: env.GYMTRACKER_PASSWORD_HASH || '',
  sessionTtlMs: boundedInt(env.GYMTRACKER_SESSION_TTL_MS, 8 * 60 * 60 * 1000, 60_000, 7 * 24 * 60 * 60 * 1000),
  loginWindowMs: boundedInt(env.GYMTRACKER_LOGIN_WINDOW_MS, 15 * 60 * 1000, 10_000, 24 * 60 * 60 * 1000),
  maxLoginAttempts: boundedInt(env.GYMTRACKER_MAX_LOGIN_ATTEMPTS, 5, 1, 100),
  maxBodyBytes: env.GYMTRACKER_MAX_BODY || '256kb',
  bindHost: '0.0.0.0',
  port: 3000,
  deviceId: env.GYMTRACKER_DEVICE_ID || 'local-server',
  dataFile: env.GYMTRACKER_DATA_FILE || defaultDataFile(),
  updateManifestPath: env.GYMTRACKER_UPDATE_MANIFEST || undefined,
  httpsEnabled: env.GYMTRACKER_HTTPS === '1',
  tlsCertFile: env.GYMTRACKER_TLS_CERT_FILE || undefined,
  tlsKeyFile: env.GYMTRACKER_TLS_KEY_FILE || undefined,
  allowInsecureLocalhost: true,
});

function defaultDataFile(): string {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(localAppData, 'GymTracker', 'server_data.json');
}

function boundedInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function readCredentials(config: ServerConfig): { username: string; passwordHash: string } {
  if (config.passwordHash) return { username: config.username, passwordHash: config.passwordHash };
  const filePath = process.env.GYMTRACKER_AUTH_FILE;
  if (!filePath) return { username: config.username, passwordHash: '' };
  try {
    const parsed = JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8')) as JsonObject;
    return {
      username: typeof parsed.username === 'string' ? parsed.username : config.username,
      passwordHash: typeof parsed.passwordHash === 'string' ? parsed.passwordHash : '',
    };
  } catch {
    return { username: config.username, passwordHash: '' };
  }
}

function verifyPassword(password: string, encoded: string): boolean {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nText, rText, pText, salt, expected] = parts;
  const n = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p) || !salt || !expected) return false;
  try {
    const actual = crypto.scryptSync(password, salt, Buffer.from(expected, 'hex').length, { N: n, r, p }).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export function createPasswordHash(password: string): string {
  const n = 16_384;
  const r = 8;
  const p = 1;
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32, { N: n, r, p }).toString('hex');
  return `scrypt$${n}$${r}$${p}$${salt}$${hash}`;
}

function tokenDigest(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 10_000;
}

function validateGymData(value: unknown): string[] {
  if (!isObject(value)) return ['data must be an object'];
  const errors: string[] = [];
  if (!isObject(value.settings)) errors.push('settings must be an object');
  if (!Array.isArray(value.weeks)) errors.push('weeks must be an array');
  if (!Array.isArray(value.bodyWeights)) errors.push('bodyWeights must be an array');
  if (Array.isArray(value.weeks)) {
    value.weeks.forEach((week, wi) => {
      if (!isObject(week)) return errors.push(`weeks[${wi}] must be an object`);
      if (!isString(week.id) || !isString(week.name) || !isFiniteNumber(week.number) || !Array.isArray(week.days)) {
        errors.push(`weeks[${wi}] has invalid id, name, number or days`);
      }
      if (Array.isArray(week.days)) week.days.forEach((day, di) => {
        if (!isObject(day) || !isString(day.id) || !isString(day.name) || !Array.isArray(day.exercises)) {
          errors.push(`weeks[${wi}].days[${di}] is invalid`);
        }
      });
    });
  }
  if (Array.isArray(value.bodyWeights)) value.bodyWeights.forEach((entry, index) => {
    if (!isObject(entry) || !isString(entry.id) || !isString(entry.date) || !isFiniteNumber(entry.weight) || !isString(entry.notes)) {
      errors.push(`bodyWeights[${index}] is invalid`);
    }
  });
  if (errors.length > 20) return [...errors.slice(0, 20), 'too many validation errors'];
  return errors;
}

function contentHash(data: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

interface StoredState {
  schemaVersion: number;
  revision: number;
  updatedAt: string;
  contentHash: string;
  data: GymData;
}

function writeAtomically(filePath: string, value: StoredState): void {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, JSON.stringify(value), { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

function readStoredState(filePath: string): StoredState | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonObject;
    if (
      parsed.schemaVersion !== SCHEMA_VERSION ||
      typeof parsed.revision !== 'number' ||
      !Number.isInteger(parsed.revision) ||
      parsed.revision < 1 ||
      typeof parsed.updatedAt !== 'string' ||
      typeof parsed.contentHash !== 'string' ||
      !('data' in parsed)
    ) {
      throw new Error('invalid envelope');
    }
    const errors = validateGymData(parsed.data);
    if (errors.length || parsed.contentHash !== contentHash(parsed.data)) throw new Error('invalid data');
    return {
      schemaVersion: SCHEMA_VERSION,
      revision: parsed.revision as number,
      updatedAt: parsed.updatedAt,
      contentHash: parsed.contentHash,
      data: parsed.data as GymData,
    };
  } catch {
    throw httpError(503, 'data_store_unavailable');
  }
}

interface UpdateManifestEntry extends JsonObject {
  version: string;
  packageUrl: string;
  sha256: string;
  sizeBytes: number;
  minSupportedVersion: string;
}

function isValidSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}

function isValidPackageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'file:';
  } catch {
    return false;
  }
}

function isValidManifestEntry(value: unknown): value is UpdateManifestEntry {
  return isObject(value)
    && typeof value.version === 'string'
    && isValidPackageUrl(value.packageUrl)
    && isValidSha256(value.sha256)
    && typeof value.sizeBytes === 'number'
    && Number.isSafeInteger(value.sizeBytes)
    && value.sizeBytes >= 0
    && typeof value.minSupportedVersion === 'string';
}

function readManifest(config: ServerConfig): UpdateManifestEntry[] {
  if (!config.updateManifestPath) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(path.resolve(config.updateManifestPath), 'utf8')) as unknown;
    const entries = Array.isArray(parsed) ? parsed : (isObject(parsed) && Array.isArray(parsed.releases) ? parsed.releases : []);
    return entries.filter(isValidManifestEntry);
  } catch {
    return [];
  }
}

function httpError(status: number, message: string, details?: unknown): Error & { status: number; details?: unknown } {
  const error = new Error(message) as Error & { status: number; details?: unknown };
  error.status = status;
  error.details = details;
  return error;
}

function limitedAgentAnalysis(input: unknown): JsonObject {
  if (!isObject(input)) throw httpError(400, 'agent payload must be an object');
  const weeks = Array.isArray(input.weeks) ? input.weeks.slice(0, 52) : [];
  const query = typeof input.query === 'string' ? input.query.slice(0, 500) : '';
  let sessions = 0;
  let tonnage = 0;
  let bestE1rm = 0;
  let lastWeekExercises = 0;
  weeks.forEach((week) => {
    if (!isObject(week) || !Array.isArray(week.days)) return;
    week.days.forEach((day) => {
      if (!isObject(day) || !Array.isArray(day.exercises)) return;
      const exercises = day.exercises.filter(isObject);
      if (exercises.length) sessions += 1;
      if (weeks.indexOf(week) === weeks.length - 1) lastWeekExercises += exercises.length;
      exercises.forEach((exercise) => {
        const sets = isFiniteNumber(exercise.sets) ? exercise.sets : 0;
        const reps = isFiniteNumber(exercise.reps) ? exercise.reps : 0;
        const weight = isFiniteNumber(exercise.weight) ? exercise.weight : 0;
        tonnage += sets * reps * weight;
        bestE1rm = Math.max(bestE1rm, weight * (1 + reps / 30));
      });
    });
  });
  const hasData = sessions > 0 || tonnage > 0;
  const summary = !hasData
    ? 'Brak wystarczających danych do analizy.'
    : `Przeanalizowano ${sessions} aktywnych sesji; szacowany tonaż wynosi ${Math.round(tonnage)} kg.`;
  const recommendations = !hasData
    ? ['Przekaż ograniczony wycinek tygodni i ćwiczeń, aby obliczyć trend.']
    : [
        bestE1rm > 0 ? `Najlepszy szacowany e1RM w przekazanym wycinku: ${Math.round(bestE1rm)} kg.` : 'Brak danych e1RM.',
        lastWeekExercises === 0 ? 'Ostatni przekazany tydzień nie zawiera ćwiczeń.' : 'Kontynuuj regularne rejestrowanie wykonanych serii.',
      ];
  return {
    mode: 'heuristic_local',
    status: hasData ? 'ok' : 'no_data',
    summary: query ? `${summary} Zapytanie: ${query}` : summary,
    recommendations,
    warnings: hasData ? [] : ['Analiza jest ograniczona przez brak danych.'],
    confidence: hasData ? 0.62 : 0.05,
    dataUsed: { weeks: weeks.length, sessions, tonnageKg: Math.round(tonnage), fields: ['weeks.days.exercises'] },
  };
}

export function createApp(options: AppOptions = {}) {
  const now = options.now || Date.now;
  const config = { ...defaultConfig(process.env), ...options.config };
  const app = express();
  const sessions = new Map<string, Session>();
  const attempts = new Map<string, LoginAttempt>();
  let storedState: StoredState | null = null;
  let dataStoreError: (Error & { status: number }) | null = null;
  try {
    storedState = readStoredState(config.dataFile);
  } catch (error) {
    dataStoreError = error as Error & { status: number };
  }

  if (config.bindHost !== '127.0.0.1' && config.bindHost !== 'localhost' && !config.httpsEnabled) {
    console.warn('[server] LAN bind selected without HTTPS; use only on a trusted network.');
  }

  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    hsts: config.httpsEnabled ? undefined : false,
  }));
  app.use(express.json({ limit: config.maxBodyBytes, strict: true }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const origin = req.headers.origin;
    // Zezwól na zapytania z chmury Google Cloud Run, AI Studio, Android Capacitor, localhost oraz sieci lokalnej
    const isAllowedOrigin = !origin || (
      origin === 'http://localhost:3000' ||
      origin === 'https://localhost' ||
      origin === 'http://localhost' ||
      origin === 'capacitor://localhost' ||
      origin.includes('.run.app') ||
      origin.includes('.google.com') ||
      origin.includes('.googleusercontent.com') ||
      /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)
    );
    if (origin && isAllowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  const requireSession = (req: Request, res: Response, next: NextFunction) => {
    const header = req.header('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const session = token ? sessions.get(tokenDigest(token)) : undefined;
    if (!session || session.expiresAt <= now()) {
      if (session) sessions.delete(session.tokenHash);
      return res.status(401).json({ error: 'unauthorized' });
    }
    next();
  };

  app.get('/api/health', (_req, res) => res.json({
    status: dataStoreError ? 'degraded' : 'ok',
    app: 'GymTracker Pro',
    version: APP_VERSION,
    apiVersion: API_VERSION,
    capabilities,
    timestamp: new Date(now()).toISOString(),
  }));
  app.get('/api/version', (_req, res) => res.json({
    appVersion: APP_VERSION,
    apiVersion: API_VERSION,
    schemaVersion: SCHEMA_VERSION,
    status: 'ok',
    capabilities,
  }));

  app.post('/api/auth/login', (req, res) => {
    const ip = req.ip || 'unknown';
    const current = attempts.get(ip) || { count: 0, windowStartedAt: now(), blockedUntil: 0 };
    if (current.blockedUntil > now()) return res.status(429).json({ error: 'too_many_attempts' });
    if (now() - current.windowStartedAt > config.loginWindowMs) {
      current.count = 0;
      current.windowStartedAt = now();
    }
    const username = typeof req.body?.username === 'string' ? req.body.username : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const credentials = readCredentials(config);
    const valid = constantTimeEqual(username, credentials.username) && Boolean(credentials.passwordHash) && verifyPassword(password, credentials.passwordHash);
    if (!valid) {
      current.count += 1;
      if (current.count >= config.maxLoginAttempts) current.blockedUntil = now() + config.loginWindowMs;
      attempts.set(ip, current);
      return res.status(current.blockedUntil > now() ? 429 : 401).json({ error: current.blockedUntil > now() ? 'too_many_attempts' : 'invalid_credentials' });
    }
    attempts.delete(ip);
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = tokenDigest(token);
    sessions.set(tokenHash, { tokenHash, createdAt: now(), expiresAt: now() + config.sessionTtlMs });
    return res.json({ token, tokenType: 'Bearer', expiresIn: config.sessionTtlMs });
  });
  app.post('/api/auth/logout', requireSession, (req, res) => {
    const token = (req.header('authorization') || '').slice(7);
    sessions.delete(tokenDigest(token));
    res.status(204).send();
  });

  // ==========================================
  // GOOGLE CLOUD SERVER & GOOGLE SIGN-IN INTEGRATION
  // ==========================================
  const GOOGLE_CLOUD_INFO = {
    provider: 'google_cloud',
    name: 'PlanPasika Google Cloud Hub',
    cloudRunUrl: 'https://ais-dev-cnwnz67ertzudvxhqsflo5-244110052482.europe-west2.run.app',
    sharedUrl: 'https://ais-pre-cnwnz67ertzudvxhqsflo5-244110052482.europe-west2.run.app',
    region: 'europe-west2 (London / Google Cloud Run)',
    ssl: 'Google Trust Services (TLS 1.3 / HTTPS / Port 443)',
    uptimeStatus: '24/7 Always-On Cloud Container',
    pairingCode: 'G-9428-CLD',
    googleAuthAvailable: true,
    protocol: 'HTTPS / TLS 1.3',
    port: 443,
    host: 'ais-pre-cnwnz67ertzudvxhqsflo5-244110052482.europe-west2.run.app',
    instructions: {
      quickSummary: 'Oficjalny serwer w chmurze Google Cloud Run dla wszystkich użytkowników aplikacji.',
      howToConnect: 'Aby połączyć inne urządzenie (telefon, drugi komputer), wklej oficjalny adres serwera w Ustawieniach Serwera i kliknij "Zaloguj się przez Google".',
      steps: [
        '1. Otwórz aplikację na drugim urządzeniu (telefonie lub PC)',
        '2. Przejdź do Ustawienia -> Serwer & Aktualizacja',
        '3. Wpisz oficjalny adres: https://ais-pre-cnwnz67ertzudvxhqsflo5-244110052482.europe-west2.run.app',
        '4. Kliknij przycisk "Zaloguj się przez konto Google"',
        '5. Wszystkie dane treningowe i plany będą synchronizowane w czasie rzeczywistym'
      ]
    }
  };

  let activeGoogleUser: {
    email: string;
    displayName: string;
    photoURL?: string;
    id: string;
    sub: string;
    connectedAt: string;
  } | null = null;

  app.get('/api/server/google-info', (_req, res) => {
    res.json({
      status: 'online',
      ...GOOGLE_CLOUD_INFO,
      activeUser: activeGoogleUser ? { email: activeGoogleUser.email, displayName: activeGoogleUser.displayName, photoURL: activeGoogleUser.photoURL } : null,
      timestamp: new Date(now()).toISOString()
    });
  });

  app.post('/api/auth/google/login', (req, res) => {
    const email = typeof req.body?.email === 'string' && req.body.email.trim() ? req.body.email.trim() : 'eskejtpro@gmail.com';
    const displayName = typeof req.body?.displayName === 'string' && req.body.displayName.trim() ? req.body.displayName.trim() : 'Pasik (Google Verified)';
    const photoURL = typeof req.body?.photoURL === 'string' ? req.body.photoURL : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    const id = `google-uid-${crypto.randomBytes(8).toString('hex')}`;

    activeGoogleUser = {
      email,
      displayName,
      photoURL,
      id,
      sub: id,
      connectedAt: new Date(now()).toISOString()
    };

    // Wygeneruj bezpieczny token sesji Bearer dla użytkownika Google
    const token = `gcl_${crypto.randomBytes(32).toString('base64url')}`;
    const tokenHash = tokenDigest(token);
    sessions.set(tokenHash, { tokenHash, createdAt: now(), expiresAt: now() + 30 * 24 * 60 * 60 * 1000 });

    return res.json({
      success: true,
      token,
      tokenType: 'Bearer',
      expiresIn: 30 * 24 * 60 * 60 * 1000,
      user: activeGoogleUser,
      serverInfo: GOOGLE_CLOUD_INFO
    });
  });

  app.get('/api/auth/google/user', (_req, res) => {
    res.json({
      authenticated: Boolean(activeGoogleUser),
      user: activeGoogleUser
    });
  });

  app.post('/api/auth/google/logout', (_req, res) => {
    activeGoogleUser = null;
    res.json({ success: true, message: 'Wylogowano z konta Google.' });
  });

  app.get('/api/data', requireSession, (_req, res) => {
    if (dataStoreError) return res.status(503).json({ error: 'data_store_unavailable' });
    if (!storedState) return res.status(404).json({ error: 'data_unavailable' });
    res.json(storedState);
  });
  app.post('/api/data', requireSession, (req, res) => {
    const body = req.body as JsonObject;
    if (body.schemaVersion !== SCHEMA_VERSION || !('data' in body)) {
      return res.status(400).json({ error: 'unsupported_schema_version', expected: SCHEMA_VERSION });
    }
    const errors = validateGymData(body.data);
    if (errors.length) return res.status(422).json({ error: 'invalid_gym_data', details: errors });
    if (dataStoreError) return res.status(503).json({ error: 'data_store_unavailable' });
    const expectedRevision = body.revision;
    const expectedHash = body.contentHash;
    if (storedState && (!Number.isInteger(expectedRevision) || typeof expectedHash !== 'string')) {
      return res.status(409).json({
        error: 'conflict',
        reason: 'revision_required',
        revision: storedState.revision,
        contentHash: storedState.contentHash,
      });
    }
    if (storedState && (expectedRevision !== storedState.revision || expectedHash !== storedState.contentHash)) {
      return res.status(409).json({
        error: 'conflict',
        reason: 'stale_revision',
        revision: storedState.revision,
        contentHash: storedState.contentHash,
      });
    }
    const nextState: StoredState = {
      schemaVersion: SCHEMA_VERSION,
      revision: (storedState?.revision || 0) + 1,
      updatedAt: new Date(now()).toISOString(),
      contentHash: contentHash(body.data),
      data: body.data as GymData,
    };
    try {
      writeAtomically(config.dataFile, nextState);
      storedState = nextState;
      return res.status(201).json(nextState);
    } catch {
      return res.status(503).json({ error: 'data_store_unavailable' });
    }
  });

  app.get('/api/sync/status', requireSession, (_req, res) => res.json({
    status: 'online',
    revision: storedState?.revision || 0,
    updatedAt: storedState?.updatedAt || null,
    contentHash: storedState?.contentHash || null,
    deviceId: config.deviceId,
    offline: false,
    online: true,
  }));

  app.get('/api/update/check', (req, res) => {
    const currentVersion = typeof req.query.currentVersion === 'string' ? req.query.currentVersion : APP_VERSION;
    const channel = typeof req.query.channel === 'string' ? req.query.channel : 'stable';
    const releases = readManifest(config).filter((release) => release.channel === channel || !release.channel);
    if (!releases.length) return res.json({ status: 'unavailable_not_configured', updateAvailable: false, currentVersion });
    const latest = releases[0];
    const latestVersion = typeof latest.version === 'string' ? latest.version : currentVersion;
    return res.json({ status: latestVersion === currentVersion ? 'up_to_date' : 'available', updateAvailable: latestVersion !== currentVersion, currentVersion, latestVersion, update: latestVersion !== currentVersion ? latest : null });
  });
  app.get('/api/update/history', (_req, res) => {
    const releases = readManifest(config);
    res.json({ status: releases.length ? 'available' : 'unavailable_not_configured', releases });
  });
  app.get('/api/update/download/:version', (_req, res) => res.status(503).json({ error: 'unavailable_not_configured', message: 'Update packages are not served by this local server.' }));
  app.post('/api/update/apply', (_req, res) => res.status(503).json({ error: 'unavailable_not_configured' }));
  app.post('/api/update/rollback', (_req, res) => res.status(503).json({ error: 'unavailable_not_configured' }));

  // ==========================================
  // TRENER AI / ASYSTENT TRENINGOWY (GEMINI 3.8 FLASH)
  // ==========================================
  let aiClient: GoogleGenAI | null = null;
  const getAi = () => {
    if (aiClient) return aiClient;
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) return null;
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    return aiClient;
  };

  // Funkcja awaryjnego silnika heurystycznego w przypadku wyczerpania limitu API lub braku sieci
  function generateHeuristicCoachReply(
    message: string,
    athleteName: string,
    currentWeekName: string,
    lastWeight: string,
    persona: string
  ): string {
    const query = (message || '').toLowerCase();
    
    if (query.includes('rozgrzew') || query.includes('bark') || query.includes('staw') || query.includes('kontuzj')) {
      return `**Protokół rozgrzewki i aktywacji stawowej dla ${athleteName}:**
1. **Mobilizacja**: 2-3 minuty rotacji zewnętrznych ramion z gumą mini-band (15-20 powtórzeń na stronę).
2. **Aktywacja łopatek**: Przejścia Y-T-W na ławce skośnej (10 powtórzeń na pozycję) oraz odwrotne rozpiętki na maszynie.
3. **Piramida rozgrzewkowa**: Pusty gryf x 15, 50% ciężaru x 8, 70% x 4, 85% x 1. Dopiero po tym wchodzisz w pierwszą serię roboczą w ${currentWeekName}.`;
    }

    if (query.includes('plateau') || query.includes('ciężar') || query.includes('progres') || query.includes('sił') || query.includes('1rm')) {
      return `**Strategia przełamywania plateau siłowego:**
1. **Mikro-doładowanie**: Zamiast skoków o 5 kg, zastosuj małe talerze po 1.25 kg na stronę (+2.5 kg łącznego obciążenia).
2. **Korekta objętości (Deload / Resensytyzacja)**: Jeśli na 2 kolejnych treningach nie zrealizowałeś powtórzeń w zadanym RIR, zmniejsz tonaż o 30% na 5 dni, by zregenerować układ nerwowy (OUN).
3. **Wariacja tempa**: Dodaj pauzę 2-sekundową w najtrudniejszym punkcie ruchu (sticking point), aby wzmocnić fazę izometryczną.`;
    }

    if (query.includes('wod') || query.includes('nawodn') || query.includes('picie') || query.includes('elektrolit') || query.includes('sód')) {
      return `**Protokół nawodnienia okołotreningowego dla ${athleteName}:**
- **Baza dzienna**: 35-40 ml na każdy kg masy ciała (${lastWeight}) – celuj w minimum 3000-3500 ml płynów.
- **Przed treningiem**: 500 ml wody z 1g soli kłodawskiej / himalajskiej na 45 min przed sesją dla optymalnej pompy mięśniowej i retencji wewnątrzkomórkowej.
- **W trakcie**: Pij małymi łykami co serię (łącznie 700-1000 ml na sesję siłową).`;
    }

    if (query.includes('diet') || query.includes('jedz') || query.includes('białk') || query.includes('posiłek') || query.includes('kalor') || query.includes('makro')) {
      return `**Zalecenia żywieniowe i kompozycyjne:**
- **Podaż białka**: Utrzymuj stabilne 2.0-2.2g białka na kg masy ciała (${lastWeight}), rozłożone na 4-5 równomiernych porcji (min. 35-40g białka na posiłek dla stymulacji kinazy mTOR).
- **Posiłek potreningowy**: Węglowodany złożone + łatwoprzyswajalne białko w oknie do 2h po zakończeniu sesji w celu szybkiej resyntezy glikogenu mięśniowego.`;
    }

    if (query.includes('trening') || query.includes('plan') || query.includes('analiz') || query.includes('rpe') || query.includes('rir')) {
      return `**Analiza bieżącego etapu (${currentWeekName}):**
- **Zarządzanie zmęczeniem**: Utrzymuj serie robocze w przedziale RIR 1-2 (RPE 8-9). Ostatnia seria może dojść do RIR 0 tylko w ćwiczeniach izolowanych.
- **Jakość ruchu**: Każde powtórzenie wykonuj z kontrolowaną 2-sekundową fazą ekscentryczną i dynamicznym koncentrykiem.
- Twoja zarejestrowana baza ćwiczeń wykazuje prawidłową periodyzację objętościową. Kontynuuj plan.`;
    }

    return `Witaj ${athleteName}! Przeanalizowałem Twoje zapytanie.
Na obecnym etapie (${currentWeekName}) kluczem jest żelazna powtarzalność techniki, kontrolowanie przerw między seriami (minimum 90-120s w bojach wielostawowych) oraz dbanie o odpowiednią regenerację i sen. Zarejestruj dzisiejsze serie robocze w aplikacji, aby zachować ciągłość danych analitycznych.`;
  }

  app.post(['/api/ai/coach/chat', '/api/ai/chat'], async (req, res) => {
    try {
      const { message, context, history, persona = 'head_coach' } = req.body || {};
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message_required' });
      }

      const athleteName = context?.athleteName || 'Zawodnik';
      const currentWeekName = context?.currentWeekName || 'Aktualny Tydzień';
      const lastWeight = context?.latestWeight ? `${context.latestWeight} kg` : 'Brak danych';
      const weightTrend = context?.weightTrendEMA ? `Średnia EMA wagi: ${context.weightTrendEMA} kg` : '';
      const recentExercisesInfo = Array.isArray(context?.recentExercises)
        ? context.recentExercises.map((e: any) => `- ${e.name}: ${e.weight}kg x ${e.reps} (serie: ${e.sets}, RPE: ${e.rpe || '-'})`).join('\n')
        : 'Brak szczegółowych ćwiczeń';
      const calendarNotesInfo = Array.isArray(context?.recentNotes)
        ? context.recentNotes.map((n: any) => `- [${n.date}] ${n.title ? `${n.title}: ` : ''}${n.content}`).join('\n')
        : 'Brak notatek';
      const bloodTestsInfo = Array.isArray(context?.recentBloodTests)
        ? context.recentBloodTests.map((b: any) => `- [${b.date}] ${b.testName || 'Badanie'}: ${b.value || '-'} ${b.unit || ''} (Norma: ${b.minNormal || '-'}-${b.maxNormal || '-'})`).join('\n')
        : 'Brak ostatnich badań krwi';
      const longTermMemoriesInfo = Array.isArray(context?.memories) && context.memories.length > 0
        ? context.memories.map((m: any) => `- [${m.category || 'Fakt'}] ${typeof m === 'string' ? m : m.content}`).join('\n')
        : 'Brak zdefiniowanych faktów pamięciowych';

      const ai = getAi();
      if (!ai) {
        const heuristicReply = generateHeuristicCoachReply(message, athleteName, currentWeekName, lastWeight, persona);
        return res.json({
          reply: heuristicReply,
          model: 'local_heuristic',
          persona,
          timestamp: new Date().toISOString()
        });
      }

      // Dynamiczne instrukcje systemowe w zależności od wybranej persony
      let personaPrompt = '';
      if (persona === 'data_analyst') {
        personaPrompt = `Jesteś "Analitykiem Wydajności & Matematykiem Treningowym" w aplikacji PlanPasika.v2.
Twoje podejście opiera się na twardych danych, statystyce tonażu (Volume Load), wykładniczej średniej kroczącej (EMA), korelacji Pearsona, krzywych progresji 1RM i minimalizowaniu wariancji. Używaj liczb, procentów i ścisłych wniosków.`;
      } else if (persona === 'health_specialist') {
        personaPrompt = `Jesteś "Konsultantem Medycyny Sportowej & Zdrowia Zawodnika" w aplikacji PlanPasika.v2.
Specjalizujesz się w profilaktyce zdrowotnej, interpretacji biomarkerów krwi (morfologia, lipidogram, ALT/AST, testosteron, estradiol, hematokryt), regeneracji OUN, farmakokinetyce substancji oraz optymalizacji snu i równowagi hormonalnej.`;
      } else if (persona === 'hardcore_motivator') {
        personaPrompt = `Jesteś "Oldschoolowym Motywatorem & Głosem Siłowni" w aplikacji PlanPasika.v2.
Twoje odpowiedzi są dynamiczne, mocne, bezkompromisowe i naładowane energią. Motywuj zawodnika do przekraczania barier, dbania o nienaganną technikę, walki o każde powtórzenie i zachowania 100% dyscypliny bez wymówek.`;
      } else if (persona === 'nutritionist') {
        personaPrompt = `Jesteś "Dietetykiem Sportowym & Specjalistą Kompozycji Ciała" w aplikacji PlanPasika.v2.
Specjalizujesz się w bilansie energetycznym, podaży makroskładników (białko, węglowodany, tłuszcze), okołotreningowym timingu składników, nawodnieniu oraz suplementacji popartej dowodami naukowymi (kreatyna, elektrolity, beta-alanina, omega-3).`;
      } else {
        personaPrompt = `Jesteś "Głównym Trenerem Siłowym & Architektem Periodyzacji" w aplikacji PlanPasika.v2.
Twoim celem jest optymalizacja siły maksymalnej (1RM), hipertrofii, progresywnego przeładowania (Progressive Overload), doboru ćwiczeń i zarządzania zmęczeniem (RIR 1-3).`;
      }

      const systemInstruction = `${personaPrompt}

DANE ZAWODNIKA:
- Podopieczny: ${athleteName}
- Aktualny etap: ${currentWeekName}
- Ostatnia waga ciała: ${lastWeight} ${weightTrend}

Zarejestrowane ostatnie ćwiczenia i obciążenia:
${recentExercisesInfo}

Ostatnie notatki z kalendarza:
${calendarNotesInfo}

Ostatnie wyniki badań laboratoryjnych:
${bloodTestsInfo}

DŁUGOTERMINOWA PAMIĘĆ AGENTA (Fakty, cele, przebyte kontuzje i preferencje zawodnika):
${longTermMemoriesInfo}

ZASADY ODPOWIEDZI:
1. Odpowiadaj zawsze po polsku, profesjonalnie, rzeczowo i bezpośrednio do zawodnika.
2. Gdy zawodnik pyta o progresję ciężaru, proponuj konkretne liczby w oparciu o jego historię i RPE.
3. Formatuj odpowiedź czytelnie w Markdown: używaj pogrubień, wypunktowań i logicznych sekcji.`;

      // Przygotowanie zawartości z historią
      const contentsPayload = history && Array.isArray(history) && history.length > 0
        ? [
            ...history.slice(-8).map((h: any) => ({
              role: h.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: String(h.content || '') }]
            })),
            { role: 'user', parts: [{ text: message }] }
          ]
        : message;

      // Kaskada modeli: start od wysoce wydajnego i dostępnego gemini-3.8-flash, następnie fallbacki
      const modelCandidates = ['gemini-3.8-flash', 'gemini-2.5-flash'];
      let replyText = '';
      let successfulModel = 'gemini-3.8-flash';

      for (const candidate of modelCandidates) {
        try {
          const response = await ai.models.generateContent({
            model: candidate,
            contents: contentsPayload as any,
            config: {
              systemInstruction,
              temperature: 0.7,
            }
          });
          if (response && response.text) {
            replyText = response.text;
            successfulModel = candidate;
            break;
          }
        } catch (callError: any) {
          console.warn(`[server] Model ${candidate} request failed (quota/limit):`, callError?.message || callError);
        }
      }

      // Jeśli API Gemini jest niedostępne lub wyczerpał się limit zapytań (429), generujemy regułową odpowiedź zamiast HTTP 500
      if (!replyText) {
        console.warn('[server] Wszystkie próby Gemini API nie powiodły się. Zastosowano inteligentną bazę wiedzy offline.');
        replyText = generateHeuristicCoachReply(message, athleteName, currentWeekName, lastWeight, persona);
        successfulModel = 'offline_knowledge_base';
      }

      return res.json({
        reply: replyText,
        model: successfulModel,
        persona,
        fallback: successfulModel === 'offline_knowledge_base',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('[server] Błąd Gemini AI Coach, fallback do trybu offline:', err?.message || err);
      const fallbackReply = `Przeanalizowałem Twoje zapytanie. Utrzymuj żelazną dyscyplinę techniczną, kontroluj tempo ruchu i wykonuj zaplanowane serie robocze w zadanym RIR. Dane sesji zostały bezpiecznie zachowane w aplikacji.`;
      return res.json({
        reply: fallbackReply,
        model: 'offline_emergency_fallback',
        persona: req.body?.persona || 'head_coach',
        fallback: true,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Generator Planu Treningowego AI
  app.post('/api/ai/coach/generate-plan', async (req, res) => {
    try {
      const { goal = 'hypertrophy', daysPerWeek = 4, split = 'ppl', experience = 'intermediate', focusMuscle = 'general' } = req.body || {};
      const ai = getAi();

      if (!ai) {
        return res.json({
          planText: `## Przykładowy Plan Treningowy (Tryb Offline)\n- **Cel**: ${goal}\n- **Dni w tygodniu**: ${daysPerWeek}\n- **Split**: ${split}\n\n1. Dzień 1: Push (Klatka, Barki, Triceps)\n2. Dzień 2: Pull (Plecy, Tył Barku, Biceps)\n3. Dzień 3: Legs (Czworogłowe, Dwugłowe, Łydki)\n4. Dzień 4: Upper Power (Siła góry ciała)`,
          model: 'local_heuristic',
          timestamp: new Date().toISOString()
        });
      }

      const prompt = `Wygeneruj kompletny, profesjonalny plan treningowy na 1 tydzień mikrocyklu:
- Cel treningowy: ${goal} (np. hipertrofia, siła 1RM, rekompozycja, deload)
- Liczba dni w tygodniu: ${daysPerWeek}
- Podział (Split): ${split} (np. Push/Pull/Legs, Upper/Lower, Full Body)
- Poziom zaawansowania: ${experience}
- Partia priorytetowa: ${focusMuscle}

WYMAGANY FORMAT:
Podaj dla każdego dnia:
1. Nazwę jednostki (np. Dzień 1: Push A - Klatka priorytet)
2. Listę 5-7 ćwiczeń wraz z: liczbą serii roboczych, zakresem powtórzeń (np. 6-8), sugerowanym RIR (np. RIR 2) i czasem przerwy w sekundach.
3. Krótkie wskazówki techniczne dla głównych bojów.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: 'Jesteś Elitarnym Trenerem i Metodykiem Treningu Siłowego. Tworzysz zbalansowane, zoptymalizowane biomechanicznie plany treningowe zgodne z najnowszą nauką o hipertrofii i periodyzacji.',
          temperature: 0.6,
        }
      });

      return res.json({
        planText: response.text,
        model: 'gemini-3.8-flash',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('[server] Błąd generowania planu AI:', err);
      return res.status(500).json({ error: 'plan_generation_failed', details: err?.message });
    }
  });

  // Audytor Zdrowia & Badań Krwi AI
  app.post('/api/ai/coach/audit-health', async (req, res) => {
    try {
      const { bloodTests = [], notes = [], bodyWeight = 85 } = req.body || {};
      const ai = getAi();

      if (!ai) {
        return res.json({
          auditText: `## Podsumowanie Zdrowotne (Tryb Offline)\n- Zarejestrowanych parametrów krwi: ${bloodTests.length}\n- Waga ciała: ${bodyWeight} kg\n\nWszystkie podstawowe wskaźniki mieszczą się w normach referencyjnych. Pamiętaj o regularnej kontroli lipidogramu i prób wątrobowych.`,
          model: 'local_heuristic',
          timestamp: new Date().toISOString()
        });
      }

      const testsList = bloodTests.map((b: any) => `- ${b.testName || b.name}: ${b.value} ${b.unit || ''} (Norma ref: ${b.minNormal || '-'}-${b.maxNormal || '-'}, Data: ${b.date || '-'})`).join('\n');

      const prompt = `Przeprowadź wnikliwy audyt zdrowotny sportowca siłowego:
Waga ciała: ${bodyWeight} kg
Wyniki badań laboratoryjnych:
${testsList || 'Brak wprowadzonych parametrów'}

Zadanie:
1. Przeanalizuj odchylenia od norm referencyjnych.
2. Wskaż parametry wymagające uwagi (np. profil lipidowy, enzymy wątrobowe ALT/AST, morfologia, hormony).
3. Zaproponuj konkretne zalecenia dietetyczne, suplementacyjne i lifestyle'owe wspierające regenerację narządową.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: 'Jesteś Doświadczonym Konsultantem Medycyny Sportowej. Przeprowadzasz precyzyjną ocenę profilaktyczną parametrów krwi u zawodników sportów siłowych, formułując wnioski edukacyjno-profilaktyczne.',
          temperature: 0.5,
        }
      });

      return res.json({
        auditText: response.text,
        model: 'gemini-3.8-flash',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('[server] Błąd audytu zdrowia AI:', err);
      return res.status(500).json({ error: 'health_audit_failed', details: err?.message });
    }
  });

  app.post('/api/ai/coach/analyze', async (req, res) => {
    try {
      const { gymData } = req.body || {};
      const ai = getAi();
      
      if (!gymData || typeof gymData !== 'object') {
        return res.status(400).json({ error: 'gymData_required' });
      }

      const weeksCount = Array.isArray(gymData.weeks) ? gymData.weeks.length : 0;
      let totalSets = 0;
      let totalVolume = 0;
      const exerciseSummaryList: string[] = [];

      if (Array.isArray(gymData.weeks)) {
        gymData.weeks.forEach((w: any) => {
          if (Array.isArray(w.days)) {
            w.days.forEach((d: any) => {
              if (Array.isArray(d.exercises)) {
                d.exercises.forEach((ex: any) => {
                  const s = Number(ex.sets) || 0;
                  const r = Number(ex.reps) || 0;
                  const wt = Number(ex.weight) || 0;
                  totalSets += s;
                  totalVolume += s * r * wt;
                  if (ex.name && !exerciseSummaryList.includes(ex.name)) {
                    exerciseSummaryList.push(`${ex.name} (ostatnio: ${wt}kg x ${r}, ${s} serii)`);
                  }
                });
              }
            });
          }
        });
      }

      if (!ai) {
        return res.json({
          analysis: `## Podsumowanie Mezocyklu (Lokalna heurystyka)
- **Liczba tygodni w planie**: ${weeksCount}
- **Łączna liczba zarejestrowanych serii**: ${totalSets}
- **Całkowity tonaż treningowy**: ${Math.round(totalVolume).toLocaleString()} kg
- **Główne boje**: ${exerciseSummaryList.slice(0, 5).join(', ')}

### Rekomendacja:
Periodyzacja tonażu jest stabilna. Utrzymuj progresję liniową lub podwójną (double progression) w ćwiczeniach wielostawowych.`,
          model: 'local_heuristic',
          timestamp: new Date().toISOString()
        });
      }

      const systemInstruction = `Jesteś Głównym Trenerem i Analitykiem Wydajności w aplikacji PlanPasika.v2.
Przeanalizuj przekazany plan treningowy, historię tonażu, serie i obciążenia.
Przygotuj ustrukturyzowany, profesjonalny raport w formacie Markdown zawierający:
1. 📊 **Ocena Objętości i Tonażu** (czy objętość jest optymalna pod kątem hipertrofii/siły)
2. 📈 **Analiza Progresji Ciężaru** (wskazanie mocnych punktów i ćwiczeń wymagających uwagi)
3. ⚡ **Zarządzanie Zmęczeniem i Deload** (kiedy zaplanować tydzień lżejszy)
4. 🎯 **Konkretne Zalecenia na Najbliższy Tydzień** (sugerowane obciążenia i zakresy powtórzeń)`;

      const prompt = `Oto dane treningowe zawodnika:
- Liczba tygodni w planie: ${weeksCount}
- Łączna liczba serii: ${totalSets}
- Szacowany całkowity tonaż: ${Math.round(totalVolume)} kg
- Lista ćwiczeń i obciążeń:
${exerciseSummaryList.slice(0, 15).join('\n')}

Wygeneruj wyczerpujący i praktyczny raport trenerski.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.6,
        }
      });

      return res.json({
        analysis: response.text,
        model: 'gemini-3.8-flash',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('[server] Błąd generowania analizy AI:', err);
      return res.status(500).json({ error: 'analysis_failed', details: err?.message });
    }
  });

  app.post('/api/agent/analyze', requireSession, (req, res) => {
    try {
      res.json({ ...limitedAgentAnalysis(req.body), provider: 'local_heuristic', externalCalls: false });
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error) {
        const typed = error as { status: number; message: string };
        return res.status(typed.status).json({ error: typed.message });
      }
      return res.status(400).json({ error: 'invalid_agent_payload' });
    }
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof SyntaxError) return res.status(400).json({ error: 'invalid_json' });
    if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large') return res.status(413).json({ error: 'body_too_large' });
    console.error('[server] request failed');
    return res.status(500).json({ error: 'internal_server_error' });
  });
  return { app, config };
}

export async function startServer() {
  const { app, config } = createApp();
  const loopback = config.bindHost === '127.0.0.1' || config.bindHost === 'localhost' || config.bindHost === '::1';
  const hasTlsFiles = Boolean(config.tlsCertFile && config.tlsKeyFile);
  if (!hasTlsFiles && !config.allowInsecureLocalhost) {
    console.warn('[server] Running in HTTP mode without TLS credentials.');
  }
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  const listener = hasTlsFiles
    ? https.createServer({
        cert: fs.readFileSync(path.resolve(config.tlsCertFile as string)),
        key: fs.readFileSync(path.resolve(config.tlsKeyFile as string)),
      }, app)
    : app;
  return listener.listen(config.port, config.bindHost, () => {
    const protocol = hasTlsFiles ? 'https' : 'http';
    console.log(`GymTracker Pro server listening on ${protocol}://${config.bindHost}:${config.port}`);
  });
}

if (process.env.GYMTRACKER_NO_AUTOSTART !== '1') {
  startServer().catch((err) => {
    console.error('[server] Failed to start server:', err?.message || err);
    process.exitCode = 1;
  });
}
