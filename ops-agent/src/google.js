import { GoogleAuth } from 'google-auth-library';
import { API_NAMES, maskServiceAccount } from './core.js';

const base = 'https://';
const enc = encodeURIComponent;

export class GoogleReader {
  constructor(requester) {
    if (requester) this.requester = requester;
    else {
      const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
      this.requester = (options) => auth.request(options);
    }
  }
  async get(url) { return (await this.requester({ url, method: 'GET', timeout: 7000 })).data; }
  async post(url, data) { return (await this.requester({ url, method: 'POST', data, timeout: 7000 })).data; }

  service(c) { return this.get(`${base}run.googleapis.com/v2/projects/${enc(c.projectId)}/locations/${enc(c.region)}/services/${enc(c.service)}`); }
  revisions(c) { return this.get(`${base}run.googleapis.com/v2/projects/${enc(c.projectId)}/locations/${enc(c.region)}/services/${enc(c.service)}/revisions?pageSize=20`); }
  firestore(c) { return this.get(`${base}firestore.googleapis.com/v1/projects/${enc(c.projectId)}/databases/${enc(c.databaseId)}`); }
  async apiStates(c) {
    return Promise.all(API_NAMES.map(async name => {
      try {
        const data = await this.get(`${base}serviceusage.googleapis.com/v1/projects/${enc(c.projectId)}/services/${name}`);
        return { name, state: data.state || 'UNKNOWN' };
      } catch (error) { return { name, state: 'UNKNOWN', error: Number(error?.response?.status || 0) }; }
    }));
  }
  logging(c) {
    const filter = `resource.type="cloud_run_revision" AND resource.labels.service_name="${c.service}" AND severity>=WARNING AND timestamp>="${new Date(Date.now() - 15 * 60_000).toISOString()}"`;
    return this.post(`${base}logging.googleapis.com/v2/entries:list`, { resourceNames: [`projects/${c.projectId}`], filter, orderBy: 'timestamp desc', pageSize: 50 });
  }
  metrics(c, metric) {
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - 15 * 60_000).toISOString();
    const filter = `metric.type="run.googleapis.com/${metric}" AND resource.type="cloud_run_revision" AND resource.labels.service_name="${c.service}"`;
    const query = new URLSearchParams({ filter, 'interval.startTime': startTime, 'interval.endTime': endTime, view: 'FULL', 'pageSize': '200' });
    return this.get(`${base}monitoring.googleapis.com/v3/projects/${enc(c.projectId)}/timeSeries?${query}`);
  }
}

export function serviceSummary(data) {
  const ready = data?.terminalCondition?.state === 'CONDITION_SUCCEEDED' || data?.conditions?.some(x => x.type === 'Ready' && (x.state === 'CONDITION_SUCCEEDED' || x.status === 'True'));
  const traffic = Array.isArray(data?.trafficStatuses) ? data.trafficStatuses : (Array.isArray(data?.traffic) ? data.traffic : []);
  return {
    ready: Boolean(ready),
    url: data?.uri || data?.urls?.[0] || '',
    created: data?.createTime || '', updated: data?.updateTime || '', generation: data?.generation || '',
    latestCreated: data?.latestCreatedRevision || '', latestReady: data?.latestReadyRevision || '',
    serviceAccountConfigured: Boolean(data?.template?.serviceAccount),
    serviceAccount: maskServiceAccount(data?.template?.serviceAccount),
    traffic: traffic.map(x => ({ revision: x.revision || x.revisionName || '', percent: Number(x.percent || 0) })),
    envNames: (data?.template?.containers || []).flatMap(x => (x.env || []).map(e => e.name)).filter(Boolean)
  };
}

export function firestoreMetadataSummary(data) {
  return {
    name: data?.name || '',
    locationId: data?.locationId || '',
    type: data?.type || '',
    concurrencyMode: data?.concurrencyMode || '',
    deleteProtectionState: data?.deleteProtectionState || '',
    pointInTimeRecoveryEnablement: data?.pointInTimeRecoveryEnablement || ''
  };
}

export function serviceUsageSummary(states, names = API_NAMES) {
  const byName = new Map((Array.isArray(states) ? states : []).map(item => [item.name, item.state || 'UNKNOWN']));
  const normalized = names.map(name => ({ name, state: byName.get(name) || 'UNKNOWN' }));
  return {
    states: normalized,
    disabled: normalized.filter(item => item.state === 'DISABLED'),
    unknown: normalized.filter(item => item.state === 'UNKNOWN')
  };
}

export function classifyLog(entry) {
  const message = String(entry?.textPayload || entry?.jsonPayload?.message || '');
  const status = Number(entry?.httpRequest?.status || 0);
  const type = /firestore|cloud_store|datastore/i.test(message) ? 'FIRESTORE_ERROR'
    : /oauth|google.*auth|unauthori[sz]|token/i.test(message) ? 'AUTH_ERROR'
    : /start|listen|crash/i.test(message) ? 'STARTUP_ERROR'
    : /gemini/i.test(message) ? 'GEMINI_ERROR'
    : /timeout|deadline/i.test(message) ? 'TIMEOUT'
    : /config|environment/i.test(message) ? 'CONFIG_ERROR'
    : status >= 500 ? 'HTTP_5XX' : 'UNKNOWN';
  return { type, severity: entry?.severity || 'UNKNOWN', ...(status ? { httpStatus: status } : {}), timestamp: entry?.timestamp || '' };
}

export function metricSummary(requests, instances, latencies) {
  const series = requests?.timeSeries || [];
  let count = 0, failures = 0;
  for (const row of series) {
    const codeClass = row.metric?.labels?.response_code_class || '';
    for (const point of row.points || []) {
      const n = Number(point.value?.int64Value || 0);
      if (Number.isFinite(n)) { count += n; if (codeClass === '5xx') failures += n; }
    }
  }
  const active = (instances?.timeSeries || []).filter(row => row.metric?.labels?.state === 'active').flatMap(row => row.points || []).map(p => Number(p.value?.int64Value || 0)).filter(Number.isFinite);
  const distributions = (latencies?.timeSeries || []).flatMap(row => row.points || []).map(p => p.value?.distributionValue).filter(Boolean);
  const latencySamples = distributions.reduce((sum, d) => sum + Number(d.count || 0), 0);
  const weightedMean = latencySamples ? distributions.reduce((sum, d) => sum + Number(d.mean || 0) * Number(d.count || 0), 0) / latencySamples : null;
  return { requests: count, errors5xx: failures, errorRate: count ? failures / count : null, activeInstances: active.length ? Math.max(...active) : null, meanLatencyMs: weightedMean };
}
