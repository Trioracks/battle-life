import test from 'node:test';
import assert from 'node:assert/strict';
import {mountVirtualPc} from '../src/virtual-pc-ui.js?rev=28';
import {createVirtualPcState,diskUsage,loadVirtualPcState} from '../src/virtual-pc-state.js?rev=28';
import {advanceVirtualPc} from '../src/virtual-pc-runtime.js?rev=28';
import {mountInstaller} from '../src/pc-software-view.js?rev=28';
import * as software from '../src/pc-software.js?rev=28';
import {pcDocument,findButton,allPc,fire} from './helpers/virtual-pc-dom.js';
function setup(){const d=pcDocument(),root=d.createElement('section'),pc=mountVirtualPc(root);pc.showDesktop(createVirtualPcState({power:'on'}));pc.open('underweb');pc.navigateUnderweb('underweb://dump');return {pc,root,d};}
function click(root,name){const b=findButton(root,name);assert.ok(b,'Missing '+name);b.click();}
function wizard(root,pc){for(const name of ['Далее >','Далее >','Установить'])click(root,name);pc.syncState(software.advanceInstallation(pc.state,pc.state.software.installer.appId==='client'?10:30).state);click(root,'Готово');}
test('opening the installer cancels a pending FT launch and preserves its keyboard scope',()=>{
 const d=pcDocument(),root=d.createElement('section'),timers=new Map();let timerId=0;
 const pc=mountVirtualPc(root,{setTimeoutFn:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeoutFn:id=>timers.delete(id)});
 pc.showDesktop(createVirtualPcState({power:'on',download:{status:'installed'},software:{client:{receivedBytes:2000000},ft:{installed:true}}}));
 pc.open('ft-studio');const pending=timers.get(timerId);assert.equal(root.getAttribute('aria-busy'),'true');
 pc.softwareAction('installer','client');pending();
 assert.equal(pc.window,'installer');assert.equal(root.getAttribute('aria-busy'),'false');
 assert.equal(pc.windows.windows.some(w=>w.id==='ft-studio'),false);
 assert.equal(pc.focusScope().dataset.windowId,'installer');assert.ok(pc.focusScope().contains(d.activeElement));
 fire(root,'keydown',{key:'Escape'});assert.equal(pc.state.software.installer,null);
 pc.open('ft-studio');timers.get(timerId)();assert.equal(pc.window,'ft-studio');pc.dispose();
});
test('wizard step changes move focus into the next step and clock updates preserve its controls',()=>{
 const {pc,root,d}=setup();pc.syncState(createVirtualPcState({power:'on',software:{client:{receivedBytes:2000000}}}));pc.softwareAction('installer','client');
 const next=findButton(root,'Далее >');next.focus();next.click();
 const input=allPc(root).find(n=>n.getAttribute?.('aria-label')==='Папка установки');assert.ok(d.activeElement===input,'Next focuses the destination input');
 input.value='C:\\Keyboard\\torent';input.selectionStart=3;input.selectionEnd=11;
 const destinationNext=findButton(root,'Далее >');pc.syncState({...pc.state,lastGameMinute:6});
 assert.ok(d.activeElement===input,'clock sync preserves input focus');assert.ok(findButton(root,'Далее >')===destinationNext,'clock sync preserves Next identity');assert.equal(input.value,'C:\\Keyboard\\torent');assert.equal(input.selectionStart,3);assert.equal(input.selectionEnd,11);
 destinationNext.focus();destinationNext.click();assert.ok(pc.focusScope().contains(d.activeElement));assert.equal(d.activeElement.tagName,'H2');
 const back=findButton(root,'< Назад');back.focus();back.click();assert.ok(d.activeElement===allPc(root).find(n=>n.getAttribute?.('aria-label')==='Папка установки'),'Back focuses the destination input');
 findButton(root,'< Назад').focus();click(root,'< Назад');assert.equal(d.activeElement.tagName,'H2');pc.dispose();
});
test('an installer rebuild does not steal focus from outside its view',()=>{
 const d=pcDocument(),root=d.createElement('section'),outside=d.createElement('button');let state=createVirtualPcState({software:{client:{receivedBytes:2000000},installer:{appId:'client',step:'welcome'}}});
 outside.focus();const view=mountInstaller(root,{getState:()=>state,onAction(){}});assert.equal(d.activeElement,outside);
 state={...state,software:{...state.software,installer:{...state.software.installer,step:'destination'}}};view.update();assert.equal(d.activeElement,outside);view.dispose();
});
test('an inactive installer rebuild does not move focus into its inert window',()=>{
 const d=pcDocument(),frame=d.createElement('section'),root=d.createElement('div');frame.append(root);let state=createVirtualPcState({software:{client:{receivedBytes:2000000},installer:{appId:'client',step:'welcome'}}});
 const view=mountInstaller(root,{getState:()=>state,onAction(){}});findButton(root,'Далее >').focus();frame.inert=true;
 state={...state,software:{...state.software,installer:{...state.software.installer,step:'destination'}}};view.update();assert.equal(d.activeElement,null);view.dispose();
});
test('forum client download leads through wizard into an empty torrent client and FT metadata adds one task',()=>{
 const {pc,root}=setup();click(root,'torent — торрент-клиент');click(root,'Скачать установщик torent');
 pc.syncState(advanceVirtualPc(pc.state,{day:1,minutes:0}).state);pc.syncState(advanceVirtualPc(pc.state,{day:1,minutes:2}).state);
 click(root,'Открыть установщик torent');wizard(root,pc);pc.open('torent');assert.ok(allPc(root).some(n=>n.textContent==='Нет задач. Открой файл .torrent из Загрузок.'));
 pc.open('underweb');pc.navigateUnderweb('underweb://dump/ft-studio');click(root,'Скачать FT-Studio.torrent');click(root,'Открыть FT-Studio.torrent');
 assert.equal(pc.window,'torent');assert.equal(pc.state.software.task.appId,'ft');assert.equal(pc.windows.windows.filter(w=>w.id==='torent').length,1);
 pc.syncState(advanceVirtualPc(pc.state,{day:1,minutes:600}).state);click(root,'Открыть установщик FT Studio');wizard(root,pc);assert.equal(pc.state.download.status,'installed');
 assert.ok(findButton(root,'FT Studio'));pc.open('computer');pc.openFolder('C:\\Program Files\\Field Tone\\FT Studio');assert.ok(allPc(root).some(n=>n.textContent==='Plugins'));
});
test('wizard typing survives clock sync, back and Escape cancellation retain the downloaded installer',()=>{
 const {pc,root,d}=setup();pc.syncState(createVirtualPcState({power:'on',software:{client:{receivedBytes:2000000}}}));pc.navigateUnderweb('underweb://dump/client');click(root,'Открыть установщик torent');click(root,'Далее >');
 const input=allPc(root).find(n=>n.getAttribute?.('aria-label')==='Папка установки');input.value='C:\\My Tools\\torent';input.focus();pc.syncState({...pc.state,lastGameMinute:5});assert.equal(d.activeElement,input);assert.equal(input.value,'C:\\My Tools\\torent');
 click(root,'Далее >');click(root,'< Назад');assert.equal(allPc(root).find(n=>n.getAttribute?.('aria-label')==='Папка установки').value,'C:\\My Tools\\torent');
 fire(root,'keydown',{key:'Escape'});assert.equal(pc.state.software.installer,null);assert.equal(pc.state.software.client.receivedBytes,2000000);
});
test('live forum transfer keeps its cancel control and keyboard focus across byte updates',()=>{
 const {pc,root,d}=setup();pc.navigateUnderweb('underweb://dump/client');click(root,'Скачать установщик torent');
 const cancel=findButton(root,'Отменить загрузку');cancel.focus();pc.syncState(advanceVirtualPc(pc.state,{day:1,minutes:0}).state);pc.syncState(advanceVirtualPc(pc.state,{day:1,minutes:.25}).state);
 assert.equal(findButton(root,'Отменить загрузку'),cancel);assert.equal(d.activeElement,cancel);assert.ok(allPc(root).some(n=>n.textContent?.startsWith('Загрузка: 0.36')));
});
test('restored unfinished wizard keeps its path while other apps remain available',()=>{
 const {pc,root}=setup();pc.syncState(createVirtualPcState({power:'on',software:{client:{receivedBytes:2000000},installer:{appId:'client',step:'destination',path:'C:\\Custom\\torent'}}}));
 pc.showDesktop(pc.state);assert.equal(pc.window,'installer');assert.equal(pc.shell.getContentRoot('underweb').parentElement.inert,false);
 assert.equal(allPc(root).find(n=>n.getAttribute?.('aria-label')==='Папка установки').value,'C:\\Custom\\torent');pc.open('computer');assert.equal(pc.window,'computer');
});

