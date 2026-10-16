import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js?module';

const loader = new GLTFLoader();

const palette = Object.freeze({
  tee: 0x627c79,
  hoodie: 0x263d46,
  sweater: 0x53675c,
  shorts: 0x66614a,
  breeches: 0x62634f,
  sports: 0x35454c,
  cargo: 0x555e44,
  trousers: 0x373a3c,
  sandals: 0x796e54,
  sneakers: 0xd7d4c4,
  canvas: 0xd0c5b0,
  shoes: 0x2a2827,
  boots: 0x4a4035,
});

function materialSlots(root) {
  const slots = {};
  root.traverse((node) => {
    if (!node.isMesh) return;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (material?.name) slots[material.name] = material;
    }
  });
  return slots;
}

function visibility(root, name, visible) {
  const node = root.getObjectByName(name);
  if (node) node.visible = visible;
}

function applyLook(root, look = {}) {
  const slots = materialSlots(root);
  if (slots.top && palette[look.top]) slots.top.color.setHex(palette[look.top]);
  if (slots.pants && palette[look.pants]) slots.pants.color.setHex(palette[look.pants]);
  if (slots.footwear && palette[look.footwear]) slots.footwear.color.setHex(palette[look.footwear]);
  visibility(root, 'variant-hood', look.top === 'hoodie');
  visibility(root, 'variant-shorts-calves', look.pants === 'shorts');
  visibility(root, 'variant-sandals', look.footwear === 'sandals');
  visibility(root, 'variant-boots', look.footwear === 'boots');
  visibility(root, 'facial-hair-mustache', look.face === 'mustache');
  visibility(root, 'facial-hair-beard', look.face === 'beard');
}

/** One skinned mesh plus a real armature; no independent face or shoulder layers. */
export async function loadAvatarRig({
  modelUrl = './assets/models/avatar.glb',
  animationUrl = './assets/models/avatar-animations.glb',
  look = {},
} = {}) {
  const [model, animationBank] = await Promise.all([loader.loadAsync(modelUrl), loader.loadAsync(animationUrl)]);
  const root = model.scene;
  root.name = 'authored-avatar-rig';
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
  });
  applyLook(root, look);

  const mixer = new THREE.AnimationMixer(root);
  const clips = new Map(animationBank.animations.map((clip) => [clip.name, clip]));
  const actions = new Map();
  let active = null;

  function play(name, fade = .12) {
    const clip = clips.get(name) ?? clips.get('idle');
    if (!clip || active?.getClip() === clip) return;
    const next = actions.get(clip.name) ?? mixer.clipAction(clip);
    actions.set(clip.name, next);
    if (active) active.fadeOut(fade);
    next.reset().setEffectiveWeight(1).fadeIn(fade).play();
    active = next;
  }

  play('idle', 0);
  return {
    root,
    play,
    update(delta) { mixer.update(delta); },
    setLook(nextLook) { applyLook(root, nextLook); },
  };
}
