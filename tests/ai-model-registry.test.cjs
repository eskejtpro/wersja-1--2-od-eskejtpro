const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const registry = fs.readFileSync('server/ai/models.ts', 'utf8');
const server = fs.readFileSync('server.ts', 'utf8');
const aiCoach = fs.readFileSync('src/components/AiCoachView.tsx', 'utf8');
const quickDashboard = fs.readFileSync('src/components/QuickAccessDashboard.tsx', 'utf8');

test('every server-side Gemini model belongs to the central registry', () => {
  const registered = [...registry.matchAll(/:\s*'([^']+)'/g)].map((match) => match[1]);
  const used = [...server.matchAll(/model:\s*'([^']+)'/g)].map((match) => match[1]).filter((model) => model.startsWith('gemini-'));
  assert.ok(registered.length >= 7, 'registry should explicitly define the production AI model set');
  assert.deepEqual(used, [], `move direct model literals to registry: ${used.join(', ')}`);
});

test('all eight AI capabilities are represented in the central registry', () => {
  for (const key of ['coachChat', 'generatePlan', 'healthAudit', 'nutritionPlan', 'swapExercise', 'tts', 'parseCommand', 'analyze']) {
    assert.match(registry, new RegExp(`\\b${key}:`));
  }
});

test('AI clients do not override the server model or advertise an unverified default', () => {
  assert.doesNotMatch(aiCoach, /model:\s*'gemini-/);
  assert.doesNotMatch(quickDashboard, /model:\s*'gemini-/);
  assert.match(aiCoach, /model:\s*data\.model\s*\|\|\s*'unknown'/);
  assert.match(quickDashboard, /useState<string>\('unknown'\)/);
});
