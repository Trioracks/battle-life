import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, unlink, symlink, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { makeAbstractIntakeFixture } from './helpers/abstract-intake-fixture.mjs';

const workspace = fileURLToPath(new URL('../', import.meta.url));
const tempRoot = path.join(workspace, 'artifacts', 'test-temp');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function fixture() {
  await mkdir(tempRoot, { recursive: true });
  return makeAbstractIntakeFixture(await mkdtemp(path.join(tempRoot, 'abstract-intake-')));
}
async function api() { return import('../tools/abstract-intake.mjs'); }

test('intake selects exactly the approved originals', async () => {
  const { planIntake } = await api();
  const f = await fixture();
  const manifest = await planIntake(f);
  assert.equal(manifest.sources.length, 255);
  assert.equal(manifest.sources.filter(row => /^Track /.test(row.family)).length, 141);
  assert.equal(manifest.sources.filter(row => row.role.startsWith('voice-')).length, 101);
  assert.equal(manifest.sources.filter(row => row.family === 'experimental').length, 13);
  assert.ok(manifest.sources.some(row => path.basename(row.source) === 'drumm 7.mp3' && row.role === 'drums'));
  assert.deepEqual(manifest.sources.filter(row => row.family === 'Track 02' && row.role === 'bass').map(row => row.index), [1,2,3,4,5,6,7,8,9,10,11]);
  assert.ok(manifest.sources.every(row => !f.excludedPaths.includes(row.source)));
  assert.deepEqual(new Set(manifest.excluded.map(row => row.path)), new Set(f.excludedPaths));
});

test('incomplete triples are rejected before any copying', async () => {
  const { planIntake } = await api();
  const f = await fixture();
  await unlink(path.join(f.abstractRoot, 'Track 03', 'drumm 7.mp3'));
  await assert.rejects(planIntake(f), /incomplete|expected/i);
});

test('different destination is never overwritten', async () => {
  const { planIntake, copyIntake } = await api();
  const manifest = await planIntake(await fixture());
  const target = manifest.sources[0].destination;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, 'unrelated existing recording');
  const result = await copyIntake(manifest);
  assert.equal(result.ok, false);
  assert.equal(await readFile(target, 'utf8'), 'unrelated existing recording');
});

test('excluded files remain identical and identical copies may be repeated', async () => {
  const { planIntake, copyIntake } = await api();
  const f = await fixture();
  const manifest = await planIntake(f);
  const before = await Promise.all(f.excludedPaths.map(file => readFile(file)));
  assert.equal((await copyIntake(manifest)).ok, true);
  assert.equal((await copyIntake(manifest)).ok, true);
  for (const row of manifest.sources) {
    assert.equal(sha256(await readFile(row.source)), row.sha256);
    assert.equal(sha256(await readFile(row.destination)), row.sha256);
  }
  for (let i = 0; i < before.length; i++) assert.deepEqual(await readFile(f.excludedPaths[i]), before[i]);
});

async function proof(manifest) {
  const manifestPath = path.join(path.dirname(manifest.libraryRoot), 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest));
  const verificationPath = path.join(path.dirname(manifest.libraryRoot), 'verification.json');
  const verification = {
    version: 1, batch: manifest.batch, ok: true,
    manifestSha256: sha256(await readFile(manifestPath)),
    testsPassed: true, browserPassed: true, assetsVerified: true,
    preparedManifestHashes: [{ path: manifestPath, sha256: sha256(await readFile(manifestPath)) }],
    approvedSourceRows: manifest.sources,
  };
  await writeFile(verificationPath, JSON.stringify(verification));
  return { manifestPath, verificationPath, verification };
}
function finalize(paths, apply = true) {
  return spawnSync('pwsh', ['-NoProfile', '-File', path.join(workspace, 'tools', 'finalize-abstract-intake.ps1'), '-ManifestPath', paths.manifestPath, '-VerificationPath', paths.verificationPath, ...(apply ? ['-Apply'] : [])], { encoding: 'utf8' });
}

test('changed source survives finalization', async () => {
  const { planIntake, copyIntake } = await api();
  const manifest = await planIntake(await fixture());
  assert.equal((await copyIntake(manifest)).ok, true);
  const paths = await proof(manifest);
  await writeFile(manifest.sources[0].source, 'new user recording');
  const result = finalize(paths);
  assert.notEqual(result.status, 0, result.stdout);
  assert.equal(await readFile(manifest.sources[0].source, 'utf8'), 'new user recording');
  // Global preflight prevents partial deletion if any inventoried source changed.
  assert.equal(sha256(await readFile(manifest.sources[1].source)), manifest.sources[1].sha256);
});

