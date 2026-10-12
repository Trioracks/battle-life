import test from 'node:test';
import assert from 'node:assert/strict';
import * as upload from '../src/social-upload.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {attachSubmissionTrack,sendSubmission} from '../src/social-submission.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import * as runtime from '../src/virtual-pc-runtime.js';
const options={communityId:'makarevich-1',projectId:'beat',nowMinute:601};
const ready=()=>ensureBattleWindow(submissionFixture(),{battleId:'makarevich-1',nowMinute:600}).state;
const start=()=>upload.startSubmissionUpload(ready(),options);
const tick=(s,t,extra={})=>upload.advanceSubmissionUpload(s,{activeSeconds:t,powered:true,paused:false,...extra});
test('frozen 192kbps attachment uploads at 10000 bytes/s before publishing draft and personal audio',()=>{
 let r=start();assert.ok(r.ok);const id=r.state.outgoingUpload.versionId;
 // The unmixed fixture remains the four-bar working loop.
 assert.equal(r.state.outgoingUpload.totalBytes,256000);assert.equal(r.state.social.personalAudioIds.includes(id),false);assert.equal(sendSubmission(r.state,options).ok,false);
 let s=tick(r.state,10).state;assert.equal(s.outgoingUpload.uploadedBytes,100000);assert.equal(s.social.dialogs['makarevich-1']?.draftVersionId??null,null);
 const frozen=JSON.stringify(s.trackVersions.byId[id]);s.projects=[];s=tick(s,15.6).state;
 assert.equal(s.outgoingUpload.status,'ready');assert.equal(s.social.dialogs['makarevich-1'].draftVersionId,id);assert.ok(s.social.personalAudioIds.includes(id));assert.equal(JSON.stringify(s.trackVersions.byId[id]),frozen);assert.equal(s.battleSubmissions.length,0);
 assert.deepEqual(tick(s,50).state,s);
});
test('eight-bar descriptor produces 512000 bytes, pauses do not accrue and fractions survive reload',()=>{
 let s=upload.startSubmissionUpload(ensureBattleWindow(submissionFixture({mixed:true}),{battleId:'makarevich-1',nowMinute:600}).state,options).state,u=s.outgoingUpload;assert.equal(u.totalBytes,512000);
 assert.ok(!upload.normalizeOutgoingUpload(u,s.trackVersions).issue);
 for(const extra of [{powered:false},{paused:true},{activeSeconds:0},{activeSeconds:NaN}])assert.deepEqual(tick(s,100,extra).state,s);
 s=tick(s,.00005).state;assert.equal(s.outgoingUpload.fractionalBytes,.5);s=createVirtualPcState(JSON.parse(JSON.stringify(s)));s=tick(s,.00005).state;assert.equal(s.outgoingUpload.uploadedBytes,1);
 const jumped=runtime.advanceVirtualPc(s,{day:4,minutes:1200}).state;assert.equal(jumped.outgoingUpload.uploadedBytes,1);
 s=tick(jumped,51.1999).state;assert.equal(s.outgoingUpload.status,'ready');assert.equal(s.outgoingUpload.uploadedBytes,512000);
});
test('registration/deadline/source gate start; concurrent upload is rejected and cancel retains old draft/versions/attempts',()=>{
 const s=ready();assert.equal(upload.startSubmissionUpload({...s,battleApplications:[]},options).ok,false);assert.equal(upload.startSubmissionUpload(s,{...options,nowMinute:s.battleWindows[0].closesAt}).ok,false);
 const r=attachSubmissionTrack(s,options);assert.equal(r.state.outgoingUpload.status,'uploading');assert.equal(upload.startSubmissionUpload(r.state,options).ok,false);
 const id=r.state.outgoingUpload.versionId;r.state.social.dialogs['makarevich-1']={peer:{kind:'community',id:'makarevich-1'},messages:[],unread:false,draftVersionId:'old-draft'};
 const cancelled=upload.cancelSubmissionUpload(r.state);assert.ok(cancelled.ok);assert.equal(cancelled.state.outgoingUpload,null);assert.equal(cancelled.state.social.dialogs['makarevich-1'].draftVersionId,'old-draft');assert.ok(cancelled.state.trackVersions.byId[id]);assert.deepEqual(cancelled.state.battleSubmissions,[]);
});
test('invalid outgoing data enters stable recovery and cannot send',()=>{
 const s=start().state;for(const patch of [{uploadedBytes:-1},{totalBytes:1},{fractionalBytes:1},{status:'ready'},{versionId:'missing'},{communityId:'missing'},{windowId:''}]){
  const raw={...s.outgoingUpload,...patch},bad=createVirtualPcState({...s,outgoingUpload:raw});assert.ok(bad.outgoingUpload.issue);assert.deepEqual(bad.outgoingUpload.recoveryData,raw);assert.equal(upload.uploadPresentation(bad).status,'error');assert.equal(sendSubmission(bad,options).ok,false);assert.deepEqual(createVirtualPcState(bad).outgoingUpload,bad.outgoingUpload);
 }
});
test('durable real-time clock checkpoints once a second and flushes partial phase/pagehide progress',()=>{
 const clock=runtime.createSubmissionTransferClock();let s=start().state,calls=0;const save=()=>{calls++;return true;};
 s=clock.tick(s,{activeSeconds:.4,powered:true,paused:false,phase:'pc'},save).state;assert.equal(calls,0);
 s=clock.tick(s,{activeSeconds:.6,powered:true,paused:false,phase:'pc'},save).state;assert.equal(calls,1);assert.equal(s.outgoingUpload.uploadedBytes,10000);
 s=clock.tick(s,{activeSeconds:.25,powered:true,paused:false,phase:'pc'},save).state;s=clock.tick(s,{activeSeconds:0,powered:true,paused:true,phase:'hidden'},save).state;assert.equal(s.outgoingUpload.uploadedBytes,12500);
 const before=structuredClone(s);const failed=clock.tick(s,{activeSeconds:100,powered:true,paused:false,phase:'room'},()=>false);assert.equal(failed.saveFailed,true);assert.deepEqual(failed.state,before);assert.equal(failed.state.social.personalAudioIds.length,0);
 s=clock.tick(failed.state,{activeSeconds:100,powered:true,paused:false,phase:'room'},save).state;assert.equal(s.outgoingUpload.status,'ready');assert.equal(s.social.personalAudioIds.length,1);
});
test('completed upload cannot send a different legacy draft; expiry consumes no attempt and recovery cancellation keeps raw data',()=>{
 let s=tick(start().state,30).state;const oldId=s.outgoingUpload.versionId,old=structuredClone(s.trackVersions.byId[oldId]),other='track-other';s.trackVersions.byId[other]={...old,id:other};s.social.dialogs['makarevich-1'].draftVersionId=other;
 assert.match(sendSubmission(s,options).reason,/Загруженная версия не совпадает/);
 s.social.dialogs['makarevich-1'].draftVersionId=oldId;const late=sendSubmission(s,{...options,nowMinute:s.battleWindows[0].closesAt});assert.equal(late.ok,false);assert.equal(late.state.battleSubmissions.length,0);assert.equal(late.state.social.dialogs['makarevich-1'].draftVersionId,oldId);
 const raw={...s.outgoingUpload,uploadedBytes:-2},bad=createVirtualPcState({...s,outgoingUpload:raw}),cancelled=upload.cancelSubmissionUpload(bad);assert.deepEqual(cancelled.state.outgoingUploadRecovery[0].recoveryData,raw);assert.ok(cancelled.state.trackVersions.byId[oldId]);
});
