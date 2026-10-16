const validLook = Object.freeze({
  hair: Object.freeze(['bald', 'crop', 'mohawk']),
  face: Object.freeze(['clean', 'mustache', 'beard']),
  top: Object.freeze(['tee', 'hoodie', 'jacket']),
  pants: Object.freeze(['cargo', 'jeans', 'shorts']),
});

function selected(value, options) {
  return options.includes(value) ? value : options[0];
}

function normalize(look = {}) {
  return Object.fromEntries(Object.entries(validLook).map(([key, options]) => [key, selected(look[key], options)]));
}

export function avatarModelPlan(look = {}) {
  const appearance = normalize(look);
  const torso = appearance.top === 'tee' ? [.72, .84, .48] : appearance.top === 'hoodie' ? [.76, .98, .52] : [.78, .96, .54];
  return {
    representation: 'three-mesh-rig',
    appearance,
    parts: [
      { id: 'torso', size: torso, position: [0, 1.48, 0] },
      { id: 'head', size: [.53, .57, .48], position: [0, 2.32, 0] },
      { id: 'ear-left', size: [.12, .18, .17], position: [-.34, 2.32, .01] },
      { id: 'ear-right', size: [.12, .18, .17], position: [.34, 2.32, .01] },
      { id: 'arm-left', size: [.28, 1.14, .28], position: [-.42, 1.26, -.08] },
      { id: 'arm-right', size: [.28, 1.14, .28], position: [.42, 1.26, .08] },
      { id: 'leg-left', size: [.28, 1.28, .3], position: [-.19, .42, -.02] },
      { id: 'leg-right', size: [.28, 1.28, .3], position: [.19, .42, .02] },
    ],
  };
}

export function avatarFacingAtYaw(yaw) {
  const fullTurn = Math.PI * 2;
  const normalized = ((yaw + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI;
  const magnitude = Math.abs(normalized);
  if (magnitude <= Math.PI / 4) return 'front';
  if (magnitude >= Math.PI * 3 / 4) return 'back';
  return normalized > 0 ? 'profile-right' : 'profile-left';
}
