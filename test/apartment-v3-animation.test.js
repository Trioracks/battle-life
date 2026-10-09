import test from 'node:test';
import assert from 'node:assert/strict';
import {AnimationMixer,AnimationClip,NumberKeyframeTrack,Object3D} from '../vendor/three/three.module.js';
import {ApartmentAnimation} from '../src/apartment-v3-animation.js';

function setup(){const root=new Object3D(),mixer=new AnimationMixer(root);
  const clips=[['idle',0],['walk',1],['sleep',2]].map(([name,v])=>new AnimationClip(name,1,[new NumberKeyframeTrack('.position[y]',[0,1],[v,v])]));
  return {root,player:new ApartmentAnimation(mixer,clips,.84)};
}
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
