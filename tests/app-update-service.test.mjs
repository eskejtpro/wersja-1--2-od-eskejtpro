import test from 'node:test';
import assert from 'node:assert/strict';
import { AppUpdateService } from '../src/utils/appUpdateService.ts';

const update = {
  version: '9.9.9', currentVersion: '3.0.4', releaseDate: '2026-10-02', title: 'test', releaseNotes: [],
  downloadUrl: 'https://example.invalid/app.apk', fileSizeBytes: 20, sha256Checksum: 'a'.repeat(64),
  isMandatory: false, packageType: 'full_dist', author: 'test'
};

test('update check reports an unconfigured server instead of inventing a release', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ status: 'unavailable_not_configured', updateAvailable: false }), { status: 200 });
  t.after(() => { globalThis.fetch = originalFetch; });

  const result = await AppUpdateService.checkForUpdates('https://api.example.invalid');
  assert.equal(result.updateAvailable, false);
  assert.match(result.message, /nie ma skonfigurowanego katalogu/i);
});

test('update check reports network and HTTP failures as unavailable', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  assert.equal((await AppUpdateService.checkForUpdates()).updateAvailable, false);
  globalThis.fetch = async () => { throw new Error('offline'); };
  assert.match((await AppUpdateService.checkForUpdates()).message, /Nie można połączyć/);
  t.after(() => { globalThis.fetch = originalFetch; });
});

test('download, checksum, install, and rollback cannot report simulated success', async () => {
  assert.equal(await AppUpdateService.downloadUpdatePackage(update, () => assert.fail('no fake progress')), false);
  assert.equal(await AppUpdateService.verifyChecksum(update), false);
  assert.equal((await AppUpdateService.applyUpdate(update)).success, false);
  assert.equal((await AppUpdateService.rollbackVersion()).success, false);
});

test('update history starts empty instead of recording an invented installed release', () => {
  globalThis.localStorage = { getItem: () => null };
  assert.deepEqual(AppUpdateService.getUpdateHistory(), []);
  delete globalThis.localStorage;
});
