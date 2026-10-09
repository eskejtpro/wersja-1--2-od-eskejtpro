const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('Google settings use a real ID token and keep the bearer session in React memory', () => {
  const panel = source('src/components/AppUpdateServerPanel.tsx');
  const app = source('src/App.tsx');
  const types = source('src/types.ts');
  const profileModal = source('src/components/AccountProfileModal.tsx');
  const profile = source('src/components/UserProfileView.tsx');
  assert.match(panel, /SocialLogin\.login\(\{ provider: "google"/);
  assert.match(panel, /SocialLogin\.login\(\{ provider: "google", options: \{\} \}\)/);
  assert.match(panel, /loginWithGoogleAccount\(\{ idToken, targetUrl \}\)/);
  assert.match(panel, /googleSession\.token/);
  assert.match(panel, /activeGoogleUser && googleSession \? \(/);
  assert.match(panel, /Konto zapamiętane — zaloguj ponownie/);
  assert.match(panel, /Adres serwera API \(HTTPS\)/);
  assert.match(panel, /updateServerUrl: event\.target\.value\.trim\(\)/);
  assert.match(app, /useState<\{ token: string; serverUrl: string \} \| null>/);
  assert.doesNotMatch(types.slice(types.indexOf('googleUser?'), types.indexOf('\n  }', types.indexOf('googleUser?'))), /token\??:/);
  assert.doesNotMatch(panel, /eskejtpro@gmail\.com|google-user-|gcl_offline/);
  assert.doesNotMatch(profileModal, /eskejtpro@gmail\.com|google-uid-verified|Pasik \(Google Verified\)/);
  assert.doesNotMatch(profile, /gcl_session_active|G-9428-CLD|google-user-|30-dniowy token/);
  assert.match(profile, /Synchronizacja nie jest dostępna/);
});

test('Google API client has no fabricated online, identity, or session fallbacks', () => {
  const api = source('src/utils/serverApi.ts');
  assert.match(api, /idToken: string/);
  assert.match(api, /\/api\/auth\/google\/login/);
  assert.doesNotMatch(api, /status: 'online'|gcl_offline|google-user-|PASS-7788|ais-pre-|ais-dev-/);
});

test('production Android config does not allow cleartext or mixed content', () => {
  const config = source('capacitor.config.ts');
  assert.doesNotMatch(config, /cleartext:\s*true|allowMixedContent:\s*true/);
});

test('server endpoint inventory includes every AI route exposed by the backend', () => {
  const panel = source('src/components/AppUpdateServerPanel.tsx');
  const server = source('server.ts');
  assert.match(server, /app\.post\('\/api\/ai\/coach\/analyze'/);
  assert.match(panel, /path: "\/api\/ai\/coach\/analyze"/);
  assert.match(panel, /alias: \/api\/ai\/chat/);
});
