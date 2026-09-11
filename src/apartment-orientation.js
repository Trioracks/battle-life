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
