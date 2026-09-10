import test from 'node:test';
import assert from 'node:assert/strict';
import { createRapper } from '../src/creator.js';
import { cookMeal, eatMeal } from '../src/household.js';
import { createCampaign } from '../src/game-state.js';
import { getDistrictLocations, startLocationAction, travelTo } from '../src/calikfornia.js';
import { chooseBeat, masterTrack, mixTrack, polishDraft, recordAtMicrophone, startDraft, submitTrack } from '../src/track-project.js';
import { MAKAREWITCH_VI, registerForTournament, researchTournament } from '../src/tournament.js';

test('first four days can create a rapper, survive, work and submit a Makarewitch track before deadline', () => {
  let campaign = createCampaign();
  campaign = { ...campaign, player: createRapper({
    name: 'Миша', nickname: 'Ночной Маяк',
    allocations: { intelligence: 1, writing: 2, musicality: 1, flow: 2, beatmaking: 1, sound: 1, charisma: 1, confidence: 1, resilience: 0 },
    look: { hair: 'crop', face: 'clean', top: 'hoodie', pants: 'cargo' },
  }) };
  campaign = registerForTournament(campaign, MAKAREWITCH_VI.id).state;
  campaign = researchTournament(campaign).state;
  campaign = travelTo(campaign, 'north-sloboda').state;
  assert.equal(getDistrictLocations(campaign.location)[0].id, 'north-supermarket');
  campaign = startLocationAction(campaign, 'north-supermarket').state;
  campaign = cookMeal(campaign).state;
  campaign = eatMeal(campaign).state;
  campaign = travelTo(campaign, 'old-center').state;
  assert.equal(getDistrictLocations(campaign.location)[0].id, 'center-cashier');
  campaign = startLocationAction(campaign, 'center-cashier').state;
  campaign = startDraft(campaign, { focus: 2, useResearch: true }).state;
  campaign = polishDraft(campaign).state;
  campaign = chooseBeat(campaign, 'boom-bap').state;
  campaign = recordAtMicrophone(campaign, 'takes').state;
  campaign = mixTrack(campaign).state;
  campaign = masterTrack(campaign).state;
  const submitted = submitTrack(campaign);

  assert.equal(submitted.completed, true);
  assert.equal(submitted.state.tournament.submitted, true);
  assert.equal(submitted.state.track.stage, 'submitted');
  assert.equal(submitted.state.track.recordedAt, 'home-microphone');
  assert.deepEqual(submitted.state.clock, { year: 2026, month: 9, day: 18, minutes: 956 });
});
