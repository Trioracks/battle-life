import test from 'node:test';
import assert from 'node:assert/strict';
import {createSocialBackground} from '../src/social-background.js';
import {createSocialWorkerRuntime} from '../src/social-worker-runtime.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {createAudioExport} from '../src/pc-audio-exports.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {startSubmissionUpload,advanceSubmissionUpload} from '../src/social-upload.js';
import {startBrowserDownload,advanceBrowserDownloads} from '../src/pc-browser-downloads.js';
import {longCampaignFixture} from './helpers/long-campaign-fixture.js';
const metrics=await import('../tools/qa/acceptance-metrics.mjs').catch(()=>({}));

test('battle campaign fixture creates coherent battle metadata through real project commands',()=>{
 const {state}=longCampaignFixture({tracks:1,day:8,battleId:'makarevich-1'});
 const lyrics=state.projects.find(p=>p.kind==='lyrics');assert.equal(lyrics.battleId,'makarevich-1');assert.equal(lyrics.battleName,'Макаревич Батл №1');
});

test('native acceptance rejects each over-budget app but keeps isolated maximum stalls informational',()=>{
 assert.equal(typeof metrics.assertNativeTargets,'function','native target gate exists');
 for(const bad of [{frameP95:25.01,updateP95:1},{frameP95:16.7,updateP95:20.01}])assert.throws(()=>metrics.assertNativeTargets(bad,'covered app'),/covered app/);
 assert.doesNotThrow(()=>metrics.assertNativeTargets({frameP95:25,updateP95:20,frameMax:800,updateMax:700},'accepted'));
});

test('late social Worker reply retains concurrent browser files, export, durable phone and partially uploaded frozen file',()=>{
 let state=ensureBattleWindow(submissionFixture(),{battleId:'makarevich-1',nowMinute:600}).state;
 const exported=createAudioExport(state,{id:'sent',projectId:'beat',kind:'track',folderId:'exports',filename:'sent',nowMinute:600});assert.equal(exported.ok,true,exported.reason);state=exported.state;
 const upload=startSubmissionUpload(state,{communityId:'makarevich-1',fileId:'sent',nowMinute:600});assert.equal(upload.ok,true,upload.reason);state=upload.state;
 let request,worker;const calculate=createSocialWorkerRuntime(),background=createSocialBackground({getState:()=>state,createWorker:()=>worker={postMessage:m=>request=structuredClone(m),terminate(){}},persist:()=>true,onState:next=>state=next});
 background.tick(600,{},0);
 state=advanceSubmissionUpload(state,{activeSeconds:.75,powered:true,paused:false}).state;
 state=startBrowserDownload(state,{appId:'dossier',kind:'metadata'}).state;
 state=advanceBrowserDownloads(state,{activeSeconds:.25,powered:true,paused:false}).state;
 state=createAudioExport(state,{id:'new',projectId:'beat',kind:'vocal',folderId:'music',filename:'new',nowMinute:601}).state;
 state={...state,phonePresentation:{firstWakeAtMinute:599,announcedIds:['already-seen']}};
 const before=structuredClone({browserDownloads:state.browserDownloads,audioExports:state.audioExports,phonePresentation:state.phonePresentation,outgoingUpload:state.outgoingUpload}),bound=structuredClone(state.trackVersions.byId[state.outgoingUpload.versionId]);
 const reply=calculate(request);worker.onmessage({data:reply});
 assert.equal(background.snapshot.commits,1);
 for(const key of Object.keys(before))assert.deepEqual(state[key],before[key],key+' cannot be overwritten by an old Worker snapshot');
 assert.equal(state.outgoingUpload.fileId,'sent');assert.equal(state.outgoingUpload.elapsedSeconds,.75);assert.deepEqual(state.trackVersions.byId[state.outgoingUpload.versionId],bound);
 assert.ok(state.socialRuntime.events.length>0);background.dispose();
});
