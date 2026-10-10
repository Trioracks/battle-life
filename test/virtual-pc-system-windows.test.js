import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSystemWindow} from '../src/virtual-pc-system-windows.js?rev=25';
import {mountPcMenu} from '../src/virtual-pc-menus.js';
import {mountVirtualPc} from '../src/virtual-pc-ui.js?rev=25';
import {createVirtualPcState} from '../src/virtual-pc-state.js?rev=25';
import {explorerProperties} from '../src/virtual-pc-explorer.js?rev=25';
import {pcDocument,findButton,allPc,fire,findPc} from './helpers/virtual-pc-dom.js';
function setup(kind='display',durable=true){
  const d=pcDocument(),root=d.createElement('section'),host=d.createElement('section');host.append(root);
  let state=createVirtualPcState(),closed=0,shutdowns=0;const persisted=[];
  const view=mountSystemWindow(root,{kind,getState:()=>state,onPersist:next=>{state=next;persisted.push(next);return durable;},onClose:()=>closed++,onConfirmShutdown:()=>shutdowns++,onOpen:()=>{}});
  return {d,root,view,persisted,state:()=>state,closed:()=>closed,shutdowns:()=>shutdowns};
}
test('Start has no duplicate documents shortcut but Explorer still opens its folder',()=>{
  const root=pcDocument().createElement('section'),c=mountVirtualPc(root,{audio:{stop(){},dispose(){}}});
  c.showDesktop(createVirtualPcState());findButton(root,'Пуск').click();
  const start=findPc(root,'start-menu');assert.equal(Boolean(findButton(start,'Мои документы')),false);findButton(start,'Мой компьютер').click();
  fire(findButton(root,'Открыть диск C:'),'dblclick');assert.ok(findButton(root,'Открыть папку Мои документы'));
  c.dispose();
});
test('disk properties meter updates live without replacing its node',()=>{
  const root=pcDocument().createElement('section');let state=createVirtualPcState();
  const view=mountSystemWindow(root,{kind:'properties',getState:()=>state,onClose(){},properties:explorerProperties(state,{kind:'disk'})});
  const meter=allPc(root).find(n=>n.getAttribute('role')==='meter');assert.ok(meter);
  state=createVirtualPcState({download:{status:'installed'}});view.update();
  assert.equal(allPc(root).find(n=>n.getAttribute('role')==='meter'),meter);assert.equal(meter.getAttribute('aria-valuenow'),'14800');view.dispose();
});
test('display selection is preview only',()=>{
  const s=setup();findButton(s.root,'Заводской рассвет').click();
  assert.equal(s.state().wallpaper,'courtyard');assert.equal(s.persisted.length,0);
  assert.match(findPc(s.root,'wallpaper-preview').getAttribute('style:background-image'),/factory/);
});
test('apply then cancel retains applied wallpaper',()=>{
  const s=setup();findButton(s.root,'Заводской рассвет').click();findButton(s.root,'Применить').click();
  findButton(s.root,'Лампа у стены').click();findButton(s.root,'Отмена').click();
  assert.equal(s.persisted.at(-1).wallpaper,'factory');assert.equal(s.closed(),1);
});
test('OK commits and closes; failed storage displays session-only warning',()=>{
  const s=setup();findButton(s.root,'Лампа у стены').click();findButton(s.root,'ОК').click();
  assert.equal(s.state().wallpaper,'room');assert.equal(s.closed(),1);
  const failed=setup('display',false);findButton(failed.root,'Заводской рассвет').click();findButton(failed.root,'Применить').click();
  assert.match(findPc(failed.root,'system-status').textContent,/текущем сеансе/);assert.equal(failed.closed(),0);
});
test('shutdown cancellation does not call host',()=>{
  const s=setup('shutdown');findButton(s.root,'Отмена').click();assert.equal(s.shutdowns(),0);assert.equal(s.closed(),1);
});
test('outside click and Escape dismiss only menu; keyboard skips disabled items and restores anchor',()=>{
  const d=pcDocument(),host=d.createElement('section'),root=d.createElement('div'),anchor=d.createElement('button');
  host.append(root,anchor);let chosen=0,dismissed=0;
  const menu=mountPcMenu(root,{onDismiss:()=>dismissed++});
  const options={anchor,x:1200,y:700,items:[{id:'disabled',label:'Нельзя',disabled:true},{id:'open',label:'Открыть',onSelect:()=>chosen++}]};
  menu.open(options);assert.equal(d.activeElement,findButton(root,'Открыть'));
  const e=fire(root,'keydown',{key:'Escape'});assert.equal(e.defaultPrevented,true);assert.equal(root.children.length,0);assert.equal(d.activeElement,anchor);
  menu.open(options);fire(host,'pointerdown',{target:host});assert.equal(root.children.length,0);assert.equal(chosen,0);
  menu.open(options);fire(root,'keydown',{key:'Enter'});assert.equal(chosen,1);assert.equal(dismissed,3);menu.dispose();
});
test('desktop menus open singleton display and modal restores initiating focus',()=>{
  const d=pcDocument(),root=d.createElement('section'),c=mountVirtualPc(root,{audio:{stop(){},dispose(){}}});c.showDesktop(createVirtualPcState());
  c.openSystem('display');c.openSystem('display');assert.equal(c.windows.windows.length,1);
  c.closeWindow();findButton(root,'Пуск').click();assert.ok(findPc(root,'start-menu'));
  findButton(root,'Выключение').click();assert.equal(c.shutdownModal!==null,true);
  findButton(root,'Отмена').click();assert.equal(c.shutdownModal,null);assert.equal(d.activeElement,findButton(root,'Пуск'));
});
test('host persistence warning becomes visible without a shell repaint',()=>{
  const d=pcDocument(),root=d.createElement('section'),c=mountVirtualPc(root,{audio:{stop(){},dispose(){}}});c.showDesktop(createVirtualPcState());
  c.setPersistenceWarning('Ошибка записи');assert.equal(findPc(root,'persistence-warning').hidden,false);
});
test('reset tears down menus and system windows before the next session',()=>{
  const d=pcDocument(),root=d.createElement('section'),c=mountVirtualPc(root,{audio:{stop(){},dispose(){}}});c.showDesktop(createVirtualPcState());
  c.openSystem('display');c.reset(createVirtualPcState());c.showDesktop(c.state);c.openSystem('display');
  assert.ok(findButton(root,'Применить'));findButton(root,'Пуск').click();assert.ok(findPc(root,'start-menu'));
});
test('clock refresh does not steal focus inside shutdown confirmation',()=>{
  const d=pcDocument(),root=d.createElement('section'),c=mountVirtualPc(root,{audio:{stop(){},dispose(){}}});c.showDesktop(createVirtualPcState());
  c.showShutdown();const cancel=findButton(root,'Отмена');cancel.focus();c.syncHost({playerName:'Игрок',clockLabel:'17:00'});
  assert.equal(d.activeElement,cancel);
});
test('modal viewport updates clamp windows without allowing a close command',()=>{
  const d=pcDocument(),root=d.createElement('section'),c=mountVirtualPc(root,{audio:{stop(){},dispose(){}}});c.showDesktop(createVirtualPcState());c.open('underweb');
  c.windowAction({type:'geometry',id:'underweb',rect:{x:700,y:50,width:560,height:420}});c.showShutdown();
  c.windowAction({type:'viewport',width:640,height:900});assert.equal(c.windows.viewport.width,640);assert.ok(c.windows.windows[0].rect.x<640);
  c.windowAction({type:'close',id:'underweb'});assert.equal(c.windows.windows.length,1);
});
