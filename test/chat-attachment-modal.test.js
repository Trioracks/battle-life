import test from 'node:test';
import assert from 'node:assert/strict';
import {mountGoblinDialog} from '../src/goblin-dialog-view.js';
import {mountSocialDialog} from '../src/social-dialog-view.js';
import {advanceGoblin} from '../src/goblin-mentor.js';
import {exportLyricFile} from '../src/goblin-exchange.js';
import {GOBLIN_ID} from '../src/goblin-catalog.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {exportedSubmissionFixture} from './helpers/submission-fixtures.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
import {pcFocusable} from '../src/virtual-pc-dom.js';

// Model only the native dialog boundary; geometry and browser inertness are QA.
function modalDocument(){
 const d=pcDocument(),create=d.createElement;
 d.createElement=tag=>{const n=create(tag);if(tag==='dialog'){n.open=false;n.showModal=()=>{n.open=true;};n.close=()=>{n.open=false;};}return n;};return d;
}
function fixture(kind,{persist=true}={}){
 const d=modalDocument();let state=ensureBattleWindow(exportedSubmissionFixture(),{battleId:'makarevich-1',nowMinute:600}).state;
 if(kind==='goblin'){state=advanceGoblin(state,0).state;state.social.goblin.stage='text';state=exportLyricFile(state,'lyrics',600).state;}
 const options={getState:()=>state,getMetadata:()=>({gameMinutes:601,playerName:'Герой'}),navigate(){},audio:{row:()=>d.createElement('div'),releaseRows(){}},commit:r=>{if(!persist||!r.ok)return false;state=r.state;return true;}},view=kind==='goblin'?mountGoblinDialog(d,options):mountSocialDialog(d,{...options,id:'makarevich-1'}),host=d.createElement('main');host.append(view.root);
 return {d,view,get state(){return state;}};
}
const pickerIn=root=>allPc(root).find(n=>n.className?.split(' ').includes('pc-file-picker'));
const modalIn=root=>allPc(root).find(n=>n.tagName==='DIALOG');

for(const kind of ['goblin','community']){
 test(kind+' attachment opens outside the composer and Escape restores the chat focus and inert state',()=>{
  const f=fixture(kind),root=f.view.root,footer=allPc(root).find(n=>n.className==='sn-dialog-footer'),attach=findButton(root,'Прикрепить'),heading=root.children[0];heading.inert=true;attach.focus();attach.click();
  const modal=modalIn(root);assert.ok(modal,'attachment must use a separate top-layer dialog');assert.equal(modal.open,true);assert.equal(modal.parentElement,root);assert.equal(footer.contains(modal),false);
  for(const child of root.children)if(child!==modal)assert.equal(child.inert,true);
  const picker=pickerIn(modal);for(const label of ['Папка файла','Адрес папки файла','Поиск файлов','Дерево папок','Содержимое папки'])assert.ok(allPc(picker).some(n=>n.getAttribute('aria-label')===label),label);
  const folder=allPc(picker).find(n=>n.getAttribute('aria-label')==='Папка файла'),cancel=findButton(picker,'Отмена');assert.equal(f.d.activeElement,folder);cancel.focus();const tab=fire(picker,'keydown',{key:'Tab'});assert.equal(tab.defaultPrevented,true);assert.equal(f.d.activeElement,pcFocusable(picker)[0]);
  const escape=fire(picker,'keydown',{key:'Escape'});assert.equal(escape.defaultPrevented,true);assert.equal(modal.open,false);assert.equal(pickerIn(root),undefined);assert.equal(f.d.activeElement,attach);assert.equal(heading.inert,true);assert.equal(root.children[1].inert,undefined);f.view.dispose();
 });
 test(kind+' native cancellation and disposal close the attachment without leaving the chat inert',()=>{
  const f=fixture(kind),root=f.view.root,attach=findButton(root,'Прикрепить');attach.click();const modal=modalIn(root);assert.ok(modal,'attachment must use a separate top-layer dialog');
  const cancel=fire(modal,'cancel');assert.equal(cancel.defaultPrevented,true);assert.equal(modal.open,false);assert.equal(f.d.activeElement,attach);attach.click();assert.equal(modal.open,true);const grid=root.children[1];assert.equal(grid.inert,true);f.view.dispose();assert.equal(modal.open,false);assert.equal(grid.inert,undefined);assert.equal(root.children.length,0);
 });
 test(kind+' failed attachment persistence keeps the selected file and modal available for retry',()=>{
  const f=fixture(kind,{persist:false}),before=JSON.stringify(f.state);findButton(f.view.root,'Прикрепить').click();const modal=modalIn(f.view.root);assert.ok(modal,'attachment must use a separate top-layer dialog');const picker=pickerIn(modal),row=allPc(picker).find(n=>n.dataset.fileId);assert.ok(row);row.click();findButton(picker,'Прикрепить').click();
  assert.equal(modal.open,true);assert.equal(row.getAttribute('aria-pressed'),'true');assert.equal(JSON.stringify(f.state),before);assert.ok(allPc(picker).some(n=>/не удалось|не сохранено/i.test(n.textContent??'')));f.view.dispose();
 });
}

test('Goblin attachment closes the modal before focusing the durable unsent draft',()=>{
 const f=fixture('goblin');findButton(f.view.root,'Прикрепить').click();const modal=modalIn(f.view.root);assert.ok(modal,'attachment must use a separate top-layer dialog');const picker=pickerIn(modal),row=allPc(picker).find(n=>n.dataset.fileId);row.click();findButton(picker,'Прикрепить').click();
 assert.equal(modal.open,false);assert.equal(f.state.social.dialogs[GOBLIN_ID].replyDraft.fileId,row.dataset.fileId);assert.equal(f.state.social.goblin.sent.text,undefined);assert.equal(f.d.activeElement,allPc(f.view.root).find(n=>n.getAttribute('aria-label')==='Сообщение'));f.view.dispose();
});
