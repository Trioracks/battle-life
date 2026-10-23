import test from 'node:test';
import assert from 'node:assert/strict';
import {startExportJob,advanceExportJob,cancelExportJob,advanceExportJobDurably} from '../src/pc-export-job.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {softwareDiskBytes} from '../src/pc-software.js';
import {createSocialBackground} from '../src/social-background.js';
import {createSocialWorkerRuntime} from '../src/social-worker-runtime.js';
const args={jobId:'render-1',projectId:'beat',kind:'track',format:'mp3',folderId:'exports',filename:'Сдано.mp3',nowMinute:600};
const tick=(state,activeSeconds,extra={})=>advanceExportJob(state,{activeSeconds,visible:true,powered:true,paused:false,...extra});
test('five active seconds create one immutable file and version, with reserved space and stable completion ID',()=>{
 const original=submissionFixture(),started=startExportJob(original,args);assert.equal(started.ok,true,started.reason);assert.equal(started.state.audioExports.files.length,0);assert.deepEqual(started.state.trackVersions,original.trackVersions);assert.ok(softwareDiskBytes(started.state).used>softwareDiskBytes(original).used);
 const frozen=structuredClone(started.state.exportJob.file);let s=tick(started.state,4.99).state;assert.equal(s.audioExports.files.length,0);s={...s,projects:[]};s=createVirtualPcState(JSON.parse(JSON.stringify(s)));const done=tick(s,.01);assert.equal(done.completedFileId,frozen.id);assert.deepEqual(done.state.audioExports.files,[frozen]);assert.ok(done.state.trackVersions.byId[frozen.trackVersionId]);assert.equal(done.events[0].id,'render-1:complete');assert.equal(tick(done.state,10).events.length,0);
});
test('pause, hidden and power-off do not advance; cancel and duplicate starts never publish a file',()=>{
 const s=startExportJob(submissionFixture(),args).state;for(const extra of [{visible:false},{powered:false},{paused:true}])assert.equal(tick(s,20,extra).state.exportJob.elapsedSeconds,0);
 assert.equal(startExportJob(s,{...args,jobId:'other'}).ok,false);const c=cancelExportJob(s);assert.equal(c.ok,true);assert.equal(c.state.exportJob,null);assert.equal(c.state.audioExports.files.length,0);assert.deepEqual(c.state.trackVersions,s.trackVersions);
});
test('a late social worker cannot replace a pending or completed export',()=>{
 let state=submissionFixture(),worker;const calculate=createSocialWorkerRuntime(),background=createSocialBackground({getState:()=>state,createWorker:()=>worker={postMessage(request){this.request=structuredClone(request);},terminate(){}},persist:()=>true,onState:s=>state=s});background.tick(600,{},0);state=startExportJob(state,args).state;const pending=state.exportJob;worker.onmessage({data:calculate(worker.request)});assert.equal(state.exportJob,pending);state=tick(state,5).state;const files=state.audioExports.files;background.tick(601,{},10000);worker.onmessage({data:calculate(worker.request)});assert.equal(state.audioExports.files,files);assert.equal(state.exportJob,null);background.dispose();
});
test('a rejected final commit emits no completion or file and retries the same frozen ID',()=>{
 const started=startExportJob(submissionFixture(),args).state,ready=tick(started,4.99).state,options={activeSeconds:1,visible:true,powered:true,paused:false};let writes=0;
 const rejected=advanceExportJobDurably(ready,options,()=>{writes++;return false;});assert.equal(rejected.state,ready);assert.equal(rejected.completedFileId,null);assert.deepEqual(rejected.events,[]);assert.equal(ready.audioExports.files.length,0);
 const saved=advanceExportJobDurably(ready,options,()=>{writes++;return true;});assert.equal(saved.completedFileId,ready.exportJob.file.id);assert.equal(writes,2);assert.equal(saved.state.audioExports.files.length,1);
});
test('a full disk at completion keeps the job and publishes no incomplete file',()=>{
 const s=startExportJob(submissionFixture(),args).state;s.projects.push(...Array.from({length:1000},(_,i)=>({id:'occupied-'+i})));const r=tick(s,5);assert.equal(r.completedFileId,null);assert.match(r.state.exportJob.error,/места/);assert.equal(r.state.audioExports.files.length,0);
});
