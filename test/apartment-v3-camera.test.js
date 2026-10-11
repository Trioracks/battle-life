import {assetPath} from './helpers/apartment-assets.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraModes, CameraPointer, cameraPose, pickVisible, cameraAllowsFirstPerson} from '../src/apartment-v3-camera.js';
import {BoxGeometry,Mesh,MeshBasicMaterial,Raycaster,Vector3,DoubleSide,Group,PerspectiveCamera} from '../vendor/three/three.module.js';
import {createOutsideLighting} from '../src/apartment-v3-outside.js';
import fs from 'node:fs';
import {ApartmentMotion} from '../src/apartment-v3-motion.js';
test('camera cycle caches loads and preserves independent actor/time state',async()=>{
 const state={position:[3,0,.85],cameraX:3,clip:'idle',phase:'idle',minutes:1410};const before=structuredClone(state),loads=[];
 const c=new CameraModes();for(const mode of ['3D','2D','3D']){assert.equal(await c.cycle(state,async m=>loads.push(m)),true);assert.equal(c.mode,mode);}
 assert.deepEqual(loads,['3D']);assert.deepEqual(state,before);
});
test('load failure retains mode and can retry; competing switch is ignored',async()=>{
 const c=new CameraModes();assert.equal(await c.cycle({},async()=>{throw Error('offline');}),false);assert.equal(c.mode,'2D');assert.match(c.error.message,/offline/);
 let done;const pending=c.cycle({},()=>new Promise(r=>done=r));assert.equal(await c.cycle({},async()=>{}),false);done();await pending;assert.equal(c.mode,'3D');
});
test('look is independent, remembers yaw and clamps pitch; camera has no animation bob',()=>{
 const c=new CameraModes();c.look(100000,-100000);assert.equal(c.pitch,70*Math.PI/180);const p=cameraPose('3D',{position:[2,0,.85]},1.61,c);assert.deepEqual(p.position,[2,1.61,.85]);assert.equal(p.fov,60);assert.equal(p.near,.03);
 const a=cameraPose('2D',{cameraX:3},1.6,c);assert.deepEqual(a,cameraPose('2D',{cameraX:3},1.6));assert.equal(a.yaw,0);
});
test('pose restrictions and opaque swap only force 2D for bed and computer',()=>{
 for(const clip of ['seated','sleep'])assert.equal(cameraAllowsFirstPerson({clip}),false);
 const c=new CameraModes();c.mode='3D';c.onMotionEvent({type:'started',id:'computer'});assert.equal(c.mode,'3D');c.onMotionEvent({type:'swap',id:'sink'});assert.equal(c.mode,'3D');c.onMotionEvent({type:'swap',id:'computer'});assert.equal(c.mode,'2D');
});
test('visible picking blocks targets behind walls and closed doors, floor returns rail X',()=>{
 assert.deepEqual(pickVisible([{distance:4,id:'sink'}],[{distance:2}],{distance:5,x:3}),{});
 assert.deepEqual(pickVisible([{distance:1,id:'passage'}],[{distance:2}],null),{id:'passage'});
 assert.deepEqual(pickVisible([],[],{distance:2,x:4,z:-1}),{x:4});
});
test('raycasting actual closed door occludes a target, open doorway allows target',()=>{
 const material=new MeshBasicMaterial({side:DoubleSide}),door=new Mesh(new BoxGeometry(1,2,.06),material),target=new Mesh(new BoxGeometry(.3,.3,.3),material);
 door.position.set(0,1,-1);target.position.set(0,1,-3);door.updateMatrixWorld();target.updateMatrixWorld();
 const ray=new Raycaster(new Vector3(0,1,0),new Vector3(0,0,-1));
 const hits=()=>ray.intersectObject(target).map(h=>({distance:h.distance,id:'sink'}));
 assert.deepEqual(pickVisible(hits(),ray.intersectObject(door),null),{});
 door.position.x=.65;door.rotation.y=Math.PI/2;door.updateMatrixWorld();assert.deepEqual(pickVisible(hits(),ray.intersectObject(door),null),{id:'sink'});
});
test('real computer and bed transitions switch cameras at opaque swap, preserving routes',()=>{
 const config=JSON.parse(fs.readFileSync(assetPath('scene.json'),'utf8'));
 for(const id of ['computer','bed']){
  const m=new ApartmentMotion(config),c=new CameraModes();c.mode='3D';m.interact(id);let swapped=false;
  for(let i=0;i<2000&&!swapped;i++){
   m.tick(.01);for(const e of m.drainEvents()){
    const before=JSON.stringify(m);c.onMotionEvent(e);assert.equal(JSON.stringify(m),before);
    if(e.type==='swap'){assert.equal(m.fade,1);assert.equal(c.mode,'2D');swapped=true;}
   }
  }
  assert.equal(swapped,true,id);
 }
});
test('right drag never picks, left click immediately works after release',()=>{
 const input=new CameraPointer(),right={button:2,clientX:10,clientY:20},left={button:0};
 assert.equal(input.start(right,false),false);assert.equal(input.canPick(right),false);
 assert.equal(input.start(right,true),true);assert.equal(input.canPick(right),false);assert.equal(input.canPick(left),false);
 assert.deepEqual(input.move({clientX:30,clientY:14}),[20,-6]);input.stop();assert.equal(input.canPick(left),true);assert.equal(input.move({clientX:100,clientY:100}),null);
});
test('side follow centers the hero at every approach depth',()=>{
 for(const z of [.85,-.3,-1.1]){const pose=cameraPose('2D',{cameraX:3,position:[3,0,z]},1.63);assert.equal(pose.target[0],3);assert.equal(pose.position[0],3);}
});
test('side perspective frames the whole avatar on wide and narrow viewports while distant objects shrink',()=>{
 for(const aspect of [1280/900,640/900]){
  const pose=cameraPose('2D',{cameraX:3.4,position:[3.4,0,.85]},1.63);
  assert.ok(Number.isFinite(pose.fov),'side view supplies a perspective lens');
  const camera=new PerspectiveCamera(pose.fov,aspect,pose.near,200);camera.position.fromArray(pose.position);camera.lookAt(new Vector3(...pose.target));camera.updateMatrixWorld();
  const positions=[[3.4,0,.85],[3.4,1.75,.85]];
  if(aspect>=1)positions.push([2.11,2.58,-1.72],[5.09,1.12,-1.72]);
  for(const position of positions){
   const p=new Vector3(...position).project(camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,`room framing ${aspect}: ${position} projects to ${p.toArray()}`);
  }
  const width=z=>new Vector3(3.9,1.35,z).project(camera).x-new Vector3(2.9,1.35,z).project(camera).x;
  assert.ok(width(-31.5)<width(-1.72)*.25,'the courtyard keeps depth behind the room windows');
 }
});
test('side follow fills the vertical view with the room instead of exposing above-wall scenery or below-floor void',()=>{
 for(const aspect of [1280/900,640/900]){
  const pose=cameraPose('2D',{cameraX:3.4,position:[3.4,0,.85]},1.63),camera=new PerspectiveCamera(pose.fov,aspect,pose.near,200);
  camera.position.fromArray(pose.position);camera.lookAt(new Vector3(...pose.target));camera.updateMatrixWorld();
  assert.ok(new Vector3(3.4,3,-1.72).project(camera).y>=1,'the authored rear wall reaches the top edge');
  assert.ok(new Vector3(3.4,0,1.82).project(camera).y<=-1,'the authored floor extends below the bottom edge');
  assert.ok(new Vector3(3.4,0,.85).project(camera).y>-.56,'hero feet leave room for the compact action dock');
 }
});
test('a computer swap invalidates a first-person load already in flight',async()=>{
 const c=new CameraModes();let resolve;const pending=c.cycle({clip:'idle'},()=>new Promise(r=>resolve=r));
 c.onMotionEvent({type:'swap',id:'computer'});resolve();assert.equal(await pending,false);assert.equal(c.mode,'2D');
});
test('unsupported saved camera state normalizes before switching',async()=>{
 const c=new CameraModes();c.mode='2.5D';let loaded;
 assert.equal(await c.cycle({clip:'idle'},async id=>{loaded=id;}),true);assert.equal(c.mode,'3D');assert.equal(loaded,'3D');
});
test('outside windows and sky follow daylight without changing interior brass',()=>{
 const root=new Group();for(const name of ['static-outside-window-lights','static-dusty-blue-night-glass','static-distant-panel-buildings','static-aged-brass']){const mesh=new Mesh(new BoxGeometry(),new MeshBasicMaterial());mesh.name=name;root.add(mesh);}
 const update=createOutsideLighting(root);update(0);assert.equal(root.children[0].visible,true);assert.ok(root.children[1].material.color.r<.2);update(1);assert.equal(root.children[0].visible,false);assert.equal(root.children[1].material.color.r,1);assert.equal(root.children[3].material.color.r,1);
});
