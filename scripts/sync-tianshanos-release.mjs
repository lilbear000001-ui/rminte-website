// Bootstrap/retry the exact same synchronization used by the Worker cron.
// Run from the repository root; --publish uploads to the production R2 bucket.
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { syncRelease } from '../services/tianshanos-ota/src/releases.js';
const publish = process.argv.includes('--publish');
const directory = await mkdtemp(join(tmpdir(), 'tianshanos-sync-'));
const bucket = {
  async get(key) {
    const response = await fetch(`https://downloads.rminte.com/${key}?sync=${Date.now()}`, { cache: 'no-store' });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`R2 metadata read: ${response.status}`);
    return { json: () => response.json() };
  },
  async put(key, value, options) {
    const path = join(directory, key.split('/').at(-1));
    await writeFile(path, typeof value === 'string' ? value : new Uint8Array(value));
    if (!publish) { console.log(`Validated: ${key}`); return; }
    const result = spawnSync('npx', ['--yes', 'wrangler', 'r2', 'object', 'put', `rminte-downloads/${key}`, '--remote', '--file', path, '--content-type', options.httpMetadata.contentType, ...(options.httpMetadata.cacheControl ? ['--cache-control', options.httpMetadata.cacheControl] : [])], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error(`R2 upload failed: ${key}`);
  }
};
try { console.log(JSON.stringify(await syncRelease(bucket))); }
finally { await rm(directory, { recursive: true, force: true }); }
