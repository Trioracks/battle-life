import test from 'node:test';
import assert from 'node:assert/strict';
import { clickIntent } from '../src/click-intent.js';

test('a computer hit takes priority over the floor position', () => {
  assert.deepEqual(
    clickIntent({ hitComputer: true, worldX: -4, worldY: .2, actorX: 1 }),
    { type: 'computer' },
  );
});

test('a named apartment object creates a generic interaction intent', () => {
  assert.deepEqual(
    clickIntent({ hitAction: 'sink', hitComputer: false, worldX: 2, worldY: .2, actorX: 1 }),
    { type: 'apartment-action', actionId: 'sink' },
  );
});

test('a click directly below the actor asks them to face the camera', () => {
  assert.deepEqual(
    clickIntent({ hitComputer: false, worldX: 1.2, worldY: .35, actorX: 1 }),
    { type: 'face-camera' },
  );
});

test('a click beside the actor becomes a walk destination', () => {
  assert.deepEqual(
    clickIntent({ hitComputer: false, worldX: -3.2, worldY: 1.4, actorX: 1 }),
    { type: 'walk', targetX: -3.2 },
  );
});
