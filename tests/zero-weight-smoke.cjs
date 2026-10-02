const { _electron: electron } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const dir = fs.mkdtempSync(path.join(root, 'build', 'zero-weight-'));
const dataFile = path.join(dir, 'workout_data.json');
const makeExercise = (id, weight) => ({ id, name: `Podciąganie ${id}`, category: 'plecy', sets: 3, reps: 8, weight, rpe: 8, notes: '', history: [] });
fs.writeFileSync(dataFile, JSON.stringify({
  settings: { unit: 'kg', theme: 'dark', autoSave: true, athleteName: 'Zero QA', windowsPath: '', soundFeedback: false, autoBackupEnabled: false },
  weeks: [{ id: 'w', number: 1, name: 'Tydzień 1', startDate: '2026-01-01', days: [{ id: 'd', name: 'Pull', completed: false, exercises: [makeExercise('zero', 0), makeExercise('edit', 10)] }] }],
  bodyWeights: [], protocolEntries: []
}));
const env = { ...process.env, GYMTRACKER_DATA_DIR: dir };
delete env.ELECTRON_RUN_AS_NODE;
let app;
const results = [];
async function launch() {
  app = await electron.launch({ ...(process.env.GYM_SMOKE_EXE ? { executablePath: process.env.GYM_SMOKE_EXE, args: [] } : { args: [path.resolve(__dirname, '..')] }), env });
  const page = await app.firstWindow();
  page.setDefaultTimeout(10000);
  await page.locator('#input-weight-zero').waitFor();
  return page;
}
async function check(name, action) {
  await action();
  results.push(name);
  console.log(`PASS ${name}`);
}
const readExercise = id => JSON.parse(fs.readFileSync(dataFile, 'utf8')).weeks[0].days[0].exercises.find(ex => ex.id === id);
const waitSaved = async (id, predicate) => {
  for (let i = 0; i < 60; i++) {
    if (predicate(readExercise(id))) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Saved values did not match for ${id}`);
};
(async () => {
  try {
    let page = await launch();
    await check('0 kg survives initial card and detailed rows', async () => {
      assert.equal(await page.locator('#input-weight-zero').inputValue(), '0');
      await page.locator('#btn-toggle-tracker-zero').click();
      const rows = page.locator('#exercise-card-zero input[step="0.5"]:not([id])');
      assert.equal(await rows.count(), 3);
      for (const row of await rows.all()) assert.equal(await row.inputValue(), '0');
    });
    await check('quick +/- adjustment returns to 0 kg after save', async () => {
      const card = page.locator('#exercise-card-zero');
      await card.getByRole('button', { name: '+2.5', exact: true }).click();
      assert.equal(await page.locator('#input-weight-zero').inputValue(), '2.5');
      await card.getByRole('button', { name: '-2.5', exact: true }).click();
      await page.locator('#btn-save-performance-zero').click();
      await waitSaved('zero', ex => ex.weight === 0 && ex.history.length > 0);
      assert.equal(await page.locator('#input-weight-zero').inputValue(), '0');
    });
    await check('completed zero-weight set keeps 0 in JSON and history', async () => {
      await page.locator('#exercise-card-zero').getByRole('button', { name: 'S1', exact: true }).click();
      await waitSaved('zero', ex => ex.loggedSets?.[0].completed === true);
      const ex = readExercise('zero');
      assert.equal(ex.weight, 0);
      assert.ok(ex.loggedSets.every(set => set.weight === 0));
      assert.ok(ex.history.every(point => point.weight === 0));
    });
    await check('modal edit to 0 kg updates the mounted card', async () => {
      await page.locator('#btn-edit-edit').click();
      await page.locator('#input-exercise-weight').fill('0');
      await page.locator('#btn-submit-exercise-modal').click();
      await waitSaved('edit', ex => ex.weight === 0);
      assert.equal(await page.locator('#input-weight-edit').inputValue(), '0');
      await page.locator('#btn-toggle-tracker-edit').click();
      for (const row of await page.locator('#exercise-card-edit input[step="0.5"]:not([id])').all()) {
        assert.equal(await row.inputValue(), '0', 'Unlogged rows follow the edited exercise weight');
      }
      await page.locator('#btn-save-performance-edit').click();
      await waitSaved('edit', ex => ex.loggedSets?.every(set => set.weight === 0));
    });
    await check('restart preserves 0 kg and completed set', async () => {
      await app.close();
      app = null;
      page = await launch();
      assert.equal(await page.locator('#input-weight-zero').inputValue(), '0');
      assert.equal(await page.locator('#input-weight-edit').inputValue(), '0');
      assert.equal(readExercise('zero').loggedSets[0].completed, true);
      assert.equal(readExercise('zero').loggedSets[0].weight, 0);
    });
    console.log(JSON.stringify({ passed: results.length, dataDir: dir }));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (app) await app.close();
    fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify({ results, success: !process.exitCode }, null, 2));
  }
})();
