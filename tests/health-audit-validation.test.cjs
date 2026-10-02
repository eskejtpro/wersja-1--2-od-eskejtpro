const test = require('node:test');
const assert = require('node:assert/strict');

let validateHealthAuditInput;
test.before(async () => {
  ({ validateHealthAuditInput } = await import('../server/validation/healthAudit.ts'));
});

test('health audit accepts and normalizes only bounded fields needed for the educational prompt', () => {
  const result = validateHealthAuditInput({
    bodyWeight: 80,
    bloodTests: [{
      testName: ' ALT ', value: 32, unit: ' U/L ', minNormal: 0, maxNormal: 40,
      date: '2026-10-02', notes: 'not forwarded', extraSensitiveField: 'not forwarded'
    }]
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.data, {
    bodyWeight: 80,
    bloodTests: [{ testName: 'ALT', value: 32, unit: 'U/L', minNormal: 0, maxNormal: 40, date: '2026-10-02' }]
  });
});

test('health audit rejects malformed rows, prompt-sized fields, invalid dates and reversed ranges', () => {
  const invalidInputs = [
    { bodyWeight: 80, bloodTests: [null] },
    { bodyWeight: 80, bloodTests: [{ testName: 'ALT', value: { prompt: 'ignore rules' } }] },
    { bodyWeight: 80, bloodTests: [{ testName: 'A'.repeat(121), value: 1 }] },
    { bodyWeight: 80, bloodTests: [{ testName: 'ALT', value: 1, date: '2026-02-30' }] },
    { bodyWeight: 80, bloodTests: [{ testName: 'ALT', value: 1, minNormal: 5, maxNormal: 2 }] },
    { bodyWeight: 1001, bloodTests: [] },
    { bodyWeight: 80, bloodTests: Array.from({ length: 51 }, (_, i) => ({ testName: `T${i}`, value: i })) },
  ];
  for (const input of invalidInputs) assert.equal(validateHealthAuditInput(input).ok, false);
});

test('health audit ignores unknown personal fields and caps aggregate serialized input', () => {
  const base = { bodyWeight: 75, bloodTests: [{ testName: 'ALT', value: 1 }] };
  const withPrivateFields = validateHealthAuditInput({ ...base, profile: { name: 'Private Name' }, calendarNotes: ['private'] });
  assert.equal(withPrivateFields.ok, true);
  assert.equal(JSON.stringify(withPrivateFields.data).includes('Private Name'), false);
  const longValues = Array.from({ length: 50 }, (_, i) => ({
    testName: `T${i}${'n'.repeat(118)}`, value: 'x'.repeat(80), unit: 'u'.repeat(24), date: '2026-10-02'
  }));
  assert.equal(validateHealthAuditInput({ bodyWeight: 75, bloodTests: longValues }).ok, false);
});