for(const [id,duration,archive,installedMb]of [['client',10,2000000,8],['notebook',10,4000000,12],['ft',30,800000000,800]])test(`${id} installs while minimized without interrupting the browser`,()=>{
 const {pc,root,d}=setup();pc.syncState(createVirtualPcState({power:'on',software:{[id]:{receivedBytes:archive}}}));pc.softwareAction('installer',id);
 for(const name of ['Далее >','Далее >','Установить'])click(root,name);
 const installer=pc.shell.getContentRoot('installer'),used=diskUsage(pc.state).usedMb;
 assert.equal(findButton(installer.parentElement,'Свернуть окно').disabled,false);
 findButton(installer.parentElement,'Свернуть окно').click();assert.equal(installer.parentElement.hidden,true);
 const taskbar=allPc(root).find(n=>n.className==='pc-taskbar');assert.equal(taskbar.inert,false);
 pc.open('underweb');pc.navigateUnderweb('underweb://dump');
 const browser=pc.shell.getContentRoot('underweb'),address=allPc(browser).find(n=>n.tagName==='INPUT');address.focus();address.value='Незавершённый адрес';
 pc.syncState(software.advanceInstallation(pc.state,duration/2).state);
 assert.equal(pc.state.software.installer.elapsedSeconds,duration/2);assert.equal(pc.state.software[id].installed,false);assert.equal(diskUsage(pc.state).usedMb,used);
 pc.syncState(software.advanceInstallation(pc.state,duration/2).state);
 assert.equal(pc.state.software[id].installed,true);assert.equal(pc.state.software.installer.step,'finish');assert.equal(diskUsage(pc.state).usedMb,used+installedMb);
 assert.equal(pc.window,'underweb');assert.equal(d.activeElement,address);assert.equal(address.value,'Незавершённый адрес');assert.equal(installer.parentElement.hidden,true);
 const task=allPc(root).find(n=>n.dataset.pcRole==='task'&&n.dataset.windowId==='installer');task.click();assert.equal(pc.window,'installer');assert.equal(installer.parentElement.hidden,false);assert.ok(findButton(installer,'Готово'));
 click(installer,'Готово');assert.equal(pc.state.software.installer,null);assert.equal(pc.state.software[id].installed,true);pc.dispose();
});

