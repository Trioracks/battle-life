import {assetPath} from './helpers/apartment-assets.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import { Group, Mesh } from '../vendor/three/three.module.js';
import {
  APPEARANCE_OPTIONS, DEFAULT_APPEARANCE, STAT_KEYS, STAT_LABELS, SAVE_KEY,
  normalizeAppearance, applyAppearance, createProfile, saveProfile, loadProfile,
} from '../src/avatar-v3-profile.js?rev=28';

const allocations = {
  intelligence: 2, writing: 2, musicality: 1, flow: 1, beatmaking: 1,
  sound: 1, charisma: 1, confidence: 1, resilience: 0,
};
const expectedSkills = {
  intelligence: 30, writing: 30, musicality: 20, flow: 20, beatmaking: 20,
  sound: 20, charisma: 20, confidence: 20, resilience: 10,
};
const expectedDefault = {
  hair: 'crop', face: 'oval', beard: 'none', mustache: 'none',
  top: 'tee', bottom: 'jeans', footwear: 'sneakers',
  topColor:'blue',bottomColor:'blue',footwearColor:'grey',
};

function profile(overrides = {}) {
  return { version: 3, name: 'Миша', skills: { ...expectedSkills }, appearance: { ...expectedDefault }, ...overrides };
}

// Browser storage is unavailable in Node. This adapter preserves its string/key semantics.
function memoryStorage(initial = {}) {
  const records = new Map(Object.entries(initial));
  return {
    getItem: (key) => records.has(key) ? records.get(key) : null,
    setItem: (key, value) => records.set(String(key), String(value)),
  };
}

test('appearance normalization supplies all defaults without accepting legacy or unknown options', () => {
  assert.deepEqual(normalizeAppearance(null), expectedDefault);
  assert.deepEqual(normalizeAppearance({ hair: 'mohawk', face: 'beard', pants: 'jeans', top: 'coat', footwear: 2 }), expectedDefault);
  assert.deepEqual(DEFAULT_APPEARANCE, expectedDefault);
});

test('multi-material GLTF primitive children remain visible with their selected look', () => {
  const root=new Group(),selected=new Group(),other=new Group();
  selected.name='look-face-square';other.name='look-face-oval';root.add(selected,other);
  const skin=new Mesh(),eye=new Mesh(),hidden=new Mesh();
  skin.name='look-face-square_1';eye.name='look-face-square_2';hidden.name='look-face-oval_1';
  selected.add(skin,eye);other.add(hidden);
  applyAppearance(root,{face:'square'});
  assert.equal(selected.visible,true);assert.equal(skin.visible,true);assert.equal(eye.visible,true);
  assert.equal(other.visible,false);assert.equal(hidden.visible,false);
  applyAppearance(root,{face:'oval'});
  assert.equal(selected.visible,false);assert.equal(skin.visible,false);assert.equal(hidden.visible,true);
});

test('actual GLTFLoader primitive children inherit fitted look ownership across every face and sibling', async () => {
  // Match the browser import map without installing a second Three.js copy.
  const hook=registerHooks({resolve(specifier,context,nextResolve){
    return nextResolve(specifier==='three'?new URL('../vendor/three/three.module.js',import.meta.url).href:specifier,context);
  }});
  let GLTFLoader;
  try{({GLTFLoader}=await import('../vendor/three/addons/loaders/GLTFLoader.js'));}finally{hook.deregister();}
  const bytes=fs.readFileSync(assetPath('mannequin.glb'));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const owners=[];
  gltf.scene.traverse(node=>{
    const match=/^look-(hair|beard|mustache)-([^-]+)(?:-|$)/.exec(node.name);
    if(match&&node.userData.faceVariant)owners.push({node,category:match[1],style:match[2],face:node.userData.faceVariant});
  });
  assert.equal(owners.length,36,'all exported fitted hair/beard/moustache owners must be exercised');
  applyAppearance(gltf.scene,{face:'square',beard:'full'});
  const squareFull=owners.find(owner=>owner.face==='square'&&owner.category==='beard'&&owner.style==='full').node;
  squareFull.traverse(child=>assert.equal(child.visible,true,child.name+' must render the selected square full beard'));
  for(const face of ['oval','square','long'])for(const [category,styles] of Object.entries({hair:['buzz','lake'],beard:['stubble','short','full','goatee','chinstrap'],mustache:['pencil','classic','walrus','handlebar','horseshoe']}))for(const style of styles){
    applyAppearance(gltf.scene,{face,hair:'bald',beard:'none',mustache:'none',[category]:style});
    for(const owner of owners){
      const expected=owner.face===face&&owner.category===category&&owner.style===style;
      assert.equal(owner.node.visible,expected,owner.node.name+' owner');
      owner.node.traverse(child=>assert.equal(child.visible,expected,`${face}/${category}/${style}: ${child.name} must inherit ${owner.node.name}`));
    }
  }
  applyAppearance(gltf.scene,{face:'square',hair:'bald',beard:'none',mustache:'none'});
  for(const {node} of owners)node.traverse(child=>assert.equal(child.visible,false,child.name+' must hide when deselected'));
});

