import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createBackdropMaterial} from '../src/apartment-v3-lighting.js?rev=27';
import * as lighting from '../src/apartment-v3-lighting.js?rev=27';

test('lighting inspection can show noon without changing the actual wall clock at 03:55',()=>{
  assert.equal(typeof lighting.sceneTimeState,'function');
  const state=lighting.sceneTimeState(235,720);
  assert.equal(state.light.daylight,1);
  assert.ok(Math.abs(state.hands.hour-(235/720)*2*Math.PI)<1e-10);
  assert.ok(Math.abs(state.hands.minute-(55/60)*2*Math.PI)<1e-10);
});
test('dawn blends the two backdrops before drawing opaque actors, not as a transparent veil over them',()=>{
  const night=new THREE.Texture(),day=new THREE.Texture(),m=createBackdropMaterial(THREE,night,day);
  m.uniforms.daylight.value=.5;
  assert.equal(m.transparent,false,'a transparent scene-wide plane would draw after opaque character meshes');
  assert.equal(m.depthTest,false);assert.equal(m.depthWrite,false);
  assert.equal(m.uniforms.nightMap.value,night);assert.equal(m.uniforms.dayMap.value,day);
});

test('independent room lighting binds all baked states without swapping kitchen and living room',()=>{
  const states=Object.fromEntries(['off','living','kitchen','both'].map(k=>[k,{night:new THREE.Texture(),day:new THREE.Texture()}]));
  const m=createBackdropMaterial(THREE,states.both.night,states.both.day,states);
  for(const room of ['off','living','kitchen']){
    assert.equal(m.uniforms[room+'NightMap']?.value,states[room].night);
    assert.equal(m.uniforms[room+'DayMap']?.value,states[room].day);
  }
  assert.equal(m.uniforms.livingLight?.value,1);assert.equal(m.uniforms.kitchenLight?.value,1);
  assert.equal(m.transparent,false);
});

test('turning off a practical lamp removes its real illumination, not daylight or the other room lamp',()=>{
  assert.equal(typeof lighting.createPracticalLighting,'function');
  const scene=new THREE.Scene(),rig=lighting.createPracticalLighting(THREE,scene,{
    living:[4.05,2.37,-.1],kitchen:[-4.8,2.37,-.1]
  });
  rig.update({daylight:1,living:1,kitchen:1});
  const daylight=rig.sky.intensity,kitchen=rig.lamps.kitchen.intensity;
  rig.update({daylight:1,living:0,kitchen:1});
  assert.equal(rig.lamps.living.intensity,0);assert.equal(rig.lamps.kitchen.intensity,kitchen);
  assert.equal(rig.sky.intensity,daylight);
  rig.update({daylight:0,living:0,kitchen:0});
  assert.equal(rig.lamps.kitchen.intensity,0);assert.ok(rig.sky.intensity>0&&rig.sky.intensity<daylight*.4,'night remains faintly readable');
  rig.update({daylight:0,living:1,kitchen:0});
  assert.ok(rig.lamps.living.intensity>0);assert.equal(rig.lamps.kitchen.intensity,0);
  assert.equal(rig.lamps.living.castShadow,true);assert.equal(rig.lamps.kitchen.castShadow,true);
});

test('ceiling lamps have local bounced fill in front of the actor, which also switches off',()=>{
  const scene=new THREE.Scene(),rig=lighting.createPracticalLighting(THREE,scene,{living:[4.05,2.37,-.1],kitchen:[-4.8,2.37,-.1]});
  const fill=rig.bounce?.living;
  assert.ok(fill,'a top/back light alone leaves the face and front cloth black');
  rig.update({daylight:0,living:1,kitchen:0});
  assert.ok(fill.position.z>.85&&fill.intensity>0,'the lit room supplies frontal reflected light');
  assert.equal(rig.bounce.kitchen.intensity,0);assert.ok(fill.distance<7,'the fill is local rather than a whole-scene directional lamp');
  rig.update({daylight:0,living:0,kitchen:1});
  assert.equal(fill.intensity,0);assert.ok(rig.bounce.kitchen.intensity>0);
});
