import test from 'node:test';
import assert from 'node:assert/strict';
import {mountRapNotebook} from '../src/rap-notebook-view.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createLyric} from '../src/lyric-production.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
function setup(skill=10,seed){const d=pcDocument(),root=d.createElement('main');let state=seed??createVirtualPcState(),works=0,accepted=true;const view=mountRapNotebook(root,{getState:()=>state,getMetadata:()=>({gameDay:1,gameMinutes:10,skills:{writing:skill}}),onChange:n=>{if(!accepted)return false;state=n;return true;},onCommit:n=>{if(!accepted)return false;state=n;return true;},onWork:()=>{works++;return true;}});return {d,root,view,get state(){return state;},set state(s){state=s;},get works(){return works;},set accepted(x){accepted=x;}};}
const field=(root,label)=>allPc(root).find(n=>n.getAttribute?.('aria-label')===label);
test('a novice starts work with Create, while skill 25 keeps the decision stage',()=>{
 for(const [skill,want]of [[0,1],[24.99,1],[25,0]]){const f=setup(skill);findButton(f.root,'Новый текст').click();field(f.root,'Название текста').value='Первый';findButton(f.root,'Создать текст').click();assert.equal(f.works,want);assert.equal(Boolean(f.state.writing.job),Boolean(want));f.view.dispose();}
});
test('battle selection locks the topic name and ignores edited input at submission',()=>{
 const f=setup(25);findButton(f.root,'Новый текст').click();const select=field(f.root,'Для чего пишем текст');select.value='makarevich-1';fire(select,'change');const name=field(f.root,'Название текста');
 assert.equal(name.readOnly,true);assert.equal(name.value,'Не переключай');assert.equal(findButton(f.root,'Случайное название').disabled,true);
 name.value='Обман';findButton(f.root,'Создать текст').click();assert.equal(f.state.projects[0].name,'Не переключай');
 findButton(f.root,'Новый текст').click();const next=field(f.root,'Для чего пишем текст');next.value='makarevich-1';fire(next,'change');findButton(f.root,'Создать текст').click();assert.equal(f.state.projects[1].name,'Не переключай (1)');f.view.dispose();
});
test('the first Save selects a virtual TXT path and subsequent Save updates that same file',()=>{
 const seed=createLyric(createVirtualPcState(),{id:'text-a',name:'Мысль'}).state,f=setup(10,seed);
 findButton(f.root,'Сохранить').click();let box=field(f.root,'Сохранить как');assert.ok(box);
 field(box,'Имя файла').value='Мой текст.txt';const folder=field(box,'Папка файла');folder.value='downloads';fire(folder,'change');findButton(box,'Сохранить').click();
 assert.equal(f.state.fileSystem.files.length,1);assert.equal(f.state.fileSystem.files[0].filename,'Мой текст.txt');assert.equal(f.state.fileSystem.files[0].folderId,'downloads');
 const id=f.state.fileSystem.files[0].id;f.state={...f.state,projects:f.state.projects.map(p=>({...p,name:'Новая мысль'}))};f.view.update();findButton(f.root,'Сохранить').click();
 assert.equal(f.state.fileSystem.files.length,1);assert.equal(f.state.fileSystem.files[0].id,id);assert.equal(f.state.fileSystem.files[0].snapshot.name,'Новая мысль');assert.equal(field(f.root,'Сохранить как'),undefined);f.view.dispose();
});
test('a failed file commit keeps the picker and leaves no saved file',()=>{
 const f=setup(10,createLyric(createVirtualPcState(),{id:'text-a',name:'Мысль'}).state);f.accepted=false;findButton(f.root,'Сохранить').click();const box=field(f.root,'Сохранить как');assert.ok(box);findButton(box,'Сохранить').click();
 assert.equal(f.state.fileSystem.files.length,0);assert.ok(field(f.root,'Сохранить как'));assert.ok(allPc(box).some(n=>/Не удалось сохранить/.test(n.textContent)));f.view.dispose();
});
