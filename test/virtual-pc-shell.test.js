import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mountPcShell} from '../src/virtual-pc-shell.js?rev=23';
import {createWindowState,reduceWindows} from '../src/virtual-pc-window-state.js';
import {pcDocument,findPc,findButton,fire,allPc} from './helpers/virtual-pc-dom.js';
function setup(){
  const document=pcDocument(),root=document.createElement('section'),commands=[];
  const shell=mountPcShell(root,{onCommand:c=>commands.push(c)});
  const model={windows:reduceWindows(createWindowState({width:1280,height:720}),{type:'open',id:'underweb',appId:'underweb',title:'Underweb'}),
    apps:[{id:'computer',label:'Мой компьютер',iconId:'computer'}],iconPositions:{computer:{x:8,y:8}},wallpaper:'./assets/ui/virtual-pc/wallpaper-courtyard.png',metadata:{playerName:'MC',clockLabel:'12:00'},warning:''};
  shell.render(model);return {document,root,shell,commands,model};
}
test('render retains content and input nodes',()=>{
  const {document,shell,model}=setup(),content=shell.getContentRoot('underweb'),input=document.createElement('input');
  input.value='underweb://battles/yard-cipher';content.append(input);
  shell.render({...model,metadata:{playerName:'MC',clockLabel:'16:00'},windows:reduceWindows(model.windows,{type:'toggle-maximize',id:'underweb'})});
  assert.strictEqual(shell.getContentRoot('underweb'),content);assert.equal(input.value,'underweb://battles/yard-cipher');assert.equal(input.parentElement,content);
});
test('title controls emit window commands',()=>{
  const {root,commands}=setup();
  findButton(root,'Свернуть окно').click();
  assert.deepEqual(commands.at(-1),{type:'window',action:{type:'minimize',id:'underweb'}});
  findButton(root,'Закрыть окно').click();
  assert.equal(commands.at(-1).action.type,'close');
});
test('one click selects double click opens',()=>{
  const {root,commands}=setup(),icon=findPc(root,'desktop-icon');
  icon.click();assert.equal(commands.length,0);assert.equal(icon.getAttribute('aria-pressed'),'true');
  fire(icon,'dblclick');assert.deepEqual(commands.at(-1),{type:'open-app',appId:'computer'});
});
test('pointer cancellation suppresses click and releases drag',()=>{
  const {root,commands}=setup(),icon=findPc(root,'desktop-icon');
  fire(icon,'pointerdown',{button:0,pointerId:1,clientX:10,clientY:10});
  fire(icon,'pointermove',{pointerId:1,clientX:80,clientY:80});
  fire(icon,'pointercancel',{pointerId:1});fire(icon,'dblclick');
  assert.equal(commands.some(c=>c.type==='open-app'),false);
});
test('dispose removes gesture listeners',()=>{
  const {root,shell,commands}=setup(),icon=findPc(root,'desktop-icon');shell.dispose();
  fire(icon,'dblclick');assert.equal(commands.length,0);
});
test('desktop icons resolve real local SVG artwork',async()=>{
  const {root}=setup();const imgs=allPc(root).filter(n=>n.tagName==='IMG');
  assert.ok(imgs.length>=5);
  for(const img of imgs){const svg=await readFile(new URL('../'+img.getAttribute('src').replace('./',''),import.meta.url),'utf8');assert.match(svg,/<svg[^>]+viewBox=/);}
});
test('closing or disposing a dragging frame releases pointer capture',()=>{
  for(const action of ['close','dispose']){
    const {root,shell,model}=setup(),title=findPc(root,'titlebar','underweb');let captured=null;
    title.setPointerCapture=id=>{captured=id;};title.hasPointerCapture=id=>captured===id;title.releasePointerCapture=()=>{captured=null;};
    fire(title,'pointerdown',{button:0,pointerId:7,clientX:10,clientY:10});
    assert.equal(captured,7);
    if(action==='close')shell.render({...model,windows:reduceWindows(model.windows,{type:'close',id:'underweb'})});else shell.dispose();
    assert.equal(captured,null);
  }
});
test('XP base controls explicitly reset apartment button shadows',async()=>{
  const css=await readFile(new URL('../virtual-pc.css',import.meta.url),'utf8');
  assert.match(css,/#virtual-pc button\s*\{[^}]*box-shadow:\s*none/);
});
test('clicking icon artwork focuses it for immediate Enter',()=>{
  const {root,document,commands}=setup(),icon=findPc(root,'desktop-icon');
  fire(icon,'pointerdown',{button:0,pointerId:1,clientX:15,clientY:15,target:icon});
  fire(icon,'pointerup',{pointerId:1});icon.click();assert.equal(document.activeElement===icon,true);
  fire(icon,'keydown',{key:'Enter'});assert.equal(commands.at(-1).type,'open-app');
});
test('ResizeObserver still reports viewport changes while a modal is open',()=>{
  const document=pcDocument();let resize;
  document.defaultView={ResizeObserver:class{constructor(cb){resize=cb;}observe(){}disconnect(){}}};
  const root=document.createElement('section'),commands=[],shell=mountPcShell(root,{onCommand:c=>commands.push(c)});
  shell.render({windows:createWindowState({width:1280,height:720}),apps:[],iconPositions:{},wallpaper:'',metadata:{clockLabel:'12:00'},warning:''});
  shell.setModal(document.createElement('aside'));root.getBoundingClientRect=()=>({width:640,height:900});resize();
  assert.ok(commands.some(c=>c.type==='window'&&c.action.type==='viewport'&&c.action.width===640));
});
test('desktop icon label participates in the same drag gesture as its artwork',()=>{
  const {root,commands}=setup(),icon=findPc(root,'desktop-icon'),label=icon.children[1];
  fire(icon,'pointerdown',{button:0,pointerId:2,clientX:15,clientY:60,target:label});
  fire(icon,'pointermove',{pointerId:2,clientX:155,clientY:160});fire(icon,'pointerup',{pointerId:2});
  assert.ok(commands.some(c=>c.type==='move-icon'));
});
