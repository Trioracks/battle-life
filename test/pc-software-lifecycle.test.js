import test from 'node:test';
import assert from 'node:assert/strict';
import * as software from '../src/pc-software.js';
import {SOFTWARE} from '../src/pc-software-catalog.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {mountTorrent,mountInstaller} from '../src/pc-software-view.js';
import {pcDocument,findButton,allPc,fire} from './helpers/virtual-pc-dom.js';
import {createBeat} from '../src/beat-production.js';
import {startCreativeChain} from '../src/creative-workflow.js';
import {startLyricWork} from '../src/lyric-production.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
const ready=id=>createVirtualPcState({power:'on',software:{client:{installed:true},[id]:{receivedBytes:SOFTWARE[id].downloadBytes}}});
test('uninstall explains why a standalone text refinement cannot be paused',()=>{
 let s=submissionFixture();s.software.notebook.installed=true;s.music.needs={satiety:100,energy:100};
 s=startLyricWork(s,{projectId:'lyrics',kind:'diss'},{}).state;assert.ok(s.writing.job);
 const d=pcDocument(),root=d.createElement('div'),pc=mountVirtualPc(root);pc.showDesktop(s);pc.softwareAction('uninstall','notebook');
 assert.equal(findButton(root,'Удалить программу').disabled,true);
 assert.ok(allPc(root).some(n=>n.textContent==='Сначала заверши текущую доработку.'));
 assert.ok(pc.state.writing.job);pc.dispose();
});
function finish(id){let s=software.openInstaller(ready(id),id).state;for(let n=0;n<3;n++)s=software.advanceInstaller(s).state;return software.advanceInstallation(s,SOFTWARE[id].installSeconds).state;}
for(const id of ['client','ft','notebook'])test(id+' opens once on Done, checkbox prevents opening and uninstall retains files',()=>{
 let s=finish(id);assert.equal(s.software.installer.openAfterInstall,true);
 const off=software.setInstallerOpenAfter(s,false).state;assert.equal(software.advanceInstaller(off).openAppId,null);
 const first=software.advanceInstaller(s);assert.equal(first.openAppId,SOFTWARE[id].desktopAppId);assert.ok(first.openAppId);
 assert.equal(software.advanceInstaller(first.state).openAppId,null);
 s={...first.state,projects:[{id:'keep',name:'My song'}]};
 const result=software.uninstallSoftware(s,id);assert.equal(result.ok,true);assert.equal(result.state.software[id].installed,false);
 assert.deepEqual(result.state.projects,s.projects);assert.equal(result.state.software[id].receivedBytes,s.software[id].receivedBytes);
});
test('selected completed torrent has one top install action and double click opens its wizard',()=>{
 const d=pcDocument(),root=d.createElement('div'),actions=[];let s=ready('notebook');
 const view=mountTorrent(root,{getState:()=>s,onAction:(...a)=>actions.push(a)});
 const row=findButton(root,'Выбрать загрузку Рэпблокнот');row.click();
 const install=findButton(root,'Установить');assert.ok(install);assert.equal(install.parentElement.className,'torrent-toolbar');
 install.click();fire(row,'dblclick');assert.deepEqual(actions,[['installer','notebook'],['installer','notebook']]);
 assert.equal(findButton(root,'Открыть установщик Рэпблокнот'),undefined);view.dispose();
});
test('wizard shows app artwork and a keyboard reachable open checkbox',()=>{
 const d=pcDocument(),root=d.createElement('div');let s=finish('notebook');const actions=[];
 const view=mountInstaller(root,{getState:()=>s,onAction:(...a)=>actions.push(a)});
 assert.ok(allPc(root).some(n=>n.tagName==='IMG'&&n.getAttribute('src').endsWith('/notebook.svg?rev=35')));
 const checkbox=allPc(root).find(n=>n.getAttribute?.('aria-label')==='Открыть после установки');assert.ok(checkbox);assert.equal(checkbox.checked,true);
 checkbox.checked=false;fire(checkbox,'change');assert.deepEqual(actions,[['open-after-install',false]]);view.dispose();
});
test('explorer selection installs, deletion confirms and closes only chosen app',()=>{
 const d=pcDocument(),root=d.createElement('div'),pc=mountVirtualPc(root);pc.showDesktop(ready('notebook'));pc.open('computer');pc.openFolder('downloads');
 findButton(root,'Открыть Rap-Notebook-setup.exe').click();findButton(root,'Установить').click();assert.equal(pc.window,'installer');
 for(let i=0;i<3;i++)pc.softwareAction('next');pc.syncState(software.advanceInstallation(pc.state,10).state);pc.softwareAction('next');
 assert.equal(pc.window,'rap-notebook');pc.open('underweb');pc.softwareAction('uninstall','notebook');
 assert.equal(pc.state.software.notebook.installed,true);findButton(root,'Удалить программу').click();
 assert.equal(pc.state.software.notebook.installed,false);assert.ok(pc.windows.windows.some(w=>w.id==='underweb'));
 assert.equal(pc.windows.windows.some(w=>w.id==='rap-notebook'),false);pc.dispose();
});
test('uninstall refuses unfinished recording and protected system destination',()=>{
 const s=ready('ft');s.software.ft.installed=true;s.recording={job:{kind:'draft'}};
 assert.equal(software.uninstallSoftware(s,'ft').reason,'recording-in-progress');
 assert.equal(software.normalizeInstallPath('C:\\System\\FT'),null);
});
test('uninstall pauses owned beat work and preserves frozen decisions; Escape cancels',()=>{
 let s=ready('ft');s.software.ft.installed=true;s=createBeat(s,{id:'work',name:'Work'},{},()=>.4).state;s=startCreativeChain(s,{kind:'beat',projectId:'work'},{},()=>.4).state;
 const plans=structuredClone(s.creativeWork.items),d=pcDocument(),root=d.createElement('div'),pc=mountVirtualPc(root);pc.showDesktop(s);
 pc.softwareAction('uninstall','ft');fire(root,'keydown',{key:'Escape'});assert.equal(pc.state.software.ft.installed,true);assert.ok(pc.state.music.job);
 pc.softwareAction('uninstall','ft');findButton(root,'Удалить программу').click();
 assert.equal(pc.state.music.job,null);assert.ok(pc.state.creativeWork.items[0].pausedJob);
 assert.deepEqual(pc.state.creativeWork.items[0].plans,plans[0].plans);assert.equal(pc.state.projects[0].id,'work');pc.dispose();
});
test('finishing while away prepares the app without requesting a camera or work transition',()=>{
 const d=pcDocument(),root=d.createElement('div');let moves=0;
 const pc=mountVirtualPc(root,{onLeave:()=>moves++,onWork:()=>moves++,onShutdown:()=>moves++});pc.showDesktop(finish('notebook'));
 pc.presentTransition({phase:'room',overlay:0,zoom:0,locked:true,progress:0});pc.softwareAction('next');
 assert.equal(pc.state.software.installer,null);assert.ok(pc.windows.windows.some(w=>w.id==='rap-notebook'));assert.equal(moves,0);assert.equal(pc.locked,true);pc.dispose();
});
