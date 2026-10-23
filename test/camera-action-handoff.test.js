import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as cameras from '../src/apartment-v3-camera.js';
import {ApartmentMotion} from '../src/apartment-v3-motion.js';
import {prepareApartmentConfig} from '../src/apartment-v3-runtime.js';
import {PcLifecycle} from '../src/virtual-pc-lifecycle.js';
const config=prepareApartmentConfig(JSON.parse(fs.readFileSync(new URL('../assets/apartment/v3/scene.json',import.meta.url))));
for(const dt of [1/24,1/60,1/144])for(const initial of ['2D','3D'])test(`bed to computer has no visible first-person interlude, ${initial} at ${1/dt}fps`,()=>{
 const motion=new ApartmentMotion(config),camera=new cameras.CameraModes({initialMode:initial});
 const tick=()=>{motion.tick(dt,true);for(const e of motion.drainEvents())camera.onMotionEvent(e);camera.onMotionState(motion);};
 const until=p=>{for(let i=0;i<10000&&!p();i++)tick();assert.ok(p(),motion.phase);};
 motion.startSleeping();for(const e of motion.drainEvents())camera.onMotionEvent(e);motion.interact('computer');
 until(()=>motion.phase==='return-in');let frames=0;
 until(()=>{if(motion.fade<1){assert.equal(camera.mode,'2D',motion.phase);frames++;}return motion.actionId==='computer'&&motion.phase==='perform';});assert.ok(frames>10);
});
test('computer entry uses the currently framed room camera; work return deliberately uses head camera',()=>{
 assert.equal(typeof cameras.computerCameraSource,'function');const overview={},firstPerson={},head={};
 assert.equal(cameras.computerCameraSource({mode:'2D',overview,firstPerson,head}),overview);
 assert.equal(cameras.computerCameraSource({mode:'3D',overview,firstPerson,head}),firstPerson);
 assert.equal(cameras.computerCameraSource({mode:'2D',overview,firstPerson,head,fromHead:true}),head);
});
test('queued computer remembers the original room preference and restores it only under return blackout',async()=>{
 const modes=new cameras.CameraModes({initialMode:'3D'});modes.onMotionEvent({id:'bed',type:'started'});
 let state={power:'on'};const view={modes,prepareComputerView(){},beginComputerView(){},endComputerView(){}};
 const life=new PcLifecycle({view,getState:()=>state,setPower:power=>state={power}});life.prepare();modes.onMotionEvent({id:'computer',type:'swap'});await life.seated();life.tick(2);life.leave();life.tick(2);life.restore('return-out');assert.equal(modes.mode,'2D');life.restore('return-in');assert.equal(modes.mode,'3D');
});
