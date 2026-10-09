import test from 'node:test';
import assert from 'node:assert/strict';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createStudioProject} from '../src/ft-studio-project.js';
import {pcDocument,findButton,allPc} from './helpers/virtual-pc-dom.js';
const project=()=>createStudioProject({id:'song',name:'Бит',battleId:'concrete-echo'}).project;
function setup(persist=true){
  const d=pcDocument(),root=d.createElement('section');let stops=0,shutdowns=0;
  const controller=mountVirtualPc(root,{onPersist:()=>persist,onShutdown:()=>shutdowns++,audio:{stop(){stops++;},dispose(){},async play(){return {ok:true};}}});
  controller.showDesktop(createVirtualPcState({power:'on',download:{status:'installed'}}));
  return {d,root,controller,stops:()=>stops,shutdowns:()=>shutdowns};
}
test('switching preserves studio draft and audio',()=>{
  const s=setup(),c=s.controller;c.openProject(project());c.updateProject({...c.project,name:'Изменён'});
  const before=s.stops();c.open('underweb');
  assert.equal(c.windows.windows.length,2);assert.equal(c.windows.activeId,'underweb');
  assert.equal(c.confirmClose,false);assert.equal(c.project.name,'Изменён');assert.equal(c.dirty,true);assert.equal(s.stops(),before);
});
test('reopening studio focuses existing form',()=>{
  const {controller:c,root}=setup();c.open('ft-studio');
  const input=allPc(root).find(n=>n.getAttribute('aria-label')==='Название проекта');input.value='Не потеряй';
  c.open('underweb');c.open('ft-studio');
  assert.strictEqual(allPc(root).find(n=>n.getAttribute('aria-label')==='Название проекта'),input);
  assert.equal(input.value,'Не потеряй');
});
test('hidden dirty studio guards shutdown and failed save keeps host untouched',()=>{
  const s=setup(false),c=s.controller;c.openProject(project());c.updateProject({...c.project,name:'Черновик'});
  c.windowAction({type:'minimize',id:'ft-studio'});c.open('underweb');c.requestShutdown();
  assert.equal(c.confirmClose,true);assert.equal(c.windows.activeId,'ft-studio');
  findButton(s.root,'Сохранить').click();
  assert.equal(s.shutdowns(),0);assert.equal(c.confirmClose,true);
});
test('syncState retains torent controls and studio fader',()=>{
  const {controller:c,root}=setup();c.openProject(project());c.open('torent');
  const gain=allPc(root).find(n=>n.getAttribute('aria-label')==='Громкость kick');
  const content=c.shell.getContentRoot('torent');c.syncState({...c.state,lastGameMinute:850});
  assert.strictEqual(c.shell.getContentRoot('torent'),content);assert.equal(gain.isConnected,true);
});
test('shutdown clears windows but leave preserves them',()=>{
  const {controller:c}=setup();c.open('underweb');c.requestLeave();c.showDesktop(c.state);
  assert.equal(c.windows.windows.length,1);
  c.requestShutdown();assert.equal(c.windows.windows.length,0);
});
test('closing another app never asks about dirty studio',()=>{
  const {controller:c}=setup();c.openProject(project());c.updateProject({...c.project,name:'Редакция'});c.open('underweb');c.closeWindow();
  assert.equal(c.confirmClose,false);assert.equal(c.windows.activeId,'ft-studio');assert.equal(c.dirty,true);
});
