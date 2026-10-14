import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState,loadVirtualPcState,diskUsage} from '../src/virtual-pc-state.js';
import * as downloads from '../src/pc-browser-downloads.js';
import {openMetadata} from '../src/pc-software.js';
import {advanceVirtualPc} from '../src/virtual-pc-runtime.js';
import {createAudioExport} from '../src/pc-audio-exports.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {createSocialBackground} from '../src/social-background.js';
import {createSocialWorkerRuntime} from '../src/social-worker-runtime.js';
const start=(s,appId='client',kind='installer')=>downloads.startBrowserDownload(s,{appId,kind});
const tick=(s,activeSeconds,options={})=>downloads.advanceBrowserDownloads(s,{activeSeconds,powered:true,paused:false,...options});
const fresh=()=>createVirtualPcState({power:'on'});

test('browser installer takes one active second, publishes bytes once, and never opens itself',()=>{
 let s=start(fresh()).state;
 assert.equal(s.software.client.receivedBytes,0);assert.equal(s.software.installer,null);
 assert.equal(tick(s,0).state,s);
 s=tick(s,.5).state;assert.equal(s.software.client.receivedBytes,1000000);assert.equal(diskUsage(s).downloadMb,1);
 assert.equal(tick(s,.5,{paused:true}).state,s);assert.equal(tick(s,.5,{powered:false}).state,s);
 s=tick(s,.5).state;assert.equal(s.software.client.receivedBytes,2000000);assert.equal(diskUsage(s).downloadMb,2);
 assert.equal(s.software.installer,null);assert.deepEqual(s.software.transfers,{});assert.equal(tick(s,10).state,s);
 assert.equal(start(s).state,s);
});

test('metadata downloads without an association, and two manually opened files start separate torrents',()=>{
 let s=start(fresh(),'ft','metadata').state;s=start(s,'notebook','metadata').state;
 s=tick(s,.5).state;assert.equal(s.software.metadata,false);assert.equal(diskUsage(s).downloadMb,.012);
 s=tick(s,.5).state;assert.equal(s.software.metadata,true);assert.equal(s.software.notebookMetadata,true);assert.equal(diskUsage(s).downloadMb,.024);
 assert.deepEqual(s.software.transfers,{});assert.equal(openMetadata(s,'ft').reason,'client-required');
 s={...s,software:{...s.software,client:{...s.software.client,installed:true}}};
 s=openMetadata(s,'ft').state;s=openMetadata(s,'notebook').state;
 assert.deepEqual(Object.keys(s.software.transfers).sort(),['ft','notebook']);
});

test('partial browser download reload retains progress with no game-clock credit',()=>{
 let s=tick(start(fresh()).state,.5).state;
 s=loadVirtualPcState({getItem:()=>JSON.stringify(s)}).state;
 assert.equal(s.browserDownloads.items[0].elapsedSeconds,.5);
 s=advanceVirtualPc(s,{day:80,minutes:720}).state;assert.equal(s.software.client.receivedBytes,1000000);
 s=tick(s,.5).state;assert.equal(s.software.client.receivedBytes,2000000);
});

test('browser disk exhaustion retains partial bytes and resumes after space is freed',()=>{
 const full={...fresh(),projects:Array.from({length:1000},(_,i)=>({id:String(i)}))};
 assert.equal(start(full).reason,'insufficient-space');
 let s=tick(start(fresh()).state,.5).state;s={...s,projects:full.projects};
 s=tick(s,.5).state;assert.equal(s.software.client.receivedBytes,1000000);assert.equal(s.browserDownloads.items[0].error,'insufficient-space');
 s=tick({...s,projects:[]},.5).state;assert.equal(s.software.client.receivedBytes,2000000);
});

test('partial metadata shares export space and becomes one completed file after reload',()=>{
 let s=createAudioExport(submissionFixture(),{id:'keep',projectId:'beat',kind:'track',folderId:'exports',filename:'Keep.wav',nowMinute:600}).state;
 s={...s,power:'on',projects:Array.from({length:999},(_,i)=>({id:String(i)}))};
 const freeBefore=diskUsage(s).freeMb,exports=s.audioExports;
 s=tick(start(s,'ft','metadata').state,.5).state;assert.ok(Math.abs(diskUsage(s).freeMb-(freeBefore-.006))<1e-9);
 s=loadVirtualPcState({getItem:()=>JSON.stringify(s)}).state;assert.deepEqual(s.audioExports,exports);assert.equal(s.browserDownloads.items[0].elapsedSeconds,.5);
 s=tick(s,.5).state;assert.equal(s.software.metadata,true);assert.ok(Math.abs(diskUsage(s).freeMb-(freeBefore-.012))<1e-9);assert.deepEqual(s.audioExports,exports);
 const full={...s,projects:[...s.projects,{id:'last'}]};assert.equal(start(full,'notebook','metadata').reason,'insufficient-space');
});

test('late social worker merge preserves the current browser queue, phone presentation and exports',()=>{
 let state=fresh(),request;const worker={postMessage(message){request=structuredClone(message);},terminate(){}};
 const runtime=createSocialBackground({getState:()=>state,createWorker:()=>worker,persist:()=>true,onState:next=>state=next});
 runtime.tick(600,{},0);
 state=tick(start(state,'notebook','metadata').state,.5).state;
 const queue=state.browserDownloads,presentation={firstWakeAtMinute:0,announcedIds:['keep']},exports={version:1,files:[],recovery:[{reason:'keep'}]};state={...state,phonePresentation:presentation,audioExports:exports};
 worker.onmessage({data:structuredClone(createSocialWorkerRuntime()(request))});
 assert.equal(state.browserDownloads,queue);assert.equal(state.phonePresentation,presentation);assert.equal(state.audioExports,exports);assert.equal(state.browserDownloads.items[0].elapsedSeconds,.5);runtime.dispose();
});
