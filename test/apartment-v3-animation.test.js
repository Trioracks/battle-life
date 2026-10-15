import test from 'node:test';
import assert from 'node:assert/strict';
import {AnimationMixer,AnimationClip,NumberKeyframeTrack,Object3D,Bone} from '../vendor/three/three.module.js';
import {ApartmentAnimation} from '../src/apartment-v3-animation.js';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {Vector3} from '../vendor/three/three.module.js';
import {applyAppearance} from '../src/avatar-v3-profile.js';

test('actual seated GLB keeps both palms and fingertips over keyboard at all runtime tap extrema',async()=>{
 const hook=registerHooks({resolve(s,c,next){return next(s==='three'?new URL('../vendor/three/three.module.js',import.meta.url).href:s,c);}});
 let GLTFLoader;try{({GLTFLoader}=await import('../vendor/three/addons/loaders/GLTFLoader.js'));}finally{hook.deregister();}
 const bytes=readFileSync(new URL('../assets/apartment/v3/mannequin.glb',import.meta.url));
 const {scene,animations}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const config=JSON.parse(readFileSync(new URL('../assets/apartment/v3/scene.json',import.meta.url)));
 const root=new Object3D();root.add(scene);root.position.fromArray(config.actions.computer.pose);root.rotation.y=config.actions.computer.yaw;
 const mixer=new AnimationMixer(scene),player=new ApartmentAnimation(mixer,animations,.9);
 const skin=scene.getObjectByName('neutral-skinned-body'),attrs=skin.geometry.attributes,handVertices=[];
 for(let i=0;i<attrs.position.count;i++)for(let k=0;k<4;k++){
  if(/^hand[LR]$/.test(skin.skeleton.bones[attrs.skinIndex.getComponent(i,k)].name)&&attrs.skinWeight.getComponent(i,k)>.9){handVertices.push(i);break;}
 }
 assert.ok(handVertices.length>=400,'both authored palm surfaces are tested');
 // All supported appearances share one skeleton and fixed body proportions.
 for(const face of ['oval','square','long'])for(const top of ['tee','shirt','hoodie','sweater','tank','turtleneck']){
  applyAppearance(scene,{face,top});
  for(let i=0;i<=180;i++){
   player.update({clip:'seated',fade:1,working:true,walkDistance:0,workPerformance:'typing'},1/120);
   root.updateMatrixWorld(true);
   for(const index of handVertices){
    const p=skin.localToWorld(skin.getVertexPosition(index,new Vector3()));
    assert.ok(p.y>=.878&&p.y<=.945,`actual palm surface clears keys: ${p.y}`);
    assert.ok(p.x>=4.185&&p.x<=4.775&&p.z>=-.665&&p.z<=-.465,`actual palm surface remains over keyboard: ${p.toArray()}`);
   }
   for(const side of ['L','R']){
    const hand=scene.getObjectByName('hand'+side),forearm=scene.getObjectByName('forearm'+side),upper=scene.getObjectByName('upper_arm'+side);
    assert.ok(hand&&forearm&&upper,'loaded rig bones');
    const wrist=hand.getWorldPosition(new Vector3()),elbow=forearm.getWorldPosition(new Vector3()),shoulder=upper.getWorldPosition(new Vector3());
    assert.ok(Math.abs(wrist.distanceTo(elbow)-.235)<.015,'forearm remains human length');
    assert.ok(Math.abs(elbow.distanceTo(shoulder)-.276)<.015,'upper arm remains human length');
    for(const along of [.045,.105]){
     const p=hand.localToWorld(new Vector3(0,along,0));
     assert.ok(p.x>=4.185&&p.x<=4.775&&p.z>=-.665&&p.z<=-.465,`${face}/${top} ${side} frame ${i} palm/tip outside keys: ${p.toArray()}`);
     assert.ok(p.y>=.879&&p.y<=.925,`${side} hand must sit just above key tops: ${p.y}`);
    }
   }
  }
 }
});

test('vocal pose freezes typing clip and derives gestures from restored job seconds',()=>{
 const root=new Object3D(),bone=new Bone();bone.name='head';root.add(bone);
 const mixer=new AnimationMixer(root),player=new ApartmentAnimation(mixer,[new AnimationClip('seated',2,[new NumberKeyframeTrack('.position[y]',[0,1,2],[0,1,0])])],.9);
 const state={clip:'seated',fade:1,working:true,workPerformance:'rapping',workElapsedSeconds:3};
 player.update(state,.1);const time=player.active.time,q=bone.quaternion.toArray();
 player.update(state,.1);assert.equal(player.active.time,time,'vocal cannot keep running the typing clip');assert.deepEqual(bone.quaternion.toArray(),q);
 player.update({...state,workElapsedSeconds:4},.1);assert.notDeepEqual(bone.quaternion.toArray(),q);
 player.update({...state,reducedMotion:true},.1);const still=bone.quaternion.toArray();
 player.update({...state,reducedMotion:true,workElapsedSeconds:6},.1);assert.deepEqual(bone.quaternion.toArray(),still);
});

