import test from 'node:test';
import assert from 'node:assert/strict';
import {mountPcFilePicker} from '../src/pc-file-picker-view.js';
import {savePcDocument} from '../src/pc-filesystem.js';
import {creativeFixture} from './helpers/creative-fixtures.js';
import {pcDocument,findButton,allPc,fire} from './helpers/virtual-pc-dom.js';
import {pcFocusable} from '../src/virtual-pc-dom.js';
test('one picker filters files, navigates folders and returns a stable file ID only on explicit open',()=>{
 const {state,projectId}=creativeFixture('lyrics'),saved=savePcDocument(state,{projectId,folderId:'downloads',filename:'Правки.txt',nowMinute:1});
 const d=pcDocument(),root=d.createElement('div');let selected=null;
 const picker=mountPcFilePicker(root,{getState:()=>saved.state,mode:'open',types:['txt'],initialFolderId:'downloads',onSelect:id=>{selected=id;return {ok:true};},onCancel(){}});
 findButton(root,'Выбрать: Правки.txt').click();assert.equal(selected,null);findButton(root,'Открыть').click();assert.equal(selected,saved.fileId);picker.dispose();
 const empty=mountPcFilePicker(root,{getState:()=>saved.state,mode:'attach',types:['flp'],initialFolderId:'downloads',onSelect(){throw Error('wrong type');},onCancel(){}});
 assert.equal(allPc(root).some(n=>n.textContent==='Выбрать: Правки.txt'),false);assert.equal(findButton(root,'Прикрепить').disabled,true);empty.dispose();
});

test('selected file details join the keyboard cycle and empty details stay out',()=>{
 const f=creativeFixture('lyrics'),saved=savePcDocument(f.state,{projectId:f.projectId,folderId:'documents',filename:'Длинное имя.txt',nowMinute:1}),d=pcDocument(),root=d.createElement('div');
 const picker=mountPcFilePicker(root,{getState:()=>saved.state,mode:'open',types:['txt'],onSelect(){}}),details=allPc(root).find(n=>n.className==='pc-picker-details');
 assert.equal(pcFocusable(root).includes(details),false);findButton(root,'Выбрать: Длинное имя.txt').click();assert.equal(pcFocusable(root).includes(details),true);picker.dispose();
});
test('save-as asks before replacing an existing file and preserves input across host ticks',()=>{
 const {state,projectId}=creativeFixture('lyrics'),saved=savePcDocument(state,{projectId,folderId:'documents',filename:'Мой.txt',nowMinute:1});
 const d=pcDocument(),root=d.createElement('div');let target=null;
 const picker=mountPcFilePicker(root,{getState:()=>saved.state,mode:'save',types:['txt'],suggestedName:'Мой.txt',onSelect:value=>{target=value;},onCancel(){}});
 const input=allPc(root).find(n=>n.getAttribute?.('aria-label')==='Имя файла');input.focus();picker.update();assert.equal(d.activeElement,input);
 findButton(root,'Сохранить').click();assert.equal(target,null);findButton(root,'Заменить файл').click();assert.equal(target.overwriteFileId,saved.fileId);
 picker.dispose();
});
