import test from 'node:test';
import assert from 'node:assert/strict';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {advanceVirtualPc} from '../src/virtual-pc-runtime.js';
import {pcDocument,findButton,allPc,fire} from './helpers/virtual-pc-dom.js';
function setup(){const d=pcDocument(),root=d.createElement('section'),pc=mountVirtualPc(root);pc.showDesktop(createVirtualPcState({power:'on'}));pc.open('underweb');pc.navigateUnderweb('underweb://dump');return {pc,root,d};}
function click(root,name){const b=findButton(root,name);assert.ok(b,'Missing '+name);b.click();}
function wizard(root){for(const name of ['Далее >','Далее >','Установить','Завершить установку','Готово'])click(root,name);}
test('forum client download leads through wizard into an empty torrent client and FT metadata adds one task',()=>{
 const {pc,root}=setup();click(root,'torent — торрент-клиент');click(root,'Скачать установщик torent');
 pc.syncState(advanceVirtualPc(pc.state,{day:1,minutes:0}).state);pc.syncState(advanceVirtualPc(pc.state,{day:1,minutes:2}).state);
 click(root,'Открыть установщик torent');wizard(root);pc.open('torent');assert.ok(allPc(root).some(n=>n.textContent==='Нет задач. Открой файл .torrent из Загрузок.'));
 pc.open('underweb');pc.navigateUnderweb('underweb://dump/ft-studio');click(root,'Скачать FT-Studio.torrent');click(root,'Открыть FT-Studio.torrent');
 assert.equal(pc.window,'torent');assert.equal(pc.state.software.task.appId,'ft');assert.equal(pc.windows.windows.filter(w=>w.id==='torent').length,1);
 pc.syncState(advanceVirtualPc(pc.state,{day:1,minutes:600}).state);click(root,'Открыть установщик FT Studio');wizard(root);assert.equal(pc.state.download.status,'installed');
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
test('restored unfinished wizard opens as the master window and blocks other app controls',()=>{
 const {pc,root}=setup();pc.syncState(createVirtualPcState({power:'on',software:{client:{receivedBytes:2000000},installer:{appId:'client',step:'destination',path:'C:\\Custom\\torent'}}}));
 pc.showDesktop(pc.state);assert.equal(pc.window,'installer');assert.equal(pc.shell.getContentRoot('underweb').parentElement.inert,true);
 assert.equal(allPc(root).find(n=>n.getAttribute?.('aria-label')==='Папка установки').value,'C:\\Custom\\torent');pc.open('computer');assert.equal(pc.window,'installer');
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