test('every catalog option survives normalization and has a readable Russian UI label', () => {
  for (const [category, group] of Object.entries(APPEARANCE_OPTIONS)) {
    assert.match(group.label, /[А-Яа-яЁё]/);
    for (const option of group.options) {
      assert.match(option.label, /[А-Яа-яЁё]/);
      assert.equal(normalizeAppearance({ [category]: option.id })[category], option.id);
    }
  }
  assert.deepEqual(normalizeAppearance({
    hair: 'parted', face: 'square', beard: 'stubble', mustache: 'classic',
    top: 'shirt', bottom: 'breeches', footwear: 'flipflops',
  }), {
    topColor:'blue',bottomColor:'blue',footwearColor:'grey',
    hair: 'parted', face: 'square', beard: 'stubble', mustache: 'classic',
    top: 'shirt', bottom: 'breeches', footwear: 'ankleboots',
  });
  assert.deepEqual(normalizeAppearance({
    hair: 'shaggy', face: 'long', beard: 'full', top: 'hoodie', bottom: 'sports', footwear: 'boots',
  }), {
    hair: 'bowl', face: 'long', beard: 'full', mustache: 'none',
    topColor:'blue',bottomColor:'blue',footwearColor:'grey',
    top: 'hoodie', bottom: 'sports', footwear: 'boots',
  });
  assert.equal(normalizeAppearance({ top: 'sweater', bottom: 'shorts', footwear: 'sandals' }).bottom, 'shorts');
});

test('appearance selection switches real nested Three meshes and all pieces of a selected outfit', () => {
  const model = new Group();
  const wardrobe = new Group();
  model.add(wardrobe);
  const nodes = Object.fromEntries([
    'look-hair-crop', 'look-hair-shaggy', 'look-top-tee', 'look-top-hoodie',
    'look-top-hoodie-sleeve-left', 'look-beard-full', 'look-mustache-classic',
  ].map((name) => {
    const node = new Mesh();
    node.name = name;
    wardrobe.add(node);
    return [name, node];
  }));

  applyAppearance(model, { hair: 'shaggy', top: 'hoodie', beard: 'full', mustache: 'classic' });
  assert.equal(nodes['look-hair-crop'].visible, false);
  assert.equal(nodes['look-hair-shaggy'].visible, true);
  assert.equal(nodes['look-top-tee'].visible, false);
  assert.equal(nodes['look-top-hoodie'].visible, true);
  assert.equal(nodes['look-top-hoodie-sleeve-left'].visible, true);
  assert.equal(nodes['look-beard-full'].visible, true);
  assert.equal(nodes['look-mustache-classic'].visible, true);

  assert.deepEqual(applyAppearance(model, {}), expectedDefault);
  assert.equal(nodes['look-hair-crop'].visible, true);
  assert.equal(nodes['look-hair-shaggy'].visible, false);
  assert.equal(nodes['look-top-tee'].visible, true);
  assert.equal(nodes['look-top-hoodie-sleeve-left'].visible, false);
  assert.equal(nodes['look-beard-full'].visible, false);
  assert.equal(nodes['look-mustache-classic'].visible, false);
});

test('appearance switching preserves structural nodes and hides unsupported variants of known categories', () => {
  const model = new Group();
  const names = ['body', 'look-accessory-watch', 'look-top-hoodieish', 'look-top-retired', 'look-top-hoodie'];
  const nodes = names.map((name) => {
    const node = new Group();
    node.name = name;
    model.add(node);
    return node;
  });
  nodes[0].visible = false;
  applyAppearance(model, { top: 'hoodie' });
  assert.deepEqual(nodes.map((node) => node.visible), [false, true, false, false, true]);
  assert.deepEqual(applyAppearance(null, {}), expectedDefault);
});

test('profile creation trims names and derives the nine skills without converting v3 appearance to legacy look', () => {
  const result = createProfile({ name: '  Миша  ', allocations, appearance: { face: 'long', top: 'shirt', bottom: 'jeans' } });
  assert.equal(result.name,'Миша');assert.equal(result.version,4);assert.equal(result.skillSchema,2);assert.deepEqual(Object.values(result.skills),Array(9).fill(0));assert.deepEqual(result.appearance,{...expectedDefault,face:'long',top:'shirt'});assert.deepEqual(result.wardrobe.top,[{id:'shirt',color:'blue'}]);
  assert.equal(Object.hasOwn(result, 'look'), false);
  assert.deepEqual(STAT_KEYS, Object.keys(expectedSkills));
  assert.equal(STAT_LABELS.writing, 'Письмо');
});

