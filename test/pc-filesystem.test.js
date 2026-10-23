import test from 'node:test';
import assert from 'node:assert/strict';
import {createPcFolder,normalizePcFileSystem,pcFileEntries,savePcDocument,openPcDocument} from '../src/pc-filesystem.js';
import {createVirtualPcState,saveVirtualPcState,loadVirtualPcState} from '../src/virtual-pc-state.js';
import {creativeFixture} from './helpers/creative-fixtures.js';
import {softwareDiskBytes} from '../src/pc-software.js';
import {mountExplorer} from '../src/virtual-pc-explorer-view.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('nested user folders and a saved document survive a real game save without duplicate files or disk charge',()=>{
 let {state,projectId}=creativeFixture('lyrics');
 state=createPcFolder(state,{id:'folder-one',parentId:'documents',name:'Тексты',nowMinute:1}).state;
 state=createPcFolder(state,{id:'folder-two',parentId:'folder-one',name:'Отбор',nowMinute:1}).state;
 const r=savePcDocument(state,{projectId,folderId:'folder-two',filename:'Черновик.txt',nowMinute:2});assert.equal(r.ok,true);
 const before=softwareDiskBytes(r.state),s=storage();assert.equal(saveVirtualPcState(s,r.state),true);
 const loaded=loadVirtualPcState(s);assert.equal(loaded.ok,true);
 assert.deepEqual(pcFileEntries(loaded.state,{folderId:'folder-two',types:['txt']}).map(f=>f.filename),['Черновик.txt']);
 assert.equal(softwareDiskBytes(loaded.state).used,before.used);
 assert.equal(createVirtualPcState(loaded.state).fileSystem.files.length,1);
});
test('folder validation rejects unsafe names, duplicate siblings, reserved IDs and missing parents',()=>{
 const state=createPcFolder(createVirtualPcState(),{id:'a',parentId:'documents',name:'Папка',nowMinute:0}).state;
 for(const options of [{id:'b',parentId:'documents',name:'папка'},{id:'__proto__',parentId:'documents',name:'Другое'},{id:'c',parentId:'missing',name:'Тест'},{id:'d',parentId:'windows',name:'Тест'},{id:'e',parentId:'documents',name:'CON'},{id:'f',parentId:'documents',name:'..'}]){
  const result=createPcFolder(state,{...options,nowMinute:0});assert.equal(result.ok,false);assert.equal(result.state,state);
 }
 assert.equal(createPcFolder(state,{id:'b',parentId:'downloads',name:'Папка',nowMinute:0}).ok,true);
});
test('legacy projects migrate once and invalid cyclic folders retain recoverable source data',()=>{
 const {state}=creativeFixture('beat');delete state.fileSystem;
 const fs=normalizePcFileSystem(null,{projects:state.projects});assert.equal(fs.files.length,1);assert.equal(fs.files[0].filename,'Ночной район.flp');
 assert.equal(normalizePcFileSystem(fs,{projects:state.projects}).files.length,1);
 const damaged=normalizePcFileSystem({version:1,folders:[{id:'a',parentId:'b',name:'A'},{id:'b',parentId:'a',name:'B'}],files:[],recovery:[]});
 assert.equal(damaged.folders.length,0);assert.equal(damaged.recovery.length,2);
});
test('saving a collision never overwrites another file without explicit confirmation and opening preserves the saved snapshot',()=>{
 const {state,projectId}=creativeFixture('lyrics'),a=savePcDocument(state,{projectId,folderId:'documents',filename:'Текст.txt',nowMinute:1});
 assert.equal(a.ok,true);const modified={...a.state,projects:a.state.projects.map(p=>({...p,name:'Другое'}))};
 const collision=savePcDocument(modified,{projectId,folderId:'documents',filename:'текст.txt',nowMinute:2});assert.equal(collision.ok,false);
 const updated=savePcDocument(modified,{projectId,fileId:a.fileId,nowMinute:2});assert.equal(updated.ok,true);assert.equal(updated.state.fileSystem.files.length,1);
 const reopened=openPcDocument(a.state,{fileId:a.fileId,appId:'rap-notebook'});assert.equal(reopened.ok,true);assert.equal(reopened.state.projects.find(p=>p.id===reopened.projectId).name,'Ночной район');
 assert.equal(openPcDocument(a.state,{fileId:a.fileId,appId:'ft-studio'}).ok,false);
});
test('Explorer creates a folder through its context menu and opens that persisted folder',()=>{
 const d=pcDocument(),root=d.createElement('div');let state=createVirtualPcState(),menu;
 const view=mountExplorer(root,{onChange:next=>{state=next;return true;},onMenu:value=>{menu=value;},onProperties(){},onOpenProject(){},onClose(){}});
 view.update(state);view.navigate('documents');const area=allPc(root).find(n=>n.getAttribute?.('aria-label')==='Содержимое папки');
 fire(area,'contextmenu',{clientX:0,clientY:0});menu.items.find(i=>i.id==='new-folder').onSelect();
 const input=allPc(root).find(n=>n.getAttribute?.('aria-label')==='Имя новой папки');input.value='Мой отбор';findButton(root,'Создать папку').click();
 assert.equal(state.fileSystem.folders[0].name,'Мой отбор');fire(findButton(root,'Открыть папку Мой отбор'),'dblclick');
 assert.equal(allPc(root).find(n=>n.getAttribute?.('aria-label')==='Адрес папки').value,'C:\\Мои документы\\Мой отбор');view.dispose();
});
