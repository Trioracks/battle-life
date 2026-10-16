import test from 'node:test';
import assert from 'node:assert/strict';
import {Quaternion,Vector3} from '../vendor/three/three.module.js';
const api=await import('../src/apartment-head-pose.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('head camera uses world-space seated head and offset, never an overview position',()=>{
 assert.equal(typeof api.headCameraPose,'function');
 const head={position:[4.48,1.35,-.02],quaternion:[0,1,0,0],eyeOffset:[0,.09,.1]},before=structuredClone(head);
 const pose=api.headCameraPose(head);assert.ok(new Vector3(...pose.position).distanceTo(new Vector3(4.48,1.44,-.12))<1e-12);
 const direction=new Vector3(0,0,-1).applyQuaternion(new Quaternion(...pose.quaternion));assert.ok(direction.z<-.99);assert.ok(new Vector3(...pose.position).distanceTo(new Vector3(...head.position))<.2);
 assert.equal(pose.fov,60);assert.equal(pose.near,.03);assert.deepEqual(head,before);
});
