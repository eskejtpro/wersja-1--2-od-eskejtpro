import http from 'node:http';
import { textReport } from './core.js';
import { GoogleReader } from './google.js';
import { runDiagnostics } from './diagnostics.js';

export function createServer(config, reader = new GoogleReader(), fetcher = fetch) {
  return http.createServer(async (req, res) => {
    const path = new URL(req.url || '/', 'http://localhost').pathname;
    const json = (status, value) => {
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      res.end(JSON.stringify(value));
    };
    if (req.method === 'GET' && path === '/health') return json(200, { status: 'ok', service: 'planpasika-cloud-ops-agent' });
    if (req.method === 'GET' && path === '/version') return json(200, { version: '0.1.0', mode: 'read-only' });
    if (req.method !== 'POST' || path !== '/api/diagnostics/run') return json(404, { error: 'Nie znaleziono trasy.' });
    if (Number(req.headers['content-length'] || 0) > 1024) return json(413, { error: 'Żądanie jest za duże.' });
    let length = 0;
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 1024) return json(413, { error: 'Żądanie jest za duże.' });
    }
    try {
      const report = await runDiagnostics(config, reader, fetcher);
      if (req.headers.accept === 'text/plain') {
        res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
        return res.end(textReport(report));
      }
      return json(200, report);
    } catch {
      return json(503, { error: 'Nie udało się przygotować raportu.' });
    }
  });
}
