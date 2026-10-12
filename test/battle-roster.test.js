import test from 'node:test';
import assert from 'node:assert/strict';
const api = await import('../src/battle-roster.js').catch(() => ({}));
const roundIds = ['selection','round-2','round-3','round-4','round-5','final'];
const roster = id => { assert.equal(typeof api.battleRoster, 'function'); return api.battleRoster(id); };
const rank = (...args) => { assert.equal(typeof api.rankSelection, 'function'); return api.rankSelection(...args); };

test('game panels are odd, excluded individual and collective channels remain identifiable', () => {
  assert.deepEqual(roundIds.map(id => roster(id).judgeIds.length), [5,13,17,19,23,21]);
  assert.equal(roster('round-2').excludedJudgeIds.length, 1);
  assert.equal(roster('round-4').excludedJudgeIds.length, 1);
  assert.deepEqual(roster('round-2').collectiveChannels.map(c => c.label), ['НАРОД']);
  assert.ok(!roundIds.some(id => roster(id).judgeIds.includes('НАРОД')));
  const copy = roster('selection'); copy.judgeIds.length = 0;
  assert.equal(roster('selection').judgeIds.length, 5);
  assert.equal(roster('not-a-round'), null);
});

test('201 entrants compete for 32 slots without a hero guarantee', () => {
  const entries = Array.from({ length:201 }, (_,i) => ({id:i === 19 ? 'hero' : 'npc-' + i}));
  const results = entries.map((e,i) => ({entryId:e.id,raw:300-i}));
  const passing = rank(entries,results,{limit:32});
  assert.equal(passing.qualifiedIds.length,32);
  assert.ok(passing.qualifiedIds.includes('hero'));
  results.find(r => r.entryId === 'hero').raw = 260.5;
  const failing = rank(entries,results,{limit:32});
  assert.equal(failing.qualifiedIds.length,32);
  assert.ok(!failing.qualifiedIds.includes('hero'));
});

test('boundary ties remain unresolved independent of input ordering', () => {
  const entries = Array.from({length:34},(_,i)=>({id:'p'+i}));
  const results = entries.map((e,i)=>({entryId:e.id,raw:i<31?100-i:40}));
  const a = rank(entries,results,{limit:32});
  const b = rank([...entries].reverse(),[...results].reverse(),{limit:32});
  assert.deepEqual(a,b);
  assert.equal(a.qualifiedIds.length,31);
  assert.deepEqual(a.tiedAtBoundary,['p31','p32','p33']);
});

test('a missing score cannot beat or masquerade as a legitimate zero', () => {
  const entries = [{id:'missing'},{id:'zero'},{id:'good'}];
  const r = rank(entries,[{entryId:'good',raw:1},{entryId:'zero',raw:0},{entryId:'missing',raw:null}],{limit:2});
  assert.deepEqual(r.qualifiedIds,['good','zero']);
  assert.deepEqual(r.pendingIds,['missing']);
});
