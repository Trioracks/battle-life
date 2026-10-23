import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import {readGlb} from './helpers/glb-pose.js';
import {assetPath} from './helpers/apartment-assets.js';
import {createWardrobeFurniture} from '../src/home-wardrobe.js';
import {prepareApartmentConfig} from '../src/apartment-v3-runtime.js';
import {createInteractionTargets,pickInteraction,createApartmentHover,canClickApartment} from '../src/apartment-interaction.js';
import {PcLifecycle,moveInRoom} from '../src/virtual-pc-lifecycle.js';
import {ApartmentMotion} from '../src/apartment-v3-motion.js';

function geometryScene(name){
  const {json:g,values}=readGlb(name),root=new THREE.Group();
  const nodes=g.nodes.map(n=>{
    const object=new THREE.Group();object.name=n.name;
    if(n.translation)object.position.fromArray(n.translation);
    if(n.rotation)object.quaternion.fromArray(n.rotation);
    if(n.scale)object.scale.fromArray(n.scale);
    if(n.mesh!==undefined)for(const p of g.meshes[n.mesh].primitives){
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(values(p.attributes.POSITION).flat(),3));
      if(p.indices!==undefined)geometry.setIndex(values(p.indices).flat());
      object.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})));
    }
    return object;
  });
  g.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].add(nodes[j])));
  g.scenes[g.scene??0].nodes.forEach(i=>root.add(nodes[i]));
  root.traverse(o=>{if(o.name.startsWith('depth-')||o.name.startsWith('static-cutaway-shell-')||o.name==='sleep-blanket')o.visible=false;});
  root.updateMatrixWorld(true);return root;
}
const config=prepareApartmentConfig(JSON.parse(fs.readFileSync(assetPath('scene.json'),'utf8')));
const staticScene=geometryScene('static.glb'),liveScene=geometryScene('interaction.glb');
liveScene.add(createWardrobeFurniture(THREE));liveScene.updateMatrixWorld(true);
const targets=createInteractionTargets(THREE,{staticScene,liveScene,config});
const rayAt=(origin,direction=[0,0,-1])=>new THREE.Raycaster(new THREE.Vector3(...origin),new THREE.Vector3(...direction));
const pick=ray=>pickInteraction(ray,targets,[staticScene,liveScene]);

test('all visible bed surfaces select the bed, including its low frame, front drawers and side',()=>{
  for(const origin of [[1.7,.15,.8],[1.2,.3,.8],[2.2,.34,.8],[1,.6,.8],[1,.8,.8]])assert.equal(pick(rayAt(origin)).id,'bed',String(origin));
  assert.equal(pick(rayAt([3.2,.35,-.8],[-1,0,0])).id,'bed');
});

test('the full tall bed headboard belongs to the same selectable silhouette',()=>{
  assert.equal(pick(rayAt([.72,1.15,.8])).id,'bed','headboard front above the pillow');
  assert.equal(pick(rayAt([1.1,1.2,-.8],[-1,0,0])).id,'bed','headboard side near its top');
  assert.equal(pick(rayAt([2.2,1.07,.8])).id,undefined,'nearby window sill stays excluded');
});

test('all apartment action furniture has its own exact selectable surface',()=>{
  for(const [id,origin] of [['computer',[4.63,1.2,.8]],['computer',[5.2,.2,.8]],['dining',[-7.25,.8,.8]],['sink',[-5.3,.5,.8]],['stove',[-3.32,.4,.8]],['fridge',[-1.26,1,.8]],['wardrobe',[6.6,1,.8]],['light-living',[3.6,1.22,.8]],['light-kitchen',[-.25,1.22,.8]]])assert.equal(pick(rayAt(origin)).id,id,String(origin));
  assert.equal(pick(rayAt([7.8,1.1,.675],[1,0,0])).id,'entry');
  assert.equal(pick(rayAt([-.5,1.1,.5],[1,0,0])).id,'passage');
});

