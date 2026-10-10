import test from 'node:test';
import assert from 'node:assert/strict';
import {ApartmentMotion} from '../src/apartment-v3-motion.js';
import {ApartmentTime} from '../src/apartment-v3-time.js?rev=26';

async function runtime(){let module;try{module=await import('../src/apartment-v3-runtime.js?rev=26');}catch{}assert.equal(typeof module?.advanceHomeFrame,'function','game time and motion must share a tested frame integration');return module;}
const config={bounds:[-6,6.15],spawn:[2,0,.85],speed:1.1,doorX:0,actions:{
  bed:{approach:[2,0,.85],pose:[1.84,.95,-.8],yaw:Math.PI/2,clip:'sleep',fade:true,duration:5},
  entry:{label:'Выйти',approach:[5.98,0,.85],pose:[6.04,0,.675],yaw:Math.PI/2,clip:'open-door',fade:false,duration:3}
}};

test('initial sleep visibly advances six hours, crosses midnight and wakes without a second jump',async()=>{
  const {advanceHomeFrame,prepareApartmentConfig}=await runtime();
  const m=new ApartmentMotion(prepareApartmentConfig(config)),c=new ApartmentTime({day:1,minutes:1315});m.startSleeping();
  let events=[];for(let i=0;i<240;i++)events.push(...advanceHomeFrame(m,c,1/60).events);
  assert.equal(c.day,2);assert.equal(c.label,'00:55');assert.equal(m.clip,'sleep');assert.equal(m.sleeping,true);
  for(let i=0;i<240;i++)events.push(...advanceHomeFrame(m,c,1/60).events);
  assert.equal(c.label,'03:55');assert.equal(c.isSleeping,false);assert.equal(m.phase,'return-out');
  assert.equal(events.filter(e=>e.type==='completed'&&e.id==='bed').length,1);
  for(let i=0;i<60;i++)advanceHomeFrame(m,c,1/60);
  assert.equal(m.phase,'idle');assert.equal(c.label,'03:55');assert.ok(c.minutes<236);
});

test('a floor click during accelerated rest cancels only its remaining time',async()=>{
  const {advanceHomeFrame,prepareApartmentConfig}=await runtime();
  const m=new ApartmentMotion(prepareApartmentConfig(config)),c=new ApartmentTime({day:1,minutes:1200});m.startSleeping();
  for(let i=0;i<120;i++)advanceHomeFrame(m,c,1/60);
  assert.equal(c.label,'21:30');m.move(4);
  for(let i=0;i<180;i++)advanceHomeFrame(m,c,1/60);
  assert.equal(c.isSleeping,false);assert.equal(c.label,'21:30');assert.ok(m.position[0]>2);
});

test('inspection hold pauses sleep time without losing its target or pose',async()=>{
  const {advanceHomeFrame,prepareApartmentConfig}=await runtime();
  const m=new ApartmentMotion(prepareApartmentConfig(config)),c=new ApartmentTime({day:1,minutes:1200});m.startSleeping();
  for(let i=0;i<900;i++)advanceHomeFrame(m,c,1/60,true);
  assert.equal(c.label,'20:00');assert.equal(m.phase,'perform');assert.equal(c.sleepTargetLabel,'02:00');
  for(let i=0;i<480;i++)advanceHomeFrame(m,c,1/60);
  assert.equal(c.label,'02:00');assert.equal(m.phase,'return-out');
});

test('resume of a partial sleep preserves the original target and remaining duration',async()=>{
  const {advanceHomeFrame,prepareApartmentConfig}=await runtime();
  const cfg=prepareApartmentConfig(config),first=new ApartmentTime({day:1,minutes:1315});first.beginSleep();first.tick(3);
  const c=new ApartmentTime(first.snapshot()),m=new ApartmentMotion(cfg);m.startSleeping();
  for(let i=0;i<300;i++)advanceHomeFrame(m,c,1/60);
  assert.equal(c.label,'03:55');assert.equal(m.phase,'return-out');
});

test('door peephole action targets the door but never has an overlapping scene hitbox',async()=>{
  const {prepareApartmentConfig}=await runtime();const cfg=prepareApartmentConfig(config);
  assert.equal(config.actions.peephole,undefined,'do not mutate export');
  assert.equal(cfg.actions.peephole.hit,undefined);assert.equal(cfg.actions.peephole.duration,Infinity);
  assert.equal(cfg.actions.peephole.yaw,Math.PI/2);assert.equal(cfg.actions.bed.clockDriven,true);
});
