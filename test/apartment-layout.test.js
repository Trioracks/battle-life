import test from 'node:test';
import assert from 'node:assert/strict';
import { APARTMENT_DESK, APARTMENT_FLOOR_Y, APARTMENT_MICROPHONE, APARTMENT_ROOMS, APARTMENT_SPAWN, apartmentWalkTargets, cameraTargetX, getApartmentRoom, routeBetweenRooms } from '../src/apartment-layout.js';

test('kitchen actions route through the internal door and actor floor is explicit', () => {
  assert.equal(getApartmentRoom('computer'), 'living');
  assert.equal(getApartmentRoom('stove'), 'kitchen');
  assert.deepEqual(routeBetweenRooms('living', 'kitchen'), ['living-door', 'kitchen-door']);
  assert.equal(APARTMENT_FLOOR_Y, 0);
});

test('staying in one room does not add an unnecessary door route', () => {
  assert.deepEqual(routeBetweenRooms('living', 'living'), []);
});

test('room bounds leave a doorway gap between the widened kitchen and living room', () => {
  assert.equal(APARTMENT_ROOMS.kitchen.right, -1.05);
  assert.equal(APARTMENT_ROOMS.living.left, -.8);
  assert.ok(APARTMENT_ROOMS.kitchen.right < APARTMENT_ROOMS.living.left);
});

test('default apartment spawn is in open living-room floor space', () => {
  assert.deepEqual(APARTMENT_SPAWN, { room: 'living', x: 3.5 });
  assert.ok(APARTMENT_SPAWN.x > 2.8);
  assert.ok(APARTMENT_SPAWN.x < 4.07);
});

test('desk microphone is positioned on the desktop instead of on the floor', () => {
  assert.equal(APARTMENT_MICROPHONE.x, 4.43);
  assert.ok(APARTMENT_MICROPHONE.baseY > APARTMENT_DESK.surfaceY);
});

test('camera stays horizontally centred on the actor on both sides of the doorway', () => {
  assert.equal(cameraTargetX(4.43), 4.43);
  assert.equal(cameraTargetX(-4.66), -4.66);
});

test('cross-room walking visits each side of the interior doorway before the target', () => {
  assert.deepEqual(apartmentWalkTargets('living', 'kitchen', -4.66), [-.8, -1.05, -4.66]);
  assert.deepEqual(apartmentWalkTargets('kitchen', 'living', 4.43), [-1.05, -.8, 4.43]);
});
