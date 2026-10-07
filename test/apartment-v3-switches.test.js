import test from 'node:test';
import assert from 'node:assert/strict';
import {ApartmentTime,saveHomeTime,loadHomeTime} from '../src/apartment-v3-time.js';
import {ApartmentMotion} from '../src/apartment-v3-motion.js';
import {advanceHomeFrame} from '../src/apartment-v3-runtime.js';

const config={bounds:[-6,6.2],spawn:[2,0,.85],speed:1,doorX:0,actions:{
  'light-living':{approach:[3.6,0,.85],pose:[3.6,0,-1.0],yaw:Math.PI,clip:'reach',duration:.7,lightRoom:'living',contactTime:.32},
  'light-kitchen':{approach:[-1,0,.85],pose:[-1,0,-1],yaw:Math.PI,clip:'reach',duration:.7,lightRoom:'kitchen',contactTime:.32},
}};
function advanceUntil(m,c,predicate,hold=false){
  const events=[];for(let n=0;n<1600&&!predicate();n++)events.push(...advanceHomeFrame(m,c,1/60,hold).events);
  assert.ok(predicate(),'action reached expected phase');return events;
}

test('each wall switch changes only its own room and survives a save round trip',()=>{
  const c=new ApartmentTime({day:2,minutes:300});
  assert.equal(typeof c.toggleRoomLight,'function');
  assert.deepEqual(c.lights,{living:true,kitchen:true});
  c.toggleRoomLight('living');assert.deepEqual(c.lights,{living:false,kitchen:true});
  assert.equal(c.label,'05:00','a switch does not spend activity minutes');
  const memory=new Map(),storage={setItem:(k,v)=>memory.set(k,v),getItem:k=>memory.get(k)};
  saveHomeTime(storage,c);const resumed=loadHomeTime(storage);
  assert.deepEqual(resumed.lights,{living:false,kitchen:true});
  resumed.toggleRoomLight('kitchen');assert.deepEqual(resumed.lights,{living:false,kitchen:false});
  resumed.toggleRoomLight('living');assert.deepEqual(resumed.lights,{living:true,kitchen:false});
  resumed.toggleRoomLight('__proto__');assert.deepEqual(resumed.lights,{living:true,kitchen:false});
});

test('old and malformed lighting saves migrate without treating strings as enabled switches',()=>{
  assert.deepEqual(new ApartmentTime({day:2,minutes:720}).lights,{living:true,kitchen:true});
  assert.deepEqual(new ApartmentTime({day:2,minutes:720,lights:{living:false,kitchen:'false'}}).lights,{living:false,kitchen:true});
});

test('light changes at hand contact after approach, exactly once even while inspection holds the action',()=>{
  const m=new ApartmentMotion(config),c=new ApartmentTime({day:2,minutes:720});m.interact('light-living');
  advanceUntil(m,c,()=>m.phase==='perform',true);
  assert.deepEqual(c.lights,{living:true,kitchen:true},'walking to a switch cannot change it remotely');
  for(let n=0;n<12;n++)advanceHomeFrame(m,c,1/60,true);
  assert.equal(c.lights.living,true,'hand has not reached the switch yet');
  const events=[];for(let n=0;n<300;n++)events.push(...advanceHomeFrame(m,c,1/60,true).events);
  assert.deepEqual(c.lights,{living:false,kitchen:true});
  assert.equal(events.filter(e=>e.type==='interacted'&&e.id==='light-living').length,1);
  advanceUntil(m,c,()=>m.phase==='idle');
  m.interact('light-living');advanceUntil(m,c,()=>m.phase==='idle');
  assert.deepEqual(c.lights,{living:true,kitchen:true},'next intentional press toggles it back');
});

test('cancelling before hand contact leaves lights unchanged',()=>{
  const m=new ApartmentMotion(config),c=new ApartmentTime({day:2,minutes:720});m.interact('light-living');
  advanceUntil(m,c,()=>m.phase==='perform');m.move(5);
  advanceUntil(m,c,()=>m.phase==='idle');
  assert.deepEqual(c.lights,{living:true,kitchen:true});
});

test('reaching the other room switch opens the passage only for that crossing',()=>{
  const m=new ApartmentMotion(config),c=new ApartmentTime({day:2,minutes:720});m.interact('light-kitchen');
  let opened=false;for(let n=0;n<1800&&!(m.phase==='idle'&&n>0);n++){
    advanceHomeFrame(m,c,1/60);opened||=m.doorOpen>.9;
  }
  assert.equal(opened,true);assert.equal(m.phase,'idle');
  assert.deepEqual(c.lights,{living:true,kitchen:false});
  assert.ok(m.doorOpen<.01,'passage closes after crossing, not because the switch is used');
});
