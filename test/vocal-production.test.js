import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createBeat,startBeatStage,advanceBeatWork} from '../src/beat-production.js';
import {createLyric,startLyricWork,advanceLyricWork} from '../src/lyric-production.js';
const v=await import('../src/vocal-production.js').catch(()=>({}));
export function fixture(){
 let s=createVirtualPcState();s=createBeat(s,{id:'b',name:'Бит'},{},()=>.2).state;
 for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=advanceBeatWork(startBeatStage(s,'b',undefined,{},()=>.5).state,1000).state;}
 s=createLyric(s,{id:'t',name:'Текст'},{}).state;
 for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=advanceLyricWork(startLyricWork(s,{projectId:'t',kind:'stage'},{}).state,1000).state;}
 s.music.needs={satiety:100,energy:100};return s;
}
const finish=(s,kind,extra={})=>{s.music.needs={satiety:100,energy:100};const r=v.startVocalWork(s,{beatId:'b',textId:'t',kind,...extra},{flow:10,sound:10},()=>.2);assert.equal(r.ok,true,r.reason);return v.advanceVocalWork(r.state,1000).state;};
test('ready beat and ready text required; recording survives save and fixes one source',()=>{
 assert.equal(typeof v.startVocalWork,'function');let s=fixture();
 assert.equal(v.startVocalWork(s,{beatId:'b',kind:'draft',textId:'missing'}).ok,false);
 s=finish(s,'draft');const r=s.projects[0].recording;assert.ok(r.draft);assert.equal(r.clean,null);assert.equal(r.text.id,'t');assert.equal(r.sourceId,'vocal-09');
 assert.deepEqual(createVirtualPcState(JSON.parse(JSON.stringify(s))).projects[0].recording,r);
 s=finish(s,'clean');assert.equal(s.projects[0].recording.sourceId,r.sourceId);assert.ok(s.projects[0].recording.clean.quality>r.draft.quality);
 assert.equal(v.startVocalWork(s,{beatId:'b',kind:'draft'}).ok,false);assert.equal(v.startVocalWork(s,{beatId:'b',kind:'clean'}).ok,false);
});
test('post processing is optional, capped, one-time and reset by clean take',()=>{
 assert.equal(typeof v.startVocalWork,'function');let s=finish(fixture(),'draft');const q=s.projects[0].recording.draft.quality;
 s=finish(s,'mix');s=finish(s,'master');assert.equal(v.recordingQuality(s.projects[0].recording),q+4);
 assert.equal(v.startVocalWork(s,{beatId:'b',kind:'master'}).ok,false);assert.equal(v.startVocalWork(s,{beatId:'b',kind:'mix'}).ok,false);
 s=finish(s,'clean');assert.equal(s.projects[0].recording.mix,null);assert.equal(s.projects[0].recording.master,null);
});
test('hardware ceiling persists despite expert skill and best settings',()=>{
 assert.equal(typeof v.startVocalWork,'function');let s=fixture();
 for(const kind of ['draft','clean','mix','master']){s.music.needs={satiety:100,energy:100};const r=v.startVocalWork(s,{beatId:'b',textId:'t',kind,sliders:[8,8,8]},{flow:100,sound:100,musicality:100,confidence:100},()=>.5);assert.ok(r.ok);s=v.advanceVocalWork(r.state,1000).state;}
 assert.ok(v.recordingQuality(s.projects[0].recording)<=44);
});
test('interrupted work preserves candidate and credits practice once, locks competing work',()=>{
 assert.equal(typeof v.startVocalWork,'function');let s=fixture();s.music.needs.satiety=21;
 let r=v.startVocalWork(s,{beatId:'b',textId:'t',kind:'draft'},{},()=>.2);const output=r.state.recording.job.output;
 assert.equal(startLyricWork(r.state,{projectId:'t',kind:'diss'}).ok,false);
 r=v.advanceVocalWork(r.state,1000);assert.equal(r.blocked,true);assert.equal(r.finished,false);
 s=createVirtualPcState(JSON.parse(JSON.stringify(r.state)));assert.deepEqual(s.recording.job.output,output);s.music.needs.satiety=100;
 s=v.advanceVocalWork(s,1000).state;assert.ok(Math.abs(s.recording.practice.flow-1/3)<1e-9);
 assert.equal(v.advanceVocalWork(s,1000).state.recording.practice.flow,s.recording.practice.flow);
});
test('malformed or foreign revision jobs cannot overwrite another recording',()=>{
 assert.equal(typeof v.startVocalWork,'function');let s=v.startVocalWork(fixture(),{beatId:'b',textId:'t',kind:'draft'}).state;
 s.recording.job.baseRevision=99;assert.equal(createVirtualPcState(s).recording.job,null);
 s=finish(fixture(),'draft');s.projects[0].recording.sourceId='../../bad';assert.equal(createVirtualPcState(s).projects[0].recording,undefined);
});
test('even unlucky clean decisions cannot make the take worse than its draft',()=>{
 let s=fixture();s=v.advanceVocalWork(v.startVocalWork(s,{beatId:'b',textId:'t',kind:'draft',sliders:[8,8,8]},{flow:30,sound:30},()=>.4).state,1000).state;
 const q=s.projects[0].recording.draft.quality;s.music.needs={satiety:100,energy:100};
 s=v.advanceVocalWork(v.startVocalWork(s,{beatId:'b',kind:'clean',sliders:[0,0,0]},{flow:30,sound:30},()=>.4).state,1000).state;
 assert.ok(s.projects[0].recording.clean.quality>=Math.min(44,q+3));
});
