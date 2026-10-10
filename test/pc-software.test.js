import test from 'node:test';
import assert from 'node:assert/strict';
import * as software from '../src/pc-software.js';
import {createVirtualPcState,diskUsage,loadVirtualPcState} from '../src/virtual-pc-state.js';
import {desktopApps} from '../src/virtual-pc-catalog.js';
import {advanceVirtualPc,downloadPresentation} from '../src/virtual-pc-runtime.js';
import {createBeat} from '../src/beat-production.js';
const fresh=()=>createVirtualPcState({power:'on'});
function install(state,id){state=software.openInstaller(state,id).state;for(let i=0;i<5;i++)state=software.advanceInstaller(state).state;return state;}
function client(){let s=software.downloadClient(fresh()).state;s=advanceVirtualPc(s,{day:1,minutes:0}).state;s=advanceVirtualPc(s,{day:1,minutes:2}).state;return install(s,'client');}
test('new desktop requires the forum client installer before torrent metadata can open',()=>{
 let s=fresh();assert.equal(desktopApps(s).some(a=>a.id==='torent'),false);
 s=software.downloadMetadata(s).state;assert.equal(software.openMetadata(s).reason,'client-required');assert.equal(diskUsage(s).downloadMb,.012);
});
test('direct client and FT wizard retain artifacts and reserve installed bytes exactly once',()=>{
 let s=client();assert.equal(s.software.client.installed,true);assert.equal(diskUsage(s).usedMb,14010);
 s=software.downloadMetadata(s).state;s=software.openMetadata(s).state;assert.deepEqual(software.openMetadata(s).state,s);s=advanceVirtualPc(s,{day:1,minutes:600}).state;
 assert.equal(s.download.status,'ready-to-install');assert.equal(diskUsage(s).downloadMb,802.012);
 s=install(s,'ft');assert.equal(s.download.status,'installed');assert.equal(diskUsage(s).usedMb,15610.012);assert.equal(software.openInstaller(s,'ft').reason,'already-installed');
});
test('pause, off, reload and reversed time anchor transfers without retroactive credit',()=>{
 let s=software.openMetadata(software.downloadMetadata(client()).state).state;s=software.pauseTransfer(s).state;const bytes=s.download.receivedBytes;
 s=advanceVirtualPc(s,{day:2,minutes:0}).state;assert.equal(s.download.receivedBytes,bytes);assert.equal(downloadPresentation(s).speedKbPerSecond,0);
 s=software.resumeTransfer(s).state;s=advanceVirtualPc({...s,power:'off'},{day:2,minutes:60}).state;assert.equal(s.download.receivedBytes,bytes);
 const restored=loadVirtualPcState({getItem:()=>JSON.stringify({...s,power:'on'})}).state;assert.equal(advanceVirtualPc(restored,{day:3,minutes:0}).advancedBytes,0);
 s=advanceVirtualPc({...s,power:'on'},{day:1,minutes:10}).state;assert.equal(s.lastGameMinute,10);assert.ok(advanceVirtualPc(s,{day:1,minutes:11}).advancedBytes>0);
});
test('fractional frames and a full sleep integrate identical periodic transfer rates',()=>{
 const s=software.openMetadata(software.downloadMetadata(client()).state).state;const whole=advanceVirtualPc(s,{day:1,minutes:122}).state;let frames=s;
 for(let m=2.125;m<=122;m+=.125)frames=advanceVirtualPc(frames,{day:1,minutes:m}).state;
 assert.equal(frames.download.receivedBytes,whole.download.receivedBytes);assert.ok(downloadPresentation(whole).speedKbPerSecond>=24&&downloadPresentation(whole).speedKbPerSecond<=37);
});
test('incoming bytes stop at shared capacity and beat creation respects retained archives',()=>{
 let s=software.openMetadata(software.downloadMetadata(client()).state).state;s={...s,projects:Array.from({length:994},(_,i)=>({id:String(i)}))};s=advanceVirtualPc(s,{day:1,minutes:100}).state;
 assert.equal(diskUsage(s).usedMb,16000);assert.equal(s.software.task.error,'insufficient-space');assert.equal(createBeat(s,{id:'new',name:'Beat'}).ok,false);
 const partial=s.download.receivedBytes;assert.equal(advanceVirtualPc(s,{day:1,minutes:200}).state.download.receivedBytes,partial);
});
test('installer cancellation preserves archive, rejects unsafe paths and checks free space',()=>{
 let s=createVirtualPcState({power:'on',download:{status:'ready-to-install'},projects:Array.from({length:200},(_,i)=>({id:String(i)}))});s=software.openInstaller(s,'ft').state;s=software.advanceInstaller(s).state;
 assert.equal(software.setInstallerPath(s,'D:\\bad').ok,false);s=software.setInstallerPath(s,'C:/Music/Custom FT').state;s=software.advanceInstaller(s).state;assert.equal(software.advanceInstaller(s).reason,'insufficient-space');
 s=software.cancelInstaller(s).state;assert.equal(s.download.receivedBytes,800000000);assert.equal(s.software.installer,null);
});
test('legacy installed FT retains projects, audio, household and has no invented archive',()=>{
 const project={id:'p',sourceStems:['a.wav'],chosenAudio:'a.wav'},s=createVirtualPcState({download:{status:'installed'},projects:[project],household:{fridge:{pear:3}}});
 assert.deepEqual(s.projects,[project]);assert.equal(s.software.ft.installed,true);assert.equal(s.software.ft.receivedBytes,0);assert.equal(s.household.fridge.pear,3);assert.equal(diskUsage(s).usedMb,14802);
});
test('legacy in-memory transfer uses its supplied game clock until an explicit load reanchors it',()=>{
 const s=createVirtualPcState({power:'on',lastGameMinute:0,download:{status:'downloading',receivedBytes:0}});
 assert.equal(advanceVirtualPc(s,{day:1,minutes:1}).advancedBytes,1440000);
});
test('virtual install paths reject traversal, system folders and Windows reserved names',()=>{
 for(const path of ['C:\\..\\outside','C:\\Windows\\torent','C:\\Tools\\CON','C:\\Tools\\bad.'])assert.equal(software.normalizeInstallPath(path),null,path);
 assert.equal(software.normalizeInstallPath('c:/Music//FT Studio/'),'C:\\Music\\FT Studio');
});
test('an uncommitted saved finish step cannot claim installation success',()=>{
 const s=createVirtualPcState({software:{ft:{receivedBytes:800000000},installer:{appId:'ft',step:'finish'}}});
 assert.equal(s.software.installer.step,'welcome');assert.equal(s.download.status,'ready-to-install');
});
test('failed legacy backup still reanchors the retained partial transfer on load',()=>{
 const raw=JSON.stringify({version:1,power:'on',lastGameMinute:0,download:{status:'downloading',receivedBytes:123000000}});
 const loaded=loadVirtualPcState({getItem:key=>key.endsWith('-before-household')?null:raw,setItem(){throw Error('blocked');}});
 assert.equal(loaded.reason,'household-backup-failed');assert.equal(advanceVirtualPc(loaded.state,{day:2,minutes:0}).advancedBytes,0);assert.equal(loaded.state.download.receivedBytes,123000000);
});
test('beat creation uses actual free bytes rather than the obsolete 590-project cap',()=>{
 const projects=Array.from({length:590},(_,i)=>({id:String(i)})),legacy=createVirtualPcState({download:{status:'installed'},projects});
 assert.equal(createBeat(legacy,{id:'new',name:'Still fits'}).ok,true);
 const retained=createVirtualPcState({software:{client:{installed:true,receivedBytes:2000000},ft:{installed:true,receivedBytes:800000000},metadata:true},projects:projects.slice(0,194)});
 assert.equal(createBeat(retained,{id:'new',name:'Cannot fit'}).ok,false);
});
test('installer checks capacity again when another producer uses space after the summary',()=>{
 let s=createVirtualPcState({power:'on',download:{status:'ready-to-install'},projects:Array.from({length:195},(_,i)=>({id:String(i)}))});
 s=software.openInstaller(s,'ft').state;for(let i=0;i<3;i++)s=software.advanceInstaller(s).state;
 assert.equal(s.software.installer.step,'install');s=createBeat(s,{id:'late',name:'Other project'}).state;
 const result=software.advanceInstaller(s);assert.equal(result.reason,'insufficient-space');assert.equal(result.state.software.ft.installed,false);assert.equal(result.state.software.ft.receivedBytes,800000000);
});
