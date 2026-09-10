import test from 'node:test';
import assert from 'node:assert/strict';
import { presentActionProgress } from '../src/action-progress.js';

test('long apartment actions expose clamped observed progress', () => {
  assert.deepEqual(presentActionProgress({ label: 'Приготовить 2 порции', minutes: 35 }, .5, 2), {
    ratio: .25,
    percent: 25,
    observed: true,
    label: 'Приготовить 2 порции',
    minutes: 35,
  });
  assert.equal(presentActionProgress({ label: 'Помыть посуду', minutes: 15 }, 8, 2).percent, 100);
  assert.equal(presentActionProgress({ label: 'Открыть холодильник', minutes: 5 }, .5, 2).observed, false);
});
