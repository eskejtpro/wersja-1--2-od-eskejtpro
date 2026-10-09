import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientId = process.env.VITE_GOOGLE_WEB_CLIENT_ID?.trim();
const serverUrl = process.env.VITE_GYMTRACKER_SERVER_URL?.trim();
assert.ok(clientId, 'Missing VITE_GOOGLE_WEB_CLIENT_ID. Set the public OAuth Web Client ID for this build.');
assert.ok(serverUrl, 'Missing VITE_GYMTRACKER_SERVER_URL. Set the HTTPS Cloud Run URL for this build.');
assert.match(clientId, /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/, 'VITE_GOOGLE_WEB_CLIENT_ID has an invalid format.');
assert.match(serverUrl, /^https:\/\/[^\s/]+\.run\.app$/, 'VITE_GYMTRACKER_SERVER_URL must be an HTTPS Cloud Run URL.');

const root = fileURLToPath(new URL('../android/app/src/main/assets/public/', import.meta.url));
async function readTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const parts = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) parts.push(...await readTextFiles(path));
    else if (/\.(?:js|html)$/.test(entry.name)) parts.push(await readFile(path, 'utf8'));
  }
  return parts;
}

const bundle = (await readTextFiles(root)).join('\n');
assert.ok(bundle.includes(clientId), 'Android bundle does not contain Google Web Client ID');
assert.ok(bundle.includes(serverUrl), 'Android bundle does not contain Cloud Run URL');
assert.ok(!bundle.includes('WKLEJ_TUTAJ_SKOPIOWANY_ID'), 'Android bundle contains OAuth placeholder');
console.log('Android OAuth bundle configuration: OK');
