import test from 'node:test';
import assert from 'node:assert/strict';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
import {createVirtualPcState,applyToBattle} from '../src/virtual-pc-state.js';
import {createLyric,startLyricWork,advanceLyricWork} from '../src/lyric-production.js';
import {createBeat,startBeatStage,advanceBeatWork} from '../src/beat-production.js';
import * as view from '../src/rap-notebook-view.js';
import {pcFocusable} from '../src/virtual-pc-dom.js';
import {savePcDocument} from '../src/pc-filesystem.js';
function fixture(seed){const d=pcDocument(),root=d.createElement('main');let s=createVirtualPcState(seed),works=0;const mounted=view.mountRapNotebook(root,{getState:()=>s,getMetadata:()=>({gameDay:1,skills:{writing:10}}),onChange:n=>s=createVirtualPcState(n),onWork:()=>{works++;return true;}});return {root,mounted,get state(){return s;},set state(n){s=n;},get works(){return works;}};}
function readyState(){let s=createLyric(createVirtualPcState(),{id:'ready',name:'Готовый текст'}).state;for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=advanceLyricWork(startLyricWork(s,{projectId:'ready'},{writing:10},()=>.4).state,1000).state;}s.music.needs={satiety:100,energy:100};return s;}
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
 assert.equal(findButton(f.root,'Начать писать'),undefined);assert.equal(f.works,1);assert.equal(f.state.writing.job.kind,'stage');
 f.state=advanceLyricWork(f.state,1000).state;f.mounted.update();
 assert.ok(allPc(f.root).some(n=>n.className==='rn-word rn-error'));assert.ok(allPc(f.root).some(n=>n.dataset.lyricRole==='document'));
});
test('host redraw preserves an unfinished text title and failed work transition rolls back its job',()=>{
 const f=fixture();fire(findButton(f.root,'Новый текст'),'click');const input=allPc(f.root).find(n=>n.getAttribute('aria-label')==='Название текста');input.value='Не терять';f.mounted.update();assert.equal(input.value,'Не терять');
 const d=pcDocument(),root=d.createElement('main');let s=createLyric(createVirtualPcState(),{id:'x',name:'x'}).state;
 const mounted=view.mountRapNotebook(root,{getState:()=>s,getMetadata:()=>({skills:{writing:10}}),onChange:n=>s=n,onWork:()=>false});
 fire(findButton(root,'Начать писать'),'click');assert.equal(s.writing.job,null);mounted.dispose();
});

test('text dialogs focus and trap controls, keep background inert, and restore focus on Escape',()=>{
 const seed=createLyric(createVirtualPcState(),{id:'draft',name:'Черновик'}).state,f=fixture(seed),d=f.root.ownerDocument;
 findButton(f.root,'Новый текст').focus();fire(findButton(f.root,'Новый текст'),'click');
 const cover=allPc(f.root).find(n=>n.className==='rn-cover'),items=pcFocusable(cover);
 assert.equal(d.activeElement,items[0]);assert.ok(!pcFocusable(f.root).includes(findButton(f.root,'Начать писать')));
 items.at(-1).focus();fire(cover,'keydown',{key:'Tab'});assert.equal(d.activeElement,items[0]);
 fire(cover,'keydown',{key:'Tab',shiftKey:true});assert.equal(d.activeElement,items.at(-1));
 fire(cover,'keydown',{key:'Escape'});assert.ok(!allPc(f.root).some(n=>n.className==='rn-cover'));
 assert.equal(d.activeElement,findButton(f.root,'Новый текст'));assert.equal(f.works,0);
 assert.ok(pcFocusable(f.root).includes(findButton(f.root,'Начать писать')));
});

test('novice draft renders flowing prose without notes or verse headings',()=>{
 let s=createLyric(createVirtualPcState({music:{needs:{satiety:100,energy:100}}}),{id:'raw',name:'Спальный район'},{writing:10},()=>.37).state;
 s=startLyricWork(s,{projectId:'raw'},{writing:10},()=>.5).state;s=advanceLyricWork(s,1000).state;
 const f=fixture(s),nodes=allPc(f.root);
 assert.ok(!nodes.some(n=>n.className==='rn-note'));
 assert.ok(!nodes.some(n=>n.tagName==='H2'&&/Куплет|Припев/.test(n.textContent)));
 assert.ok(nodes.some(n=>n.className==='rn-prose'),'novice words flow in a paragraph');
});

test('empty notebook keeps New and Open available and cannot save an absent document',()=>{
 const f=fixture(),toolbar=allPc(f.root).find(n=>n.className==='rn-toolbar');
 assert.deepEqual(allPc(toolbar).filter(n=>n.tagName==='BUTTON').map(n=>n.textContent),['Новый','Открыть','Сохранить','Сохранить как']);
 assert.equal(findButton(f.root,'Сохранить').disabled,true);
});

