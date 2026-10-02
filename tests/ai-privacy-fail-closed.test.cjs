const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('ordinary AI chat sends only bounded training context, not stored health, calendar, identity, or memory data', () => {
  const coach = source('src/components/AiCoachView.tsx');
  const builder = coach.slice(coach.indexOf('const buildAthleteContext'), coach.indexOf('// Autonomous Single Action Executor'));
  assert.doesNotMatch(builder, /bloodTests|calendarNotes|agentMemories|profile\?\.name|latestWeight|weightTrendEMA/);
  assert.match(builder, /recentExercises: recentExercises\.slice\(0, 12\)/);
  assert.match(coach, /history: newMessagesList\.slice\(-9, -1\)/);
});

test('AI chat transport failure is presented as unavailable, without invented advice or actions', () => {
  const coach = source('src/components/AiCoachView.tsx');
  const failure = coach.slice(coach.indexOf("console.error('Chat service unavailable:"), coach.indexOf('} finally {', coach.indexOf("console.error('Chat service unavailable:")));
  assert.match(failure, /Nie otrzymano odpowiedzi/);
  assert.match(failure, /model: 'unavailable'/);
  assert.doesNotMatch(failure, /parseAiResponseAction|action,|actions,|bezpiecznie synchronizowane|Przetworzyłem Twoje polecenie/);
});

test('Quick Access rejects empty/failed AI responses instead of displaying canned text as Gemini output', () => {
  const dashboard = source('src/components/QuickAccessDashboard.tsx');
  const handler = dashboard.slice(dashboard.indexOf('const handleAskAiCoach'), dashboard.indexOf('// WIDGET CONFIGURATION ACTIONS'));
  assert.match(handler, /if \(!response\.ok\) throw/);
  assert.match(handler, /typeof json\.reply !== 'string'/);
  assert.match(handler, /setAiModelUsed\('unavailable'\)/);
  assert.match(handler, /Nie wygenerowano zastępczej analizy/);
  assert.doesNotMatch(handler, /Wskazówka Gemini:|Zalecenie: Utrzymuj/);
});

test('AI Coach server exceptions fail with 503 instead of returning generic text as a successful answer', () => {
  const server = source('server.ts');
  const failure = server.slice(server.indexOf("console.error('[server] AI Coach service failed:"), server.indexOf("\n  });", server.indexOf("console.error('[server] AI Coach service failed:")));
  assert.match(failure, /res\.status\(503\)\.json\(\{ error: 'ai_unavailable'/);
  assert.doesNotMatch(failure, /fallbackReply|offline_emergency_fallback|Dane sesji zostały bezpiecznie zachowane/);
});