test('Escape and close in another app do not cancel a background installation',()=>{
 const {pc,root}=setup();pc.syncState(createVirtualPcState({power:'on',software:{client:{receivedBytes:2000000},installer:{appId:'client',step:'install',elapsedSeconds:4}}}));pc.showDesktop(pc.state);
 pc.open('underweb');fire(root,'keydown',{key:'Escape'});assert.equal(pc.state.software.installer?.elapsedSeconds,4);
 pc.closeWindow('underweb');assert.equal(pc.shell.getContentRoot('underweb'),null);assert.equal(pc.state.software.installer.elapsedSeconds,4);
 fire(root,'keydown',{key:'Escape'});assert.equal(pc.state.software.installer,null);assert.equal(pc.state.software.client.installed,false);assert.equal(pc.state.software.client.receivedBytes,2000000);pc.dispose();
});

test('Escape cancels the shutdown dialog before the active installer',()=>{
 const {pc,root}=setup();pc.syncState(createVirtualPcState({power:'on',software:{client:{receivedBytes:2000000},installer:{appId:'client',step:'install',elapsedSeconds:4}}}));pc.showDesktop(pc.state);
 pc.showShutdown();fire(root,'keydown',{key:'Escape'});assert.equal(pc.shutdownModal===null,true);assert.equal(pc.state.software.installer?.elapsedSeconds,4);pc.dispose();
});

test('leaving the PC saves installation progress and returning preserves minimized windows',()=>{
 const d=pcDocument(),root=d.createElement('section');let saved=null,left=false;
 const pc=mountVirtualPc(root,{onPersist:state=>{saved=JSON.stringify(state);return true;},onLeave:()=>{left=true;}});
 pc.showDesktop(createVirtualPcState({power:'on',software:{ft:{receivedBytes:800000000},installer:{appId:'ft',step:'install'}}}));
 pc.windowAction({type:'minimize',id:'installer'});pc.open('underweb');pc.syncState(software.advanceInstallation(pc.state,4).state);pc.requestLeave();
 assert.equal(left,true);assert.ok(saved);assert.equal(loadVirtualPcState({getItem:()=>saved}).state.software.installer.elapsedSeconds,4);
 pc.syncState(software.advanceInstallation(pc.state,3).state);pc.showDesktop(pc.state);
 assert.equal(pc.window,'underweb');assert.equal(pc.windows.windows.find(w=>w.id==='installer').mode,'minimized');assert.equal(pc.state.software.installer.elapsedSeconds,7);pc.dispose();
});
test('torrent toolbar disables empty and finished queue actions and only resumes paused transfers',()=>{
 const {pc,root}=setup();pc.showDesktop(createVirtualPcState({power:'on',software:{client:{installed:true}}}));pc.open('torent');
 for(const name of ['Ⅱ Пауза','▶ Продолжить','× Отменить'])assert.equal(findButton(root,name).disabled,true,name);
 pc.syncState(createVirtualPcState({power:'on',download:{status:'downloading',receivedBytes:1000000}}));
 assert.equal(findButton(root,'Ⅱ Пауза').disabled,false);assert.equal(findButton(root,'▶ Продолжить').disabled,true);assert.equal(findButton(root,'× Отменить').disabled,false);
 click(root,'Ⅱ Пауза');assert.equal(findButton(root,'Ⅱ Пауза').disabled,true);assert.equal(findButton(root,'▶ Продолжить').disabled,false);
 click(root,'▶ Продолжить');assert.equal(findButton(root,'▶ Продолжить').disabled,true);
 pc.syncState(createVirtualPcState({power:'on',download:{status:'ready-to-install'}}));for(const name of ['Ⅱ Пауза','▶ Продолжить','× Отменить'])assert.equal(findButton(root,name).disabled,true,name);
});
test('forum has muted graphics, games and system categories without download controls',()=>{
 const {root}=setup();for(const category of ['Графика','Игры','Системы']){assert.ok(allPc(root).some(n=>n.textContent===category));assert.equal(findButton(root,category),undefined);}
});
test('opening FT metadata without the client explains the prerequisite in the forum',()=>{
 const {pc,root}=setup();pc.navigateUnderweb('underweb://dump/ft-studio');click(root,'Скачать FT-Studio.torrent');click(root,'Открыть FT-Studio.torrent');
 assert.ok(allPc(root).some(n=>n.textContent==='Сначала скачай и установи torent из темы клиента.'));assert.equal(pc.window,'underweb');assert.equal(pc.state.software.task,null);
});

