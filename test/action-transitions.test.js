import test from 'node:test';
import assert from 'node:assert/strict';
import { createActionTransition, phaseAfterApproach, transitionPhaseAt } from '../src/action-transitions.js';

test('sleep cannot jump directly from walking to a lying pose', () => {
  const transition = createActionTransition({ actionId: 'bed', fromRoom: 'living', toRoom: 'living' });

  assert.equal(transitionPhaseAt(transition, 0).id, 'walk');
  assert.equal(transitionPhaseAt(transition, 1.01).id, 'turn');
  assert.equal(transitionPhaseAt(transition, 1.30).id, 'start');
  assert.equal(transitionPhaseAt(transition, 1.65).id, 'perform');
});

test('cross-room actions retain both door waypoints before the action pose', () => {
  const transition = createActionTransition({ actionId: 'stove', fromRoom: 'living', toRoom: 'kitchen' });

  assert.deepEqual(transition.route, ['living-door', 'kitchen-door']);
  assert.equal(transitionPhaseAt(transition, .7).id, 'walk');
});

test('object pose begins only after the settled turn and start phases', () => {
  const transition = createActionTransition({ actionId: 'microphone', fromRoom: 'living', toRoom: 'living' });

  assert.equal(phaseAfterApproach(transition, 0).id, 'turn');
  assert.equal(phaseAfterApproach(transition, .3).id, 'start');
  assert.equal(phaseAfterApproach(transition, .65).id, 'perform');
});
