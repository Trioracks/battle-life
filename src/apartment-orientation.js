const fixtureFacing = Object.freeze({
  computer: Math.PI,
  microphone: Math.PI,
  fridge: Math.PI,
  stove: Math.PI,
  sink: Math.PI,
  door: Math.PI,
  bed: Math.PI / 2,
});

export function walkYaw(facing) {
  return Number(facing) >= 0 ? Math.PI / 2 : -Math.PI / 2;
}

export function cameraYaw() {
  return 0;
}

export function actionYaw(actionId) {
  return fixtureFacing[actionId] ?? cameraYaw();
}

function normalizedYaw(yaw) {
  const fullTurn = Math.PI * 2;
  return ((yaw + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI;
}

// Gameplay yaw selects a prepared 2.5D silhouette. The visual panel cancels
// that yaw so the selected face, torso and limbs remain on one screen plane.
export function avatarFacingForYaw(yaw) {
  const normalized = normalizedYaw(yaw);
  const angle = Math.abs(normalized);
  const billboardYaw = normalized === 0 ? 0 : normalized === -Math.PI ? -Math.PI : -normalized;
  if (angle <= Math.PI / 4) {
    return { face: 'front', visibleArm: 'both', profileLocalYaw: 0, billboardYaw, bodyWidth: 1 };
  }
  if (angle >= Math.PI * 3 / 4) {
    return { face: 'back', visibleArm: 'both', profileLocalYaw: 0, billboardYaw, bodyWidth: 1 };
  }
  return normalized >= 0
    ? { face: 'profile-right', visibleArm: 'back', profileLocalYaw: 0, billboardYaw, bodyWidth: .72 }
    : { face: 'profile-left', visibleArm: 'front', profileLocalYaw: 0, billboardYaw, bodyWidth: .72 };
}

export function shouldPauseWalkForTurn(turn) {
  return turn !== null && turn !== undefined;
}
