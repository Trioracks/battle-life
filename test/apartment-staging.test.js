import test from 'node:test';
import assert from 'node:assert/strict';
import { getInteractionStaging, isWalkTargetAllowed } from '../src/apartment-staging.js';

test('every household interaction has a concrete approach and transition', () => {
  assert.equal(getInteractionStaging('computer').transition, 'desk-fade');
  assert.equal(getInteractionStaging('microphone').transition, 'desk-fade');
  assert.equal(getInteractionStaging('bed').transition, 'bed-fade');
  assert.equal(getInteractionStaging('sink').facing, 'back');
  assert.equal(getInteractionStaging('door').facing, 'profile');
});

test('walk targets refuse the staged desk blocker while leaving the foreground lane open', () => {
  const { blockers } = getInteractionStaging('computer');
  assert.equal(isWalkTargetAllowed({ x: 4.9, z: 0 }, blockers), false);
  assert.equal(isWalkTargetAllowed({ x: 3.5, z: 0 }, blockers), true);
});
