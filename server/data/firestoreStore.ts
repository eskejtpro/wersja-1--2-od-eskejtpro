import crypto from 'node:crypto';
import { GoogleAuth } from 'google-auth-library';

export interface CloudDataState {
  schemaVersion: 1;
  revision: number;
  updatedAt: string;
  contentHash: string;
  data: Record<string, unknown>;
}

export interface CloudSession {
  tokenHash: string;
  expiresAt: number;
  createdAt: number;
  principalId: string;
  googleUser: {
    id: string;
    sub: string;
    email: string;
    displayName: string;
    photoURL?: string;
    connectedAt: string;
  };
}

type RequestOptions = { url: string; method: 'GET' | 'POST'; data?: unknown; timeout?: number };
export type FirestoreRequester = (options: RequestOptions) => Promise<{ data: unknown }>;

interface FirestoreDocument {
  updateTime?: string;
  fields?: { payload?: { stringValue?: string } };
}

interface LoginAttemptState {
  count: number;
  windowStartedAt: number;
  blockedUntil: number;
}

export class CloudStoreError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
    this.name = 'CloudStoreError';
  }
}

export class CloudConflictError extends CloudStoreError {
  constructor(readonly revision: number, readonly contentHash: string, readonly reason: string) {
    super('conflict', 409);
    this.name = 'CloudConflictError';
  }
}

function responseStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  const response = error.response as { status?: unknown } | undefined;
  return typeof response?.status === 'number' ? response.status : undefined;
}

function isPreconditionFailure(error: unknown): boolean {
  const status = responseStatus(error);
  if (status === 409 || status === 412) return true;
  if (!error || typeof error !== 'object' || !('response' in error)) return false;
  const response = error.response as { data?: { error?: { status?: string } } } | undefined;
  return response?.data?.error?.status === 'FAILED_PRECONDITION' || response?.data?.error?.status === 'ABORTED';
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function digest(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function parsePayload(document: FirestoreDocument): unknown {
  const payload = document.fields?.payload?.stringValue;
  if (typeof payload !== 'string') throw new CloudStoreError('cloud_store_corrupt', 503);
  try {
    return JSON.parse(payload);
  } catch {
    throw new CloudStoreError('cloud_store_corrupt', 503);
  }
}

function parseDataState(value: unknown, validateData: (data: unknown) => boolean): CloudDataState {
  if (!object(value) || value.schemaVersion !== 1 || !Number.isSafeInteger(value.revision) || (value.revision as number) < 1
    || typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt))
    || typeof value.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(value.contentHash)
    || !object(value.data) || !validateData(value.data) || digest(JSON.stringify(value.data)) !== value.contentHash) {
    throw new CloudStoreError('cloud_store_corrupt', 503);
  }
  return value as unknown as CloudDataState;
}

function parseSession(value: unknown, tokenHash: string): CloudSession {
  if (!/^[a-f0-9]{64}$/.test(tokenHash) || !object(value) || value.tokenHash !== tokenHash || !Number.isSafeInteger(value.createdAt)
    || !Number.isSafeInteger(value.expiresAt) || (value.expiresAt as number) <= (value.createdAt as number)
    || typeof value.principalId !== 'string' || !value.principalId.startsWith('google:')
    || !object(value.googleUser) || typeof value.googleUser.sub !== 'string' || value.googleUser.sub.length < 1 || value.googleUser.sub.length > 256
    || value.googleUser.id !== value.googleUser.sub
    || value.principalId !== `google:${value.googleUser.sub}`
    || typeof value.googleUser.email !== 'string' || value.googleUser.email.length > 320
    || typeof value.googleUser.displayName !== 'string' || value.googleUser.displayName.length > 512
    || typeof value.googleUser.connectedAt !== 'string' || !Number.isFinite(Date.parse(value.googleUser.connectedAt))
    || (value.googleUser.photoURL !== undefined && (typeof value.googleUser.photoURL !== 'string'
      || value.googleUser.photoURL.length > 2048 || !value.googleUser.photoURL.startsWith('https://')))) {
    throw new CloudStoreError('cloud_session_corrupt', 503);
  }
  return value as unknown as CloudSession;
}