test('opening Downloads metadata without the client announces the prerequisite inside Explorer',()=>{
 const {pc,root}=setup();pc.navigateUnderweb('underweb://dump/ft-studio');click(root,'Скачать FT-Studio.torrent');
 pc.open('computer');pc.openFolder('downloads');const explorer=pc.shell.getContentRoot('computer');
 fire(findButton(explorer,'Открыть FT-Studio.torrent'),'keydown',{key:'Enter'});
 assert.equal(pc.window,'computer');assert.equal(pc.state.software.task,null);
 const status=allPc(explorer).find(n=>n.getAttribute?.('aria-live')==='polite');
 assert.match(status.textContent,/Сначала.*установи torent/);assert.notEqual(status.hidden,true);
});

test('running installer updates visible progress in place and cannot be completed with Next',()=>{
 const d=pcDocument(),root=d.createElement('section');let state=createVirtualPcState({power:'on',software:{client:{receivedBytes:2000000},installer:{appId:'client',step:'summary'}}});
 state=software.advanceInstaller(state).state;
 const view=mountInstaller(root,{getState:()=>state,onAction:action=>{if(action==='next')state=software.advanceInstaller(state).state;}});
 const progress=allPc(root).find(n=>n.tagName==='PROGRESS'),next=allPc(root).find(n=>n.tagName==='BUTTON'&&n.textContent!=='< Назад'&&n.textContent!=='Отмена'),cancel=findButton(root,'Отмена');
 assert.equal(progress.value,0);assert.equal(next.disabled,true);cancel.focus();
 state=software.advanceInstallation(state,2.5).state;view.update();
 assert.equal(progress.value,25);assert.ok(allPc(root).some(n=>/25%/.test(n.textContent)));assert.equal(allPc(root).find(n=>n.tagName==='PROGRESS'),progress);assert.equal(findButton(root,'Отмена'),cancel);assert.equal(d.activeElement,cancel);assert.equal(next.disabled,true);
 state=software.advanceInstallation(state,7.5).state;view.update();assert.ok(findButton(root,'Готово'));assert.equal(d.activeElement.tagName,'H2');view.dispose();
});

test('installation completion preserves focus outside a hidden or inert installer',()=>{
 for(const hidden of [true,false]){
  const d=pcDocument(),frame=d.createElement('section'),root=d.createElement('div'),outside=d.createElement('button');frame.append(root);
  let state=createVirtualPcState({power:'on',software:{client:{receivedBytes:2000000},installer:{appId:'client',step:'install',elapsedSeconds:9}}});
  const view=mountInstaller(root,{getState:()=>state,onAction(){}});findButton(root,'Отмена').focus();frame.hidden=hidden;frame.inert=!hidden;
  state=software.advanceInstallation(state,1).state;view.update();assert.equal(d.activeElement,null);
  outside.focus();view.update();assert.equal(d.activeElement,outside);view.dispose();
 }
});

test('installer displays a saved capacity failure while retaining completed progress',()=>{
 const d=pcDocument(),root=d.createElement('section');let state=createVirtualPcState({power:'on',software:{ft:{receivedBytes:800000000},installer:{appId:'ft',step:'install',elapsedSeconds:29}}});
 const view=mountInstaller(root,{getState:()=>state,onAction(){}}),progress=allPc(root).find(n=>n.tagName==='PROGRESS');
 state=software.advanceInstallation({...state,projects:Array.from({length:201},(_,i)=>({id:String(i)}))},1).state;view.update();
 assert.equal(progress.value,100);assert.ok(allPc(root).some(n=>/Недостаточно места/.test(n.textContent)));assert.equal(findButton(root,'Готово'),undefined);view.dispose();
});
