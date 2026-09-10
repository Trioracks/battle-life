import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreSelection } from '../src/selection.js';
import { MAKAREWITCH_VI } from '../src/tournament.js';

test('coherent lyrical starter release can narrowly pass Makarewitch selection', () => {
  const result = scoreSelection({ stage: 'submitted', quality: 4.7, focus: 2, useResearch: true, genre: 'boom-bap' }, MAKAREWITCH_VI);

  assert.equal(result.scores.length, 3);
  assert.equal(result.passed, true);
  assert.ok(result.total >= MAKAREWITCH_VI.hiddenPass);
});

test('weak mismatched release can fail without any forced win', () => {
  const result = scoreSelection({ stage: 'submitted', quality: 1.8, focus: 5, useResearch: false, genre: 'noise' }, MAKAREWITCH_VI);

  assert.equal(result.passed, false);
  assert.ok(result.scores.every((score) => score.value >= 1 && score.value <= 10));
});
