import test from 'node:test';
import assert from 'node:assert/strict';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createStudioProject} from '../src/ft-studio-project.js';
import {pcDocument,findButton,allPc,fire} from './helpers/virtual-pc-dom.js';
const project=()=>createStudioProject({id:'song',name:'Архивная работа',battleId:'concrete-echo'}).project;
function setup(){
  const d=pcDocument(),root=d.createElement('section'),timers=new Map();let id=0,shutdowns=0;
  const controller=mountVirtualPc(root,{onShutdown:()=>shutdowns++,audio:{stop(){},dispose(){}},setTimeoutFn(fn){timers.set(++id,fn);return id;},clearTimeoutFn(id){timers.delete(id);}});
  controller.showDesktop(createVirtualPcState({power:'on',download:{status:'installed'},draft:project()}));
  return {d,root,controller,timers,shutdowns:()=>shutdowns,launch(){controller.open('ft-studio');for(const [id,fn] of [...timers]){timers.delete(id);fn();}}};
}
test('switching applications preserves the visual workspace and archived draft',()=>{
  const s=setup(),c=s.controller;s.launch();const draft=structuredClone(c.state.draft);
  const workspace=c.shell.getContentRoot('ft-studio').children[0];c.open('underweb');c.open('ft-studio');
  assert.equal(c.windows.windows.length,2);assert.equal(c.windows.activeId,'ft-studio');
  assert.equal(c.shell.getContentRoot('ft-studio').children[0],workspace);assert.deepEqual(c.state.draft,draft);
});
test('restoring minimized Studio preserves scroll and does not schedule a second launch',()=>{
  const s=setup(),c=s.controller;s.launch();const scroll=allPc(s.root).find(n=>n.className==='ft-playlist-scroll');scroll.scrollTop=130;
  c.windowAction({type:'minimize',id:'ft-studio'});c.open('underweb');c.open('ft-studio');
  assert.equal(c.windows.activeId,'ft-studio');assert.equal(scroll.scrollTop,130);assert.equal(s.timers.size,0);
  assert.equal(allPc(s.root).find(n=>n.className==='ft-playlist-scroll'),scroll);
});
test('clock reconciliation retains torent controls and the visual workspace',()=>{
  const s=setup(),c=s.controller;s.launch();c.open('torent');
  const workspace=c.shell.getContentRoot('ft-studio').children[0],content=c.shell.getContentRoot('torent');
  c.syncState({...c.state,lastGameMinute:850});
  assert.equal(c.shell.getContentRoot('torent'),content);assert.equal(c.shell.getContentRoot('ft-studio').children[0],workspace);
});
test('shutdown clears windows but leave preserves them and never discards the old draft',()=>{
  const s=setup(),c=s.controller;s.launch();c.open('underweb');const draft=structuredClone(c.state.draft);
  c.requestLeave();c.showDesktop(c.state);assert.equal(c.windows.windows.length,2);
  c.requestShutdown();assert.equal(s.shutdowns(),1);c.completeShutdown();assert.equal(c.windows.windows.length,0);
  assert.deepEqual(c.state.draft,draft);
});
test('closing another app leaves Studio intact and needs no music-save dialog',()=>{
  const s=setup(),c=s.controller;s.launch();c.open('underweb');c.closeWindow();
  assert.equal(c.windows.activeId,'ft-studio');assert.equal(findButton(s.root,'Сохранить'),undefined);
});
test('Explorer title and icon follow the current folder',()=>{
  const {controller:c,root}=setup();c.open('computer');c.openFolder('projects');
  const w=c.windows.windows.find(w=>w.id==='computer');assert.equal(w.title,'Мои проекты');
  const title=allPc(root).find(n=>n.dataset.pcRole==='titlebar'&&n.dataset.windowId==='computer');
  assert.ok(allPc(title).some(n=>n.tagName==='IMG'&&n.getAttribute('src').endsWith('/folder.svg')));
});
test('delayed Studio launch does not replace unfinished Underweb text',()=>{
  const s=setup(),c=s.controller;c.open('underweb');
  const address=allPc(c.shell.getContentRoot('underweb')).find(n=>n.tagName==='INPUT');address.value='Незавершённый ввод';
  s.launch();c.open('underweb');assert.equal(allPc(c.shell.getContentRoot('underweb')).find(n=>n.tagName==='INPUT'),address);
  assert.equal(address.value,'Незавершённый ввод');
});
test('shutdown cancellation retains the active app and restores focus',()=>{
  const s=setup(),c=s.controller;s.launch();c.open('underweb');
  const home=findButton(s.root,'Главная Underweb');home.focus();c.showShutdown();
  fire(s.root,'keydown',{key:'Escape'});assert.equal(c.shutdownModal,null);assert.equal(s.shutdowns(),0);
  assert.equal(c.windows.activeId,'underweb');assert.equal(s.d.activeElement,home);
});
test('shutdown dialog remains modal during viewport resizing',()=>{
  const s=setup(),c=s.controller;s.launch();c.showShutdown();const modal=c.shutdownModal;
  c.windowAction({type:'viewport',width:640,height:900});c.windowAction({type:'close',id:'ft-studio'});
  assert.equal(c.windows.viewport.width,640);assert.equal(c.shutdownModal,modal);assert.equal(c.windows.windows.length,1);
});
