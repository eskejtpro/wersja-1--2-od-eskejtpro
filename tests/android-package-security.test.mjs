import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { detectSensitiveText, inspectExtractedApk } from '../scripts/verify-android-package-security.mjs';

test('public OAuth ID and Cloud Run URL are not secrets', () => {
  assert.deepEqual(detectSensitiveText('761415655121-example.apps.googleusercontent.com https://example.run.app'), []);
});

test('credential patterns are detected without returning their values', () => {
  const labels = detectSensitiveText('AIza' + 'a'.repeat(35) + ' -----BEGIN PRIVATE KEY-----');
  assert.deepEqual(labels, ['Google API key', 'private key block']);
});

test('APK file scan flags packaged credential files without logging their contents', async () => {
  const root = await mkdtemp(join(tmpdir(), 'planpasika-security-test-'));
  try {
    await mkdir(join(root, 'assets'));
    await writeFile(join(root, 'assets', 'service-account.json'), '{"type":"service_account"}');
    const findings = await inspectExtractedApk(root);
    assert.ok(findings.some((finding) => finding.includes('credential file name')));
    assert.ok(findings.some((finding) => finding.includes('service account credential')));
    assert.ok(findings.every((finding) => !finding.includes('"type"')));
  } finally {
    await unlink(join(root, 'assets', 'service-account.json'));
    await rmdir(join(root, 'assets'));
    await rmdir(root);
  }
});
