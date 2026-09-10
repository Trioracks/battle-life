import test from 'node:test';
import assert from 'node:assert/strict';
import { stepCharacter } from '../src/character-motion.js';

const room = { left: -4.5, right: 4.5 };

test('moves the character right and faces right while the right key is held', () => {
  const next = stepCharacter({ x: 0, facing: -1 }, { left: false, right: true }, 0.5, room);

  assert.equal(next.x, 1.5);
  assert.equal(next.facing, 1);
  assert.equal(next.moving, true);
});

test('moves the character left without crossing the room boundary', () => {
  const next = stepCharacter({ x: -4.3, facing: 1 }, { left: true, right: false }, 0.5, room);

  assert.equal(next.x, -4.5);
  assert.equal(next.facing, -1);
  assert.equal(next.moving, true);
});

test('keeps a stationary character in place', () => {
  const next = stepCharacter({ x: 2, facing: -1 }, { left: false, right: false }, 0.5, room);

  assert.deepEqual(next, { x: 2, facing: -1, moving: false });
});
