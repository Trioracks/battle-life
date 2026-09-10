import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceCampaign, createCampaign, loadCampaign, saveCampaign } from '../src/game-state.js';

test('new campaign starts after work on 17 September with cash and four visible needs', () => {
  const campaign = createCampaign();

  assert.deepEqual(campaign.clock, { year: 2026, month: 9, day: 17, minutes: 1140 });
  assert.equal(campaign.cash, 5000);
  assert.deepEqual(campaign.needs, { energy: 72, hunger: 68, health: 82, leisure: 56 });
  assert.equal(campaign.rent.status, 'upcoming');
  assert.equal(campaign.rent.amount, 3500);
});

test('confirmed two-hour action advances time and applies its load plus basic needs drain', () => {
  const start = createCampaign();
  const result = advanceCampaign(start, {
    id: 'write-draft',
    label: 'Пишет черновик',
    minutes: 120,
    effects: { energy: -5, leisure: -2 },
  });

  assert.equal(result.state.clock.minutes, 1260);
  assert.equal(result.state.activity.label, 'Пишет черновик');
  assert.equal(result.state.needs.energy, 66);
  assert.equal(result.state.needs.hunger, 65);
  assert.equal(result.state.needs.health, 82);
  assert.equal(result.state.needs.leisure, 53);
  assert.equal(result.crossedDay, false);
});

test('an action crossing midnight creates one automatic daily-save marker', () => {
  const start = { ...createCampaign(), clock: { year: 2026, month: 9, day: 17, minutes: 1410 } };
  const result = advanceCampaign(start, { id: 'late-task', label: 'Позднее дело', minutes: 60 });

  assert.deepEqual(result.state.clock, { year: 2026, month: 9, day: 18, minutes: 30 });
  assert.equal(result.crossedDay, true);
  assert.equal(result.state.lastDailySave, '2026-09-18');
});

test('the first action reaching 1 October marks the 3,500 ₽ rent as due', () => {
  const start = { ...createCampaign(), clock: { year: 2026, month: 9, day: 30, minutes: 1410 } };
  const result = advanceCampaign(start, { id: 'sleep', label: 'Спит', minutes: 180 });

  assert.deepEqual(result.state.clock, { year: 2026, month: 10, day: 1, minutes: 150 });
  assert.equal(result.state.rent.status, 'due');
  assert.equal(result.state.rent.amount, 3500);
});

test('saved campaigns round-trip through the supplied storage without exposing its implementation', () => {
  const writes = new Map();
  const storage = {
    setItem(key, value) { writes.set(key, value); },
    getItem(key) { return writes.get(key) ?? null; },
  };
  const campaign = advanceCampaign(createCampaign(), { id: 'snack', label: 'Перекус', minutes: 15 }).state;

  saveCampaign(campaign, storage);

  assert.deepEqual(loadCampaign(storage), campaign);
});
