import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assetPath} from './helpers/apartment-assets.js';
const glb=name=>{const b=fs.readFileSync(assetPath(name));return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());};
test('manifest declares both live CRT surfaces with finite nonzero bounds',()=>{
 const manifest=JSON.parse(fs.readFileSync(assetPath('scene.json')));
 assert.deepEqual(manifest.computer,{screen:'crt-glass',indicator:'crt-power-led'});
 const live=glb(manifest.geometry),baked=glb(manifest.staticGeometry);
 for(const name of Object.values(manifest.computer)){
  const nodes=live.nodes.filter(n=>n.name===name);assert.equal(nodes.length,1);
  assert.equal(nodes[0].extras.apartment_role,'computer-live');
  const position=live.accessors[live.meshes[nodes[0].mesh].primitives[0].attributes.POSITION];
  assert.ok(position.min.every(Number.isFinite)&&position.max.every(Number.isFinite));
  assert.ok(position.max[0]>position.min[0]&&position.max[1]>position.min[1]);
  assert.ok(position.max[1]-position.min[1]>(position.max[2]-position.min[2])*2,'local +Z is outward, local +Y is up');
  assert.ok(!baked.nodes.some(n=>n.name===name||n.extras?.apartment_role==='computer-live'));
 }
 assert.ok(!baked.materials.some(m=>/crt-off|crt-led/.test(m.name)));
});
