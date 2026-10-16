const staging = Object.freeze({
  computer: { approach: { x: 4.35, z: 0 }, facing: 'back', blockers: [{ x: [4.55, 5.55], z: [-.3, .8] }], transition: 'desk-fade' },
  microphone: { approach: { x: 4.35, z: 0 }, facing: 'back', blockers: [{ x: [4.55, 5.55], z: [-.3, .8] }], transition: 'desk-fade' },
  bed: { approach: { x: 1.25, z: 0 }, facing: 'profile', blockers: [{ x: [.35, 2.4], z: [-.2, .9] }], transition: 'bed-fade' },
  fridge: { approach: { x: -5.25, z: 0 }, facing: 'back', blockers: [{ x: [-6.35, -5.15], z: [-.1, .8] }], transition: 'visible' },
  stove: { approach: { x: -4.2, z: 0 }, facing: 'back', blockers: [{ x: [-5.15, -3.8], z: [-.1, .8] }], transition: 'visible' },
  sink: { approach: { x: -3.05, z: 0 }, facing: 'back', blockers: [{ x: [-3.95, -2.55], z: [-.1, .8] }], transition: 'visible' },
  door: { approach: { x: 7.15, z: 0 }, facing: 'profile', blockers: [{ x: [7.28, 8.15], z: [-.1, .9] }], transition: 'visible' },
});

export function getInteractionStaging(id) {
  const value = staging[id];
  return value ? { ...value, approach: { ...value.approach }, blockers: value.blockers.map((blocker) => ({ x: [...blocker.x], z: [...blocker.z] })) } : null;
}

export function isWalkTargetAllowed(point, blockers = []) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.z)) return false;
  return !blockers.some((blocker) => point.x >= blocker.x[0] && point.x <= blocker.x[1] && point.z >= blocker.z[0] && point.z <= blocker.z[1]);
}

export const apartmentInteractionIds = Object.freeze(Object.keys(staging));
