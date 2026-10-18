import test from 'node:test';
import assert from 'node:assert/strict';
import {ApartmentMotion} from '../src/apartment-v3-motion.js';
import {ApartmentTime} from '../src/apartment-v3-time.js';
import * as runtime from '../src/apartment-v3-runtime.js';
import {createVirtualPcState,loadVirtualPcState,saveVirtualPcState} from '../src/virtual-pc-state.js';
import {advanceInstallation,openInstaller,advanceInstaller} from '../src/pc-software.js';
import {getSoundCue,playSoundCue} from '../src/sound-cues.js';
import * as apartmentActions from '../src/apartment-actions.js';

const installationClock=await import('../src/pc-installation-clock.js').catch(()=>({}));
const config=runtime.prepareApartmentConfig({bounds:[-2,2],spawn:[1,0,.8],speed:1,doorX:0,actions:{
  bed:{approach:[1,0,.8],pose:[1,.4,0],yaw:0,clip:'sleep',fade:true,duration:5},
}});
function installer(){
  let state=createVirtualPcState({power:'on',software:{ft:{receivedBytes:800000000}}});
  state=openInstaller(state,'ft').state;for(let i=0;i<3;i++)state=advanceInstaller(state).state;return state;
}
function elapsed(options){assert.equal(typeof installationClock.installationElapsedSeconds,'function');return installationClock.installationElapsedSeconds(options);}

test('installation host counts accepted game minutes once and falls back to active seconds',()=>{
  assert.equal(elapsed({activeSeconds:2,advancedGameMinutes:.5,powered:true,paused:false}),2);
  assert.equal(elapsed({activeSeconds:8,advancedGameMinutes:360,powered:true,paused:false}),1440);
  assert.equal(elapsed({activeSeconds:2,advancedGameMinutes:0,powered:true,paused:false}),2);
  for(const invalid of [NaN,Infinity,-1,'360'])assert.equal(elapsed({activeSeconds:2,advancedGameMinutes:invalid,powered:true,paused:false}),2);
  for(const activeSeconds of [0,-1,NaN,Infinity,'8'])assert.equal(elapsed({activeSeconds,advancedGameMinutes:0,powered:true,paused:false}),0);
});

test('powered six-hour sleep finishes installation through the shared apartment clock',()=>{
  const motion=new ApartmentMotion(config),clock=new ApartmentTime({day:1,minutes:600});let state=installer();motion.startSleeping();
  for(let frame=0;frame<480;frame++){
    const before=(clock.day-1)*1440+clock.minutes;
    runtime.advanceHomeFrame(motion,clock,1/60);
    state=advanceInstallation(state,elapsed({activeSeconds:1/60,advancedGameMinutes:(clock.day-1)*1440+clock.minutes-before,powered:true,paused:false})).state;
  }
  assert.equal(clock.label,'16:00');assert.equal(clock.isSleeping,false);
  assert.equal(state.software.ft.installed,true);assert.equal(state.software.installer.step,'finish');
});

test('installation retains room progress and ignores off, pause, hidden and reload gaps',()=>{
  let state=advanceInstallation(installer(),elapsed({activeSeconds:4,advancedGameMinutes:1,powered:true,paused:false})).state;
  assert.equal(state.software.installer.elapsedSeconds,4);
  state=advanceInstallation(state,elapsed({activeSeconds:3,advancedGameMinutes:.75,powered:true,paused:false})).state;
  assert.equal(state.software.installer.elapsedSeconds,7,'progress continues away from the desktop');
  for(const [reason,powered,paused] of [['off',false,false],['pause',true,true],['hidden',true,true],['menu',true,true],['home modal pauses simulation',true,true]]){
    state=advanceInstallation(state,elapsed({activeSeconds:100,advancedGameMinutes:360,powered,paused})).state;
    assert.equal(state.software.installer.elapsedSeconds,7,reason);
  }
  state=loadVirtualPcState({getItem:()=>JSON.stringify(state)}).state;
  state=advanceInstallation(state,elapsed({activeSeconds:0,advancedGameMinutes:0,powered:true,paused:false})).state;
  assert.equal(state.software.installer.elapsedSeconds,7);assert.equal(state.software.ft.installed,false);
});

test('manual bed request reaches the bed, holds through a week and wakes explicitly',()=>{
  const motion=new ApartmentMotion(config),clock=new ApartmentTime({day:1,minutes:600});
  assert.equal(runtime.startHomeAction(motion,clock,'bed',{mode:'manual',minutesPerSecond:45}).allowed,true);
  for(let frame=0;frame<600&&!clock.isSleeping;frame++)runtime.advanceHomeFrame(motion,clock,1/60);
  assert.equal(clock.snapshot().sleep?.mode,'manual');assert.equal(motion.sleeping,true);
  for(let frame=0;frame<896;frame++)runtime.advanceHomeFrame(motion,clock,.25);
  assert.equal(clock.isSleeping,true);assert.equal(motion.phase,'perform');assert.ok(clock.day>=8);
  assert.equal(motion.wakeUp(),true);runtime.advanceHomeFrame(motion,clock,1/60);
  assert.equal(clock.isSleeping,false);assert.equal(motion.phase,'return-out');
});

