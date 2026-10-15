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
import {explorerEntries} from '../src/virtual-pc-explorer.js';
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

test('clearing completed history preserves active partials, files, bytes and durable transfer identity',()=>{
 let s=tick(start(fresh()).state,1).state;
 s=tick(start(s,'ft','metadata').state,.5).state;
 const beforeFiles=explorerEntries(s,'downloads'),beforeUsage=diskUsage(s),beforeItems=s.browserDownloads.items;
 const cleared=downloads.clearCompletedBrowserDownloadHistory(s);
 assert.equal(cleared.ok,true);s=cleared.state;
 assert.deepEqual(downloads.browserDownloadEntries(s).map(e=>e.id),['ft:metadata']);
 assert.deepEqual(downloads.browserDownloadEntries(s,{includeHidden:true}).map(e=>e.id),['client:installer','ft:metadata']);
 assert.deepEqual(s.browserDownloads.items,beforeItems);assert.deepEqual(explorerEntries(s,'downloads'),beforeFiles);assert.deepEqual(diskUsage(s),beforeUsage);
 s=loadVirtualPcState({getItem:()=>JSON.stringify(s)}).state;
 assert.deepEqual(downloads.browserDownloadEntries(s).map(e=>e.id),['ft:metadata']);
 assert.deepEqual(explorerEntries(s,'downloads'),beforeFiles);assert.deepEqual(diskUsage(s),beforeUsage);
 s=start(s).state;
 assert.deepEqual(downloads.browserDownloadEntries(s).map(e=>e.id),['ft:metadata','client:installer']);
 assert.equal(s.browserDownloads.items.length,2);assert.deepEqual(diskUsage(s),beforeUsage);assert.equal(s.software.installer,null);
 s=tick(s,.5).state;assert.equal(s.software.metadata,true);assert.equal(s.software.client.receivedBytes,2000000);
});

test('legacy history stays visible and damaged history visibility survives normalization in recovery',()=>{
 const legacy=tick(start(fresh()).state,1).state;
 const loaded=loadVirtualPcState({getItem:()=>JSON.stringify({...legacy,browserDownloads:{version:1,items:legacy.browserDownloads.items}})}).state;
 assert.deepEqual(downloads.browserDownloadEntries(loaded).map(e=>e.id),['client:installer']);
 const raw={...legacy.browserDownloads,hiddenHistoryIds:['client:installer','ghost:installer',42]};
 const normalized=downloads.normalizeBrowserDownloads(raw);
 assert.deepEqual(normalized.hiddenHistoryIds,['client:installer']);
 assert.ok(normalized.recovery.some(r=>r.recoveryData==='ghost:installer'));
 assert.ok(normalized.recovery.some(r=>r.recoveryData===42));
 assert.deepEqual(downloads.normalizeBrowserDownloads(normalized),normalized);
 const active=tick(start(fresh()).state,.5).state;
 active.browserDownloads.hiddenHistoryIds=['client:installer'];
 assert.equal(downloads.browserDownloadEntries(active).length,1,'history visibility cannot hide an active transfer');
});

test('explicit repeat brings an older completed file to newest without duplicating disk storage',()=>{
 let s=tick(start(fresh()).state,1).state;s=tick(start(s,'ft','metadata').state,1).state;
 const before=diskUsage(s);s=start(s).state;
 assert.deepEqual(downloads.browserDownloadEntries(s).map(e=>e.id),['ft:metadata','client:installer']);
 assert.deepEqual(diskUsage(s),before);assert.equal(s.browserDownloads.items.length,2);
});

test('damaged recovery and inherited catalog names are retained in recovery instead of entering the queue',()=>{
 const raw={version:1,items:[{appId:'toString',kind:'installer',elapsedSeconds:0}],recovery:{saved:'source'}};
 const normalized=downloads.normalizeBrowserDownloads(raw);
 assert.deepEqual(normalized.items,[]);
 assert.ok(normalized.recovery.some(r=>r.recoveryData?.saved==='source'));
 assert.ok(normalized.recovery.some(r=>r.recoveryData?.appId==='toString'));
 assert.equal(start(fresh(),'toString').reason,'unknown-app');
});

test('active ticks preserve immutable recovery and history visibility without reprocessing either archive',()=>{
 const s=start(fresh()).state,recovery=[{reason:'retained',recoveryData:{source:'original'}}];s.browserDownloads.recovery=recovery;
 const visibility=s.browserDownloads.hiddenHistoryIds,next=tick(s,.25).state;
 assert.equal(next.browserDownloads.recovery,recovery);assert.equal(next.browserDownloads.hiddenHistoryIds,visibility);
 assert.equal(s.browserDownloads.items[0].elapsedSeconds,0);assert.equal(next.browserDownloads.items[0].elapsedSeconds,.25);
});
