import test from 'node:test';
import assert from 'node:assert/strict';
import {ApartmentTime,saveHomeTime,loadHomeTime} from '../src/apartment-v3-time.js?rev=28';
import {ApartmentMotion} from '../src/apartment-v3-motion.js';
import {advanceHomeFrame} from '../src/apartment-v3-runtime.js?rev=28';
import * as THREE from '../vendor/three/three.module.js';
import {readGlb} from './helpers/glb-pose.js';
const style=await import('../src/apartment-switch-style.js?rev=28').catch(()=>({}));

function switchFixture(){
  const {json:g}=readGlb('interaction.glb'),scene=new THREE.Group(),original=new THREE.MeshStandardMaterial({color:0x202018,map:new THREE.Texture()});
  for(const room of ['living','kitchen']){
    const node=g.nodes.find(n=>n.name==='switch-'+room+'-root'),root=new THREE.Group();root.name=node.name;root.position.fromArray(node.translation);scene.add(root);
    for(const i of node.children){
      const n=g.nodes[i],a=g.accessors[g.meshes[n.mesh].primitives[0].attributes.POSITION],size=a.max.map((v,i)=>v-a.min[i]);
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),original);mesh.name=n.name.replaceAll('.','_');if(n.translation)mesh.position.fromArray(n.translation);if(n.rotation)mesh.quaternion.fromArray(n.rotation);root.add(mesh);
    }
  }
  for(const name of ['socket','switch-bedroom-rocker','switch-living-rocker-decoration']){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),original);mesh.name=name;mesh.position.set(9,1,0);scene.add(mesh);}
  scene.updateMatrixWorld(true);return {scene,original};
}

test('switch styling replaces dark baked surfaces only on known switch parts without moving ray targets',()=>{
  assert.equal(typeof style.applySwitchStyle,'function');const {scene,original}=switchFixture(),originalColor=original.color.clone(),originalMap=original.map;
  const before=new Map();scene.traverse(o=>{if(o.isMesh)before.set(o,{matrix:o.matrixWorld.clone(),geometry:o.geometry});});
  const rays=['living','kitchen'].map(room=>{const root=scene.getObjectByName('switch-'+room+'-root');return new THREE.Raycaster(new THREE.Vector3(root.position.x,root.position.y,2),new THREE.Vector3(0,0,-1));});
  const hits=rays.map(ray=>ray.intersectObject(scene,true).map(hit=>[hit.object,hit.distance]));
  const owned=style.applySwitchStyle(THREE,scene);scene.updateMatrixWorld(true);
  for(const [mesh,snapshot] of before){
    assert.deepEqual(mesh.matrixWorld,snapshot.matrix);assert.equal(mesh.geometry,snapshot.geometry);
    if(/^switch-(living|kitchen)-(backplate|recess|rocker|screw(?:_001)?)$/.test(mesh.name)){
      assert.notEqual(mesh.material,original);assert.equal(mesh.material.map,null,'baked dark map must not survive the override');
      const brightness=mesh.material.color.r*.2126+mesh.material.color.g*.7152+mesh.material.color.b*.0722;
      assert.ok(brightness>.18,'even the recess is muted rather than near black');
      if(/backplate|rocker/.test(mesh.name)){assert.ok(brightness>.45,'cream remains readable');assert.ok(mesh.material.color.r>mesh.material.color.b,'cream is warm');}
    }else assert.equal(mesh.material,original,'shared non-switch material remains untouched');
  }
  assert.deepEqual(rays.map(ray=>ray.intersectObject(scene,true).map(hit=>[hit.object,hit.distance])),hits);
  assert.deepEqual(original.color,originalColor,'shared source finish is not recolored');assert.equal(original.map,originalMap);owned.dispose();
});

test('reapplying switch styling reuses owned resources and disposal restores shared originals exactly once',()=>{
  assert.equal(typeof style.applySwitchStyle,'function');const {scene,original}=switchFixture(),rocker=scene.getObjectByName('switch-living-rocker'),plate=scene.getObjectByName('switch-living-backplate');
  const array=[original,original];plate.material=array;let originalDisposals=0,textureDisposals=0,geometryDisposals=0;
  original.addEventListener('dispose',()=>originalDisposals++);original.map.addEventListener('dispose',()=>textureDisposals++);rocker.geometry.addEventListener('dispose',()=>geometryDisposals++);
  const first=style.applySwitchStyle(THREE,scene),materials=new Set();scene.traverse(o=>{if(o.isMesh&&o.material!==original)materials.add(o.material);});
  const disposals=new Map([...materials].map(m=>[m,0]));for(const m of materials)m.addEventListener('dispose',()=>disposals.set(m,disposals.get(m)+1));
  assert.equal(style.applySwitchStyle(THREE,scene),first);assert.ok(materials.has(rocker.material),'repeat did not replace resources');
  first.dispose();first.dispose();assert.deepEqual([...disposals.values()],Array(materials.size).fill(1));assert.equal(rocker.material,original);assert.equal(plate.material,array);
  assert.equal(originalDisposals,0);assert.equal(textureDisposals,0);assert.equal(geometryDisposals,0);
  const next=style.applySwitchStyle(THREE,scene);assert.notEqual(next,first);assert.ok(!materials.has(rocker.material),'a disposed style can be reapplied');next.dispose();
});

