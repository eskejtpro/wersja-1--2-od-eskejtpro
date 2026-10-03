import { Capacitor } from '@capacitor/core';
type Session = { serverUrl: string; token: string };
let activeSession: Session | null = null;
const requests = new Set<AbortController>();
const responseSessions = new WeakMap<Response, Session | null>();
const paths = new Set(['coach/chat', 'coach/tts', 'coach/generate-plan', 'coach/nutrition-plan',
  'coach/swap-exercise', 'coach/audit-health', 'agent/parse-command'].map(path => `/api/ai/${path}`));
paths.add('/api/ai/chat');

export function setAiRemoteSession(session: Session | null): void {
  for (const request of requests) request.abort();
  activeSession = session ? { ...session } : null;
}

export function assertAiResponseCurrent(response: Response): void {
  if (!responseSessions.has(response) || responseSessions.get(response) !== activeSession) {
    throw new Error('Sesja AI zmieniła się. Ponów operację po zalogowaniu.');
  }
}

export async function requestAi(path: string, options: RequestInit = {}): Promise<Response> {
  if (!paths.has(path)) throw new Error('Nieobsługiwana operacja AI.');
  const session = activeSession;
  const headers = new Headers(options.headers);
  headers.delete('Authorization');
  let target: string;
  if (session) {
    const base = new URL(session.serverUrl);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
    if ((!local && base.protocol !== 'https:') || !['http:', 'https:'].includes(base.protocol)
        || base.username || base.password || base.search || base.hash || !session.token) {
      throw new Error('Nieprawidłowa konfiguracja HTTPS serwera AI.');
    }
    target = `${base.href.replace(/\/+$/, '')}${path}`;
    headers.set('Authorization', `Bearer ${session.token}`);
  } else {
    const location = typeof window !== 'undefined' ? window.location : undefined;
    if (Capacitor.isNativePlatform() || !location || !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
        || !['http:', 'https:'].includes(location.protocol)) {
      throw new Error('Zaloguj się przez Google do serwera, aby korzystać z AI online.');
    }
    target = `${location.origin}${path}`;
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) abort();
  const timeout = setTimeout(abort, 60_000);
  requests.add(controller);
  try {
    const response = await fetch(target, { ...options, headers, signal: controller.signal, credentials: 'omit', redirect: 'error' });
    const body = await response.arrayBuffer();
    if (controller.signal.aborted || activeSession !== session) throw new Error('Sesja AI zmieniła się. Ponów operację po zalogowaniu.');
    const buffered = new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
    responseSessions.set(buffered, session);
    return buffered;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
    requests.delete(controller);
  }
}
