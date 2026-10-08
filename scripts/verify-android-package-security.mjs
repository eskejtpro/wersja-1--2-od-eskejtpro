import { execFileSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const sensitivePatterns = [
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['OAuth client secret', /GOCSPX-[0-9A-Za-z_-]{20,}/],
  ['private key block', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['service account credential', /["']type["']\s*:\s*["']service_account["']/],
  ['embedded bearer JWT', /Bearer\s+eyJ[0-9A-Za-z_-]{20,}\.[0-9A-Za-z_-]+\.[0-9A-Za-z_-]+/i],
  ['OpenAI-style secret', /sk-(?:proj-)?[0-9A-Za-z_-]{20,}/],
];

export function detectSensitiveText(content) {
  return sensitivePatterns.filter(([, pattern]) => pattern.test(content)).map(([label]) => label);
}

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}

export async function inspectExtractedApk(root) {
  const findings = [];
  for await (const path of walk(root)) {
    const relativePath = path.slice(root.length + 1).replaceAll('\\', '/');
    const name = basename(path).toLowerCase();
    if (name === 'google-services.json' || name === '.env' || name.startsWith('.env.') || /(?:service[-_]?account|credentials)\.json$/.test(name)) {
      findings.push(`${relativePath}: credential file name`);
    }
    if (!/\.(?:js|html|json|xml|properties|txt|css|map)$/.test(name)) continue;
    const content = await readFile(path, 'utf8');
    for (const label of detectSensitiveText(content)) findings.push(`${relativePath}: ${label}`);
  }
  return findings;
}

async function main() {
  const apkPath = resolve(process.argv[2] || fileURLToPath(new URL('../android/app/build/outputs/apk/debug/app-debug.apk', import.meta.url)));
  const extractionRoot = await mkdtemp(join(tmpdir(), 'planpasika-apk-scan-'));
  try {
    execFileSync('jar', ['xf', apkPath], { cwd: extractionRoot, stdio: 'ignore' });
    const findings = await inspectExtractedApk(extractionRoot);
    if (findings.length > 0) {
      // Do not print matching credential values.
      for (const finding of findings) console.error(finding);
      process.exitCode = 1;
    } else {
      console.log('Android APK credential-pattern scan: OK');
    }
  } finally {
    const actual = await realpath(extractionRoot);
    const temporaryRoot = await realpath(tmpdir());
    if (!actual.startsWith(temporaryRoot + sep) || !basename(actual).startsWith('planpasika-apk-scan-')) {
      throw new Error('Unsafe temporary extraction path; cleanup refused');
    }
    await rm(actual, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
