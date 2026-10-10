import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ApartmentMotion} from '../src/apartment-v3-motion.js';
import {ApartmentTime} from '../src/apartment-v3-time.js?rev=26';
import {prepareApartmentConfig,advanceHomeFrame} from '../src/apartment-v3-runtime.js?rev=26';

test('computer activation walks to the desk before transition and keeps seated actor hidden',async()=>{
 const {beginPcCutscene,pcActorVisible}=await import('../src/virtual-pc-lifecycle.js?rev=26');
 assert.equal(typeof beginPcCutscene,'function');assert.equal(typeof pcActorVisible,'function');
 const config=prepareApartmentConfig(JSON.parse(readFileSync(new URL('../assets/apartment/v3/scene.json',import.meta.url))));
 const m=new ApartmentMotion(config),time=new ApartmentTime();
 const start=[...m.position];
 assert.equal(beginPcCutscene(m),true);assert.equal(m.phase,'walk');assert.deepEqual(m.position,start);
 assert.equal(pcActorVisible(m,false),true);
 const visible=[];
 for(let i=0;i<300;i++){
  advanceHomeFrame(m,time,1/60,true);visible.push([m.phase,pcActorVisible(m,false)]);
  if(m.phase==='fade-out')assert.equal(m.position[0],config.actions.computer.approach[0]);
 }
 assert.equal(m.phase,'perform');assert.equal(m.actionId,'computer');
 assert.equal(visible.some(([phase,shown])=>phase==='walk'&&shown),true);
 for(const phase of ['black','fade-in','perform'])assert.ok(visible.filter(([p])=>p===phase).every(([,shown])=>!shown));
 assert.equal(pcActorVisible(m,false),false,'normal source-frame capture must not reintroduce seated actor');
 m.leaveAction();for(let i=0;i<90;i++)advanceHomeFrame(m,time,1/60);
 assert.equal(m.phase,'idle');assert.equal(pcActorVisible(m,false),true);
});
