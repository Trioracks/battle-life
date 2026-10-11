import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
const {createComputerView}=await import('../src/apartment-v3-computer.js').catch(()=>({}));
test('canvas texture follows glTF UV orientation, never upside-down',()=>{
 const previous=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>null})};
 try{const screen=new THREE.Mesh(new THREE.PlaneGeometry(.4,.3),new THREE.MeshBasicMaterial()),indicator=screen.clone();const v=createComputerView({THREE,screen,indicator,viewport:{width:1280,height:720}});assert.equal(screen.material.map.flipY,false);v.dispose();}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
test('monitor transition begins with the room perspective lens so narrow views do not jump',()=>{
 for(const [width,height,fov] of [[1280,900,45],[640,900,76]]){
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(.465,.315),new THREE.MeshBasicMaterial()),indicator=screen.clone();screen.position.set(4,1.2,-.6);screen.updateMatrixWorld();
  const source=new THREE.PerspectiveCamera(fov,width/height,.03,200);source.position.set(3.4,2.05,5);source.lookAt(3.4,1.35,0);source.updateMatrixWorld();
  const view=createComputerView({THREE,screen,indicator,viewport:{width,height}});view.begin(source);
  const corner=new THREE.Vector3(4.2,1.35,-.6);
  const before=corner.clone().project(source),after=corner.clone().project(view.camera);
  assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<1e-10,'monitor entry preserves the visible room framing');view.dispose();
 }
});
test('camera fits live transformed glass in landscape and portrait without mutating source',()=>{
 assert.equal(typeof createComputerView,'function');
 for(const size of [[1280,720],[640,900]])for(const ortho of [false,true]){
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(.465,.315),new THREE.MeshBasicMaterial()),indicator=screen.clone();screen.position.set(4,1.2,-.6);screen.rotation.y=.2;screen.updateMatrixWorld();
  const source=ortho?new THREE.OrthographicCamera(-3,3,2,-2,.1,80):new THREE.PerspectiveCamera(60,size[0]/size[1],.03,80);source.position.set(4,3,12);source.lookAt(4,1.2,-.6);source.updateMatrixWorld();
  const original=source.matrixWorld.clone(),mat=screen.material;
  const view=createComputerView({THREE,screen,indicator,viewport:{width:size[0],height:size[1]}});view.begin(source);
  let previous=Infinity;for(let i=0;i<=10;i++){view.update({zoom:i/10},{screen:'off',brightness:0});const distance=view.camera.position.distanceTo(screen.position);assert.ok(distance<=previous+1e-7);previous=distance;assert.ok(view.camera.matrixWorld.elements.every(Number.isFinite));if(i===5)view.resize(...size);}
  const projected=[[-.2325,-.1575,0],[.2325,.1575,0]].map(p=>new THREE.Vector3(...p).applyMatrix4(screen.matrixWorld).project(view.camera));
  assert.ok(projected[0].x<=-1&&projected[1].x>=1);assert.ok(projected[0].y<=-1&&projected[1].y>=1);
  const normal=new THREE.Vector3(0,0,1).transformDirection(screen.matrixWorld);assert.ok(view.camera.position.clone().sub(screen.position).dot(normal)>0);
  assert.ok(original.equals(source.matrixWorld));view.end();view.dispose();assert.equal(screen.material,mat);
 }
});
