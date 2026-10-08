const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repositoryRoot = path.resolve(__dirname, '..');
const userFacingFiles = [
  'src/components/AiCoachView.tsx',
  'src/components/AndroidMoreBottomSheet.tsx',
  'src/components/QuickAccessDashboard.tsx',
  'src/data/initialData.ts',
].map((file) => fs.readFileSync(path.join(repositoryRoot, file), 'utf8'));

test('UI does not claim a Gemini model unless that model is reported by the server', () => {
  const visibleSource = userFacingFiles.join('\n');
  assert.doesNotMatch(visibleSource, /gemini-3\.8-flash|Gemini\s+3\.8\s+(?:Flash|Pro)/i);
  assert.match(visibleSource, /msg\.model &&/);
});
