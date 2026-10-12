import test from 'node:test';
import assert from 'node:assert/strict';
import {AnimationMixer,AnimationClip,NumberKeyframeTrack,Object3D,Bone} from '../vendor/three/three.module.js';
import {ApartmentAnimation} from '../src/apartment-v3-animation.js';

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
