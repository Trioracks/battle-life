import test from 'node:test';
import assert from 'node:assert/strict';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createLyric,startLyricWork,advanceLyricWork} from '../src/lyric-production.js';
import {mountRapNotebook} from '../src/rap-notebook-view.js';
const picker=await import('../src/project-picker-view.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});

test('picker filters twenty compact beat rows by name and groups latest dated projects first',()=>{
 assert.equal(typeof picker.mountProjectPicker,'function');const d=pcDocument(),root=d.createElement('div'),items=Array.from({length:20},(_,i)=>({id:'b'+i,name:i===13?'Нужный двор':'Бит '+i,updatedDay:i+1,updatedDate:String(i+1).padStart(2,'0')+'.09.2012',bpm:90,status:'ready'}));let chosen,cancelled=0;
 const view=picker.mountProjectPicker(root,{items,onSelect:p=>chosen=p.id,onCancel:()=>cancelled++}),search=allPc(root).find(n=>n.getAttribute('aria-label')==='Поиск проектов');
 assert.ok(search);assert.equal(allPc(root).filter(n=>n.dataset.projectId).length,20);
 assert.equal(allPc(root).find(n=>n.dataset.projectId).dataset.projectId,'b19');
 search.value='НУЖНЫЙ';fire(search,'input');const rows=allPc(root).filter(n=>n.dataset.projectId);assert.equal(rows.length,1);assert.match(rows[0].textContent,/14\.09\.2012.*90 BPM.*готов/);
 fire(rows[0],'click');assert.equal(chosen,'b13');fire(findButton(root,'Отмена'),'click');assert.equal(cancelled,1);
 search.value='ничего';fire(search,'input');assert.ok(allPc(root).some(n=>n.textContent==='Проекты не найдены.'));view.dispose();
});
test('notebook offers bounded refinement and preserves an adaptation search during background updates',()=>{
 let s=createLyric(createVirtualPcState(),{id:'t',name:'Текст'},{writing:10},()=>.3).state;
 for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=advanceLyricWork(startLyricWork(s,{projectId:'t'},{writing:10},()=>.5).state,180).state;}
 const d=pcDocument(),root=d.createElement('div'),view=mountRapNotebook(root,{getState:()=>s,getMetadata:()=>({skills:{writing:60},gameDay:2}),onChange:n=>s=n,onWork:()=>true});
 assert.ok(findButton(root,'Доработать'));assert.ok(!findButton(root,'Новая содержательная версия'));
 fire(findButton(root,'Адаптировать под бит'),'click');const search=allPc(root).find(n=>n.getAttribute('aria-label')==='Поиск проектов');assert.ok(search);search.value='Район';fire(search,'input');
 s={...s,projects:[...s.projects],music:{...s.music,needs:{satiety:90,energy:90}}};view.update();assert.equal(allPc(root).find(n=>n.getAttribute('aria-label')==='Поиск проектов'),search);assert.equal(search.value,'Район');view.dispose();
});
test('picker groups each known battle once, keeps unknown beats outside battle, and filters/sorts dates',()=>{
 const d=pcDocument(),root=d.createElement('div'),items=[{id:'old-free',name:'Старый',createdDay:1},{id:'a2',name:'Средний',createdDay:2,battleId:'a',battleName:'Баттл A'},{id:'new-free',name:'Новый',createdDay:4,currentAdaptation:true},{id:'a5',name:'Свежий',createdDay:5,battleId:'a',battleName:'Баттл A'}];
 picker.mountProjectPicker(root,{items});const rows=()=>allPc(root).filter(n=>n.dataset.projectId),groups=()=>allPc(root).filter(n=>n.className==='project-picker-group');
 assert.deepEqual(groups().map(n=>n.textContent),['Баттл A','Вне баттла']);assert.deepEqual(rows().map(n=>n.dataset.projectId),['a5','a2','new-free','old-free']);assert.match(rows()[2].textContent,/текущая адаптация/);
 const group=allPc(root).find(n=>n.getAttribute('aria-label')==='Баттл проектов');group.value='free';fire(group,'change');assert.deepEqual(rows().map(n=>n.dataset.projectId),['new-free','old-free']);
 const order=allPc(root).find(n=>n.getAttribute('aria-label')==='Порядок по дате');order.value='oldest';fire(order,'change');assert.deepEqual(rows().map(n=>n.dataset.projectId),['old-free','new-free']);
});
