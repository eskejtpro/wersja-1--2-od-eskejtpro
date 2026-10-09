const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = relative => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');

test('widget Androida deklaruje skróty i przekazuje cel do aplikacji', () => {
  const provider = read('android/app/src/main/java/com/gymtracker/pro/GymTrackerWidgetProvider.java');
  const activity = read('android/app/src/main/java/com/gymtracker/pro/MainActivity.java');
  const app = read('src/App.tsx');
  const manifest = read('android/app/src/main/AndroidManifest.xml');

  for (const destination of ['plan', 'hydration', 'calendar', 'home']) {
    assert.match(provider, new RegExp(`\\\"${destination}\\\"`));
  }
  assert.match(manifest, /GymTrackerWidgetProvider/);
  assert.match(activity, /gymtracker-widget-navigation/);
  assert.match(app, /gymtracker-widget-navigation/);
  assert.match(app, /hydration: 'quick_access'/);
  assert.match(app, /calendar: 'cycles'/);
});
