import test from 'node:test';
import assert from 'node:assert/strict';
import { APARTMENT_FLOOR_Y, getApartmentRoom, routeBetweenRooms } from '../src/apartment-layout.js';

test('kitchen actions route through the internal door and actor floor is explicit', () => {
  assert.equal(getApartmentRoom('computer'), 'living');
  assert.equal(getApartmentRoom('stove'), 'kitchen');
  assert.deepEqual(routeBetweenRooms('living', 'kitchen'), ['living-door', 'kitchen-door']);
  assert.equal(APARTMENT_FLOOR_Y, 0);
});

test('staying in one room does not add an unnecessary door route', () => {
  assert.deepEqual(routeBetweenRooms('living', 'living'), []);
});
