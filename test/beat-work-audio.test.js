import test from 'node:test';
import assert from 'node:assert/strict';
import {BeatAudio} from '../src/beat-audio.js';
const module=await import('../src/beat-work-audio.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const frame=(stage=0,phase='working',hidden=false)=>({phase,hidden,beat:{version:3,id:'a',drumId:'beginner-drums-01',stages:[],audio:{bankVersion:1,bars:4,themeId:'beginner-theme-01',arrangementId:'beginner-arrangement-01'}},job:{beatId:'a',stage}});
test('hiding during departure or reveal requires a gesture before the work layer starts',async()=>{
 for(const phase of ['work-out','work-reveal']){
  let starts=0;const c=module.createBeatWorkAudio({playProject:async()=>{starts++;return true;},stop(){},unlock:async()=>{}});
  c.sync(frame(0,'work-out'));c.sync(frame(0,phase,true));c.sync(frame(0,phase));const result=c.sync(frame());
  assert.equal(starts,0,phase+' must not auto-start');assert.equal(result.needsGesture,true);
  await c.enableAudio();assert.equal(starts,1);c.sync(frame(0,'work-cover'));c.sync(frame(1,'work-out'));c.sync(frame(1));assert.equal(starts,2,'a newly requested stage permits sound');c.dispose();
 }
});
test('working plays exact stage once and finish/cancel/hidden stop audio',async()=>{
 assert.equal(typeof module.createBeatWorkAudio,'function');const calls=[],stops=[];let unlocks=0;
 const c=module.createBeatWorkAudio({playProject:async(b,o)=>{calls.push(o.workStage);return true;},stop:o=>stops.push(o),unlock:async()=>unlocks++});
 for(let stage=0;stage<3;stage++){c.sync(frame(stage,'work-out'));c.sync(frame(stage));c.sync(frame(stage));c.sync(frame(stage,'work-cover'));}
 assert.deepEqual(calls,[0,1,2]);assert.ok(stops.every(o=>o.fadeSeconds===.08));
 c.sync(frame(1));c.sync(frame(1,'working',true));const before=calls.length;
 assert.equal(c.sync(frame(1)).needsGesture,true);assert.equal(calls.length,before);
 await c.enableAudio();assert.equal(unlocks,1);assert.equal(calls.length,before+1);
 c.sync(frame(1,'room'));c.dispose();const count=calls.length;c.sync(frame());assert.equal(calls.length,count);
});
test('audio failure reports a retry without changing job or time',async()=>{
 assert.equal(typeof module.createBeatWorkAudio,'function');const f=frame(),before=structuredClone(f);let calls=0;
 const c=module.createBeatWorkAudio({playProject:async()=>{calls++;return false;},stop(){},error:'Файл недоступен'});
 c.sync(f);await Promise.resolve();assert.match(c.sync(f).audioError,/недоступен/);assert.equal(calls,1);assert.deepEqual(f,before);c.dispose();
});
test('late decode after work cannot start sources',async()=>{
 assert.equal(typeof module.createBeatWorkAudio,'function');let decode,started=0;
 const ctx={state:'running',currentTime:0,decodeAudioData:()=>new Promise(r=>decode=r),createBufferSource(){started++;},close(){}};
 const audio=new BeatAudio({contextFactory:()=>ctx,fetchFn:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})}),c=module.createBeatWorkAudio(audio);
 c.sync(frame());while(!decode)await Promise.resolve();c.sync(frame(0,'work-cover'));decode({duration:32/3});await Promise.resolve();await Promise.resolve();
 assert.equal(started,0);assert.equal(audio.getSnapshot().status,'stopped');c.dispose();audio.dispose();
});
