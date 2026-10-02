const { _electron: electron } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const dir = path.resolve(__dirname, '../..', 'build', 'analysis-logic-smoke');
fs.mkdirSync(dir, { recursive: true });
const exercise = (id, name, category, weight, history = []) => ({
  id, name, category, sets: 3, reps: 10, weight, rpe: 8, notes: '', history
});
const data = {
  settings: {
    unit: 'kg', theme: 'dark', autoSave: true, athleteName: 'Test', windowsPath: '', soundFeedback: true,
    autoBackupEnabled: false, analysisOnlyCompleted: true, analysisIncludePartialHistory: true
  },
  weeks: [
    {
      id: 'w1', number: 1, name: 'Tydzień 1', startDate: '2026-09-01', days: [
        { id: 'd1', name: 'Push', completed: true, exercises: [exercise('push-1', 'Wyciskanie sztangi', 'klatka', 80, [{ date: '2026-08-25', weight: 75, reps: 10, sets: 3 }, { date: '2026-09-01', weight: 80, reps: 10, sets: 3 }])] },
        { id: 'd2', name: 'Legs', completed: false, exercises: [exercise('legs', 'Przysiady', 'nogi', 100, [{ date: '2026-08-20', weight: 90, reps: 10, sets: 3 }, { date: '2026-09-03', weight: 100, reps: 10, sets: 3 }])] }
      ]
    },
    {
      id: 'w2', number: 2, name: 'Tydzień 2', startDate: '2026-09-08', days: [
        { id: 'd3', name: 'Push 2', completed: true, exercises: [exercise('push-2', 'Wyciskanie sztangi', 'klatka', 82.5, [{ date: '2026-09-01', weight: 80, reps: 10, sets: 3 }, { date: '2026-09-08', weight: 82.5, reps: 10, sets: 3 }])] }
      ]
    }
  ],
  bodyWeights: [], protocolEntries: []
};
fs.writeFileSync(path.join(dir, 'workout_data.json'), JSON.stringify(data));

