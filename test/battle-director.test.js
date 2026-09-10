import test from 'node:test';
import assert from 'node:assert/strict';
import { PERFORMANCE_SECONDS, performanceStyleAt, shuffledStyles } from '../src/battle-director.js';

test('a performer gets four distinct gesture slots over a twenty-second round', () => {
  const order = ['open-hands', 'shoulder-rock', 'crowd-turn', 'point'];

  assert.equal(PERFORMANCE_SECONDS, 20);
  assert.equal(performanceStyleAt(0, order), 'open-hands');
  assert.equal(performanceStyleAt(5.1, order), 'shoulder-rock');
  assert.equal(performanceStyleAt(10.1, order), 'crowd-turn');
  assert.equal(performanceStyleAt(15.1, order), 'point');
});

test('the opponent receives the same four gestures in a shuffled order', () => {
  const order = shuffledStyles(() => .1);

  assert.equal(order.length, 4);
  assert.deepEqual([...order].sort(), ['crowd-turn', 'open-hands', 'point', 'shoulder-rock']);
  assert.notDeepEqual(order, ['open-hands', 'shoulder-rock', 'crowd-turn', 'point']);
});
