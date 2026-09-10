import test from 'node:test';
import assert from 'node:assert/strict';
import { completeShift, getJob } from '../src/jobs.js';
import { createCampaign } from '../src/game-state.js';

test('cashier shift pays cash and applies a lighter load than construction', () => {
  const cashier = completeShift(createCampaign(), 'cashier');
  const builder = completeShift(createCampaign(), 'builder');

  assert.equal(cashier.state.cash, 6050);
  assert.ok(cashier.state.needs.energy > builder.state.needs.energy);
  assert.equal(getJob('warehouse').duration, 720);
});

test('heavy work refuses a hero with critical energy', () => {
  const tired = { ...createCampaign(), needs: { energy: 16, hunger: 68, health: 82, leisure: 56 } };

  assert.deepEqual(completeShift(tired, 'warehouse'), { state: tired, message: 'Не хватает бодрости для этой смены.', completed: false });
});
