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

// The profile is drawn on the actual side plane of the head. It therefore
// inherits the body's yaw instead of counter-rotating towards the camera.
export function avatarFacingForYaw(yaw) {
  const angle = Math.abs(normalizedYaw(yaw));
  if (angle <= Math.PI / 4) {
    return { face: 'front', visibleArm: 'both', profileLocalYaw: 0 };
  }
  if (angle >= Math.PI * 3 / 4) {
    return { face: 'back', visibleArm: 'both', profileLocalYaw: 0 };
  }
  return normalizedYaw(yaw) >= 0
    ? { face: 'profile-right', visibleArm: 'back', profileLocalYaw: 0 }
    : { face: 'profile-left', visibleArm: 'front', profileLocalYaw: 0 };
}

export function shouldPauseWalkForTurn(turn) {
  return turn !== null && turn !== undefined;
}