(async () => {
  const target = process.env.GYM_SMOKE_EXE;
  const launchOptions = target ? { executablePath: target, args: [] } : { args: [path.resolve(__dirname, '..')] };
  const app = await electron.launch({ ...launchOptions, env: { ...process.env, GYMTRACKER_DATA_DIR: dir } });
  try {
    const page = await app.firstWindow();
    await page.locator('#sidebar-nav-muscle').click();
    await page.locator('#muscle-progress-view').waitFor();
    assert.equal(await page.locator('#analysis-muscle-frequency').count(), 1);
    assert.match(await page.locator('[data-frequency-category="klatka"]').innerText(), /2 sesji/);
    assert.equal(await page.locator('[data-frequency-category="nogi"]').count(), 0);
    assert.equal(await page.locator('#chart2-group-nogi').count(), 0);
    assert.equal(await page.locator('#card-group-nogi').count(), 0);
    assert.match(await page.locator('#analysis-execution-summary').innerText(), /Wykonane dni:\s*2/);
    await page.locator('#sidebar-nav-stats').click();
    await page.locator('#view-stats').waitFor();
    assert.equal(await page.locator('#mesocycle-execution-summary').count(), 1);
    assert.match(await page.locator('#mesocycle-execution-summary').innerText(), /Ćwiczenia:\s*2/);
    assert.equal(await page.locator('#analysis-week-comparison').count(), 1);
    assert.deepEqual(await page.locator('#select-comparison-week-a option').allTextContents(), ['Tydzień 1', 'Tydzień 2']);
    const comparisonRow = page.locator('[data-exercise-name="Wyciskanie sztangi"]');
    assert.equal(await comparisonRow.count(), 1);
    assert.match(await comparisonRow.innerText(), /2400.*2475.*\+75/);
    assert.match(await page.locator('#weekly-tonnage-week-1').innerText(), /2400/);
    assert.match(await page.locator('#weekly-tonnage-week-2').innerText(), /2475/);
    assert.equal(await page.locator('#analysis-weekly-metrics').count(), 1);
    assert.match(await page.locator('[data-week-metrics="1"]').innerText(), /1\/2.*1.*3.*30.*2400/);
    assert.match(await page.locator('[data-week-metrics="2"]').innerText(), /1\/1.*1.*3.*30.*2475/);
    assert.equal(await page.locator('#analysis-regularity').count(), 1);
    assert.match(await page.locator('[data-regularity-week="1"]').innerText(), /50/);
    assert.match(await page.locator('[data-regularity-week="2"]').innerText(), /100/);
    assert.equal(await page.locator('#analysis-monthly-comparison').count(), 1);
    assert.match(await page.locator('[data-month="2026-09"]').innerText(), /2026-09.*2.*6.*60.*4875/);
    assert.equal(await page.locator('#analysis-period-comparison').count(), 1);
    assert.match(await page.locator('[data-period="first"]').innerText(), /Okres A.*1.*1\/2.*1.*3.*30.*2400/);
    assert.match(await page.locator('[data-period="second"]').innerText(), /Okres B.*2.*1\/1.*1.*3.*30.*2475/);
    assert.match(await page.locator('#period-comparison-delta').innerText(), /\+75/);
    await page.locator('#tab-btn-exercises-1rm').click();
    assert.equal(await page.locator('#progression-status').count(), 1);
    assert.match(await page.locator('#progression-status').innerText(), /progres/);
    await page.locator('#sidebar-nav-settings').click();
    await page.locator('#view-settings').waitFor();
    const tonnageSetting = page.locator('#chk-analysis-weekly-tonnage');
    assert.equal(await tonnageSetting.isChecked(), true);
    await tonnageSetting.uncheck();
    await page.locator('#sidebar-nav-stats').click();
    await page.locator('#view-stats').waitFor();
    assert.equal(await page.locator('#analysis-weekly-tonnage').count(), 0);
    await page.locator('#sidebar-nav-settings').click();
    await page.locator('#view-settings').waitFor();
    await page.locator('#chk-analysis-weekly-tonnage').check();
    const metricsSetting = page.locator('#chk-analysis-weekly-metrics');
    assert.equal(await metricsSetting.isChecked(), true);
    await metricsSetting.uncheck();
    await page.locator('#sidebar-nav-stats').click();
    await page.locator('#view-stats').waitFor();
    assert.equal(await page.locator('#analysis-weekly-metrics').count(), 0);
    await page.locator('#sidebar-nav-settings').click();
    await page.locator('#view-settings').waitFor();
    await page.locator('#chk-analysis-weekly-metrics').check();
    const regularitySetting = page.locator('#chk-analysis-regularity');
    assert.equal(await regularitySetting.isChecked(), true);
    await regularitySetting.uncheck();
    await page.locator('#sidebar-nav-stats').click();
    await page.locator('#view-stats').waitFor();
    assert.equal(await page.locator('#analysis-regularity').count(), 0);
    await page.locator('#sidebar-nav-settings').click();
    await page.locator('#view-settings').waitFor();
    await regularitySetting.check();
    await page.locator('#input-analysis-regularity-target').fill('75');
    const frequencySetting = page.locator('#chk-analysis-muscle-frequency');
    assert.equal(await frequencySetting.isChecked(), true);
    await frequencySetting.uncheck();
    await page.locator('#sidebar-nav-muscle').click();
    await page.locator('#muscle-progress-view').waitFor();
    assert.equal(await page.locator('#analysis-muscle-frequency').count(), 0);
    await page.locator('#sidebar-nav-settings').click();
    await page.locator('#view-settings').waitFor();
    await frequencySetting.check();
    const monthlySetting = page.locator('#chk-analysis-monthly-comparison');
    assert.equal(await monthlySetting.isChecked(), true);
    await monthlySetting.uncheck();
    await page.locator('#sidebar-nav-stats').click();
    await page.locator('#view-stats').waitFor();
    assert.equal(await page.locator('#analysis-monthly-comparison').count(), 0);
    await page.locator('#sidebar-nav-settings').click();
    await page.locator('#view-settings').waitFor();
    await monthlySetting.check();
    await page.locator('#select-analysis-monthly-metric').selectOption('executedSets');
    const periodSetting = page.locator('#chk-analysis-period-comparison');
    assert.equal(await periodSetting.isChecked(), true);
    await periodSetting.uncheck();
    await page.locator('#sidebar-nav-stats').click();
    await page.locator('#view-stats').waitFor();
    assert.equal(await page.locator('#analysis-period-comparison').count(), 0);
    await page.locator('#sidebar-nav-settings').click();
    await page.locator('#view-settings').waitFor();
    await periodSetting.check();
    await page.locator('#select-analysis-period-metric').selectOption('executedSets');
    await page.locator('#sidebar-nav-settings').click();
    await page.locator('#view-settings').waitFor();
    const comparisonSetting = page.locator('#chk-analysis-week-comparison');
    assert.equal(await comparisonSetting.isChecked(), true);
    await comparisonSetting.uncheck();
    await page.locator('#sidebar-nav-stats').click();
    await page.locator('#view-stats').waitFor();
    assert.equal(await page.locator('#analysis-week-comparison').count(), 0);
    await page.locator('#sidebar-nav-settings').click();
    await page.locator('#view-settings').waitFor();
    await page.locator('#chk-analysis-week-comparison').check();
    await page.locator('#sidebar-nav-stats').click();
    await page.locator('#view-stats').waitFor();
    const v23SettingIds = [
      '#chk-analysis-weekly-metrics', '#chk-analysis-executed-days', '#chk-analysis-executed-exercises',
      '#chk-analysis-executed-sets', '#chk-analysis-executed-reps', '#chk-analysis-volume-delta',
      '#chk-analysis-data-confidence', '#chk-analysis-best-e1rm', '#chk-analysis-latest-result', '#chk-analysis-trend-line'
    ];
    await page.locator('#sidebar-nav-settings').click();
    await page.locator('#view-settings').waitFor();
    for (const id of v23SettingIds) {
      const checkbox = page.locator(id);
      assert.equal(await checkbox.isChecked(), true);
      await checkbox.uncheck();
      assert.equal(await checkbox.isChecked(), false);
      await checkbox.check();
    }
    await page.locator('#sidebar-nav-stats').click();
    await page.locator('#view-stats').waitFor();
    await page.locator('#tab-btn-exercises-1rm').click();
    assert.deepEqual(await page.locator('#select-stats-exercise option').allTextContents(), ['Wyciskanie sztangi']);
    assert.equal(await page.locator('#exercise-analysis-signals').count(), 1);
    assert.equal(await page.getByText('PR', { exact: true }).count(), 2);
    assert.match(await page.locator('#stagnation-status').innerText(), /brak wystarczających danych/);
    await page.locator('#sidebar-nav-settings').click();
    await page.locator('#view-settings').waitFor();
    const prMarkers = page.locator('#chk-analysis-pr-markers');
    assert.equal(await prMarkers.isChecked(), true);
    await prMarkers.uncheck();
    await page.locator('#sidebar-nav-stats').click();
    await page.locator('#view-stats').waitFor();
    await page.locator('#tab-btn-exercises-1rm').click();
    assert.equal(await page.getByText('PR', { exact: true }).count(), 0);
    await page.locator('#sidebar-nav-settings').click();
    await page.locator('#view-settings').waitFor();
    await prMarkers.check();
    await page.locator('#select-analysis-pr-metric').selectOption('weight');
    await page.locator('#input-analysis-stagnation-window').fill('3');
    await page.locator('#input-analysis-stagnation-min').fill('2');
    console.log('PASS v2.8 period comparison, monthly comparison, muscle frequency and scoped analysis');
  } finally {
    await app.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
