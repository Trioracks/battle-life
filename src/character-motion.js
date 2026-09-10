const WALK_SPEED = 3;

export function stepCharacter(character, keys, deltaSeconds, room) {
  const direction = Number(keys.right) - Number(keys.left);

  if (direction === 0) {
    return { ...character, moving: false };
  }

  const x = Math.min(
    room.right,
    Math.max(room.left, character.x + direction * WALK_SPEED * deltaSeconds),
  );

  return { x, facing: direction, moving: true };
}
