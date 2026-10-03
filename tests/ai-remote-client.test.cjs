const test = require('node:test');
const assert = require('node:assert/strict');
let requestAi, setAiRemoteSession, assertAiResponseCurrent, Capacitor, originalFetch, originalNative;
test.before(async () => {
  ({ requestAi, setAiRemoteSession, assertAiResponseCurrent } = await import('../src/utils/aiRemoteClient.ts'));
  ({ Capacitor } = await import('@capacitor/core'));
  originalFetch = global.fetch; originalNative = Capacitor.isNativePlatform;
});
test.afterEach(() => { setAiRemoteSession(null); global.fetch = originalFetch; Capacitor.isNativePlatform = originalNative; delete global.window; });
test('native AI requests use the actual session URL and bearer, never localhost or a caller token', async () => {
  Capacitor.isNativePlatform = () => true;
  setAiRemoteSession({ serverUrl: 'https://cloud.example.test', token: 'synthetic-session' });
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://cloud.example.test/api/ai/coach/chat');
    assert.equal(options.headers.get('Authorization'), 'Bearer synthetic-session');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error');
    return new Response('{"reply":"test"}', { status: 200 });
  };
  assert.equal((await (await requestAi('/api/ai/coach/chat', { headers: { Authorization: 'not-allowed' } })).json()).reply, 'test');
});
test('native without active session fails closed even when WebView origin is localhost', async () => {
  Capacitor.isNativePlatform = () => true;
  global.window = { location: { hostname: 'localhost', protocol: 'https:', origin: 'https://localhost' } };
  global.fetch = () => { throw new Error('must not fetch'); };
  await assert.rejects(requestAi('/api/ai/coach/chat'), /Zaloguj/);
});
test('development loopback is allowed only outside the native application', async () => {
  Capacitor.isNativePlatform = () => false;
  global.window = { location: { hostname: 'localhost', protocol: 'http:', origin: 'http://localhost:3000' } };
  global.fetch = async url => { assert.equal(url, 'http://localhost:3000/api/ai/coach/chat'); return new Response('{}'); };
  await requestAi('/api/ai/coach/chat');
});
test('URL tricks and non-AI paths cannot receive a bearer session', async () => {
  global.fetch = () => { throw new Error('must not fetch'); };
  setAiRemoteSession({ serverUrl: 'http://external.example.test', token: 'synthetic' });
  await assert.rejects(requestAi('/api/ai/coach/chat'), /HTTPS/);
  setAiRemoteSession({ serverUrl: 'https://user:pass@external.example.test', token: 'synthetic' });
  await assert.rejects(requestAi('/api/ai/coach/chat'), /HTTPS/);
  await assert.rejects(requestAi('https://attacker.example.test'), /Nieobsługiwana/);
});
test('logout aborts ongoing downloads and never publishes the previous session response', async () => {
  setAiRemoteSession({ serverUrl: 'https://cloud.example.test', token: 'synthetic' });
  let release;
  let signal;
  global.fetch = async (_url, options) => {
    signal = options.signal;
    return { status: 200, statusText: 'OK', headers: new Headers(), arrayBuffer: () => new Promise(resolve => { release = resolve; }) };
  };
  const request = requestAi('/api/ai/coach/chat');
  await new Promise(resolve => setImmediate(resolve));
  setAiRemoteSession(null);
  assert.equal(signal.aborted, true);
  release(new ArrayBuffer(0));
  await assert.rejects(request, /Sesja AI/);
});

test('response parsed after logout cannot update the previous account UI', async () => {
  setAiRemoteSession({ serverUrl: 'https://cloud.example.test', token: 'synthetic' });
  global.fetch = async () => new Response('{"reply":"previous-account"}');
  const response = await requestAi('/api/ai/coach/chat');
  assertAiResponseCurrent(response);
  setAiRemoteSession(null);
  await response.json();
  assert.throws(() => assertAiResponseCurrent(response), /Sesja AI/);
});