test('finalization requires complete proof and matching manifest hash', async () => {
  const { planIntake, copyIntake } = await api();
  const manifest = await planIntake(await fixture());
  assert.equal((await copyIntake(manifest)).ok, true);
  const paths = await proof(manifest);
  for (const key of ['manifestSha256', 'testsPassed', 'browserPassed', 'assetsVerified', 'preparedManifestHashes', 'approvedSourceRows']) {
    const invalid = { ...paths.verification };
    delete invalid[key];
    await writeFile(paths.verificationPath, JSON.stringify(invalid));
    assert.notEqual(finalize(paths).status, 0, `accepted missing ${key}`);
  }
  for (const key of ['ok', 'testsPassed', 'browserPassed', 'assetsVerified']) {
    await writeFile(paths.verificationPath, JSON.stringify({ ...paths.verification, [key]: 1 }));
    assert.notEqual(finalize(paths, false).status, 0, `accepted non-boolean ${key}`);
  }
  assert.equal(sha256(await readFile(manifest.sources[0].source)), manifest.sources[0].sha256);
});

test('finalization dry run preserves sources; apply and repeat only remove verified sources', async () => {
  const { planIntake, copyIntake } = await api();
  const f = await fixture();
  const manifest = await planIntake(f);
  assert.equal((await copyIntake(manifest)).ok, true);
  const paths = await proof(manifest);
  const dryRun = finalize(paths, false);
  assert.equal(dryRun.status, 0, dryRun.stderr);
  assert.equal(JSON.parse(dryRun.stdout).pending, 255);
  assert.equal(sha256(await readFile(manifest.sources[0].source)), manifest.sources[0].sha256);
  const applied = finalize(paths);
  assert.equal(applied.status, 0, applied.stderr);
  assert.equal(JSON.parse(applied.stdout).removed, 255);
  const repeated = finalize(paths);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(JSON.parse(repeated.stdout).removed, 0);
  for (const row of manifest.excluded) assert.equal(sha256(await readFile(row.path)), row.sha256);
});

test('wrong manifest or prepared hash and changed or missing approvals authorize no deletion', async () => {
  const { planIntake, copyIntake } = await api();
  const manifest = await planIntake(await fixture());
  assert.equal((await copyIntake(manifest)).ok, true);
  const paths = await proof(manifest);
  const mutations = [
    p => p.manifestSha256 = '0'.repeat(64),
    p => p.preparedManifestHashes[0].sha256 = '0'.repeat(64),
    p => p.approvedSourceRows[0].sha256 = '0'.repeat(64),
    p => p.approvedSourceRows[0].destination += '-foreign',
    p => p.approvedSourceRows.pop(),
  ];
  for (const mutate of mutations) {
    const invalid = structuredClone(paths.verification); mutate(invalid);
    await writeFile(paths.verificationPath, JSON.stringify(invalid));
    const result = finalize(paths);
    assert.notEqual(result.status, 0, result.stdout);
    // Check every approved source, not only the bad row: preflight is atomic.
    for (const row of manifest.sources) assert.equal(sha256(await readFile(row.source)), row.sha256);
  }
});

test('junction is rejected by importer and finalizer', async () => {
  const { planIntake, copyIntake } = await api();
  const f = await fixture();
  const manifest = await planIntake(f);
  assert.equal((await copyIntake(manifest)).ok, true);
  const paths = await proof(manifest);
  const linkedRoot = path.join(path.dirname(f.libraryRoot), 'linked');
  await symlink(f.abstractRoot, linkedRoot, 'junction');
  await assert.rejects(planIntake({ ...f, abstractRoot: linkedRoot }), /link|reparse/i);
  // A directory inserted after planning must also be refused by copy/finalization.
  const source = path.join(f.abstractRoot, 'Track 01', 'nested-link');
  await symlink(f.libraryRoot, source, 'junction');
  await assert.rejects(planIntake(f), /link|reparse/i);
  const destination = manifest.sources[0].destination;
  const destinationParent = path.dirname(destination);
  await rename(destinationParent, `${destinationParent}-original`);
  await symlink(`${destinationParent}-original`, destinationParent, 'junction');
  assert.equal((await copyIntake(manifest)).ok, false);
  assert.notEqual(finalize(paths).status, 0);
  assert.equal(sha256(await readFile(manifest.sources[0].source)), manifest.sources[0].sha256);
});