const config={bounds:[-6,6.2],spawn:[2,0,.85],speed:1,doorX:0,actions:{
  'light-living':{approach:[3.6,0,.85],pose:[3.6,0,-1.0],yaw:Math.PI,clip:'reach',duration:.7,lightRoom:'living',contactTime:.32},
  'light-kitchen':{approach:[-1,0,.85],pose:[-1,0,-1],yaw:Math.PI,clip:'reach',duration:.7,lightRoom:'kitchen',contactTime:.32},
}};
function advanceUntil(m,c,predicate,hold=false){
  const events=[];for(let n=0;n<1600&&!predicate();n++)events.push(...advanceHomeFrame(m,c,1/60,hold).events);
  assert.ok(predicate(),'action reached expected phase');return events;
}

test('each wall switch changes only its own room and survives a save round trip',()=>{
  const c=new ApartmentTime({day:2,minutes:300});
  assert.equal(typeof c.toggleRoomLight,'function');
  assert.deepEqual(c.lights,{living:true,kitchen:true});
  c.toggleRoomLight('living');assert.deepEqual(c.lights,{living:false,kitchen:true});
  assert.equal(c.label,'05:00','a switch does not spend activity minutes');
  const memory=new Map(),storage={setItem:(k,v)=>memory.set(k,v),getItem:k=>memory.get(k)};
  saveHomeTime(storage,c);const resumed=loadHomeTime(storage);
  assert.deepEqual(resumed.lights,{living:false,kitchen:true});
  resumed.toggleRoomLight('kitchen');assert.deepEqual(resumed.lights,{living:false,kitchen:false});
  resumed.toggleRoomLight('living');assert.deepEqual(resumed.lights,{living:true,kitchen:false});
  resumed.toggleRoomLight('__proto__');assert.deepEqual(resumed.lights,{living:true,kitchen:false});
});

test('old and malformed lighting saves migrate without treating strings as enabled switches',()=>{
  assert.deepEqual(new ApartmentTime({day:2,minutes:720}).lights,{living:true,kitchen:true});
  assert.deepEqual(new ApartmentTime({day:2,minutes:720,lights:{living:false,kitchen:'false'}}).lights,{living:false,kitchen:true});
});

test('light changes at hand contact after approach, exactly once even while inspection holds the action',()=>{
  const m=new ApartmentMotion(config),c=new ApartmentTime({day:2,minutes:720});m.interact('light-living');
  advanceUntil(m,c,()=>m.phase==='perform',true);
  assert.deepEqual(c.lights,{living:true,kitchen:true},'walking to a switch cannot change it remotely');
  for(let n=0;n<12;n++)advanceHomeFrame(m,c,1/60,true);
  assert.equal(c.lights.living,true,'hand has not reached the switch yet');
  const events=[];for(let n=0;n<300;n++)events.push(...advanceHomeFrame(m,c,1/60,true).events);
  assert.deepEqual(c.lights,{living:false,kitchen:true});
  assert.equal(events.filter(e=>e.type==='interacted'&&e.id==='light-living').length,1);
  advanceUntil(m,c,()=>m.phase==='idle');
  m.interact('light-living');advanceUntil(m,c,()=>m.phase==='idle');
  assert.deepEqual(c.lights,{living:true,kitchen:true},'next intentional press toggles it back');
});

test('cancelling before hand contact leaves lights unchanged',()=>{
  const m=new ApartmentMotion(config),c=new ApartmentTime({day:2,minutes:720});m.interact('light-living');
  advanceUntil(m,c,()=>m.phase==='perform');m.move(5);
  advanceUntil(m,c,()=>m.phase==='idle');
  assert.deepEqual(c.lights,{living:true,kitchen:true});
});

test('reaching the other room switch opens the passage only for that crossing',()=>{
  const m=new ApartmentMotion(config),c=new ApartmentTime({day:2,minutes:720});m.interact('light-kitchen');
  let opened=false;for(let n=0;n<1800&&!(m.phase==='idle'&&n>0);n++){
    advanceHomeFrame(m,c,1/60);opened||=m.doorOpen>.9;
  }
  assert.equal(opened,true);assert.equal(m.phase,'idle');
  assert.deepEqual(c.lights,{living:true,kitchen:false});
  assert.ok(m.doorOpen<.01,'passage closes after crossing, not because the switch is used');
});
