export interface CloudDiagnosticStep {
  name: string;
  status: 'pass' | 'fail';
  timestamp: string;
  latencyMs: number;
  requestId?: string;
  error?: string;
}
export interface CloudDiagnosticReport {
  status: 'pass' | 'fail';
  steps: CloudDiagnosticStep[];
  documentId: string;
  requestId: string;
  checkedAt: string;
}

// This operation only writes an isolated disposable diagnostic record, never GymData.
export async function runCloudFirestoreDiagnostic(session: { serverUrl: string; token: string }): Promise<CloudDiagnosticReport> {
  const target = new URL(session.serverUrl);
  if (target.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(target.hostname)) {
    throw new Error('Diagnostyka serwera wymaga HTTPS.');
  }
  if (!session.token) throw new Error('Zaloguj się ponownie przez Google.');
  const response = await fetch(`${session.serverUrl.replace(/\/+$/, '')}/api/diagnostics/firestore`, {
    method: 'POST', headers: { Authorization: `Bearer ${session.token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(60_000),
  });
  if (response.status === 404) throw new Error('Backend nie ma jeszcze testu Firestore. Wymagane wdrożenie aktualnego kodu serwera.');
  if (response.status === 401) throw new Error('Sesja wygasła. Zaloguj się ponownie przez Google.');
  if (response.status === 429) throw new Error('Odczekaj minutę przed ponownym testem Firestore.');
  const report = await response.json();
  if (!report || !['pass', 'fail'].includes(report.status) || !Array.isArray(report.steps) || !report.steps.length
      || typeof report.documentId !== 'string' || !report.steps.every((step: CloudDiagnosticStep) =>
        typeof step.name === 'string' && ['pass', 'fail'].includes(step.status)
        && typeof step.timestamp === 'string' && Number.isFinite(step.latencyMs) && step.latencyMs >= 0)) {
    throw new Error('Nie udało się uzyskać poprawnego raportu Firestore. Żaden zapis treningów nie został wykonany.');
  }
  const required = ['write', 'read', 'update', 'revision/hash', 'STALE_WRITE expect conflict', 'post-stale verification', 'cleanup'];
  const allPass = response.ok && report.status === 'pass' && required.every(name =>
    report.steps.some((step: CloudDiagnosticStep) => step.name === name && step.status === 'pass'))
    && report.steps.every((step: CloudDiagnosticStep) => step.status === 'pass');
  return { ...report, status: allPass ? 'pass' : 'fail', requestId: response.headers.get('X-Request-Id') || '', checkedAt: new Date().toISOString() };
}