test('a visible wall in front of a bed surface blocks picking, while hidden walls do not',()=>{
  const wall=new THREE.Mesh(new THREE.BoxGeometry(3,2,.04),new THREE.MeshBasicMaterial());
  wall.position.set(1.7,1,.3);wall.updateMatrixWorld();
  const ray=rayAt([1.7,.15,.8]);
  assert.equal(pickInteraction(ray,targets,[staticScene,liveScene,wall]).id,undefined);
  wall.visible=false;
  assert.equal(pickInteraction(ray,targets,[staticScene,liveScene,wall]).id,'bed');
});

test('furniture masks exclude the back wall and empty space below the bed',()=>{
  const bed=targets.objects('bed');
  assert.ok(bed.length>1);
  const bounds=new THREE.Box3();for(const mesh of bed)bounds.expandByObject(mesh);
  assert.ok(bounds.min.z> -1.5&&bounds.max.z<-.1);
  assert.equal(pick(rayAt([1.7,.04,.8])).id,undefined);
  assert.equal(pick(rayAt([1.7,1.1,.8])).id,undefined);
});

test('desk selection does not include nearby window sill or floorboards',()=>{
  assert.equal(pick(rayAt([4.15,1.07,.8])).id,undefined,'the wall sill is not part of the computer');
  assert.equal(pick(rayAt([4.2,.2,-.9],[0,-1,0])).id,undefined,'empty floor below the desk remains walkable');
});

test('hover clears after leaving or blocking the canvas and repicks a stationary cursor',()=>{
  let current={id:'bed'},selection=null,label='',calls=0;
  const hover=createApartmentHover({pick:()=>{calls++;return current;},select:id=>selection=id,present:hit=>label=hit.id??''});
  hover.move({clientX:20,clientY:30});hover.update(true,0);
  assert.equal(selection,'bed');assert.equal(label,'bed');
  current={id:'computer'};hover.update(true,100);assert.equal(selection,'computer');assert.equal(calls,2);
  hover.update(false);assert.equal(selection,null);assert.equal(label,'');
  hover.update(true);assert.equal(selection,null,'modal closing alone does not resurrect a stale pointer');
  hover.move({clientX:21,clientY:30});hover.update(true);assert.equal(selection,'computer');
  hover.clear();assert.equal(selection,null);assert.equal(label,'');
});

test('stationary hover repicks at bounded cadence while pointer movement is immediate',()=>{
  let calls=0;const hover=createApartmentHover({pick:()=>{calls++;return {};},select:()=>{},present:()=>{}});
  hover.move({clientX:1,clientY:1});hover.update(true,0);
  hover.update(true,30);hover.update(true,60);assert.equal(calls,1);
  hover.move({clientX:2,clientY:1});hover.update(true,61);assert.equal(calls,2);
  hover.update(true,150);assert.equal(calls,3);
});

test('floor clicks can cancel computer preparation while the player is still approaching',()=>{
  const motion=new ApartmentMotion(config);
  const view={modes:{mode:'3D',yaw:0,pitch:0},prepareComputerView:async()=>{},endComputerView(){}};
  const lifecycle=new PcLifecycle({view,getState:()=>({power:'off'}),setPower(){}});
  motion.interact('computer');lifecycle.prepare();
  const allowed=canClickApartment({mode:'game',pcPhase:lifecycle.snapshot.phase,pcEntering:lifecycle.entering});
  assert.equal(allowed,true);
  assert.equal(allowed&&moveInRoom(motion,lifecycle,2),true);
  assert.equal(motion.actionId,null);assert.equal(motion.targetX,2);
  assert.equal(lifecycle.snapshot.phase,'room');assert.equal(lifecycle.pending,null);
});

test('apartment clicks stay blocked inside PC transitions, modals and camera fades',()=>{
  const room={mode:'game',pcPhase:'room'};assert.equal(canClickApartment(room),true);
  for(const state of [
    {...room,mode:'pc'},{...room,mode:'menu'},{...room,modalOpen:true},
    {...room,actionMenuOpen:true},{...room,cameraFade:true},{...room,hidden:true},
    {...room,pcPhase:'preparing',pcEntering:true},{...room,pcPhase:'desktop'},
    {...room,pcPhase:'zoom-in'},{...room,pcPhase:'working'},
  ])assert.equal(canClickApartment(state),false,JSON.stringify(state));
});
