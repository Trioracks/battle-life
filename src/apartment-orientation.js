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

const avatarRigs = Object.freeze({
  front: Object.freeze({ headWidth: 1, torsoWidth: 1, armXs: Object.freeze([-.42, .42]), legXs: Object.freeze([-.19, .19]), frontDetails: true }),
  'profile-right': Object.freeze({ headWidth: .78, torsoWidth: .72, armXs: Object.freeze([-.32]), legXs: Object.freeze([-.14, .14]), frontDetails: false }),
  back: Object.freeze({ headWidth: 1, torsoWidth: 1, armXs: Object.freeze([-.42, .42]), legXs: Object.freeze([-.19, .19]), frontDetails: false }),
  'profile-left': Object.freeze({ headWidth: .78, torsoWidth: .72, armXs: Object.freeze([.32]), legXs: Object.freeze([-.14, .14]), frontDetails: false }),
});

// Gameplay yaw selects a prepared 2.5D silhouette. The visual panel cancels
// that yaw so the selected face, torso and limbs remain on one screen plane.
export function avatarFacingForYaw(yaw) {
  const normalized = normalizedYaw(yaw);
  const angle = Math.abs(normalized);
  const billboardYaw = normalized === 0 ? 0 : normalized === -Math.PI ? -Math.PI : -normalized;
  if (angle <= Math.PI / 4) {
    return { face: 'front', visibleArm: 'both', profileLocalYaw: 0, billboardYaw, bodyWidth: 1, rig: avatarRigs.front };
  }
  if (angle >= Math.PI * 3 / 4) {
    return { face: 'back', visibleArm: 'both', profileLocalYaw: 0, billboardYaw, bodyWidth: 1, rig: avatarRigs.back };
  }
  return normalized >= 0
    ? { face: 'profile-right', visibleArm: 'back', profileLocalYaw: 0, billboardYaw, bodyWidth: .72, rig: avatarRigs['profile-right'] }
    : { face: 'profile-left', visibleArm: 'front', profileLocalYaw: 0, billboardYaw, bodyWidth: .72, rig: avatarRigs['profile-left'] };
}

export function shouldPauseWalkForTurn(turn) {
  return turn !== null && turn !== undefined;
}
