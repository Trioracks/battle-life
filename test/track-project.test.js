import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseBeat, getTrackStepStatus, masterTrack, mixTrack, polishDraft, recordTrack, startDraft, submitTrack } from '../src/track-project.js';
import { createCampaign } from '../src/game-state.js';

test('track moves through brief, draft, beat, recording, mix and master in order', () => {
  const drafted = startDraft(createCampaign(), { focus: 2, useResearch: true });
  const polished = polishDraft(drafted.state);
  const beat = chooseBeat(polished.state, 'boom-bap');
  const recorded = recordTrack(beat.state, 'takes');
  const mixed = mixTrack(recorded.state);
  const mastered = masterTrack(mixed.state);

  assert.equal(drafted.state.track.stage, 'draft');
  assert.ok(polished.state.track.quality > drafted.state.track.quality);
  assert.equal(recorded.state.track.stage, 'recorded');
  assert.equal(mastered.state.track.stage, 'mastered');
});

test('submission refuses an unfinished track and locks a mastered release', () => {
  const start = createCampaign();
  assert.equal(submitTrack(start).completed, false);

  const registered = { ...start, tournament: { ...start.tournament, registered: true } };
  const ready = masterTrack(mixTrack(recordTrack(chooseBeat(startDraft(registered, { focus: 3, useResearch: false }).state, 'boom-bap').state, 'one-take').state).state).state;
  const submitted = submitTrack(ready);
  assert.equal(submitted.completed, true);
  assert.equal(submitted.state.track.stage, 'submitted');
  assert.equal(submitted.state.tournament.submitted, true);
});

test('track checklist makes the next step and microphone handoff explicit', () => {
  const start = createCampaign();
  const beforeRegistration = getTrackStepStatus(start);
  assert.deepEqual(beforeRegistration[0], { id: 'register', label: 'Зарегистрироваться', minutes: 0, state: 'ready', reason: '' });
  assert.equal(beforeRegistration.find((step) => step.id === 'record').reason, 'Сначала выбери бит.');

  const registered = { ...start, tournament: { ...start.tournament, registered: true } };
  const beatReady = chooseBeat(startDraft(registered, { focus: 2, useResearch: false }).state, 'boom-bap').state;
  const recording = getTrackStepStatus(beatReady).find((step) => step.id === 'record');
  assert.deepEqual(recording, { id: 'record', label: 'Записать у микрофона', minutes: 150, state: 'ready', reason: 'Подойди к микрофону в квартире.' });
});
