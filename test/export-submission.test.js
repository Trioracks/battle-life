import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionFixture,completeSubmissionMessage} from './helpers/submission-fixtures.js';
import {createAudioExport} from '../src/pc-audio-exports.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {attachSubmissionTrack,sendSubmission} from '../src/social-submission.js';
import {advanceSubmissionUpload,uploadPresentation} from '../src/social-upload.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {advanceSocial} from '../src/social-runtime.js';
const options={communityId:'makarevich-1',fileId:'full',nowMinute:601};
function fixture(){
 let s=ensureBattleWindow(submissionFixture({mixed:true}),{battleId:'makarevich-1',nowMinute:600}).state;
 for(const kind of ['beat','vocal','track']){
  const r=createAudioExport(s,{id:kind==='track'?'full':kind,projectId:'beat',kind,folderId:'exports',filename:kind+'.wav',nowMinute:600});
  assert.ok(r.ok,r.reason);s=r.state;
 }
 return s;
}
const tick=(s,t,extra={})=>advanceSubmissionUpload(s,{activeSeconds:t,powered:true,paused:false,...extra}).state;
test('decimal active frame increments complete without a byte-rounding dead end',()=>{
 let s=attachSubmissionTrack(fixture(),options).state;for(let i=0;i<10;i++)s=tick(s,.2);
 assert.equal(s.outgoingUpload.status,'ready');assert.equal(s.outgoingUpload.elapsedSeconds,2);assert.equal(uploadPresentation(s).percent,100);
});
test('attachment accepts only a full exported file, never a beat, vocal or live project',()=>{
 const s=fixture();
 for(const args of [{fileId:'beat'},{fileId:'vocal'},{fileId:'missing'},{projectId:'beat',fileId:undefined}])assert.equal(attachSubmissionTrack(s,{...options,...args}).ok,false);
 const r=attachSubmissionTrack(s,options);assert.ok(r.ok,r.reason);assert.equal(r.state.outgoingUpload.fileId,'full');
});
test('export is attached without recapturing its edited or deleted source; one active second is half and two are ready',()=>{
 const s=fixture(),file=s.audioExports.files.find(f=>f.id==='full'),archive=structuredClone(s.trackVersions);
 s.projects=[];const r=attachSubmissionTrack(s,options);assert.ok(r.ok,r.reason);assert.deepEqual(r.state.trackVersions,archive);
 assert.equal(r.versionId,file.trackVersionId);assert.equal(r.state.outgoingUpload.totalBytes,file.bytes);
 let next=tick(r.state,1);assert.equal(uploadPresentation(next).percent,50);assert.equal(next.outgoingUpload.elapsedSeconds,1);assert.equal(next.outgoingUpload.totalSeconds,2);
 assert.deepEqual(tick(next,100,{paused:true}),next);assert.deepEqual(tick(next,100,{powered:false}),next);
 next=createVirtualPcState(JSON.parse(JSON.stringify(next)));assert.equal(next.outgoingUpload.elapsedSeconds,1);
 next=tick(next,1);assert.equal(next.outgoingUpload.status,'ready');assert.equal(next.outgoingUpload.uploadedBytes,file.bytes);
 assert.equal(next.social.dialogs['makarevich-1'].draftVersionId,file.trackVersionId);assert.deepEqual(next.trackVersions,archive);
 const sent=sendSubmission(completeSubmissionMessage(next),options);assert.ok(sent.ok,sent.reason);
 const ack=advanceSocial(sent.state,sent.state.battleSubmissions[0].ackAt).state;
 const loaded=createVirtualPcState(JSON.parse(JSON.stringify(ack)));assert.equal(loaded.battleSubmissions[0].status,'accepted');assert.equal(loaded.battleSubmissions[0].trackVersionId,file.trackVersionId);
 assert.equal(attachSubmissionTrack(loaded,options).ok,false);
});
test('legacy upload migration preserves its frozen version and reached fraction without inventing a file',()=>{
 const s=fixture(),versionId=s.audioExports.files.find(f=>f.id==='full').trackVersionId;
 const raw={version:1,communityId:'makarevich-1',windowId:s.battleWindows[0].id,versionId,totalBytes:512000,uploadedBytes:128000,fractionalBytes:.5,status:'uploading'};
 s.audioExports={version:1,files:[],recovery:[]};s.projects=[];s.outgoingUpload=raw;
 const loaded=createVirtualPcState(s),u=loaded.outgoingUpload;assert.equal(u.issue,undefined);assert.equal(u.fileId,null);assert.equal(u.versionId,versionId);
 assert.equal(u.elapsedSeconds,2*128000.5/512000);assert.equal(u.uploadedBytes,128000);assert.equal(u.fractionalBytes,.5);
 assert.deepEqual(createVirtualPcState(loaded).outgoingUpload,u);assert.equal(tick(loaded,1.5).outgoingUpload.status,'ready');
 const unmarked={...u};delete unmarked.migration;const rejected=createVirtualPcState({...loaded,outgoingUpload:unmarked});assert.ok(rejected.outgoingUpload.issue);assert.deepEqual(rejected.outgoingUpload.recoveryData,unmarked);
});
test('a damaged exported source is quarantined on reload along with its unresolved attachment',()=>{
 const s=attachSubmissionTrack(fixture(),options).state,raw=structuredClone(s.audioExports.files.find(f=>f.id==='full'));raw.descriptor.parts[0].id='missing-audio-source';
 s.audioExports.files=s.audioExports.files.map(f=>f.id==='full'?raw:f);const loaded=createVirtualPcState(s);
 assert.ok(loaded.outgoingUpload.issue);assert.deepEqual(loaded.audioExports.recovery[0].recoveryData,raw);assert.equal(sendSubmission(loaded,options).ok,false);
});
