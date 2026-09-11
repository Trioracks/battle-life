export const APARTMENT_FLOOR_Y = 0;

export const APARTMENT_ROOMS = Object.freeze({
  living: Object.freeze({ id: 'living', left: -0.3, right: 5.15, doorX: -0.18 }),
  kitchen: Object.freeze({ id: 'kitchen', left: -5.15, right: -0.42, doorX: -0.42 }),
});

const actionRooms = Object.freeze({
  computer: 'living',
  bed: 'living',
  microphone: 'living',
  door: 'living',
  fridge: 'kitchen',
  stove: 'kitchen',
  sink: 'kitchen',
});

export function getApartmentRoom(actionId) {
  return actionRooms[actionId] ?? null;
}

export function routeBetweenRooms(fromRoom, toRoom) {
  if (!APARTMENT_ROOMS[fromRoom] || !APARTMENT_ROOMS[toRoom]) {
    throw new Error('Неизвестная комната квартиры.');
  }
  if (fromRoom === toRoom) return [];
  return [`${fromRoom}-door`, `${toRoom}-door`];
}
