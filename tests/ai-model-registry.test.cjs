const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const registry = fs.readFileSync('server/ai/models.ts', 'utf8');
const server = fs.readFileSync('server.ts', 'utf8');

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
