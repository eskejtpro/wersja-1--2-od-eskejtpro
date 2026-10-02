const { _electron: electron } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
const dataDir = fs.mkdtempSync(path.join(root, 'build', 'circumference-smoke-'));
const dataFile = path.join(dataDir, 'workout_data.json');
const exportFile = path.join(dataDir, 'circumferences-export.json');
const env = { ...process.env, GYMTRACKER_DATA_DIR: dataDir };
delete env.ELECTRON_RUN_AS_NODE;
const read = () => JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForSaved(predicate) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (fs.existsSync(dataFile) && predicate(read())) return;
    await wait(100);
  }
  throw new Error('Circumference persistence timed out');
}

(async () => {
  let app;
  try {
    app = await electron.launch({ args: [path.resolve(__dirname, '..')], env, timeout: 60000 });
    let page = await app.firstWindow();
    page.setDefaultTimeout(15000);
    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('#sidebar-nav-weight').click();
    await page.locator('#view-body-weight').waitFor();

    async function add(date, side, value, notes = '') {
      await page.locator('#input-circ-date').fill(date);
      await page.locator('#select-circ-body-part').selectOption('udo');
      await page.locator('#select-circ-side').selectOption(side);
      await page.locator('#input-circ-value').fill(value);
      await page.locator('#input-circ-notes').fill(notes);
      await page.locator('#btn-submit-circumference').click();
    }

    await add('2026-09-15', 'left', '35,7', 'po treningu');
    await waitForSaved((data) => data.circumferences?.length === 1 && data.circumferences[0].millimeters === 357);
    await add('2026-09-01', 'left', '35,0');
    await add('2026-09-10', 'right', '36.0');
    await waitForSaved((data) => data.circumferences?.length === 3);

    const saved = read();
    assert.deepEqual(saved.circumferences.map((item) => item.millimeters).sort((a, b) => a - b), [350, 357, 360]);
    assert.equal(saved.circumferences.filter((item) => item.side === 'left').length, 2);
    assert.equal(saved.circumferences.filter((item) => item.side === 'right').length, 1);
    await page.locator('#select-circ-series').selectOption('udo|left|standard');
    assert.match(await page.locator('#circumference-series-summary').innerText(), /\+0[,.]7 cm.*\+2%/);

    const leftLatest = saved.circumferences.find((item) => item.millimeters === 357);
    await page.locator('#btn-edit-circumference-' + leftLatest.id).click();
    await page.locator('#input-circ-value').fill('35,8');
    await page.locator('#btn-submit-circumference').click();
    await waitForSaved((data) => data.circumferences?.some((item) => item.id === leftLatest.id && item.millimeters === 358));

    await app.evaluate(({ BrowserWindow, exportFile }) => {
      const session = BrowserWindow.getAllWindows()[0].webContents.session;
      session.removeAllListeners('will-download');
      session.once('will-download', (_event, item) => item.setSavePath(exportFile));
    }, { exportFile });
  await page.locator('#btn-header-export-json').click();
    for (let attempt = 0; attempt < 80 && !fs.existsSync(exportFile); attempt += 1) await wait(100);
    assert.equal(JSON.parse(fs.readFileSync(exportFile, 'utf8')).circumferences.length, 3);

    await app.close();
    app = await electron.launch({ args: [path.resolve(__dirname, '..')], env, timeout: 60000 });
    page = await app.firstWindow();
    await page.locator('#sidebar-nav-weight').click();
    await page.locator('#view-body-weight').waitFor();
    assert.equal(await page.locator('[id^="btn-delete-circumference-"]').count(), 3);

    await page.locator('input[type=file]').first().setInputFiles(exportFile);
    await waitForSaved((data) => data.circumferences?.length === 3);
    await page.locator('#btn-delete-circumference-' + leftLatest.id).click();
    await waitForSaved((data) => data.circumferences?.length === 2);

    console.log(JSON.stringify({ status: 'PASS', dataDir }));
  } finally {
    if (app) await app.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
