import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
test('smoke uses deterministic bounded geometry and remains still at unchanged game time',async()=>{
 const {createSmoke}=await import('../src/apartment-v3-smoke.js');
 const config={emitters:[{id:'west',position:[-8,20,-75],seed:14},{id:'east',position:[8,24,-82],seed:53}]};
 const a=createSmoke(THREE,config),b=createSmoke(THREE,config);a.update(5,.7);b.update(5,.7);
 assert.deepEqual([...a.root.children[0].instanceMatrix.array],[...b.root.children[0].instanceMatrix.array]);
 const before=[...a.root.children[0].instanceMatrix.array];a.update(5,.1);assert.deepEqual([...a.root.children[0].instanceMatrix.array],before);
 a.update(6,.1);assert.notDeepEqual([...a.root.children[0].instanceMatrix.array],before);assert.equal(a.root.children.length,2);
 for(const mesh of a.root.children){assert.equal(mesh.count,18);assert.ok([...mesh.instanceMatrix.array].every(Number.isFinite));}
 let disposed=0;a.root.children[0].geometry.addEventListener('dispose',()=>disposed++);a.dispose();assert.equal(disposed,1);b.dispose();
});
