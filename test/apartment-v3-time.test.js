import test from 'node:test';
import assert from 'node:assert/strict';
import * as time from '../src/apartment-v3-time.js?rev=24';
const {ApartmentTime,homeLight,loadHomeTime,saveHomeTime}=time;

test('completing a bed action clears initial rest without instantly advancing seven hours',()=>{
  const clock=new ApartmentTime();clock.completeAction('bed');
  assert.deepEqual(clock.snapshot(),{day:1,minutes:1410,initialRest:false});assert.equal(clock.label,'23:30');
});
test('daylight follows game time with smooth dawn and dusk and dark nights',()=>{
  assert.equal(homeLight(180).daylight,0);assert.equal(homeLight(720).daylight,1);
  assert.equal(homeLight(1380).daylight,0);
  assert.ok(homeLight(390).daylight>0&&homeLight(390).daylight<1);
  assert.ok(homeLight(1140).daylight>0&&homeLight(1140).daylight<1);
  assert.ok(homeLight(270).daylight>0,'dawn begins before 05:00');
  assert.ok(homeLight(300).daylight>=.2,'05:00 must have visible morning light');
  assert.equal(homeLight(300).period,'Утро');
  assert.equal(homeLight(420).daylight,1,'full daylight by 07:00');
  assert.ok(Math.abs(homeLight(420-.01).daylight-homeLight(420+.01).daylight)<.001);
});
test('time continues slowly while playing and confirmed activities advance it once',()=>{
  const clock=new ApartmentTime({day:1,minutes:720});clock.tick(4);assert.equal(clock.label,'12:01');
  clock.completeAction('sink');assert.equal(clock.label,'12:16');
  clock.completeAction('computer');assert.equal(clock.label,'12:16','time is now charged by actual production stages');
  clock.completeAction('unknown');assert.equal(clock.label,'12:16');
  clock.tick(-2);clock.advanceMinutes(NaN);assert.equal(clock.label,'12:16');
});
test('home time round trips separately and corrupt or inaccessible saves are safe',()=>{
  const data=new Map(),storage={setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k)};
  const clock=new ApartmentTime({day:4,minutes:745});assert.equal(saveHomeTime(storage,clock),true);
  assert.deepEqual(loadHomeTime(storage).snapshot(),{day:4,minutes:745,initialRest:false});
  assert.equal(data.has('battle-life-campaign-v1'),false);
  for(const key of data.keys())data.set(key,'{"day":-1,"minutes":99999}');
  assert.equal(loadHomeTime(storage),null);
  assert.equal(saveHomeTime({setItem(){throw Error('blocked');}},clock),false);
});
test('continuing a saved morning does not request another initial seven-hour sleep',()=>{
  const clock=new ApartmentTime();assert.equal(clock.initialRest,true);clock.completeAction('bed');
  const restored=new ApartmentTime(clock.snapshot());assert.equal(restored.initialRest,false);
  assert.equal(restored.label,'23:30');
  assert.equal(new ApartmentTime({day:2,minutes:390}).initialRest,false,'migrate existing morning saves as awake');
  assert.equal(new ApartmentTime({day:1,minutes:1410}).initialRest,true,'migrate old initial night saves');
});

test('six hours of sleep advances 21:55 to 03:55 over eight real seconds',()=>{
  const clock=new ApartmentTime({day:1,minutes:1315});
  assert.equal(typeof clock.beginSleep,'function');
  assert.equal(clock.beginSleep(),true);
  assert.equal(clock.label,'21:55');
  assert.equal(clock.isSleeping,true);assert.equal(clock.sleepProgress,0);
  assert.equal(clock.sleepTargetLabel,'03:55');
  assert.deepEqual(clock.tick(2),{sleepCompleted:false});
  assert.equal(clock.label,'23:25');assert.equal(clock.sleepProgress,.25);
  clock.tick(2);assert.equal(clock.day,2);assert.equal(clock.label,'00:55');
  assert.deepEqual(clock.tick(4),{sleepCompleted:true});
  assert.equal(clock.label,'03:55');assert.equal(clock.sleepProgress,1);
  assert.equal(clock.isSleeping,false);assert.equal(clock.initialRest,false);
  assert.deepEqual(clock.tick(4),{sleepCompleted:false});assert.equal(clock.label,'03:56');
});

test('repeated sleep requests cannot reset active progress or replace its target',()=>{
  const clock=new ApartmentTime({day:2,minutes:600});
  assert.equal(typeof clock.beginSleep,'function');
  clock.beginSleep({minutes:60,seconds:2});clock.tick(1);
  assert.equal(clock.beginSleep({minutes:360,seconds:8}),false);
  assert.equal(clock.sleepTargetLabel,'11:00');assert.equal(clock.sleepProgress,.5);
  assert.deepEqual(clock.tick(1),{sleepCompleted:true});assert.equal(clock.label,'11:00');
});

test('cancelled sleep preserves elapsed minutes and resumes the normal clock',()=>{
  const clock=new ApartmentTime({day:1,minutes:1315});
  assert.equal(typeof clock.beginSleep,'function');
  clock.beginSleep();clock.tick(2);clock.cancelSleep();
  assert.equal(clock.label,'23:25');assert.equal(clock.isSleeping,false);
  assert.equal(clock.sleepProgress,0);assert.equal(clock.sleepTargetLabel,null);
  assert.equal(clock.initialRest,false);clock.tick(4);assert.equal(clock.label,'23:26');
  assert.equal(clock.beginSleep(),true);assert.equal(clock.sleepTargetLabel,'05:26');
});

