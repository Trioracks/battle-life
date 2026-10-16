import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js?module';

const loader = new GLTFLoader();

const interactionAnchors = Object.freeze({
  fridge: 'fridge-body',
  stove: 'stove-top',
  sink: 'sink-basin',
  bed: 'bed-mattress',
  computer: 'crt-screen',
  microphone: 'mic-capsule',
  door: 'entry-door-slab',
});

function makeInteractionMesh(id, anchor) {
  const bounds = new THREE.Box3().setFromObject(anchor);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(.72, size.x + .22), Math.max(.75, size.y + .28), Math.max(.34, size.z + .48)),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hit.name = `apartment-hit-${id}`;
  hit.position.copy(center);
  hit.position.z += .26;
  hit.userData.actionId = id;

  const highlight = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(.76, size.x + .3), Math.max(.8, size.y + .36), Math.max(.38, size.z + .54)),
    new THREE.MeshBasicMaterial({ color: 0xe3bf61, transparent: true, opacity: .17, depthWrite: false }),
  );
  highlight.name = `apartment-highlight-${id}`;
  highlight.position.copy(hit.position);
  highlight.visible = false;
  return { hit, highlight };
}

/**
 * Loads the authored first apartment. Interaction volumes are derived from the
 * visible objects, so gameplay clicks do not depend on the retired blockout.
 */
export async function loadApartmentScene({
  scene,
  modelUrl = './assets/models/apartment-first-location.glb',
} = {}) {
  if (!scene) throw new Error('Для квартиры нужна сцена Three.js.');
  const gltf = await loader.loadAsync(modelUrl);
  const root = gltf.scene;
  root.name = 'authored-first-apartment';
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
  });
  scene.add(root);

  root.updateWorldMatrix(true, true);
  const hitAreas = [];
  const highlights = {};
  for (const [id, anchorName] of Object.entries(interactionAnchors)) {
    const anchor = root.getObjectByName(anchorName);
    if (!anchor) continue;
    const { hit, highlight } = makeInteractionMesh(id, anchor);
    root.add(hit, highlight);
    hitAreas.push(hit);
    highlights[id] = highlight;
  }
  return { root, hitAreas, highlights };
}