export interface FirestoreStoreOptions {
  projectId: string;
  databaseId?: string;
  validateData: (data: unknown) => boolean;
  now?: () => number;
  requester?: FirestoreRequester;
}

export class FirestoreStore {
  private readonly database: string;
  private readonly requester: FirestoreRequester;
  private readonly validateData: (data: unknown) => boolean;
  private readonly now: () => number;

  constructor(options: FirestoreStoreOptions) {
    const databaseId = options.databaseId || '(default)';
    if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(options.projectId) || !/^(\(default\)|[a-zA-Z0-9_-]{4,63})$/.test(databaseId)) {
      throw new CloudStoreError('cloud_store_invalid_configuration', 503);
    }
    this.database = `projects/${options.projectId}/databases/${databaseId}`;
    this.validateData = options.validateData;
    this.now = options.now || Date.now;
    if (options.requester) {
      this.requester = options.requester;
    } else {
      const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/datastore'] });
      this.requester = async (request) => auth.request(request);
    }
  }

  private url(suffix: string): string {
    return `https://firestore.googleapis.com/v1/${this.database}/documents${suffix}`;
  }

  private documentName(collection: 'gymtracker_v1_data' | 'gymtracker_v1_sessions' | 'gymtracker_v1_login_limits', key: string): string {
    return `${this.database}/documents/${collection}/${digest(key)}`;
  }

  private async getDocument(name: string): Promise<FirestoreDocument | null> {
    try {
      const result = await this.requester({ method: 'GET', url: `https://firestore.googleapis.com/v1/${name}`, timeout: 8000 });
      if (!object(result.data)) throw new CloudStoreError('cloud_store_corrupt', 503);
      return result.data as FirestoreDocument;
    } catch (error) {
      if (responseStatus(error) === 404) return null;
      if (error instanceof CloudStoreError) throw error;
      throw new CloudStoreError('cloud_store_unavailable', 503);
    }
  }

  private async commit(name: string, payload: unknown, precondition: { exists: false } | { updateTime: string }): Promise<void> {
    const serialized = JSON.stringify(payload);
    if (Buffer.byteLength(serialized, 'utf8') > 900_000) throw new CloudStoreError('body_too_large', 413);
    await this.requester({
      method: 'POST', url: this.url(':commit'), timeout: 8000,
      data: { writes: [{ update: { name, fields: { payload: { stringValue: serialized } } }, currentDocument: precondition }] },
    });
  }

  private async readDataDocument(principalId: string): Promise<{ state: CloudDataState; updateTime: string } | null> {
    const name = this.documentName('gymtracker_v1_data', principalId);
    const document = await this.getDocument(name);
    if (!document) return null;
    if (!document.updateTime) throw new CloudStoreError('cloud_store_corrupt', 503);
    return { state: parseDataState(parsePayload(document), this.validateData), updateTime: document.updateTime };
  }

  async readData(principalId: string): Promise<CloudDataState | null> {
    return (await this.readDataDocument(principalId))?.state || null;
  }

  async saveData(principalId: string, data: Record<string, unknown>, expectedRevision?: number, expectedHash?: string): Promise<CloudDataState> {
    if (!this.validateData(data)) throw new CloudStoreError('invalid_gym_data', 422);
    const current = await this.readDataDocument(principalId);
    if (current && (!Number.isSafeInteger(expectedRevision) || typeof expectedHash !== 'string')) {
      throw new CloudConflictError(current.state.revision, current.state.contentHash, 'revision_required');
    }
    if (current && (expectedRevision !== current.state.revision || expectedHash !== current.state.contentHash)) {
      throw new CloudConflictError(current.state.revision, current.state.contentHash, 'stale_revision');
    }
    const next: CloudDataState = {
      schemaVersion: 1,
      revision: (current?.state.revision || 0) + 1,
      updatedAt: new Date(this.now()).toISOString(),
      contentHash: digest(JSON.stringify(data)),
      data,
    };
    try {
      await this.commit(this.documentName('gymtracker_v1_data', principalId), next,
        current ? { updateTime: current.updateTime } : { exists: false });
      return next;
    } catch (error) {
      if (isPreconditionFailure(error)) {
        const latest = await this.readData(principalId);
        throw new CloudConflictError(latest?.revision || 0, latest?.contentHash || '', 'stale_revision');
      }
      if (error instanceof CloudStoreError) throw error;
      throw new CloudStoreError('cloud_store_unavailable', 503);
    }
  }

  async readSession(tokenHash: string): Promise<CloudSession | null> {
    if (!/^[a-f0-9]{64}$/.test(tokenHash)) return null;
    const document = await this.getDocument(this.documentName('gymtracker_v1_sessions', tokenHash));
    if (!document) return null;
    const session = parseSession(parsePayload(document), tokenHash);
    return session.expiresAt > this.now() ? session : null;
  }

  async saveSession(session: CloudSession): Promise<void> {
    parseSession(session, session.tokenHash);
    try {
      await this.commit(this.documentName('gymtracker_v1_sessions', session.tokenHash), session, { exists: false });
    } catch (error) {
      if (error instanceof CloudStoreError) throw error;
      throw new CloudStoreError('cloud_store_unavailable', 503);
    }
  }

  async deleteSession(tokenHash: string): Promise<void> {
    if (!/^[a-f0-9]{64}$/.test(tokenHash)) return;
    try {
      await this.requester({
        method: 'POST', url: this.url(':commit'), timeout: 8000,
        data: { writes: [{ delete: this.documentName('gymtracker_v1_sessions', tokenHash) }] },
      });
    } catch {
      throw new CloudStoreError('cloud_store_unavailable', 503);
    }
  }

  private async readLoginAttempt(ip: string): Promise<{ state: LoginAttemptState; updateTime: string } | null> {
    const document = await this.getDocument(this.documentName('gymtracker_v1_login_limits', ip));
    if (!document) return null;
    const value = parsePayload(document);
    if (!document.updateTime || !object(value) || !Number.isSafeInteger(value.count)
      || !Number.isSafeInteger(value.windowStartedAt) || !Number.isSafeInteger(value.blockedUntil)
      || (value.count as number) < 0) {
      throw new CloudStoreError('cloud_rate_limit_corrupt', 503);
    }
    return { state: value as unknown as LoginAttemptState, updateTime: document.updateTime };
  }

  async isLoginBlocked(ip: string): Promise<boolean> {
    const attempt = await this.readLoginAttempt(ip);
    return Boolean(attempt && attempt.state.blockedUntil > this.now());
  }

  async recordLoginFailure(ip: string, maxAttempts: number, windowMs: number): Promise<boolean> {
    if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || !Number.isSafeInteger(windowMs) || windowMs < 1) {
      throw new CloudStoreError('cloud_rate_limit_invalid_configuration', 503);
    }
    for (let retry = 0; retry < 5; retry += 1) {
      const current = await this.readLoginAttempt(ip);
      const now = this.now();
      const previous = current?.state;
      const next: LoginAttemptState = !previous || now - previous.windowStartedAt > windowMs
        ? { count: 1, windowStartedAt: now, blockedUntil: 0 }
        : { ...previous, count: previous.count + 1 };
      if (next.count >= maxAttempts) next.blockedUntil = now + windowMs;
      try {
        await this.commit(this.documentName('gymtracker_v1_login_limits', ip), next,
          current ? { updateTime: current.updateTime } : { exists: false });
        return next.blockedUntil > now;
      } catch (error) {
        if (isPreconditionFailure(error)) continue;
        if (error instanceof CloudStoreError) throw error;
        throw new CloudStoreError('cloud_store_unavailable', 503);
      }
    }
    throw new CloudStoreError('cloud_rate_limit_busy', 503);
  }

  async clearLoginFailures(ip: string): Promise<void> {
    try {
      await this.requester({
        method: 'POST', url: this.url(':commit'), timeout: 8000,
        data: { writes: [{ delete: this.documentName('gymtracker_v1_login_limits', ip) }] },
      });
    } catch {
      throw new CloudStoreError('cloud_store_unavailable', 503);
    }
  }
}
