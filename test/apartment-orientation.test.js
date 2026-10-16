import test from 'node:test';
import assert from 'node:assert/strict';
import { actionYaw, avatarFacingForYaw, cameraYaw, shouldPauseWalkForTurn, walkYaw } from '../src/apartment-orientation.js';

test('walking keeps a full two-leg body in a sideways orientation', () => {
  assert.equal(walkYaw(1), Math.PI / 2);
  assert.equal(walkYaw(-1), -Math.PI / 2);
});

test('camera click restores a front-facing actor while room fixtures turn their back to the viewer', () => {
  assert.equal(cameraYaw(), 0);
  assert.equal(actionYaw('computer'), Math.PI);
  assert.equal(actionYaw('microphone'), Math.PI);
  assert.equal(actionYaw('sink'), Math.PI);
});

test('sideways movement keeps the head with the torso and exposes one arm', () => {
  assert.deepEqual(avatarFacingForYaw(0), {
    face: 'front',
    visibleArm: 'both',
    profileLocalYaw: 0,
    billboardYaw: 0,
    bodyWidth: 1,
    rig: { headWidth: 1, torsoWidth: 1, armXs: [-.42, .42], legXs: [-.19, .19], frontDetails: true },
  });
  assert.deepEqual(avatarFacingForYaw(Math.PI / 2), {
    face: 'profile-right',
    visibleArm: 'back',
    profileLocalYaw: 0,
    billboardYaw: -Math.PI / 2,
    bodyWidth: .72,
    rig: { headWidth: .78, torsoWidth: .72, armXs: [-.32], legXs: [-.14, .14], frontDetails: false },
  });
  assert.deepEqual(avatarFacingForYaw(-Math.PI / 2), {
    face: 'profile-left',
    visibleArm: 'front',
    profileLocalYaw: 0,
    billboardYaw: Math.PI / 2,
    bodyWidth: .72,
    rig: { headWidth: .78, torsoWidth: .72, armXs: [.32], legXs: [-.14, .14], frontDetails: false },
  });
  assert.deepEqual(avatarFacingForYaw(Math.PI), {
    face: 'back',
    visibleArm: 'both',
    profileLocalYaw: 0,
    billboardYaw: -Math.PI,
    bodyWidth: 1,
    rig: { headWidth: 1, torsoWidth: 1, armXs: [-.42, .42], legXs: [-.19, .19], frontDetails: false },
  });
});

test('a route waits for the torso to finish turning before walking', () => {
  assert.equal(shouldPauseWalkForTurn(null), false);
  assert.equal(shouldPauseWalkForTurn({ target: Math.PI / 2, elapsed: .1 }), true);
});
