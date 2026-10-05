export const API_NAMES = ['run.googleapis.com', 'logging.googleapis.com', 'monitoring.googleapis.com', 'firestore.googleapis.com', 'serviceusage.googleapis.com'];
export const REQUIRED_ENVS = ['GYMTRACKER_CLOUD_STORE', 'GYMTRACKER_FIRESTORE_PROJECT_ID', 'GOOGLE_CLIENT_ID'];
export const OPTIONAL_ENVS = ['GYMTRACKER_FIRESTORE_DATABASE_ID', 'GOOGLE_CLIENT_IDS', 'GEMINI_API_KEY', 'API_KEY'];

export function configuration(env = process.env) {
  const projectId = env.OPS_PROJECT_ID || '';
  const region = env.OPS_REGION || '';
  const service = env.OPS_TARGET_SERVICE || '';
  const databaseId = env.OPS_FIRESTORE_DATABASE_ID || '(default)';
  const expectedVersion = env.OPS_EXPECTED_VERSION || '';
  if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId)) throw new Error('Nieprawidłowy OPS_PROJECT_ID');
  if (!/^[a-z]+(?:-[a-z0-9]+)+[0-9]$/.test(region)) throw new Error('Nieprawidłowy OPS_REGION');
  if (!/^[a-z][a-z0-9-]{0,61}[a-z0-9]$/.test(service)) throw new Error('Nieprawidłowy OPS_TARGET_SERVICE');
  if (!/^(?:\(default\)|[a-zA-Z0-9_-]{4,63})$/.test(databaseId)) throw new Error('Nieprawidłowy OPS_FIRESTORE_DATABASE_ID');
  if (expectedVersion && !/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][a-zA-Z0-9.-]+)?$/.test(expectedVersion)) throw new Error('Nieprawidłowy OPS_EXPECTED_VERSION');
  return Object.freeze({ projectId, region, service, databaseId, expectedVersion });
}

// Never forward raw Google Cloud log entries; reports use categories only.
export function redact(value) {
  let text = String(value ?? '').slice(0, 500);
  const safeConfigLabels = [];
  text = text.replace(/\b([A-Z][A-Z0-9_]{2,})\s*:\s*(skonfigurowano|brak)\b/gi, (_, name, state) => {
    const marker = `__SAFE_CONFIG_${safeConfigLabels.length}__`;
    safeConfigLabels.push(`${name}: ${state}`);
    return marker;
  });
  text = text.replace(/Bearer\s+[^\s"']+/gi, 'Bearer [UKRYTO]');
  text = text.replace(/(?:access_token|id_token|refresh_token|api[_ -]?key|client[_ -]?secret|password|cookie|authorization)\s*[:=]\s*[^\s,;]+/gi, '[UKRYTO]');
  text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]');
  text = text.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[UKRYTO]');
  return text.replace(/__SAFE_CONFIG_(\d+)__/g, (_, index) => safeConfigLabels[Number(index)]);
}

export function maskServiceAccount(value) {
  const text = String(value || '');
  const match = text.match(/^([^@]{1,12})[^@]*@(.+)$/);
  return match ? `${match[1]}…@${match[2]}` : text ? '[SKONFIGUROWANO]' : 'brak';
}

export function statusForError(error) {
  const code = Number(error?.status || error?.response?.status || 0);
  if (code === 403) {
    const permission = error?.response?.data?.error?.details?.find?.(detail => detail?.['@type']?.includes('ErrorInfo'))?.metadata?.permission;
    return { status: 'UNKNOWN', summary: permission ? `Brak uprawnienia: ${permission}.` : 'Brak uprawnienia do sprawdzenia zasobu.', nextStep: 'Sprawdź uprawnienia dedykowanego konta usługi Ops Agent.' };
  }
  if (code === 404) return { status: 'FAIL', summary: 'Nie znaleziono zasobu.', nextStep: 'Sprawdź projekt, region i nazwę usługi lub bazy.' };
  if (error?.name === 'TimeoutError') return { status: 'UNKNOWN', summary: 'Przekroczono czas sprawdzania.', nextStep: 'Sprawdź dostępność Google Cloud API i ponów diagnostykę.' };
  return { status: 'UNKNOWN', summary: 'Nie udało się sprawdzić zasobu.', nextStep: 'Sprawdź Cloud Logging oraz uprawnienia Ops Agent.' };
}

export async function timedCheck(id, name, run, timeoutMs = 8000) {
  const started = Date.now();
  let timer;
  try {
    const result = await Promise.race([
      Promise.resolve().then(run),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('Timeout'), { name: 'TimeoutError' })), timeoutMs); })
    ]);
    return { id, name, status: result.status, summary: result.summary, evidence: (result.evidence || []).map(redact), ...(result.nextStep ? { nextStep: result.nextStep } : {}), durationMs: Date.now() - started };
  } catch (error) {
    return { id, name, ...statusForError(error), evidence: [], durationMs: Date.now() - started };
  } finally { clearTimeout(timer); }
}

export function overallStatus(checks) {
  if (checks.some(c => c.status === 'FAIL')) return 'FAIL';
  if (checks.some(c => c.status === 'WARN')) return 'WARN';
  if (checks.every(c => c.status === 'UNKNOWN')) return 'UNKNOWN';
  if (checks.some(c => c.status === 'UNKNOWN')) return 'WARN';
  return 'PASS';
}

export function textReport(report) {
  return ['PLANPASIKA CLOUD DIAGNOSTICS', `Wygenerowano: ${report.generatedAt}`, `Projekt: ${report.projectId}`, `Region: ${report.region}`, `Usługa: ${report.targetService}`, '', ...report.checks.flatMap(c => [`${c.name}: ${c.status} — ${c.summary}`, ...c.evidence.map(e => `  ${e}`), ...(c.nextStep ? [`  Następny krok: ${c.nextStep}`] : [])]), '', `WYNIK: ${report.overallStatus}`].join('\n');
}

export function validBackendUrl(raw) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash || !/^[a-z0-9-]+\.[a-z0-9-]+\.run\.app$/.test(url.hostname)) throw new Error('Niebezpieczny URL backendu');
  return url.origin;
}
