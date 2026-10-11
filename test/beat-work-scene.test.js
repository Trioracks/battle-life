import test from 'node:test';
import assert from 'node:assert/strict';
import {PcTransition} from '../src/virtual-pc-transition.js';
import {PcLifecycle,pcActorVisible,preparePcWorkPose} from '../src/virtual-pc-lifecycle.js?rev=27';
import {ApartmentTime} from '../src/apartment-v3-time.js?rev=27';
test('work camera pulls back, reveals seated character under black, returns to desktop',()=>{
 const t=new PcTransition();t.enter({alreadyOn:true});t.tick(3);t.drainEvents();assert.equal(t.work(),true);
 assert.equal(t.snapshot.phase,'work-out');t.tick(2.4);assert.equal(t.snapshot.phase,'work-reveal');assert.equal(t.snapshot.blackout,1);assert.equal(t.snapshot.workActor,true);
 t.tick(.4);assert.equal(t.snapshot.phase,'working');assert.equal(t.snapshot.overlay,0);
 t.finishWork();t.tick(.35);assert.equal(t.snapshot.phase,'work-in');assert.equal(t.snapshot.workActor,false);assert.equal(t.snapshot.blackout,1);
 t.tick(3);assert.equal(t.snapshot.phase,'desktop');assert.equal(t.snapshot.locked,false);
});
test('critical needs return to room and work transitions pause when hidden',()=>{
 const view={modes:{mode:'3D'},endComputerView(){},beginComputerView(){}};let room=0;
 const life=new PcLifecycle({view,getState:()=>({power:'on'}),setPower(){},onRoom:()=>room++});life.transition.setPhase('desktop');life.work();life.tick(20,{hidden:true});assert.equal(life.snapshot.phase,'work-out');
 life.tick(3);assert.equal(life.snapshot.phase,'working');assert.equal(view.modes.mode,'2D');life.finishWork({blocked:true});life.tick(.5);assert.equal(room,1);assert.equal(life.snapshot.phase,'room');
});
test('avatar appears only in deliberate work scene; leaving PC no longer charges two hours',()=>{
 const motion={actionId:'computer',phase:'perform'};assert.equal(pcActorVisible(motion,true),false);assert.equal(pcActorVisible(motion,false,true),true);
 const clock=new ApartmentTime({day:1,minutes:600});clock.completeAction('computer');assert.equal(clock.minutes,600);
});
test('working pose faces the monitor even when direct entry skipped the turning animation',()=>{
 const motion={actionId:'computer',phase:'perform',yaw:0,targetYaw:Math.PI,config:{actions:{computer:{yaw:Math.PI}}}};
 assert.equal(preparePcWorkPose(motion),true);assert.equal(motion.yaw,Math.PI);
 motion.phase='walk';assert.equal(preparePcWorkPose(motion),false);
});
