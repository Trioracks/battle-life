import test from 'node:test';
import assert from 'node:assert/strict';
import {ApartmentTime} from '../src/apartment-v3-time.js?rev=26';
import {ApartmentMotion} from '../src/apartment-v3-motion.js';
import * as runtime from '../src/apartment-v3-runtime.js?rev=26';
import {CameraModes,cameraAllowsFirstPerson} from '../src/apartment-v3-camera.js';
const config={bounds:[-8,8],spawn:[-7.25,0,.85],speed:1.326,doorX:0,actions:{dining:{approach:[-7.25,0,.85],pose:[-7.25,.045,-.02],yaw:Math.PI,clip:'eat',fade:true,duration:6}}};
test('cooking stores one portion across reloads and dining consumes it at most once',()=>{
 const clock=new ApartmentTime({day:2,minutes:600});assert.equal(clock.mealReady,false);
 clock.completeAction('stove');clock.completeAction('stove');
 const loaded=new ApartmentTime(clock.snapshot()),before=loaded.minutes;assert.equal(loaded.mealReady,true);
 loaded.completeAction('dining');loaded.completeAction('dining');assert.equal(loaded.mealReady,false);assert.equal(loaded.minutes-before,15);
});
test('starting a meal without cooking leaves motion idle with a useful explanation',()=>{
 const m=new ApartmentMotion(config),clock=new ApartmentTime();
 assert.equal(typeof runtime.startHomeAction,'function');const result=runtime.startHomeAction(m,clock,'dining');
 assert.equal(result.allowed,false);assert.match(result.reason,/Сначала приготовь/);assert.equal(m.phase,'idle');assert.equal(m.actionId,null);
});
test('meal cancellation preserves food; six uninterrupted seconds consume once under the shared frame path',()=>{
 for(const cancel of [true,false]){
  const m=new ApartmentMotion(config),clock=new ApartmentTime({day:2,minutes:600}),c=new CameraModes();clock.completeAction('stove');c.mode='3D';m.interact('dining');
  let swaps=0,completions=0,elapsed=0,performTime=0;
  for(let i=0;i<1600;i++){
   const result=runtime.advanceHomeFrame(m,clock,.01);elapsed+=result.elapsed;
   for(const e of result.events){c.onMotionEvent(e);if(e.type==='swap'){swaps++;assert.equal(m.fade,1);assert.equal(c.mode,'2D');}if(e.type==='completed'&&e.id==='dining')completions++;}
   if(m.clip==='eat')assert.equal(cameraAllowsFirstPerson(m),false);
   if(m.phase==='perform'){performTime+=.01;if(cancel&&performTime>.5)m.move(-6.3);}
  }
  assert.equal(swaps,1);assert.equal(completions,cancel?0:1);assert.equal(clock.mealReady,cancel);
  assert.ok(Math.abs(clock.minutes-(630+elapsed/4+(cancel?0:15)))<1e-8);
  assert.equal(m.position[1],0);assert.equal(m.position[2],.85);
  m.move(-6);runtime.advanceHomeFrame(m,clock,.01);assert.equal(clock.mealReady,cancel);
 }
});
