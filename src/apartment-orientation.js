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

// A side-facing body needs its own one-eye profile instead of a rotated copy
// of the front face. Keeping the choice here makes the presentation stable
// for every turn angle.
export function facePresentationForYaw(yaw) {
  const angle = Math.abs(normalizedYaw(yaw));
  if (angle <= Math.PI / 4) return 'front';
  if (angle >= Math.PI * 3 / 4) return 'back';
  return 'profile';
}

export function profileMirrorScale(yaw) {
  return normalizedYaw(yaw) >= 0 ? 1 : -1;
}
