import test from 'node:test';
import assert from 'node:assert/strict';
import {BeatAudio} from '../src/beat-audio.js';
const playback=await import('../src/beat-playback.js').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
const beat=(drumId='beginner-drums-01')=>({version:3,id:'one',name:'One',genre:'boombap',bpm:90,drumId,stages:[{},{},{}],audio:{bankVersion:1,bars:4,themeId:'beginner-theme-02',arrangementId:'beginner-arrangement-03'}});
function context(){return {state:'running',currentTime:12,destination:{},sources:[],createGain(){return {gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};},createBufferSource(){const s={connect(){},disconnect(){this.disconnected=true;},start(time,offset){Object.assign(this,{time,offset});},stop(time){this.stopped=true;this.stopTime=time;}};this.sources.push(s);return s;},decodeAudioData:async()=>({duration:32/3}),close(){}};}
const make=(ctx,fetchFn=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}))=>new BeatAudio({contextFactory:()=>ctx,fetchFn});
test('market preview has a distinct owner and project Play replaces it',async()=>{
 const ctx=context(),audio=make(ctx);await audio.play({drumId:'beginner-drums-01',stage:1});
 assert.equal(audio.getSnapshot().owner,'preview');const preview=ctx.sources[0];
 await audio.playProject(beat());assert.equal(audio.getSnapshot().owner,'studio');assert.equal(preview.stopped,true);audio.dispose();
});
test('descriptor resolves completed layers, work layers, legacy and rejects unknown IDs',()=>{
 assert.equal(typeof playback.resolveBeatPlayback,'function');const resolve=playback.resolveBeatPlayback;
 assert.equal(resolve(beat()).descriptor.parts.length,3);assert.equal(resolve(beat()).descriptor.durationSeconds,32/3);
 assert.deepEqual(resolve(beat(),{workStage:1}).descriptor.parts,[{id:'beginner-theme-02',loopSeconds:32/3}]);
 assert.equal(resolve({...beat(),stages:[]}).ok,false);assert.equal(resolve({...beat(),stages:[]},{workStage:0}).ok,true);
 assert.equal(resolve({...beat(),version:2,drumId:'primitive'}).descriptor.durationSeconds,16/3);
 assert.equal(resolve(beat('../../evil')).ok,false);assert.equal(resolve(beat(),{workStage:3}).ok,false);
 assert.equal(resolve({...beat(),audio:{...beat().audio,bankVersion:5}}).ok,false);
});
test('pause_resume_keeps_offset, stop_rewinds, repeated_play_is_idempotent and layers share clock',async()=>{
 const ctx=context(),audio=make(ctx);assert.equal(typeof audio.playProject,'function');
 const first=audio.playProject(beat()),again=audio.playProject(beat());assert.equal(await first,true);assert.equal(await again,true);assert.equal(ctx.sources.length,3);
 assert.ok(ctx.sources.every(s=>s.time===12.04&&s.offset===0));ctx.currentTime=14.04;audio.pause();
 assert.equal(audio.getSnapshot().status,'paused');assert.ok(Math.abs(audio.getSnapshot().positionSeconds-2)<1e-8);ctx.currentTime+=10;
 assert.ok(Math.abs(audio.getSnapshot().positionSeconds-2)<1e-8);await audio.playProject(beat());assert.equal(ctx.sources.length,6);
 assert.ok(ctx.sources.slice(3).every(s=>Math.abs(s.offset-2)<1e-8&&s.time===24.08));await audio.playProject(beat());assert.equal(ctx.sources.length,6);
 audio.stop();assert.equal(audio.getSnapshot().positionSeconds,0);assert.ok(ctx.sources.every(s=>s.stopped));
 await audio.playProject(beat());assert.equal(ctx.sources.at(-1).offset,0);audio.dispose();
});
test('authored four-bar sources stay aligned and playback positions wrap',async()=>{
 const ctx=context(),audio=make(ctx);assert.equal(typeof audio.playProject,'function');await audio.playProject(beat('beginner-drums-01'));
 assert.deepEqual(ctx.sources.map(s=>s.loopEnd),[32/3,32/3,32/3]);ctx.currentTime=12.04+32/3+7;audio.pause();await audio.playProject(beat('beginner-drums-01'));
 assert.ok(Math.abs(ctx.sources[3].offset-7)<1e-8);assert.ok(Math.abs(ctx.sources[4].offset-7)<1e-8);audio.dispose();
});
test('stop or pause cancels late fetch and decode without stale errors',async()=>{
 for(const action of ['stop','pause']){
  const ctx=context();let finish;ctx.decodeAudioData=()=>new Promise(r=>finish=r);const audio=make(ctx);assert.equal(typeof audio.playProject,'function');
  const pending=audio.playProject(beat(),{workStage:0});while(!finish)await Promise.resolve();audio[action]();finish({duration:32/3});
  assert.equal(await pending,false);assert.equal(ctx.sources.length,0);assert.equal(audio.getSnapshot().status,action==='pause'?'paused':'stopped');audio.dispose();
 }
 const ctx=context();let fail;const audio=make(ctx,()=>new Promise((_,reject)=>fail=reject));const pending=audio.playProject(beat(),{workStage:0});await Promise.resolve();audio.stop();fail(Error('old'));
 assert.equal(await pending,false);assert.equal(audio.getSnapshot().error,'');audio.dispose();
});
test('owner switch cancels old sources including fading work, missing files preserve project',async()=>{
 const ctx=context(),audio=make(ctx);assert.equal(typeof audio.playProject,'function');const project=beat(),before=JSON.stringify(project);
 await audio.playProject(project,{workStage:2});assert.equal(audio.getSnapshot().owner,'work');assert.equal(ctx.sources.length,1);
 audio.stop({fadeSeconds:.08});await audio.playProject(project);assert.equal(audio.getSnapshot().owner,'studio');assert.equal(ctx.sources[0].disconnected,true);
 audio.stop();audio.cache.clear();audio.fetchFn=async()=>({ok:false});assert.equal(await audio.playProject(project),false);assert.equal(audio.getSnapshot().status,'error');assert.equal(JSON.stringify(project),before);
 audio.dispose();assert.equal(await audio.playProject(project),false);
});
