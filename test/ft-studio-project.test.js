import test from 'node:test';
import assert from 'node:assert/strict';
import { BATTLE_BRIEFS } from '../src/virtual-pc-catalog.js?rev=25';
import {
  createStudioProject,
  normalizeStudioProject,
  projectFingerprint,
  setArrangementCell,
  setBpm,
  setStudioStep,
  setTrackGain,
} from '../src/ft-studio-project.js?rev=25';

const battleId = BATTLE_BRIEFS[0].id;

function projectInput(overrides = {}) {
  return { id: 'first-demo', name: 'Первый демо-трек', battleId, ...overrides };
}

test('a studio project requires a nonblank name, selected battle, and at most 32 characters', () => {
  assert.equal(createStudioProject(projectInput({ name: '   ' })).ok, false);
  assert.equal(createStudioProject(projectInput({ battleId: 'missing-brief' })).ok, false);
  assert.equal(createStudioProject(projectInput({ name: 'а'.repeat(33) })).ok, false);
  assert.equal(createStudioProject(projectInput({ name: 'а'.repeat(32) })).ok, true);
});

test('a new project contains four tracks, sixteen steps, and eight bars', () => {
  const result = createStudioProject(projectInput());

  assert.equal(result.ok, true);
  assert.deepEqual(result.project.tracks.map(track => track.id), ['kick', 'snare', 'hat', 'bass']);
  for (const track of result.project.tracks) {
    assert.equal(track.steps.length, 16);
    assert.equal(track.bars.length, 8);
  }
});

test('sequencer edits return a new project without changing the saved original', () => {
  const original = createStudioProject(projectInput()).project;
  const stepped = setStudioStep(original, 'snare', 0, true);
  const arranged = setArrangementCell(stepped, 'bass', 7, false);
  const mixed = setTrackGain(arranged, 'kick', .35);

  assert.equal(original.tracks.find(track => track.id === 'snare').steps[0], false);
  assert.equal(stepped.tracks.find(track => track.id === 'snare').steps[0], true);
  assert.equal(arranged.tracks.find(track => track.id === 'bass').bars[7], false);
  assert.equal(mixed.tracks.find(track => track.id === 'kick').gain, .35);
});

test('tempo stays within the playable studio range', () => {
  const project = createStudioProject(projectInput()).project;

  assert.equal(setBpm(project, 20).bpm, 72);
  assert.equal(setBpm(project, 999).bpm, 150);
  assert.equal(setBpm(project, 118).bpm, 118);
});

test('a serialized project reopens with every musical choice intact', () => {
  const created = createStudioProject(projectInput()).project;
  const edited = setBpm(setTrackGain(setStudioStep(created, 'hat', 3, true), 'bass', .42), 104);
  const reopened = normalizeStudioProject(JSON.parse(JSON.stringify(edited)));

  assert.deepEqual(reopened, edited);
  assert.equal(projectFingerprint(reopened), projectFingerprint(edited));
});
