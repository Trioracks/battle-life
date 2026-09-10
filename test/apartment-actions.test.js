import test from 'node:test';
import assert from 'node:assert/strict';
import { canStartApartmentAction, describeApartmentAction, getApartmentAction } from '../src/apartment-actions.js';

test('apartment exposes named actions with their declared gameplay duration', () => {
  assert.equal(getApartmentAction('sink').label, 'Помыть посуду');
  assert.equal(getApartmentAction('sink').tooltip, 'Помыть посуду · 15 мин');
  assert.equal(getApartmentAction('bed').animation, 'sleep');
  assert.equal(getApartmentAction('microphone').minutes, 120);
});

test('apartment description gives a readable duration and blocks heavy actions before click', () => {
  assert.deepEqual(describeApartmentAction(getApartmentAction('stove'), { energy: 32 }), {
    title: 'Приготовить 2 порции',
    detail: 'Приготовить 2 порции · 35 мин',
    allowed: true,
    reason: '',
  });
  assert.deepEqual(describeApartmentAction(getApartmentAction('microphone'), { energy: 15 }), {
    title: 'Записать вокал',
    detail: 'Записать вокал · 2 ч',
    allowed: false,
    reason: 'Слишком мало бодрости для записи.',
  });
});

test('free walking is not a time-spending apartment action', () => {
  assert.equal(getApartmentAction('walk'), null);
});

test('critical fatigue blocks recording but not a short household action', () => {
  assert.deepEqual(canStartApartmentAction('microphone', { energy: 15 }), { allowed: false, reason: 'Слишком мало бодрости для записи.' });
  assert.deepEqual(canStartApartmentAction('sink', { energy: 15 }), { allowed: true, reason: '' });
});
