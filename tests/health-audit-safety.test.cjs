const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('health audit UI sends only required inputs and labels offline failure as unavailable', () => {
  const source = read('src/components/AiCoachView.tsx');
  const start = source.indexOf('const handleRunHealthAudit = async');
  const end = source.indexOf('const handleSaveNewMemory', start);
  assert.notEqual(start, -1);
  const handler = source.slice(start, end);
  assert.match(handler, /bloodTests,\s*bodyWeight:/);
  assert.doesNotMatch(handler, /notes:\s*calendarNotes/);
  assert.match(handler, /if \(!response\.ok\) throw/);
  assert.match(handler, /Nie oceniono wyników/);
  assert.doesNotMatch(handler, /wszystkie zarejestrowane parametry są stabilne/i);
});

test('health audit server has no no-AI normal-results fallback and keeps advice non-diagnostic', () => {
  const source = read('server.ts');
  const start = source.indexOf("app.post('/api/ai/coach/audit-health'");
  const end = source.indexOf("app.post('/api/ai/coach/nutrition-plan'", start);
  assert.notEqual(start, -1);
  const route = source.slice(start, end);
  assert.match(route, /status\(503\)\.json\(\{ error: 'ai_unavailable'/);
  assert.match(route, /nie diagnozujesz|nie jest diagnoza/i);
  assert.doesNotMatch(route, /mieszczą się w normach referencyjnych|wszystkie podstawowe wskaźniki/i);
});