test('profile creation rejects blank and non-string names', () => {
  for (const name of ['', '  ', null, undefined, 17, {}, []]) {
    assert.throws(() => createProfile({ name, allocations }), /имя/i);
  }
});

test('obsolete allocations of every shape cannot change the novice baseline', () => {
  for (const resilience of [-1, 0.5, '0', null, NaN, Infinity, false]) {
    assert.deepEqual(Object.values(createProfile({ name: 'Миша', allocations: { ...allocations, resilience } }).skills),Array(9).fill(0));
  }
  for (const invalid of [null, undefined, [], 'points']) {
    assert.deepEqual(Object.values(createProfile({ name: 'Миша', allocations: invalid }).skills),Array(9).fill(0));
  }
});

test('saving and loading uses the isolated v3 key and preserves the old campaign', () => {
  const storage = memoryStorage({ 'battle-life-campaign': 'legacy campaign' });
  const result = saveProfile(storage, profile({ name: '  Миша  ' }));
  assert.equal(result.ok, true);
  assert.equal(SAVE_KEY, 'battle-life-apartment-v3');
  assert.deepEqual(JSON.parse(storage.getItem('battle-life-apartment-v3')), profile({voiceId:'player-voice:original'}));
  assert.equal(storage.getItem('battle-life-campaign'), 'legacy campaign');
  assert.deepEqual(loadProfile(storage), { ok: true, profile: profile({voiceId:'player-voice:original'}) });
});

test('saving revalidates profile skills and does not overwrite a good save with malformed input', () => {
  const storage = memoryStorage({ 'battle-life-apartment-v3': JSON.stringify(profile()) });
  const malformed = [
    null, [], {}, profile({ version: 2 }), profile({ name: ' ' }), profile({ name: {} }),
    profile({ skills: { ...expectedSkills, intelligence: 50 } }),
    profile({ skills: { ...expectedSkills, intelligence: 60, writing: 0 } }),
    profile({ skills: { ...expectedSkills, intelligence: 25, writing: 35 } }),
    profile({ skills: { ...expectedSkills, resilience: '10' } }),
    profile({ skills: { ...expectedSkills, resilience: undefined } }),
  ];
  for (const value of malformed) {
    const result = saveProfile(storage, value);
    assert.equal(result.ok, false);
    assert.equal(typeof result.error, 'string');
    assert.deepEqual(JSON.parse(storage.getItem('battle-life-apartment-v3')), profile());
  }
});

test('loading revalidates stored names, versions, all skills, and total point budget', () => {
  const invalid = [
    'not json', 'null', '[]', '{}',
    JSON.stringify(profile({ version: 4 })),
    JSON.stringify(profile({ name: 42 })),
    JSON.stringify(profile({ name: '  ' })),
    JSON.stringify(profile({ skills: { ...expectedSkills, resilience: 0 } })),
    JSON.stringify(profile({ skills: { ...expectedSkills, resilience: '10' } })),
    JSON.stringify(profile({ skills: { ...expectedSkills, confidence: 15, charisma: 25 } })),
    JSON.stringify(profile({ skills: { ...expectedSkills, confidence: 30 } })),
    JSON.stringify(profile({ skills: { ...expectedSkills, resilience: undefined } })),
  ];
  for (const saved of invalid) {
    const result = loadProfile(memoryStorage({ 'battle-life-apartment-v3': saved }));
    assert.equal(result.ok, false, saved);
    assert.equal(result.profile, null);
    assert.equal(typeof result.error, 'string');
  }
});

test('loading normalizes legacy cosmetics and preserves unrelated snapshot properties', () => {
  const stored = profile({ name: '  Миша  ', appearance: { top: 'shirt', bottom: 'missing', cap: 'red' }, campaign: 'unrelated' });
  const result = loadProfile(memoryStorage({ 'battle-life-apartment-v3': JSON.stringify(stored) }));
  assert.deepEqual(result, { ok: true, profile: profile({ voiceId:'player-voice:original',appearance: { ...expectedDefault, top: 'shirt' },campaign:'unrelated' }) });
});

test('missing saves and inaccessible storage are safe explicit results', () => {
  assert.deepEqual(loadProfile(memoryStorage()), { ok: true, profile: null });
  const denied = {
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('denied'); },
  };
  for (const storage of [null, {}, denied]) {
    assert.equal(saveProfile(storage, profile()).ok, false);
    assert.equal(loadProfile(storage).ok, false);
    assert.equal(loadProfile(storage).profile, null);
  }
});
