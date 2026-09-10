import test from 'node:test';
import assert from 'node:assert/strict';
import { canStartApartmentAction, getApartmentAction } from '../src/apartment-actions.js';

test('apartment exposes named actions with their declared gameplay duration', () => {
  assert.deepEqual(getApartmentAction('sink'), {
    id: 'sink', label: 'Помыть посуду', targetX: .15, minutes: 15, animation: 'wash', cue: 'dishes', requiresEnergy: 0,
  });
  assert.equal(getApartmentAction('bed').animation, 'sleep');
  assert.equal(getApartmentAction('microphone').minutes, 120);
});

test('free walking is not a time-spending apartment action', () => {
  assert.equal(getApartmentAction('walk'), null);
});

test('critical fatigue blocks recording but not a short household action', () => {
  assert.deepEqual(canStartApartmentAction('microphone', { energy: 15 }), { allowed: false, reason: 'Слишком мало бодрости для записи.' });
  assert.deepEqual(canStartApartmentAction('sink', { energy: 15 }), { allowed: true, reason: '' });
});
