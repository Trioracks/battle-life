import test from 'node:test';
import assert from 'node:assert/strict';
import {mountBrowserDownloads} from '../src/pc-browser-downloads-view.js';
import * as downloads from '../src/pc-browser-downloads.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';

function eventDocument(){
 const d=pcDocument(),events=new EventTarget(),listeners=new Set();
 d.addEventListener=(type,fn,options)=>{events.addEventListener(type,fn,options);listeners.add(fn);};
 d.removeEventListener=(type,fn,options)=>{events.removeEventListener(type,fn,options);listeners.delete(fn);};
 d.dispatchEvent=events.dispatchEvent.bind(events);return {d,listeners};
}
function setup(){
 const {d,listeners}=eventDocument(),root=d.createElement('section'),anchor=d.createElement('button');
 let state=createVirtualPcState({power:'on'}),message='';const actions=[];
 const view=mountBrowserDownloads(root,{anchor,getState:()=>state,getMessage:()=>message,onAction:(action,id)=>{
  actions.push([action,id]);if(action==='clear-download-history')state=downloads.clearCompletedBrowserDownloadHistory(state).state;
 }});
 return {d,root,anchor,view,listeners,actions,start(appId,kind='metadata'){state=downloads.startBrowserDownload(state,{appId,kind}).state;view.update();},tick(seconds){state=downloads.advanceBrowserDownloads(state,{activeSeconds:seconds}).state;view.update();},message(value){message=value;view.update();}};
}
const rows=s=>allPc(s.root).filter(n=>n.className==='uw-download-row');
const names=s=>rows(s).map(row=>allPc(row).find(n=>n.className==='uw-download-name').textContent);

test('downloads starts closed and a new transfer opens the toolbar popover with remaining time',()=>{
 const s=setup();assert.equal(s.root.hidden,true);assert.equal(s.anchor.getAttribute('aria-expanded'),'false');
 s.start('client','installer');assert.equal(s.root.hidden,false);assert.equal(s.anchor.getAttribute('aria-expanded'),'true');
 assert.match(allPc(rows(s)[0]).map(n=>n.textContent??'').join(' '),/1 с/);
 const open=findButton(s.root,'Открыть файл torent-setup.exe'),cancel=findButton(s.root,'Отменить загрузку torent-setup.exe');assert.equal(open.disabled,true);assert.equal(open.hidden,true);assert.equal(cancel.hidden,false);
 s.tick(1);assert.equal(open.disabled,false);assert.equal(open.hidden,false);assert.equal(cancel.hidden,true);assert.deepEqual(s.actions,[],'download completion never opens the installer');
 open.click();assert.deepEqual(s.actions,[['installer','client']]);s.view.dispose();
});

test('compact popover shows latest three newest entries and details exposes the full visible history',()=>{
 const s=setup();s.start('client','installer');s.start('ft');s.start('notebook');s.start('dossier');
 assert.deepEqual(names(s),['Rap-Dossier.torrent','Rap-Notebook.torrent','FT-Studio.torrent']);
 findButton(s.root,'Подробнее о загрузках').click();
 assert.deepEqual(names(s),['Rap-Dossier.torrent','Rap-Notebook.torrent','FT-Studio.torrent','torent-setup.exe']);
 findButton(s.root,'Последние загрузки').click();assert.equal(rows(s).length,3);s.view.dispose();
});

test('a repeated completed file becomes newest and reopens the closed popover',()=>{
 const s=setup();s.start('client','installer');s.tick(1);s.start('ft');s.tick(1);s.view.toggle();
 assert.equal(s.root.hidden,true);s.start('client','installer');
 assert.equal(s.root.hidden,false);assert.deepEqual(names(s),['torent-setup.exe','FT-Studio.torrent']);s.view.dispose();
});

test('Escape returns focus to the toolbar, outside pointer closes, and disposal removes listeners',()=>{
 const s=setup();s.start('client','installer');findButton(s.root,'Открыть файл torent-setup.exe').focus();
 const key=fire(s.d,'keydown',{key:'Escape'});assert.equal(key.defaultPrevented,true);assert.equal(s.root.hidden,true);assert.equal(s.d.activeElement,s.anchor);
 s.view.toggle();fire(s.d,'pointerdown',{target:s.root});assert.equal(s.root.hidden,false);
 fire(s.d,'pointerdown',{target:s.d.createElement('button')});assert.equal(s.root.hidden,true);
 assert.ok(s.listeners.size>0);s.view.dispose();assert.equal(s.listeners.size,0);assert.equal(s.anchor.getAttribute('aria-expanded'),'false');
});

test('clear completed keeps a live partial in the view and folder action routes to Explorer',()=>{
 const s=setup();s.start('client','installer');s.tick(1);s.start('ft');s.tick(.5);
 findButton(s.root,'Очистить завершённые загрузки').click();s.view.update();
 assert.deepEqual(names(s),['FT-Studio.torrent']);assert.equal(findButton(s.root,'Очистить завершённые загрузки').disabled,true);
 findButton(s.root,'Открыть папку загрузок').click();assert.deepEqual(s.actions.at(-1),['browse-metadata',undefined]);assert.equal(s.root.hidden,true);s.view.dispose();
});

test('failed no-room download opens an accessible message even when there is no history',()=>{
 const s=setup();s.message('Недостаточно места на диске.');assert.equal(s.root.hidden,false);
 assert.ok(allPc(s.root).some(n=>n.getAttribute('role')==='status'&&n.textContent==='Недостаточно места на диске.'));s.view.dispose();
});

test('browser close and reopen clean up popover listeners; clear and folder actions work through real PC routing',()=>{
 const {d,listeners}=eventDocument(),root=d.createElement('section'),pc=mountVirtualPc(root,{audio:{stop(){},dispose(){}}});
 pc.showDesktop(createVirtualPcState({power:'on'}));pc.open('underweb');const mounted=listeners.size;
 pc.softwareAction('download-client');pc.tickBrowserDownloads(1);
 findButton(root,'Очистить завершённые загрузки').click();assert.equal(downloads.browserDownloadEntries(pc.state).length,0);assert.equal(pc.state.software.client.receivedBytes,2000000);
 findButton(root,'Открыть папку загрузок').click();assert.equal(pc.windows.activeId,'computer');
 assert.equal(allPc(root).find(n=>n.getAttribute('aria-label')==='Адрес папки').value,'C:\\Загрузки');
 pc.closeWindow('underweb');assert.ok(listeners.size<mounted);pc.open('underweb');assert.equal(listeners.size,mounted);
 assert.equal(allPc(root).find(n=>n.getAttribute('aria-label')==='Загрузки Underweb').hidden,true);pc.dispose();assert.equal(listeners.size,0);
});
