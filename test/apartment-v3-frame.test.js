import test from 'node:test';
import assert from 'node:assert/strict';
import {ApartmentMotion} from '../src/apartment-v3-motion.js';
import {advanceApartmentFrame} from '../src/apartment-v3-frame.js';
const config={bounds:[-6,6],spawn:[2,0,.8],speed:1.02,doorX:0,actions:{}};
test('a low frame rate does not slow walking down by discarding simulation time',()=>{
  const slow=new ApartmentMotion(config),fast=new ApartmentMotion(config);
  for(const m of [slow,fast]){m.yaw=Math.PI/2;m.move(5);}
  for(let i=0;i<5;i++)advanceApartmentFrame(slow,.2,false);
  for(let i=0;i<60;i++)advanceApartmentFrame(fast,1/60,false);
  assert.ok(Math.abs(slow.position[0]-3.02)<.002);assert.ok(Math.abs(slow.position[0]-fast.position[0])<.002);
});
test('a suspended browser tab cannot teleport across the room when it returns',()=>{
  const m=new ApartmentMotion(config);m.yaw=Math.PI/2;m.move(5);advanceApartmentFrame(m,20,false);
  assert.ok(m.position[0]<=2.256);assert.equal(advanceApartmentFrame(m,NaN,false),0);
});
