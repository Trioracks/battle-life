import test from 'node:test';
import assert from 'node:assert/strict';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
import {createVirtualPcState,applyToBattle} from '../src/virtual-pc-state.js';
import {createLyric,startLyricWork,advanceLyricWork} from '../src/lyric-production.js';
import * as view from '../src/rap-notebook-view.js';
import {pcFocusable} from '../src/virtual-pc-dom.js';
function fixture(seed){const d=pcDocument(),root=d.createElement('main');let s=createVirtualPcState(seed),works=0;const mounted=view.mountRapNotebook(root,{getState:()=>s,getMetadata:()=>({gameDay:1,skills:{writing:10}}),onChange:n=>s=createVirtualPcState(n),onWork:()=>{works++;return true;}});return {root,mounted,get state(){return s;},set state(n){s=n;},get works(){return works;}};}
test('new text hides registered option until a battle application exists',()=>{
 assert.equal(typeof view.mountRapNotebook,'function');
 const f=fixture();fire(findButton(f.root,'Новый текст'),'click');
 assert.ok(!allPc(f.root).some(n=>n.textContent==='Баттлы, где ты зарегистрирован'));
 f.state=applyToBattle(f.state,'concrete-echo','Игрок');f.mounted.update();fire(findButton(f.root,'Новый текст'),'click');
 assert.ok(allPc(f.root).some(n=>n.textContent==='Баттлы, где ты зарегистрирован'));
});
test('beginner creates text without sliders and starts actual writing work',()=>{
 const f=fixture({music:{needs:{satiety:100,energy:100}}});fire(findButton(f.root,'Новый текст'),'click');
 const title=allPc(f.root).find(n=>n.getAttribute('aria-label')==='Название текста');title.value='Первые строки';fire(findButton(f.root,'Создать текст'),'click');
 assert.equal(f.state.projects[0].name,'Первые строки');assert.ok(!allPc(f.root).some(n=>n.type==='range'));
 fire(findButton(f.root,'Начать работу'),'click');assert.equal(f.works,1);assert.equal(f.state.writing.job.kind,'stage');
 f.state=advanceLyricWork(f.state,1000).state;f.mounted.update();
 assert.ok(allPc(f.root).some(n=>n.className==='rn-word rn-error'));assert.ok(allPc(f.root).some(n=>n.dataset.lyricRole==='document'));
});
test('host redraw preserves an unfinished text title and failed work transition rolls back its job',()=>{
 const f=fixture();fire(findButton(f.root,'Новый текст'),'click');const input=allPc(f.root).find(n=>n.getAttribute('aria-label')==='Название текста');input.value='Не терять';f.mounted.update();assert.equal(input.value,'Не терять');
 const d=pcDocument(),root=d.createElement('main');let s=createLyric(createVirtualPcState(),{id:'x',name:'x'}).state;
 const mounted=view.mountRapNotebook(root,{getState:()=>s,getMetadata:()=>({skills:{writing:10}}),onChange:n=>s=n,onWork:()=>false});
 fire(findButton(root,'Начать работу'),'click');assert.equal(s.writing.job,null);mounted.dispose();
});

test('text dialogs focus and trap controls, keep background inert, and restore focus on Escape',()=>{
 const seed=createLyric(createVirtualPcState(),{id:'draft',name:'Черновик'}).state,f=fixture(seed),d=f.root.ownerDocument;
 findButton(f.root,'Новый текст').focus();fire(findButton(f.root,'Новый текст'),'click');
 const cover=allPc(f.root).find(n=>n.className==='rn-cover'),items=pcFocusable(cover);
 assert.equal(d.activeElement,items[0]);assert.ok(!pcFocusable(f.root).includes(findButton(f.root,'Начать работу')));
 items.at(-1).focus();fire(cover,'keydown',{key:'Tab'});assert.equal(d.activeElement,items[0]);
 fire(cover,'keydown',{key:'Tab',shiftKey:true});assert.equal(d.activeElement,items.at(-1));
 fire(cover,'keydown',{key:'Escape'});assert.ok(!allPc(f.root).some(n=>n.className==='rn-cover'));
 assert.equal(d.activeElement,findButton(f.root,'Новый текст'));assert.equal(f.works,0);
 assert.ok(pcFocusable(f.root).includes(findButton(f.root,'Начать работу')));
});

test('raw draft renders margin notes but never labels itself a completed verse',()=>{
 let s=createLyric(createVirtualPcState({music:{needs:{satiety:100,energy:100}}}),{id:'raw',name:'Спальный район'},{writing:10},()=>.37).state;
 s=startLyricWork(s,{projectId:'raw'},{writing:10},()=>.5).state;s=advanceLyricWork(s,1000).state;
 const f=fixture(s),nodes=allPc(f.root);
 assert.ok(nodes.some(n=>n.className==='rn-note'&&/рифму|панч|сравнение|бит|размерность/.test(n.textContent)));
 assert.ok(!nodes.some(n=>n.tagName==='H2'&&/Куплет|Припев/.test(n.textContent)));
 assert.ok(nodes.some(n=>n.className==='rn-line-body'),'line text and notes share a column outside the gutter');
});
