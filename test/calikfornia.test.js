import test from 'node:test';
import assert from 'node:assert/strict';
import { districts, travelTo } from '../src/calikfornia.js';
import { createCampaign } from '../src/game-state.js';

test('Calikfornia contains the seven MVP districts and travel consumes declared time', () => {
  assert.equal(districts.length, 7);
  const result = travelTo(createCampaign(), 'old-center');

  assert.equal(result.state.location, 'old-center');
  assert.equal(result.state.clock.minutes, 1165);
  assert.equal(result.message, 'Доехал: Старый центр.');
});
