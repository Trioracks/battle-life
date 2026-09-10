import test from 'node:test';
import assert from 'node:assert/strict';
import { MAKAREWITCH_VI, canSubmit, registerForTournament, researchTournament } from '../src/tournament.js';
import { createCampaign } from '../src/game-state.js';

test('Makarewitch application registers before deadline and research reveals lyrical focus', () => {
  const registered = registerForTournament(createCampaign(), MAKAREWITCH_VI.id);
  const researched = researchTournament(registered.state);

  assert.equal(registered.state.tournament.registered, true);
  assert.deepEqual(researched.state.tournament.researchHints, ['лиричный фокус']);
  assert.equal(researched.state.clock.minutes, 1200);
});

test('application is unavailable once 20 September has ended', () => {
  const late = { ...createCampaign(), clock: { year: 2026, month: 9, day: 21, minutes: 1 } };

  assert.equal(registerForTournament(late, MAKAREWITCH_VI.id).completed, false);
  assert.equal(canSubmit(late, { stage: 'mastered' }), false);
});
