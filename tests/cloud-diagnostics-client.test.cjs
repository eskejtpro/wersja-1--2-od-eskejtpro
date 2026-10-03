const test = require('node:test');
const assert = require('node:assert/strict');
const steps = ['write', 'read', 'update', 'revision/hash', 'STALE_WRITE expect conflict', 'post-stale verification', 'cleanup'];
const session = { serverUrl: 'https://api.example.test', token: 'test-session' };
const makeReport = () => ({ status: 'pass', documentId: 'isolated-test-id', steps: steps.map(name => ({ name, status: 'pass', timestamp: new Date().toISOString(), latencyMs: 1 })) });
let run;
let originalFetch;
test.before(async () => { ({ runCloudFirestoreDiagnostic: run } = await import('../src/utils/cloudDiagnostics.ts')); originalFetch = global.fetch; });
test.afterEach(() => { global.fetch = originalFetch; });

test('diagnostic only calls authenticated isolated endpoint and requires all real phases', async () => {
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.example.test/api/diagnostics/firestore');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer test-session');
    assert.equal(options.body, undefined);
    return new Response(JSON.stringify(makeReport()), { status: 200, headers: { 'X-Request-Id': 'correlation-id' } });
  };
  const report = await run(session);
  assert.equal(report.status, 'pass');
  assert.equal(report.requestId, 'correlation-id');
});
test('partial PASS or failed cleanup can never become verified persistence', async () => {
  const report = makeReport();
  report.steps.pop();
  global.fetch = async () => new Response(JSON.stringify(report), { status: 200 });
  assert.equal((await run(session)).status, 'fail');
  report.steps.push({ name: 'cleanup', status: 'fail', timestamp: new Date().toISOString(), latencyMs: 1 });
  assert.equal((await run(session)).status, 'fail');
});
test('older backend, expired session and throttling produce actionable errors', async () => {
  for (const [status, message] of [[404, /wdrożenie/], [401, /Sesja wygasła/], [429, /minutę/]]) {
    global.fetch = async () => new Response('', { status });
    await assert.rejects(run(session), message);
  }
});
test('structured failed cleanup keeps the diagnostic id for repair', async () => {
  const report = makeReport(); report.status = 'fail'; report.steps[6].status = 'fail';
  global.fetch = async () => new Response(JSON.stringify(report), { status: 503 });
  const result = await run(session);
  assert.equal(result.status, 'fail');
  assert.equal(result.documentId, 'isolated-test-id');
});
test('invalid target and absent credentials fail before any request', async () => {
  global.fetch = () => { throw new Error('must not request'); };
  await assert.rejects(run({ ...session, serverUrl: 'http://api.example.test' }), /HTTPS/);
  await assert.rejects(run({ ...session, token: '' }), /Google/);
});
