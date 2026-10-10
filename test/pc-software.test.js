import test from 'node:test';
import assert from 'node:assert/strict';
import * as software from '../src/pc-software.js?rev=26';
import {createVirtualPcState,diskUsage,loadVirtualPcState} from '../src/virtual-pc-state.js?rev=26';
import {desktopApps} from '../src/virtual-pc-catalog.js?rev=26';
import {advanceVirtualPc,downloadPresentation} from '../src/virtual-pc-runtime.js?rev=26';
import {createBeat} from '../src/beat-production.js?rev=26';
const fresh=()=>createVirtualPcState({power:'on'});
function startInstallation(state,id){state=software.openInstaller(state,id).state;for(let i=0;i<3;i++)state=software.advanceInstaller(state).state;return state;}
function install(state,id){state=startInstallation(state,id);state=software.advanceInstallation(state,id==='client'?10:30).state;return software.advanceInstaller(state).state;}
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
 const result=software.advanceInstallation(s,30);assert.equal(result.reason,'insufficient-space');assert.equal(result.state.software.ft.installed,false);assert.equal(result.state.software.ft.receivedBytes,800000000);
});

for(const [id,duration,archive,installedMb]of [['client',10,2000000,8],['ft',30,800000000,800]])test(`${id} commits installation only after ${duration} active seconds and charges disk once`,()=>{
 let s=startInstallation(createVirtualPcState({power:'on',software:{[id]:{receivedBytes:archive}}}),id);
 const initial=structuredClone(s),used=diskUsage(s).usedMb;
 assert.equal(s.software.installer.elapsedSeconds,0);assert.equal(s.software[id].installed,false);
 assert.equal(software.advanceInstaller(s).reason,'installation-running');
 const partial=software.advanceInstallation(s,duration-.25);assert.equal(partial.completed,false);assert.equal(partial.advancedSeconds,duration-.25);assert.deepEqual(s,initial,'advancing is pure');s=partial.state;
 assert.equal(s.software.installer.step,'install');assert.equal(s.software[id].installed,false);assert.equal(diskUsage(s).usedMb,used);
 const done=software.advanceInstallation(s,.25);s=done.state;
 assert.equal(done.completed,true);assert.equal(done.advancedSeconds,.25);assert.equal(s.software.installer.step,'finish');assert.equal(s.software[id].installed,true);assert.equal(diskUsage(s).usedMb,used+installedMb);
 const duplicate=software.advanceInstallation(s,100);assert.equal(duplicate.completed,false);assert.equal(duplicate.advancedSeconds,0);assert.equal(diskUsage(duplicate.state).usedMb,used+installedMb);
 assert.equal(software.advanceInstaller(s).state.software.installer,null);
});

test('installation ignores invalid deltas and pauses while powered off',()=>{
 const s=software.advanceInstallation(startInstallation(createVirtualPcState({power:'on',software:{client:{receivedBytes:2000000}}}),'client'),2).state;
 for(const seconds of [NaN,Infinity,-Infinity,-1,0,'8',null,undefined]){
  const tick=software.advanceInstallation(s,seconds);assert.equal(tick.advancedSeconds,0);assert.equal(tick.completed,false);assert.equal(tick.state.software.installer.elapsedSeconds,2);assert.equal(tick.state.software.client.installed,false);
 }
 const paused=software.advanceInstallation({...s,power:'off'},100);assert.equal(paused.advancedSeconds,0);assert.equal(paused.state.software.installer.elapsedSeconds,2);
 assert.equal(software.advanceInstallation({...paused.state,power:'on'},8).state.software.client.installed,true);
});

test('saved installation resumes its elapsed seconds without credit from game time or offline time',()=>{
 let s=startInstallation(createVirtualPcState({power:'on',software:{ft:{receivedBytes:800000000}}}),'ft');
 s=software.advanceInstallation(s,12.5).state;
 const raw=JSON.stringify(s),restored=loadVirtualPcState({getItem:()=>raw}).state;
 assert.equal(restored.software.installer.elapsedSeconds,12.5);
 s=advanceVirtualPc(restored,{day:99,minutes:900}).state;assert.equal(s.software.installer.elapsedSeconds,12.5);assert.equal(s.software.ft.installed,false);
 s=software.advanceInstallation(s,17.25).state;assert.equal(s.software.ft.installed,false);
 assert.equal(software.advanceInstallation(s,.25).state.software.ft.installed,true);
});

test('old and malformed installer saves start safely without manufacturing a completed installation',()=>{
 for(const elapsedSeconds of [undefined,NaN,Infinity,-3]){
  const s=createVirtualPcState({power:'on',software:{client:{receivedBytes:2000000},installer:{appId:'client',step:'install',elapsedSeconds}}});
  assert.equal(s.software.installer.elapsedSeconds,0);assert.equal(s.software.client.installed,false);
 }
 const notStarted=createVirtualPcState({power:'on',software:{client:{receivedBytes:2000000},installer:{appId:'client',step:'summary',elapsedSeconds:999}}});
 assert.equal(software.advanceInstallation(notStarted,100).state.software.installer.step,'summary');
 assert.equal(software.advanceInstaller(notStarted).state.software.installer.elapsedSeconds,0);
});

test('a full disk at completion retains the archive and can finish after space is freed',()=>{
 let s=startInstallation(createVirtualPcState({power:'on',software:{ft:{receivedBytes:800000000}}}),'ft');
 s=software.advanceInstallation(s,29).state;s={...s,projects:Array.from({length:201},(_,i)=>({id:String(i)}))};
 const blocked=software.advanceInstallation(s,1);assert.equal(blocked.reason,'insufficient-space');assert.equal(blocked.completed,false);assert.equal(blocked.state.software.installer.step,'install');assert.equal(blocked.state.software.installer.elapsedSeconds,30);assert.equal(blocked.state.software.installer.error,'insufficient-space');assert.equal(blocked.state.software.ft.installed,false);assert.equal(blocked.state.software.ft.receivedBytes,800000000);
 const resumed=software.advanceInstallation({...blocked.state,projects:[]},1);assert.equal(resumed.completed,true);assert.equal(resumed.advancedSeconds,0);assert.equal(resumed.state.software.installer.error,'');assert.equal(resumed.state.software.ft.installed,true);
});

test('cancelling an active installation keeps the archive with no installed disk allocation',()=>{
 let s=startInstallation(createVirtualPcState({power:'on',software:{client:{receivedBytes:2000000}}}),'client');s=software.advanceInstallation(s,9).state;
 s=software.cancelInstaller(s).state;assert.equal(s.software.installer,null);assert.equal(s.software.client.installed,false);assert.equal(s.software.client.receivedBytes,2000000);assert.equal(diskUsage(s).usedMb,14002);
 assert.equal(software.advanceInstallation(s,100).state.software.client.installed,false);
});
