import test from 'node:test';
import assert from 'node:assert/strict';
import { createRapper } from '../src/creator.js';
import { buyFood, cookMeal, eatMeal } from '../src/household.js';
import { completeShift } from '../src/jobs.js';
import { createCampaign } from '../src/game-state.js';
import { chooseBeat, masterTrack, mixTrack, polishDraft, recordTrack, startDraft, submitTrack } from '../src/track-project.js';
import { MAKAREWITCH_VI, registerForTournament, researchTournament } from '../src/tournament.js';

test('first four days can create a rapper, survive, work and submit a Makarewitch track before deadline', () => {
  let campaign = createCampaign();
  campaign = { ...campaign, player: createRapper({
    name: 'Миша', nickname: 'Ночной Маяк',
    allocations: { intelligence: 1, writing: 2, musicality: 1, flow: 2, beatmaking: 1, sound: 1, charisma: 1, confidence: 1, resilience: 0 },
    look: { hair: 'crop', top: 'hoodie', pants: 'cargo', cap: 'none' },
  }) };
  campaign = registerForTournament(campaign, MAKAREWITCH_VI.id).state;
  campaign = researchTournament(campaign).state;
  campaign = buyFood(campaign, 'groceries').state;
  campaign = cookMeal(campaign).state;
  campaign = eatMeal(campaign).state;
  campaign = completeShift(campaign, 'cashier').state;
  campaign = startDraft(campaign, { focus: 2, useResearch: true }).state;
  campaign = polishDraft(campaign).state;
  campaign = chooseBeat(campaign, 'boom-bap').state;
  campaign = recordTrack(campaign, 'takes').state;
  campaign = mixTrack(campaign).state;
  campaign = masterTrack(campaign).state;
  const submitted = submitTrack(campaign);

  assert.equal(submitted.completed, true);
  assert.equal(submitted.state.tournament.submitted, true);
  assert.equal(submitted.state.track.stage, 'submitted');
  assert.deepEqual(submitted.state.clock, { year: 2026, month: 9, day: 18, minutes: 930 });
});
