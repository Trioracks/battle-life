import test from 'node:test';
import assert from 'node:assert/strict';
import { districts, getDistrictLocations, startLocationAction, travelTo } from '../src/calikfornia.js';
import { createCampaign } from '../src/game-state.js';

test('Calikfornia contains the seven MVP districts and travel consumes declared time', () => {
  assert.equal(districts.length, 7);
  const result = travelTo(createCampaign(), 'old-center');

  assert.equal(result.state.location, 'old-center');
  assert.equal(result.state.clock.minutes, 1165);
  assert.equal(result.message, 'Доехал: Старый центр.');
});

test('districts expose concrete supermarket and work locations with playable outcomes', () => {
  assert.deepEqual(getDistrictLocations('north-sloboda').map((location) => location.id), ['north-supermarket']);
  assert.deepEqual(getDistrictLocations('docklands').map((location) => location.id), ['dock-warehouse']);
  assert.deepEqual(getDistrictLocations('east-factory').map((location) => location.id), ['east-construction']);

  const groceries = startLocationAction(createCampaign(), 'north-supermarket');
  const warehouse = startLocationAction(createCampaign(), 'dock-warehouse');

  assert.equal(groceries.completed, true);
  assert.equal(groceries.state.inventory.ingredients, 5);
  assert.equal(warehouse.completed, true);
  assert.equal(warehouse.state.cash, 6900);
});
