import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState,loadVirtualPcState,saveVirtualPcState,VIRTUAL_PC_STORAGE_KEY} from '../src/virtual-pc-state.js';
import {openMetadata,pauseTransfer,resumeTransfer,cancelTransfer,softwareDiskBytes} from '../src/pc-software.js';
import {advanceTransfers} from '../src/pc-transfer-runtime.js';
import {advanceVirtualPc,downloadPresentation} from '../src/virtual-pc-runtime.js';
import {mountTorrent} from '../src/pc-software-view.js';
import {pcDocument,findButton} from './helpers/virtual-pc-dom.js';
function pair(){let s=createVirtualPcState({power:'on',lastGameMinute:0,software:{client:{installed:true},metadata:true,notebookMetadata:true}});s=openMetadata(s,'ft').state;return openMetadata(s,'notebook').state;}
test('selected row alone pauses and remains focused across progress ticks',()=>{
 let s=pair();const d=pcDocument(),root=d.createElement('div'),actions=[];
 const view=mountTorrent(root,{getState:()=>s,onAction:(action,id)=>{actions.push([action,id]);s=pauseTransfer(s,id).state;view.update();}});
 const row=findButton(root,'Выбрать загрузку Рэпблокнот');row.click();row.focus();
 s=advanceTransfers(s,0,.1).state;view.update();assert.equal(d.activeElement,row);
 findButton(root,'Ⅱ Пауза').click();assert.deepEqual(actions,[['pause','notebook']]);
 assert.equal(s.software.transfers.ft.paused,false);assert.equal(s.software.transfers.notebook.paused,true);
 s=pauseTransfer(s,'ft').state;assert.equal(advanceTransfers(s,.1,100).advancedBytes,0);view.dispose();
});
test('parallel transfers share one capped channel and pause releases capacity',()=>{
 const s=pair(),r=advanceTransfers(s,0,1).state;
 assert.equal(r.software.ft.receivedBytes,720000);assert.equal(r.software.notebook.receivedBytes,720000);
 assert.equal(s.software.ft.receivedBytes,0);
 const paused=pauseTransfer(s,'notebook').state,p=advanceTransfers(paused,0,1).state;
 assert.equal(p.software.ft.receivedBytes,1440000);assert.equal(p.software.notebook.receivedBytes,0);
 assert.equal(pauseTransfer(s).ok,false);assert.equal(pauseTransfer(s,'unknown').ok,false);
 assert.equal(resumeTransfer(JSON.parse(JSON.stringify(p)),'notebook').state.software.transfers.notebook.paused,false);
 assert.equal(cancelTransfer(s,'notebook').state.software.transfers.ft.appId,'ft');
});
test('small file completion redistributes remaining capacity and ETA uses same scheduler',()=>{
 const s=pair(),one=advanceTransfers(s,0,10).state;let split=s;
 for(let n=1;n<=1000;n++)split=advanceTransfers(split,(n-1)/100,n/100).state;
 assert.equal(one.software.notebook.receivedBytes,4000000);assert.equal(one.software.transfers.notebook,undefined);
 assert.ok(Math.abs(one.software.ft.receivedBytes-split.software.ft.receivedBytes)<=1);
 const solo=advanceTransfers(pauseTransfer(s,'notebook').state,0,10).state;
 assert.equal(one.software.ft.receivedBytes+4000000,solo.software.ft.receivedBytes);
 assert.equal(downloadPresentation(s,'ft').speedKbPerSecond,12);
 const eta=downloadPresentation(s,'notebook').remainingGameMinutes;
 assert.equal(advanceTransfers(s,0,eta).state.software.notebook.receivedBytes,4000000);
 assert.ok(advanceTransfers(s,0,eta-1).state.software.notebook.receivedBytes<4000000);
});
test('disk aggregate, power off, reversed time, midnight and huge intervals are bounded',()=>{
 let s=pair();s.projects=Array.from({length:995},(_,i)=>({id:String(i)}));const free=softwareDiskBytes(s).free;
 const r=advanceTransfers(s,0,1e8);assert.equal(r.advancedBytes,free);assert.equal(softwareDiskBytes(r.state).free,0);
 assert.equal(r.state.software.transfers.ft.error,'insufficient-space');
 assert.equal(advanceTransfers({...pair(),power:'off'},0,100).advancedBytes,0);
 assert.equal(advanceTransfers(pair(),10,0).advancedBytes,0);
 const midnight=advanceVirtualPc({...pair(),lastGameMinute:1439},{day:2,minutes:1});
 assert.ok(midnight.advancedBytes>0);
 assert.equal(advanceTransfers(pair(),0,1e8).state.software.ft.receivedBytes,800000000);
});
test('legacy paused task migrates with backup and load anchors without offline bonus',()=>{
 const legacy=createVirtualPcState({power:'on'});legacy.software={client:{installed:true},ft:{receivedBytes:123456},metadata:true,task:{appId:'ft',paused:true,error:'',baseMinute:0,baseBytes:0}};legacy.lastGameMinute=20;
 const raw=JSON.stringify(legacy),map=new Map([[VIRTUAL_PC_STORAGE_KEY,raw]]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const loaded=loadVirtualPcState(storage);assert.equal(loaded.ok,true);assert.equal(map.get(VIRTUAL_PC_STORAGE_KEY+'-before-parallel-transfers'),raw);
 assert.equal(loaded.state.software.task,undefined);assert.equal(loaded.state.software.transfers.ft.paused,true);
 assert.equal(advanceVirtualPc(loaded.state,{day:9,minutes:0}).advancedBytes,0);
 assert.equal(loaded.state.software.ft.receivedBytes,123456);
 const bad={getItem:k=>k===VIRTUAL_PC_STORAGE_KEY?raw:null,setItem(){throw Error('quota');}};
 assert.equal(loadVirtualPcState(bad).reason,'parallel-transfers-backup-failed');assert.equal(saveVirtualPcState(bad,pair()),false);
});
