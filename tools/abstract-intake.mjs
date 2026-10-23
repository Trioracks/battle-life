import { constants } from 'node:fs';
import { lstat, readdir, readFile, mkdir, open, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const batch = 'abstract-20261020-v1';
const families = new Map([['Track 01', 9], ['Track 02', 11], ['Track 03', 7], ['Track 04', 20]]);
const danielTracks = new Set([2,3,8,9,10,11,12,13,15,16,17,19,20,21,22,25,26,27,29,31,33,34,35,37,39,41,42,43,45,47,48,51,52]);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const samePath = (a, b) => a.toLowerCase() === b.toLowerCase();
const numeric = (a, b) => a.localeCompare(b, 'en', { numeric: true });

function absolute(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || !samePath(path.resolve(value), value)) throw new Error(`Noncanonical absolute path: ${value}`);
  return path.resolve(value);
}
function inside(file, root) {
  const relative = path.relative(root, file);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}
async function noLinks(file) {
  for (let current = absolute(file); ; current = path.dirname(current)) {
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error(`Link/reparse point rejected: ${current}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (current === path.dirname(current)) break;
  }
}
function roots(input) {
  const result = Object.fromEntries(['abstractRoot', 'experimentalRoot', 'libraryRoot'].map(key => [key, absolute(input[key])]));
  const values = Object.values(result);
  for (let i = 0; i < values.length; i++) for (let j = i + 1; j < values.length; j++) {
    if (samePath(values[i], values[j]) || inside(values[i], values[j]) || inside(values[j], values[i])) throw new Error('Intake roots must be disjoint');
  }
  return result;
}

function classify(source, r) {
  const relative = path.relative(r.abstractRoot, source).split(path.sep);
  if (relative.length === 2 && families.has(relative[0])) {
    const match = /^(bass|drum|drumm|lead) ([1-9]\d*)\.mp3$/i.exec(relative[1]);
    if (match && Number(match[2]) <= families.get(relative[0])) {
      const role = match[1].toLowerCase().startsWith('drum') ? 'drums' : match[1].toLowerCase();
      // Only Track 03 uses drumm; unexpected aliases cannot silently replace approved files.
      if (role === 'drums' && match[1].toLowerCase() !== (relative[0] === 'Track 03' ? 'drumm' : 'drum')) return null;
      return { role, family: relative[0], index: Number(match[2]), destination: path.join(r.libraryRoot, 'instruments', batch, relative[0].toLowerCase().replace(' ', '-'), role, relative[1]) };
    }
  }
  if (relative.length === 2 && ['Даня Войс', 'Капа Войс'].includes(relative[0])) {
    const daniel = relative[0] === 'Даня Войс';
    const match = (daniel ? /^Даниил - (REC(?:_([1-9]\d*))?|Track ([1-9]\d*))\.wav$/ : /^Капа - (REC(?:_([1-9]\d*))?|Track ([1-9]\d*))\.wav$/).exec(relative[1]);
    if (match) {
      const recIndex = match[2] === undefined ? 1 : Number(match[2]);
      const approved = match[3] ? daniel ? danielTracks.has(Number(match[3])) : match[3] === '1' : recIndex <= (daniel ? 18 : 49) && (!match[2] || recIndex >= 2);
      if (approved) return { role: daniel ? 'voice-danya' : 'voice-kapa', family: null, index: null, destination: path.join(r.libraryRoot, 'voices', daniel ? 'danya' : 'kapa', batch, relative[1]) };
    }
  }
  if (samePath(path.dirname(source), r.experimentalRoot)) {
    const match = /^lead ([1-9]\d*)\.mp3$/i.exec(path.basename(source));
    if (match && Number(match[1]) <= 13) return { role: 'lead', family: 'experimental', index: Number(match[1]), destination: path.join(r.libraryRoot, 'instruments', batch, 'experimental', 'lead', path.basename(source)) };
  }
  return null;
}
async function inventory(root) {
  await noLinks(root);
  if (!(await lstat(root)).isDirectory()) throw new Error(`Expected source directory: ${root}`);
  const files = [];
  for (const entry of (await readdir(root, { withFileTypes: true })).sort((a,b) => numeric(a.name,b.name))) {
    const file = path.join(root, entry.name);
    await noLinks(file);
    if (entry.isDirectory()) files.push(...await inventory(file));
    else if (entry.isFile()) files.push(file);
    else throw new Error(`Unsupported source entry: ${file}`);
  }
  return files;
}
async function fingerprint(file) {
  await noLinks(file);
  const item = await lstat(file);
  if (!item.isFile()) throw new Error(`Expected regular file: ${file}`);
  const bytes = await readFile(file);
  return { bytes: bytes.length, sha256: hash(bytes) };
}

function validateManifest(manifest) {
  if (manifest.version !== 1 || manifest.batch !== batch || !Array.isArray(manifest.sources) || !Array.isArray(manifest.excluded)) throw new Error('Invalid intake manifest');
  const r = roots(manifest);
  const sources = new Set(), destinations = new Set(), triples = new Set();
  const counts = { abstract: 0, experimental: 0, 'voice-danya': 0, 'voice-kapa': 0 };
  for (const row of manifest.sources) {
    absolute(row.source); absolute(row.destination);
    const expected = classify(row.source, r);
    if (!expected || Object.keys(expected).some(key => expected[key] !== row[key])) throw new Error(`Unapproved source or destination mapping: ${row.source}`);
    if (!Number.isSafeInteger(row.bytes) || row.bytes < 0 || !/^[a-f0-9]{64}$/.test(row.sha256)) throw new Error('Invalid source bytes/hash');
    const s = row.source.toLowerCase(), d = row.destination.toLowerCase();
    if (sources.has(s) || destinations.has(d)) throw new Error('Duplicate source or destination');
    sources.add(s); destinations.add(d);
    if (families.has(row.family)) {
      const key = `${row.family}/${row.index}/${row.role}`;
      if (triples.has(key)) throw new Error(`Duplicate triple role: ${key}`);
      triples.add(key); counts.abstract++;
    } else counts[row.family === 'experimental' ? 'experimental' : row.role]++;
  }
  for (const [family, count] of families) for (let index = 1; index <= count; index++) for (const role of ['bass', 'drums', 'lead']) {
    if (!triples.has(`${family}/${index}/${role}`)) throw new Error(`Incomplete triple: ${family}/${index}/${role}`);
  }
  if (manifest.sources.length !== 255 || counts.abstract !== 141 || counts.experimental !== 13 || counts['voice-danya'] !== 51 || counts['voice-kapa'] !== 50) throw new Error('Expected exactly 255 approved originals with complete categories');
  const excluded = new Set();
  for (const row of manifest.excluded) {
    absolute(row.path);
    const key = row.path.toLowerCase();
    if ((!inside(row.path, r.abstractRoot) && !inside(row.path, r.experimentalRoot)) || classify(row.path, r) || sources.has(key) || excluded.has(key) || !Number.isSafeInteger(row.bytes) || row.bytes < 0 || !/^[a-f0-9]{64}$/.test(row.sha256)) throw new Error('Invalid excluded file');
    excluded.add(key);
  }
  return r;
}

export async function planIntake(input) {
  const r = roots(input);
  await noLinks(r.libraryRoot);
  const manifest = { version: 1, batch, ...r, sources: [], excluded: [] };
  for (const root of [r.abstractRoot, r.experimentalRoot]) {
    for (const source of await inventory(root)) {
      const mapping = classify(source, r);
      const digest = await fingerprint(source);
      if (mapping) manifest.sources.push({ source, ...mapping, ...digest });
      else manifest.excluded.push({ path: source, ...digest });
    }
  }
  manifest.sources.sort((a,b) => numeric(a.source,b.source));
  validateManifest(manifest);
  return manifest;
}

export async function copyIntake(manifest) {
  const errors = [];
  try {
    validateManifest(manifest);
    // Validate the whole batch before creating the first destination.
    for (const row of manifest.sources) {
      const original = await fingerprint(row.source);
      if (original.bytes !== row.bytes || original.sha256 !== row.sha256) throw new Error(`Source changed: ${row.source}`);
      await noLinks(row.destination);
      try {
        const target = await fingerprint(row.destination);
        if (target.bytes !== row.bytes || target.sha256 !== row.sha256) throw new Error(`Different destination; refusing overwrite: ${row.destination}`);
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    for (const row of manifest.sources) {
      await noLinks(row.source); await noLinks(row.destination);
      const content = await readFile(row.source);
      if (content.length !== row.bytes || hash(content) !== row.sha256) throw new Error(`Source changed during copy: ${row.source}`);
      await mkdir(path.dirname(row.destination), { recursive: true });
      await noLinks(row.destination);
      let target;
      try { target = await open(row.destination, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
      if (target) {
        try { await target.writeFile(content); } finally { await target.close(); }
      }
      const copied = await fingerprint(row.destination);
      if (copied.bytes !== row.bytes || copied.sha256 !== row.sha256) throw new Error(`Destination verification failed: ${row.destination}`);
    }
  } catch (error) { errors.push(error.message); }
  return { ok: errors.length === 0, manifest, errors };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--mode' || !['inspect', 'copy'].includes(args[1])) throw new Error('Usage: node tools/abstract-intake.mjs --mode inspect|copy');
  const libraryRoot = fileURLToPath(new URL('../stems/source-library', import.meta.url));
  const manifest = await planIntake({ abstractRoot: 'D:\\Music\\game\\Абстракт', experimentalRoot: 'D:\\Music\\game\\Эксперементал', libraryRoot });
  const manifestPath = path.join(libraryRoot, 'batches', `${batch}.json`);
  await noLinks(manifestPath);
  if (args[1] === 'copy') {
    const serialized = JSON.stringify(manifest, null, 2) + '\n';
    try {
      const prior = JSON.parse(await readFile(manifestPath, 'utf8'));
      if (JSON.stringify(prior) !== JSON.stringify(manifest)) throw new Error('Existing batch manifest differs; refusing overwrite');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const result = await copyIntake(manifest);
    if (!result.ok) throw new Error(result.errors.join('\n'));
    await mkdir(path.dirname(manifestPath), { recursive: true });
    try { await writeFile(manifestPath, serialized, { flag: 'wx' }); }
    catch (error) {
      if (error.code !== 'EEXIST' || JSON.stringify(JSON.parse(await readFile(manifestPath, 'utf8'))) !== JSON.stringify(manifest)) throw error;
    }
  }
  console.log(JSON.stringify({ mode: args[1], batch, originals: manifest.sources.length, bytes: manifest.sources.reduce((total,row) => total + row.bytes,0), excluded: manifest.excluded.length, manifestPath, roots: { abstractRoot: manifest.abstractRoot, experimentalRoot: manifest.experimentalRoot, libraryRoot } }, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
