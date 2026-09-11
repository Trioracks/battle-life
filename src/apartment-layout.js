export const APARTMENT_FLOOR_Y = 0;
export const APARTMENT_SPAWN = Object.freeze({ room: 'living', x: 3.5 });
export const APARTMENT_DESK = Object.freeze({ x: 5.38, surfaceY: 1.32 });
export const APARTMENT_MICROPHONE = Object.freeze({ x: 4.43, baseY: 1.39 });

export const APARTMENT_ROOMS = Object.freeze({
  living: Object.freeze({ id: 'living', left: -.8, right: 8.2, doorX: -.8 }),
  kitchen: Object.freeze({ id: 'kitchen', left: -6.2, right: -1.05, doorX: -1.05 }),
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

export function apartmentWalkTargets(fromRoom, toRoom, targetX) {
  if (!APARTMENT_ROOMS[fromRoom] || !APARTMENT_ROOMS[toRoom]) {
    throw new Error('Неизвестная комната квартиры.');
  }
  if (!Number.isFinite(targetX)) throw new Error('Маршруту нужна числовая точка назначения.');
  if (fromRoom === toRoom) return [targetX];
  return [APARTMENT_ROOMS[fromRoom].doorX, APARTMENT_ROOMS[toRoom].doorX, targetX];
}

export function cameraTargetX(actorX) {
  if (!Number.isFinite(actorX)) throw new Error('Камере нужна числовая позиция героя.');
  return actorX;
}
