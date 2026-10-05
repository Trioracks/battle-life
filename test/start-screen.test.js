import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaign } from '../src/game-state.js';
import { newGameState, startScreenState } from '../src/start-screen.js';

test('fresh campaign offers New Game and no Continue action', () => {
  assert.deepEqual(startScreenState(createCampaign()), { canContinue: false, primaryAction: 'new' });
});

test('saved hero offers Continue while New Game creates a clean campaign', () => {
  assert.equal(startScreenState({ ...createCampaign(), player: { name: 'Миша' } }).canContinue, true);
  assert.deepEqual(newGameState(), createCampaign());
});
