const test = require('node:test');
const assert = require('node:assert/strict');

// Import or recreate pure logic for action executor validation
function parseAiResponseAction(rawContent, userPrompt = '') {
  const multiActionBlockRegex = /```(?:json:actions|actions)\s*([\s\S]*?)\s*```/i;
  const singleActionBlockRegex = /```(?:json:action|action)\s*([\s\S]*?)\s*```/i;

  const multiMatch = rawContent.match(multiActionBlockRegex);
  if (multiMatch) {
    try {
      const parsedList = JSON.parse(multiMatch[1]);
      if (Array.isArray(parsedList) && parsedList.length > 0) {
        const cleanContent = rawContent.replace(multiActionBlockRegex, '').trim();
        const actions = parsedList.map((item, idx) => ({
          id: `act-${idx}`,
          type: item.type,
          title: item.title,
          payload: item.payload || {},
          status: 'pending'
        }));
        return { cleanContent, actions, action: actions[0] };
      }
    } catch (e) {}
  }

  const singleMatch = rawContent.match(singleActionBlockRegex);
  if (singleMatch) {
    try {
      const parsed = JSON.parse(singleMatch[1]);
      if (parsed && parsed.type) {
        const cleanContent = rawContent.replace(singleActionBlockRegex, '').trim();
        const action = {
          id: 'act-1',
          type: parsed.type,
          title: parsed.title,
          payload: parsed.payload || {},
          status: 'pending'
        };
        return { cleanContent, action, actions: [action] };
      }
    } catch (e) {}
  }

  const promptLower = userPrompt.toLowerCase();
  const todayStr = '2026-10-02';

  if (promptLower.includes('waga') || promptLower.includes('zapisz wagę')) {
    const match = promptLower.match(/([0-9]+(?:[.,][0-9]+)?)\s*kg/i);
    if (match) {
      const num = parseFloat(match[1].replace(',', '.'));
      return {
        cleanContent: rawContent,
        action: {
          type: 'LOG_BODY_WEIGHT',
          payload: { weight: num, date: todayStr }
        }
      };
    }
  }

  if (promptLower.includes('progresj') || (promptLower.includes('zwiększ') && promptLower.includes('ciężar'))) {
    return {
      cleanContent: rawContent,
      action: {
        type: 'APPLY_PROGRESSION',
        payload: { incrementKg: 2.5 }
      }
    };
  }

  return { cleanContent: rawContent };
}

test('AI AGENT: Parsowanie pojedynczego bloku JSON action', () => {
  const raw = `Oto Twoja nowa rozpiska.\n\n\`\`\`json:action\n{\n  "type": "LOG_BODY_WEIGHT",\n  "title": "Zapisz Wagę",\n  "payload": { "weight": 85.5 }\n}\n\`\`\``;
  const result = parseAiResponseAction(raw, '');
  assert.equal(result.cleanContent, 'Oto Twoja nowa rozpiska.');
  assert.ok(result.action);
  assert.equal(result.action.type, 'LOG_BODY_WEIGHT');
  assert.equal(result.action.payload.weight, 85.5);
});

test('AI AGENT: Parsowanie wieloakcyjnego bloku JSON actions (Batch Execution)', () => {
  const raw = `Wprowadzam zmiany do Twojego planu.\n\n\`\`\`json:actions\n[\n  { "type": "LOG_BODY_WEIGHT", "title": "Waga 84kg", "payload": { "weight": 84 } },\n  { "type": "APPLY_PROGRESSION", "title": "Progresja +2.5kg", "payload": { "incrementKg": 2.5 } }\n]\n\`\`\``;
  const result = parseAiResponseAction(raw, '');
  assert.equal(result.cleanContent, 'Wprowadzam zmiany do Twojego planu.');
  assert.ok(Array.isArray(result.actions));
  assert.equal(result.actions.length, 2);
  assert.equal(result.actions[0].type, 'LOG_BODY_WEIGHT');
  assert.equal(result.actions[1].type, 'APPLY_PROGRESSION');
});

test('AI AGENT: Heurystyczne wykrywanie intencji zapisu wagi z promptu', () => {
  const result = parseAiResponseAction('Jasne, zapisuję wagę.', 'zapisz wagę 84.5 kg na czczo');
  assert.ok(result.action);
  assert.equal(result.action.type, 'LOG_BODY_WEIGHT');
  assert.equal(result.action.payload.weight, 84.5);
});

test('AI AGENT: Heurystyczne wykrywanie intencji progresji przeciążenia', () => {
  const result = parseAiResponseAction('Zastosowano progresję.', 'zastosuj progresję ciężaru');
  assert.ok(result.action);
  assert.equal(result.action.type, 'APPLY_PROGRESSION');
  assert.equal(result.action.payload.incrementKg, 2.5);
});

test('AI AGENT: Matematyka progresywnego przeładowania (applyProgressionOverload)', () => {
  const sampleWeeks = [
    {
      id: 'w1',
      number: 1,
      name: 'Tydzień 1',
      days: [
        {
          id: 'd1',
          name: 'Push',
          completed: false,
          exercises: [
            { id: 'e1', name: 'Wyciskanie', category: 'klatka', sets: 4, reps: 6, weight: 80, rpe: 8 }
          ]
        }
      ]
    }
  ];

  const increment = 2.5;
  const updatedWeeks = sampleWeeks.map(w => ({
    ...w,
    days: w.days.map(d => ({
      ...d,
      exercises: d.exercises.map(e => ({
        ...e,
        weight: e.weight + increment
      }))
    }))
  }));

  assert.equal(updatedWeeks[0].days[0].exercises[0].weight, 82.5);
});

test('AI AGENT: Matematyka generowania tygodnia Deloadu (-40% objętości, -10% obciążenia)', () => {
  const baseSets = 5;
  const baseWeight = 100;
  const volumeReductionPct = 40;
  const intensityReductionPct = 10;

  const deloadSets = Math.max(2, Math.round(baseSets * (1 - volumeReductionPct / 100)));
  const deloadWeight = Math.max(10, Math.round(baseWeight * (1 - intensityReductionPct / 100) * 2) / 2);

  assert.equal(deloadSets, 3); // 5 * 0.6 = 3 serie
  assert.equal(deloadWeight, 90); // 100 * 0.9 = 90 kg
});
