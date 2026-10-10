import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ApartmentMotion} from '../src/apartment-v3-motion.js';
import {ApartmentTime} from '../src/apartment-v3-time.js';
import {prepareApartmentConfig,advanceHomeFrame} from '../src/apartment-v3-runtime.js';

test('computer activation cuts directly to the desk without walking or a visible seated actor',async()=>{
 const {beginPcCutscene,pcActorVisible}=await import('../src/virtual-pc-lifecycle.js');
 assert.equal(typeof beginPcCutscene,'function');assert.equal(typeof pcActorVisible,'function');
 const config=prepareApartmentConfig(JSON.parse(readFileSync(new URL('../assets/apartment/v3/scene.json',import.meta.url))));
 const m=new ApartmentMotion(config),time=new ApartmentTime();
 assert.equal(beginPcCutscene(m),true);assert.equal(m.phase,'fade-out');assert.equal(beginPcCutscene(m),false);
 const visible=[];
 for(let i=0;i<90;i++){advanceHomeFrame(m,time,1/60,true);visible.push([m.phase,pcActorVisible(m,true)]);}
 assert.equal(m.phase,'perform');assert.equal(m.actionId,'computer');
 assert.equal(visible.some(([phase])=>phase==='walk'),false);
 for(const phase of ['black','fade-in','perform'])assert.ok(visible.filter(([p])=>p===phase).every(([,shown])=>!shown));
 assert.equal(pcActorVisible(m,false),false,'normal source-frame capture must not reintroduce seated actor');
 m.leaveAction();for(let i=0;i<90;i++)advanceHomeFrame(m,time,1/60);
 assert.equal(m.phase,'idle');assert.equal(pcActorVisible(m,false),true);
});
