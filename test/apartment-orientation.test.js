import test from 'node:test';
import assert from 'node:assert/strict';
import { actionYaw, cameraYaw, walkYaw } from '../src/apartment-orientation.js';

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