test('Save reports a rejected file commit and retries the same selected destination',()=>{
 const d=pcDocument(),root=d.createElement('main');let s=createLyric(createVirtualPcState(),{id:'save',name:'Сохрани мысль'}).state,accepted=false,calls=0;
 const mounted=view.mountRapNotebook(root,{getState:()=>s,onChange:next=>{calls++;if(!accepted)return false;s=next;return true;}});
 findButton(root,'Сохранить').click();let picker=allPc(root).find(n=>n.className==='pc-file-picker');findButton(picker,'Сохранить').click();
 assert.equal(calls,1);assert.equal(s.fileSystem.files.length,0);assert.ok(allPc(picker).some(n=>/Не удалось сохранить файл/.test(n.textContent)));
 accepted=true;findButton(picker,'Сохранить').click();assert.equal(calls,2);assert.equal(s.fileSystem.files[0].snapshot.name,'Сохрани мысль');
 assert.ok(allPc(root).some(n=>n.textContent==='Файл сохранён'));mounted.dispose();
});

test('automatic game saves leave a modified TXT dirty and preserve its previous file snapshot',()=>{
 const d=pcDocument(),root=d.createElement('main');let s=createLyric(createVirtualPcState(),{id:'auto',name:'Автосохранение'}).state;
 s=savePcDocument(s,{projectId:'auto',folderId:'documents',filename:'Текст.txt',nowMinute:0}).state;
 const mounted=view.mountRapNotebook(root,{getState:()=>s,onChange:next=>{s=next;return true;}});
 s={...s,projects:s.projects.map(p=>({...p,name:'Несохранённое изменение'}))};mounted.openProject(s.projects[0]);
 assert.ok(allPc(root).some(n=>n.textContent==='Черновик не сохранён в файл'));assert.equal(s.fileSystem.files[0].snapshot.name,'Автосохранение');mounted.dispose();
});

test('ready document keeps compact refinement actions and saves a TXT through the file picker',()=>{
 const f=fixture(readyState()),actions=allPc(f.root).find(n=>n.className==='rn-actions');
 assert.ok(actions?.contains(findButton(f.root,'Доработать')));assert.ok(actions.contains(findButton(f.root,'Адаптировать под бит')));
 assert.ok(findButton(f.root,'Добавить'));assert.equal(findButton(f.root,'Экспорт текста'),undefined);
 findButton(f.root,'Сохранить').click();findButton(allPc(f.root).find(n=>n.className==='pc-file-picker'),'Сохранить').click();
 assert.equal(f.state.fileSystem.files.at(-1).type,'txt');assert.equal(f.state.fileSystem.files.at(-1).snapshot.id,'ready');
});

test('ready actions update their busy state when another studio job starts or stops',()=>{
 const f=fixture(readyState());
 for(const owner of ['music','recording']){
  f.state={...f.state,[owner]:{...f.state[owner],job:{projectId:'another'}}};f.mounted.update();
  for(const name of ['Доработать','Адаптировать под бит','Добавить'])assert.equal(findButton(f.root,name).disabled,true,name+' is blocked by '+owner);
  f.state={...f.state,[owner]:{...f.state[owner],job:null}};f.mounted.update();
  assert.equal(findButton(f.root,'Адаптировать под бит').disabled,false);
 }
});

test('closing the beat picker returns focus to the relocated adaptation action',()=>{
 const f=fixture(readyState());findButton(f.root,'Адаптировать под бит').focus();fire(findButton(f.root,'Адаптировать под бит'),'click');
 const cover=allPc(f.root).find(n=>n.className==='rn-cover');fire(cover,'keydown',{key:'Escape'});
 assert.ok(f.root.ownerDocument.activeElement===findButton(f.root,'Адаптировать под бит'),'focus returns to the adaptation button');
});

test('opening, refinement and beat adaptation still run the real persisted project workflow',()=>{
 let s=readyState();s=createBeat(s,{id:'beat',name:'Ритм'},undefined,()=>.4).state;
 for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=advanceBeatWork(startBeatStage(s,'beat',undefined,undefined,()=>.4).state,1000).state;}
 s.music.needs={satiety:100,energy:100};s=createLyric(s,{id:'other',name:'Другой текст'}).state;
 s=savePcDocument(s,{projectId:'ready',folderId:'downloads',filename:'Готовый текст.txt',nowMinute:1}).state;
 const f=fixture(s);fire(findButton(f.root,'Открыть текст'),'click');
 const picker=allPc(f.root).find(n=>n.className==='pc-file-picker');findButton(picker,'Выбрать: Готовый текст.txt').click();findButton(picker,'Открыть').click();assert.equal(f.state.writing.activeTextId,'ready');
 fire(findButton(f.root,'Доработать'),'click');assert.equal(f.state.writing.job.kind,'refine');assert.equal(f.works,1);
 f.state=advanceLyricWork(f.state,1000).state;f.state.music.needs={satiety:100,energy:100};f.mounted.update();
 fire(findButton(f.root,'Адаптировать под бит'),'click');fire(allPc(f.root).find(n=>n.dataset.projectId==='beat'),'click');
 assert.equal(f.state.writing.job.kind,'adapt');assert.equal(f.works,2);
 f.state=createVirtualPcState(JSON.parse(JSON.stringify(advanceLyricWork(f.state,1000).state)));f.mounted.update();
 assert.equal(f.state.projects.find(p=>p.id==='ready').adaptation.beatId,'beat');
 assert.equal(f.state.projects.find(p=>p.id==='ready').refinementCount,1);
 assert.equal(f.state.projects.find(p=>p.id==='ready').adaptationCount,1);
});
