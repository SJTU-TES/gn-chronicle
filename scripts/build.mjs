import { mkdir, cp, writeFile, readFile, readdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const site = new URL('site/', root);
// Refuse stale output so a previously generated plaintext page cannot be published.
try {
  if ((await readdir(site)).length) throw new Error('site/ is not empty. Build from a clean checkout or remove that generated directory first.');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const envelope = JSON.parse(await readFile(new URL('assets/archive.enc.json', root), 'utf8'));
if (envelope.version !== 1 || !envelope.data) throw new Error('Encrypted archive missing.');
await mkdir(new URL('chronicle/', site), { recursive: true });
await cp(new URL('src/index.html', root), new URL('index.html', site));
await cp(new URL('src/entry.html', root), new URL('chronicle/index.html', site));
await cp(new URL('assets/', root), new URL('assets/', site), { recursive: true });
await writeFile(new URL('.nojekyll', site), '');
console.log('Static site built.');
