import test from 'node:test';
import assert from 'node:assert/strict';
import {mountBeatStudio} from '../src/beat-studio-view.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
import {documentIsDirty} from '../src/pc-document-session.js';
const field=(root,label)=>allPc(root).find(n=>n.getAttribute?.('aria-label')===label);
function setup(){const d=pcDocument(),root=d.createElement('main');let state=submissionFixture({vocal:false});const view=mountBeatStudio(root,{getState:()=>state,getMetadata:()=>({gameMinutes:600,skills:{}}),onChange:s=>{state=s;return true;},audio:{stop(){},getSnapshot(){return {};},capabilities:{recordedPlayback:false}},initialProject:state.projects.find(p=>p.id==='beat')});return {root,view,get state(){return state;},set state(s){state=s;}};}
test('studio Save As binds FLP and a second Save updates that snapshot, not an audio export',()=>{
 const f=setup();findButton(f.root,'Сохранить').click();const picker=field(f.root,'Сохранить как');assert.ok(picker);field(picker,'Имя файла').value='Мой проект.flp';findButton(picker,'Сохранить').click();
 assert.equal(f.state.fileSystem.files.length,1);assert.equal(f.state.fileSystem.files[0].type,'flp');assert.equal(documentIsDirty(f.state,'ft-studio'),false);
 f.state={...f.state,projects:f.state.projects.map(p=>p.id==='beat'?{...p,name:'Правка'}:p)};f.view.update();findButton(f.root,'Сохранить').click();assert.equal(f.state.fileSystem.files.length,1);assert.equal(f.state.fileSystem.files[0].snapshot.name,'Правка');assert.equal(f.state.audioExports.files.length,0);f.view.dispose();
});
test('Cancel and cancelling Save As keep a dirty studio open; Discard removes an unsaved project',async()=>{
 const f=setup();let closed=0;let pending=f.view.requestClose({onClose:()=>closed++});findButton(f.root,'Отмена').click();assert.equal(await pending,'cancelled');assert.equal(closed,0);
 pending=f.view.requestClose({onClose:()=>closed++});findButton(field(f.root,'Сохранить изменения?'),'Сохранить').click();assert.ok(field(f.root,'Сохранить как'));findButton(field(f.root,'Сохранить как'),'Отмена').click();assert.equal(await pending,'cancelled');assert.equal(closed,0);
 pending=f.view.requestClose({onClose:()=>closed++});findButton(f.root,'Не сохранять').click();assert.equal(await pending,'discarded');assert.equal(closed,1);assert.equal(f.state.projects.some(p=>p.id==='beat'),false);f.view.dispose();
});
