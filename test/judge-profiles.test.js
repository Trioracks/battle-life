import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { battleRoster, BATTLE_ROUND_IDS } from '../src/battle-roster.js';
const api = await import('../src/judge-profiles.js').catch(() => ({}));
const archive = JSON.parse(fs.readFileSync(new URL('../data/battle-archive/makarevich-1.json',import.meta.url)));
const profile = id => { assert.equal(typeof api.judgeProfile,'function','individual profiles available'); return api.judgeProfile(id); };

test('every individual panel member has one valid evidence-linked game profile', () => {
  assert.equal(typeof api.validateJudgeCoverage,'function');
  const rounds = BATTLE_ROUND_IDS.map(battleRoster);
  const all = api.JUDGE_PROFILES;
  assert.deepEqual(api.validateJudgeCoverage(rounds,all),[]);
  assert.equal(all.length,30);
  assert.equal(new Set(all.map(p=>p.id)).size,30);
  for (const p of all) {
    assert.ok(p.sourceRefs.length > 0);
    for (const ref of p.sourceRefs) assert.ok(archive.sourceReferenceIndex[ref],ref);
    assert.ok(p.hypothesisNotes.length > 0);
    assert.equal(p.performerSkills,undefined);
    assert.equal(p.knowledge.status,'fictional_game_configuration');
  }
});

test('a missing or duplicate judge prevents activating a panel', () => {
  const p = profile('eparhiya');
  assert.ok(api.validateJudgeCoverage([battleRoster('selection')],[p]).some(d=>d.code==='missing-profile'));
  assert.ok(api.validateJudgeCoverage([],[p,p]).some(d=>d.code==='duplicate-profile'));
});

test('invalid weights and adherence fail validation rather than being silently corrected', () => {
  const p = profile('eparhiya');
  assert.deepEqual(p.weights,{text:.4,performance:.25,music:.25,sound:.1});
  assert.ok(api.validateJudgeCoverage([],[{...p,weights:{...p.weights,text:0}}]).some(d=>d.code==='invalid-weights'));
  assert.ok(api.validateJudgeCoverage([],[{...p,formatAdherence:1.2}]).some(d=>d.code==='invalid-adherence'));
  assert.ok(api.validateJudgeCoverage([],[{...p,weights:{...p.weights,text:NaN}}]).some(d=>d.code==='invalid-weights'));
});

test('profile lookup returns isolated stable config, not random or shared mutable taste', () => {
  const before = profile('svinoferma');
  const copy = profile('svinoferma'); copy.weights.text=0; copy.knowledge.sourceIds.push('invented');
  assert.deepEqual(profile('svinoferma'),before);
  assert.equal(profile('__proto__'),null);
  assert.equal(profile('unknown'),null);
});

test('rude short voices need not share format adherence; no evidence is labelled honestly', () => {
  assert.notEqual(profile('prikolchique').formatAdherence,profile('whitespruce').formatAdherence);
  assert.equal(profile('corpse-attack').researchConfidence,'insufficient');
  assert.equal(profile('corpse-attack').configurationBasis,'authored_fallback');
  assert.equal(profile('abstract-postmodern').configurationBasis,'authored_fallback');
  assert.notEqual(profile('ok-unconfirmed').id,profile('ohuyenno-kulturny').id);
});
