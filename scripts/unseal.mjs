import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { openBundle } from '../assets/vault.mjs';
const root = new URL('../', import.meta.url);
const password = process.env.CHRONICLE_PASSWORD;
if (!password) throw new Error('Set CHRONICLE_PASSWORD in this process before unsealing.');
const envelope = JSON.parse(await readFile(new URL('assets/archive.enc.json', root), 'utf8'));
const bundle = await openBundle(envelope, password);
const directory = new URL('.private/', root);
try { await access(directory); throw new Error('Local source directory already exists; do not overwrite it.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(directory);
await writeFile(new URL('chronicle.json', directory), JSON.stringify(bundle.source.data, null, 2) + '\n');
await writeFile(new URL('chronicle-template.html', directory), bundle.source.template);
console.log('Local editable sources restored into the ignored directory.');