test('actual vocal rig faces the mic and holds relaxed hands below the desk, including paused and restored clocks',async()=>{
 const hook=registerHooks({resolve(s,c,next){return next(s==='three'?new URL('../vendor/three/three.module.js',import.meta.url).href:s,c);}});
 let GLTFLoader;try{({GLTFLoader}=await import('../vendor/three/addons/loaders/GLTFLoader.js'));}finally{hook.deregister();}
 const bytes=readFileSync(new URL('../assets/apartment/v3/mannequin.glb',import.meta.url));
 const {scene,animations}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const config=JSON.parse(readFileSync(new URL('../assets/apartment/v3/scene.json',import.meta.url))),root=new Object3D();root.add(scene);
 root.position.fromArray(config.actions.computer.pose);root.rotation.y=config.actions.computer.yaw;
 const player=new ApartmentAnimation(new AnimationMixer(scene),animations,.9),mic=new Vector3(5.12,1.169,-.94);
 let hands;
 for(const seconds of [0,1/6,1/3,3,6.5,7.9,7.9]){
  player.update({clip:'seated',fade:1,working:true,workPerformance:'rapping',workElapsedSeconds:seconds},.1,seconds===7.9);root.updateMatrixWorld(true);
  for(const name of ['head','chest']){
   const bone=scene.getObjectByName(name),forward=new Vector3(0,0,1).transformDirection(bone.matrixWorld),toward=mic.clone().sub(bone.getWorldPosition(new Vector3()));
   forward.y=toward.y=0;assert.ok(forward.normalize().dot(toward.normalize())>.99,name+' faces capsule in world space');
  }
  const current=['L','R'].map(side=>scene.getObjectByName('hand'+side).getWorldPosition(new Vector3()).toArray());
  for(const point of current){assert.ok(point[1]<.80&&point[1]>.60,'relaxed wrist below desktop, not typing over CRT');assert.ok(point[2]>-.35&&point[2]<.20,'hands remain near lap');}
  if(hands)assert.deepEqual(current,hands,'no typing cycle or arm gesture resumes');hands=current;
 }
});

function setup(){const root=new Object3D(),mixer=new AnimationMixer(root);
  const clips=[['idle',0],['walk',1],['sleep',2]].map(([name,v])=>new AnimationClip(name,1,[new NumberKeyframeTrack('.position[y]',[0,1],[v,v])]));
  return {root,player:new ApartmentAnimation(mixer,clips,.84)};
}

test('rapping turns toward the mic, gestures and restores base when interrupted',()=>{
 const root=new Object3D(),bones=['chest','head','forearm.L','forearm.R'].map(name=>{const b=new Bone();b.name=name;root.add(b);return b;});
 const player=new ApartmentAnimation(new AnimationMixer(root),[new AnimationClip('seated',1,[])],.84);
 const state={clip:'seated',fade:1,working:true,walkDistance:0,workPerformance:'typing'};
 player.update(state,.3);const typing=bones.map(b=>b.quaternion.toArray());
 player.update({...state,workPerformance:'rapping'},.3);const rap=bones.map(b=>b.quaternion.toArray());
 assert.notDeepEqual(rap,typing);assert.ok(Math.abs(bones[0].quaternion.y)>.05);assert.ok(Math.abs(bones[1].quaternion.y)>.05);
 player.update({...state,workPerformance:'rapping'},1,true);assert.deepEqual(bones.map(b=>b.quaternion.toArray()),rap);
 player.update({...state,working:false},0);for(const bone of bones)assert.deepEqual(bone.quaternion.toArray(),[0,0,0,1]);
});
test('distance-driven walking still advances crossfade weights',()=>{
 const {root,player}=setup();player.update({clip:'idle',walkDistance:0,fade:0},.2);
 for(let i=0;i<30;i++)player.update({clip:'walk',walkDistance:i*.01,fade:0},1/60);
 assert.ok(root.position.y>.999,'walk must not remain at zero weight');
});
test('pose replacement under a black screen is immediate, not revealed half-blended',()=>{
 const {root,player}=setup();player.update({clip:'idle',walkDistance:0,fade:0},.2);
 player.update({clip:'sleep',walkDistance:0,fade:1},1/60);assert.equal(root.position.y,2);
 player.update({clip:'idle',walkDistance:0,fade:1},1/60);assert.equal(root.position.y,0);
});

test('a switch press stops at the released hand pose rather than looping while held for inspection',()=>{
 const root=new Object3D(),mixer=new AnimationMixer(root);
 const clip=new AnimationClip('switch',.7,[new NumberKeyframeTrack('.position[y]',[0,.32,.7],[0,1,.2])]);
 const player=new ApartmentAnimation(mixer,[clip],.9);
 player.update({clip:'switch',fade:1,walkDistance:0},.7);
 player.update({clip:'switch',fade:0,walkDistance:0},.32);
 assert.ok(Math.abs(root.position.y-.2)<1e-6,'inspection cannot repeat the press');
});