test('manual bed menu rate advances seven days in 22.4 seconds and leaves ordinary sleep unchanged',()=>{
  assert.equal(typeof apartmentActions.sleepOptionsForActionMenu,'function');
  const manual=apartmentActions.sleepOptionsForActionMenu(true);
  assert.deepEqual(manual,{mode:'manual',minutesPerSecond:450});
  assert.equal(apartmentActions.sleepOptionsForActionMenu(false),undefined);

  const motion=new ApartmentMotion(config),clock=new ApartmentTime({day:1,minutes:600});
  assert.equal(runtime.startHomeAction(motion,clock,'bed',manual).allowed,true);
  for(let frame=0;frame<600&&!clock.isSleeping;frame++)runtime.advanceHomeFrame(motion,clock,1/60);
  assert.equal(motion.sleeping,true);
  for(let frame=0;frame<448;frame++)runtime.advanceHomeFrame(motion,clock,.05);
  assert.equal(clock.day,8);
  assert.equal(clock.isSleeping,true);
  assert.equal(motion.wakeUp(),true);
  runtime.advanceHomeFrame(motion,clock,1/60);
  assert.equal(clock.isSleeping,false);

  const ordinaryMotion=new ApartmentMotion(config),ordinaryClock=new ApartmentTime({day:1,minutes:600});
  assert.equal(runtime.startHomeAction(ordinaryMotion,ordinaryClock,'bed').allowed,true);
  for(let frame=0;frame<600&&!ordinaryMotion.sleeping;frame++)runtime.advanceHomeFrame(ordinaryMotion,ordinaryClock,1/60);
  for(let frame=0;frame<160;frame++)runtime.advanceHomeFrame(ordinaryMotion,ordinaryClock,.05);
  assert.equal(ordinaryClock.label,'16:00');
  assert.equal(ordinaryClock.isSleeping,false);
});

test('food cue follows one durable consumption and never a refusal or failed save',()=>{
  assert.equal(typeof runtime.consumeHomeFood,'function');
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)},cues=[];
  const initial=createVirtualPcState({music:{needs:{satiety:50}}});
  const success=runtime.consumeHomeFood(initial,'apple',{persist:next=>saveVirtualPcState(storage,next),cue:id=>{assert.equal(loadVirtualPcState(storage).state.music.needs.satiety,80,'meal is durable before its cue');cues.push(id);}});
  assert.equal(success.ok,true);assert.equal(success.state.music.needs.satiety,80);
  assert.equal(loadVirtualPcState(storage).state.music.needs.satiety,80);assert.deepEqual(cues,['crunch']);
  for(const [state,id,persist] of [[initial,'missing',()=>true],[createVirtualPcState({music:{needs:{satiety:100}}}),'apple',()=>true],[initial,'apple',()=>false],[initial,'apple',()=>{throw Error('blocked');}]]){
    const result=runtime.consumeHomeFood(state,id,{persist,cue:id=>cues.push(id)});
    assert.equal(result.ok,false);assert.equal(result.state,state);assert.deepEqual(cues,['crunch']);
  }
});

test('crunch creates a short filtered noise source in the existing audio context',()=>{
  assert.equal(getSoundCue('crunch')?.type,'filtered-noise');
  const events=[],samples=new Float32Array(9600),gain={gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect:()=>({})};
  const filter={frequency:{setValueAtTime(){}},Q:{setValueAtTime(){}},connect:()=>gain,disconnect:()=>events.push('filter-disconnect')};
  const source={connect:()=>filter,start:()=>events.push('start'),stop:time=>events.push(['stop',time]),disconnect:()=>events.push('source-disconnect')};
  gain.disconnect=()=>events.push('gain-disconnect');
  const context={currentTime:4,sampleRate:48000,destination:{},createBuffer:(channels,frames)=>{assert.equal(channels,1);assert.ok(frames<=9600);return {getChannelData:()=>samples.subarray(0,frames)};},createBufferSource:()=>source,createBiquadFilter:()=>filter,createGain:()=>gain};
  playSoundCue('crunch',context);assert.equal(events[0],'start');assert.ok(events[1][1]>4&&events[1][1]<=4.2);
  assert.ok(samples.some(value=>value!==0));source.onended();
  assert.ok(events.includes('source-disconnect'));assert.ok(events.includes('filter-disconnect'));assert.ok(events.includes('gain-disconnect'));
});
