import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const importer = await import('../tools/import-battle-archive.mjs').catch(() => ({}));
// Reconstruct the import boundary from the committed archive, so checkout/CI
// does not require untracked research documents in a sibling worktree.
const savedArchive = JSON.parse(fs.readFileSync(new URL('../data/battle-archive/makarevich-1.json',import.meta.url)));
const scratchRoot = fileURLToPath(new URL('../.superpowers/sdd/2026-10-12-package-one-remaining/',import.meta.url));
fs.mkdirSync(scratchRoot,{recursive:true});
const scratch = fs.mkdtempSync(path.join(scratchRoot,'archive-test-'));
const inputs = path.join(scratch,'sources','date');
fs.mkdirSync(inputs,{recursive:true});
const fixtureFiles = {
  'battle-judging-source':savedArchive.source,
  'battle-judging-analysis':{rounds:savedArchive.rounds.flatMap(r => r.views.map(v => ({
    sheet:v.sheet,participants:v.participantCount,headerRow:v.headerRow,
    judgeInfo:r.individualColumns.map(j=>({column:j.column,label:j.label})),
  })))},
  'battle-participants-source':savedArchive.participations,
  'judge-observations':savedArchive.observations.map(({judgeId,...raw})=>raw),
  'judge-review-corpus':[
    ...savedArchive.notes.canonical.map(({judgeId,attribution,...raw})=>raw),...savedArchive.notes.duplicates,
  ],
  'judge-comment-attribution':savedArchive.attribution,
  'judge-profiles':{profiles:savedArchive.identities.map(({label,sourceRefs,...p})=>({...p,judgeKey:label,evidenceRefs:sourceRefs}))},
};
for (const [name,data] of Object.entries(fixtureFiles)) fs.writeFileSync(path.join(inputs,name+'.json'),JSON.stringify(data));
fs.writeFileSync(path.join(scratch,'demo-opponent-pool-v0.1.json'),JSON.stringify(savedArchive.historicalOpponentPool));
test.after(()=>fs.rmSync(scratch,{recursive:true}));
const load = name => JSON.parse(fs.readFileSync(inputs + '/' + name + '.json', 'utf8'));
function imported() {
  assert.equal(typeof importer.importBattleArchive, 'function', 'archive importer is implemented');
  return importer.importBattleArchive(inputs);
}

test('import is deterministic and preserves every raw cell without doubling selection', () => {
  const one = imported();
  assert.deepEqual(one, imported());
  assert.equal(one.archive.rounds.length, 6);
  const selection = one.archive.rounds.find(r => r.id === 'selection');
  assert.deepEqual(selection.views.map(v => v.participantCount).sort(), [100, 101]);
  assert.deepEqual(one.archive.source.sheets, load('battle-judging-source').sheets);
  assert.equal(one.archive.participations.length, 263);
  assert.equal(one.archive.notes.rawCount, 1430);
  assert.equal(one.archive.notes.canonical.filter(n => n.kind === 'participant_review').length, 1031);
  assert.equal(one.archive.notes.canonical.filter(n => n.kind === 'judge_general_note').length, 6);
});

test('null stays missing, zero stays a decision, pair votes never become grades', () => {
  const { archive } = imported();
  const raw = load('judge-observations');
  for (const observation of raw) {
    const saved = archive.observations.find(o => o.sourceRef === observation.sourceRef);
    assert.equal(saved.value, observation.value);
    assert.equal(saved.valueKind, observation.valueKind);
  }
  assert.ok(archive.observations.some(o => o.value === null));
  assert.equal(archive.sourceReferenceIndex['2 РАУНД!B12'].kind, 'empty_cell');
  assert.equal(archive.sourceReferenceIndex['2 РАУНД!B12'].value, null);
  assert.ok(archive.observations.some(o => o.value === 0 && o.valueKind === 'pair_vote'));
  assert.equal(archive.source.sheets[0].rows[2].cells.at(-1).formula, 'SUM(B3:X3)');
});

test('crossed text subjects never move votes and unresolved cells are not guessed', () => {
  const { archive } = imported();
  for (const [cell, vote, subject] of [['C3',1,'Клинок Забузы'],['C4',0,'НБПанда'],['U3',1,'Клинок Забузы'],['U4',0,'НБПанда'],['V3',0,'Клинок Забузы'],['V4',1,'НБПанда']]) {
    const note = archive.notes.canonical.find(n => n.sourceRef === 'ФИНАЛ!' + cell);
    assert.equal(note.value, vote);
    assert.equal(note.attribution.textSubject, subject);
    assert.notEqual(note.participant, subject);
  }
  for (const [cell, vote] of [['B12',1],['B13',0]]) {
    const note = archive.notes.canonical.find(n => n.sourceRef === '4 РАУНД!' + cell);
    assert.equal(note.value, vote);
    assert.equal(note.attribution.status, 'unresolved');
    assert.equal(note.attribution.textSubject, null);
  }
});

test('judge aliases are explicit and ambiguous identities remain separate', () => {
  const { archive, diagnostics } = imported();
  assert.equal(archive.aliases['ок'], 'ok-unconfirmed');
  assert.equal(archive.aliases['охуенно культурный'], 'ohuyenno-kulturny');
  assert.equal(archive.aliases['алкс битс'], 'alx-beats');
  assert.equal(archive.aliases['alx beats'], 'alx-beats');
  assert.equal(archive.identities.find(p => p.id === 'ok-unconfirmed').possibleAliasOf, 'ohuyenno-kulturny');
  assert.deepEqual(diagnostics.unresolvedSourceRefs, []);
  assert.deepEqual(diagnostics.unknownJudgeLabels, []);
  assert.ok(archive.notes.duplicates.length > 0);
  assert.equal(archive.attribution.identicalPairTextGroups.length, 14);
});