test('an oversized finishing tick stops at the sleep target and completes only once',()=>{
  const clock=new ApartmentTime({day:1,minutes:1315});
  assert.equal(typeof clock.beginSleep,'function');
  clock.beginSleep();clock.tick(3);
  assert.deepEqual(clock.tick(100),{sleepCompleted:true});
  assert.equal(clock.day,2);assert.equal(clock.label,'03:55');assert.equal(clock.minutes,235);
  assert.deepEqual(clock.tick(0),{sleepCompleted:false});
  clock.completeAction('bed');assert.equal(clock.minutes,235);
});

test('small render ticks finish at exactly the same target as one full sleep tick',()=>{
  const clock=new ApartmentTime({day:1,minutes:1315});
  assert.equal(typeof clock.beginSleep,'function');
  clock.beginSleep();let completed=0;
  for(let frame=0;frame<480;frame++)if(clock.tick(1/60).sleepCompleted)completed++;
  assert.equal(completed,1);assert.equal(clock.isSleeping,false);
  assert.equal(clock.day,2);assert.equal(clock.minutes,235);assert.equal(clock.label,'03:55');
});

test('sleep midpoint shows the reached minute despite fractional render-tick error',()=>{
  const clock=new ApartmentTime({day:1,minutes:1315});
  clock.beginSleep();
  for(let frame=0;frame<240;frame++)clock.tick(1/60);
  assert.ok(Math.abs(clock.minutes-55)<1e-9);
  assert.equal(clock.label,'00:55');
});

test('minute labels do not round forward a few real or game milliseconds before the boundary',()=>{
  const sleeping=new ApartmentTime({day:1,minutes:1315});
  sleeping.beginSleep();sleeping.tick(3.997);
  assert.equal(sleeping.label,'00:54');
  const awake=new ApartmentTime({day:2,minutes:55-.003/60});
  assert.equal(awake.label,'00:54');
  const beforeMidnight=new ApartmentTime({day:2,minutes:1440-.003/60});
  assert.equal(beforeMidnight.label,'23:59');
});

test('partial sleep survives a save and resumes only its remaining six real seconds',()=>{
  const data=new Map(),storage={setItem:(key,value)=>data.set(key,value),getItem:key=>data.get(key)??null};
  const clock=new ApartmentTime({day:1,minutes:1315});
  assert.equal(typeof clock.beginSleep,'function');
  clock.beginSleep();clock.tick(2);assert.equal(saveHomeTime(storage,clock),true);
  const restored=loadHomeTime(storage);
  assert.equal(restored.label,'23:25');assert.equal(restored.isSleeping,true);
  assert.equal(restored.sleepProgress,.25);assert.equal(restored.sleepTargetLabel,'03:55');
  assert.equal(restored.initialRest,false);
  restored.tick(2);assert.equal(restored.label,'00:55');assert.equal(restored.sleepProgress,.5);
  assert.deepEqual(restored.tick(4),{sleepCompleted:true});assert.equal(restored.label,'03:55');
  saveHomeTime(storage,restored);assert.equal(loadHomeTime(storage).isSleeping,false);
});

test('invalid sleep parameters and tick deltas cannot poison the game clock',()=>{
  const clock=new ApartmentTime({day:2,minutes:600});
  assert.equal(typeof clock.beginSleep,'function');
  for(const options of [{minutes:0},{minutes:-1},{minutes:NaN},{seconds:0},{seconds:Infinity},{seconds:'8'},null]){
    assert.equal(clock.beginSleep(options),false);assert.equal(clock.isSleeping,false);
  }
  clock.beginSleep();
  for(const dt of [0,-1,NaN,Infinity,'2'])assert.deepEqual(clock.tick(dt),{sleepCompleted:false});
  assert.equal(clock.label,'10:00');assert.equal(clock.sleepProgress,0);
});

test('corrupt partial-sleep metadata is discarded without losing the stored time',()=>{
  const invalid=[null,[],{}, {minutes:-1,seconds:8,elapsedSeconds:2}, {minutes:360,seconds:0,elapsedSeconds:2},
    {minutes:360,seconds:8,elapsedSeconds:-1}, {minutes:360,seconds:8,elapsedSeconds:99},
    {minutes:360,seconds:8,elapsedSeconds:'2'}];
  for(const sleep of invalid){
    const clock=new ApartmentTime({day:1,minutes:1405,initialRest:false,sleep});
    assert.equal(clock.isSleeping,false);assert.equal(clock.initialRest,false);
    clock.tick(4);assert.equal(clock.label,'23:26');
  }
  for(const snapshot of [null,[],{}, {day:-1,minutes:1440}, {day:1,minutes:NaN}]){
    const clock=new ApartmentTime(snapshot);assert.equal(clock.label,'23:30');assert.equal(clock.day,1);
  }
});

test('clock hands show noon, midnight and fractional hours clockwise from twelve',()=>{
  assert.equal(typeof time.clockHandAngles,'function');
  for(const minutes of [0,720,1440])assert.deepEqual(time.clockHandAngles(minutes),{hour:0,minute:0});
  const quarterPastThree=time.clockHandAngles(195);
  assert.ok(Math.abs(quarterPastThree.hour-13*Math.PI/24)<1e-12);
  assert.ok(Math.abs(quarterPastThree.minute-Math.PI/2)<1e-12);
  assert.deepEqual(time.clockHandAngles(1635),quarterPastThree);
  assert.deepEqual(time.clockHandAngles(-1245),quarterPastThree);
  const seconds=time.clockHandAngles(30.5);
  assert.ok(Math.abs(seconds.minute-61*Math.PI/60)<1e-12);
  assert.deepEqual(time.clockHandAngles(NaN),{hour:0,minute:0});
});
