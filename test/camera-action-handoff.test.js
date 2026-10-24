import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as cameras from '../src/apartment-v3-camera.js';
import {ApartmentMotion} from '../src/apartment-v3-motion.js';
import {prepareApartmentConfig} from '../src/apartment-v3-runtime.js';
import {PcLifecycle,beginPcCutscene} from '../src/virtual-pc-lifecycle.js';
import {PerspectiveCamera} from '../vendor/three/three.module.js';
const config=prepareApartmentConfig(JSON.parse(fs.readFileSync(new URL('../assets/apartment/v3/scene.json',import.meta.url))));
for(const dt of [1/24,1/60,1/144])for(const initial of ['2D','3D'])test(`bed to computer has no visible first-person interlude, ${initial} at ${1/dt}fps`,()=>{
 const motion=new ApartmentMotion(config),camera=new cameras.CameraModes({initialMode:initial});
 const tick=()=>{motion.tick(dt,true);for(const e of motion.drainEvents())camera.onMotionEvent(e);camera.onMotionState(motion);};
 const until=p=>{for(let i=0;i<10000&&!p();i++)tick();assert.ok(p(),motion.phase);};
 motion.startSleeping();for(const e of motion.drainEvents())camera.onMotionEvent(e);motion.interact('computer');
 until(()=>motion.phase==='return-in');let frames=0;
 until(()=>{if(motion.fade<1){assert.equal(camera.mode,'2D',motion.phase);frames++;}return motion.actionId==='computer'&&motion.phase==='perform';});assert.ok(frames>10);
});
test('computer flights preserve the current first-person lens and use the hero head for overview entry',()=>{
 const overview={},firstPerson=new PerspectiveCamera(60,16/9,.03,80),head=new PerspectiveCamera(60,16/9,.03,80);
 firstPerson.position.set(3.4,1.61,.85);firstPerson.rotation.set(-.21,1.37,0,'YXZ');firstPerson.updateMatrixWorld();
 head.position.set(4.2,1.45,-.3);head.rotation.set(0,Math.PI,0);head.updateMatrixWorld();
 assert.equal(cameras.computerCameraSource({mode:'2D',overview,firstPerson,head}),head);
 assert.equal(cameras.computerCameraSource({mode:'3D',overview,firstPerson,head}),firstPerson);
 assert.equal(cameras.computerCameraSource({mode:'2D',overview,firstPerson,head,fromHead:true}),head);
 assert.equal(cameras.computerCameraSource({mode:'3D',overview,firstPerson,head,fromHead:true}),head);
});

test('first-person PC entry seats the actor without a visible walk, turn or overview fade',()=>{
 const motion=new ApartmentMotion(config),camera=new cameras.CameraModes();
 assert.equal(beginPcCutscene(motion,{firstPerson:true}),true);
 assert.equal(motion.phase,'perform');assert.equal(motion.actionId,'computer');assert.equal(motion.clip,'seated');assert.equal(motion.fade,0);
 for(const event of motion.drainEvents())camera.onMotionEvent(event);
 camera.onMotionState(motion);assert.equal(camera.mode,'3D');
 assert.deepEqual(motion.position,config.actions.computer.pose);
 assert.equal(beginPcCutscene(motion,{firstPerson:true}),false,'seated entry cannot be requested twice');
});

for(const dt of [1/24,1/60,1/144])test(`3D PC exit restores the room mode before its first synchronous render at ${1/dt}fps`,async()=>{
 const motion=new ApartmentMotion(config),modes=new cameras.CameraModes(),roomFrames=[];
 const view={modes,prepareComputerView(){},beginComputerView(){},endComputerView(){}};
 const life=new PcLifecycle({view,getState:()=>({power:'on'}),setPower(){},onRoom(){motion.leaveAction();roomFrames.push({phase:motion.phase,fade:motion.fade,mode:modes.mode});}});
 life.prepare();motion.interact('computer');
 for(let n=0;n<10000&&motion.phase!=='perform';n++){motion.tick(dt,true);for(const event of motion.drainEvents())modes.onMotionEvent(event);modes.onMotionState(motion);}
 await life.seated();life.tick(2);assert.equal(life.leave(),true);
 for(let n=0;n<10000&&(!roomFrames.length||motion.phase!=='idle');n++){
  motion.tick(dt,true);for(const event of motion.drainEvents())modes.onMotionEvent(event);modes.onMotionState(motion);life.tick(dt);life.restore(motion.phase);
  if(roomFrames.length&&motion.fade<1)assert.equal(modes.mode,'3D',motion.phase);
 }
 assert.deepEqual(roomFrames,[{phase:'return-out',fade:0,mode:'3D'}]);assert.equal(modes.mode,'3D');
});

for(const dt of [1/24,1/60,1/144])test(`3D wake restores before the first visible standing frame at ${1/dt}fps`,()=>{
 const motion=new ApartmentMotion(config),camera=new cameras.CameraModes();motion.startSleeping();for(const e of motion.drainEvents())camera.onMotionEvent(e);motion.wakeUp();
 for(let n=0;n<100&&motion.phase!=='idle';n++){motion.tick(dt,true);for(const e of motion.drainEvents())camera.onMotionEvent(e);camera.onMotionState(motion);if(motion.clip==='idle'&&motion.phase==='return-in')assert.equal(camera.mode,'3D');}
 assert.equal(camera.mode,'3D');
});
test('queued computer remembers the original room preference before revealing the room again',async()=>{
 const modes=new cameras.CameraModes({initialMode:'3D'});modes.onMotionEvent({id:'bed',type:'started'});
 let state={power:'on'};const view={modes,prepareComputerView(){},beginComputerView(){},endComputerView(){}};
 const life=new PcLifecycle({view,getState:()=>state,setPower:power=>state={power}});life.prepare();modes.onMotionEvent({id:'computer',type:'swap'});await life.seated();life.tick(2);life.leave();life.tick(2);assert.equal(modes.mode,'3D');life.restore('return-in');assert.equal(modes.mode,'3D');
});
