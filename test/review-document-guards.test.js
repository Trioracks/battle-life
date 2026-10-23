import test from 'node:test';
import assert from 'node:assert/strict';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createLyric} from '../src/lyric-production.js';
import {createBeat} from '../src/beat-production.js';
import {createPcFolder,savePcDocument} from '../src/pc-filesystem.js';
import {startExportJob,advanceExportJob} from '../src/pc-export-job.js';
import {completeMentorDownload} from '../src/pc-mentor-downloads.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {creativeFixture} from './helpers/creative-fixtures.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
const field=(root,label)=>allPc(root).find(n=>n.getAttribute?.('aria-label')===label);
function setup(kind){
 const d=pcDocument(),root=d.createElement('main');let shutdowns=0;
 const timers=[];const pc=mountVirtualPc(root,{onShutdown:()=>shutdowns++,audio:{stop(){},dispose(){}},setTimeoutFn(fn){timers.push(fn);return timers.length;},clearTimeoutFn(){}});
 let state=createVirtualPcState({power:'on',software:{ft:{installed:true},notebook:{installed:true}}});
 const create=kind==='lyrics'?createLyric:createBeat;state=create(state,{id:'a',name:'A'},{}).state;state=create(state,{id:'b',name:'B'},{}).state;
 state=savePcDocument(state,{projectId:'a',folderId:'documents',filename:kind==='lyrics'?'A.txt':'A.flp',nowMinute:1}).state;
 state=kind==='lyrics'?{...state,writing:{...state.writing,activeTextId:'a'}}:{...state,music:{...state.music,activeBeatId:'a'}};
 pc.showDesktop(state);pc.openProject(pc.state.projects.find(p=>p.id==='a'));for(const fn of timers.splice(0))fn();
 pc.syncState({...pc.state,projects:pc.state.projects.map(p=>p.id==='a'?{...p,name:'A changed'}:p)});
 return {root,pc,shutdowns:()=>shutdowns};
}
test('shutdown presents both dirty apps in order before finishing',()=>{
 const {root,pc,shutdowns}=setup('beat');let state=createLyric(pc.state,{id:'words',name:'Текст'},{}).state;pc.syncState(state);pc.openProject(pc.state.projects.find(p=>p.id==='words'));pc.windowAction({type:'minimize',id:'rap-notebook'});pc.windowAction({type:'minimize',id:'ft-studio'});pc.open('underweb');
 pc.requestShutdown();assert.equal(pc.windows.activeId,'ft-studio');findButton(field(root,'Сохранить изменения?'),'Не сохранять').click();assert.equal(shutdowns(),0);assert.equal(pc.windows.activeId,'rap-notebook');findButton(field(root,'Сохранить изменения?'),'Не сохранять').click();assert.equal(shutdowns(),1);pc.dispose();
});
test('audio export rejects folder collisions both at start and after five seconds',()=>{
 const args={jobId:'collision',projectId:'beat',kind:'track',format:'mp3',folderId:'exports',filename:'Трек.mp3',nowMinute:600},original=submissionFixture();
 const state=createPcFolder(original,{id:'taken',parentId:'exports',name:'Трек.mp3',nowMinute:1}).state;assert.equal(startExportJob(state,args).ok,false);
 const started=startExportJob(original,args);assert.equal(started.ok,true);const late=createPcFolder(started.state,{id:'taken',parentId:'exports',name:'Трек.mp3',nowMinute:1}).state;
 const done=advanceExportJob(late,{activeSeconds:5,visible:true,powered:true,paused:false});assert.equal(done.completedFileId,null);assert.equal(done.state.audioExports.files.length,0);assert.match(done.state.exportJob.error,/Имя файла занято/);
});
test('mentor download chooses an available name beside a folder and survives normalization',()=>{
 let {state,projectId}=creativeFixture('lyrics');state=createPcFolder(state,{id:'taken',parentId:'downloads',name:'Правки.txt',nowMinute:1}).state;
 state.social.goblin.files.push({id:'mentor',kind:'lyrics',filename:'Правки.txt',project:state.projects.find(p=>p.id===projectId),bytes:2000,requiresDownload:true});
 const downloaded=completeMentorDownload(state,{attachmentId:'mentor',startedAtMinute:2});assert.equal(downloaded.ok,true);const file=createVirtualPcState(downloaded.state).fileSystem.files.find(f=>f.id===downloaded.fileId);assert.equal(file.filename,'Правки (1).txt');
});
for(const kind of ['lyrics','beat']){
 test(kind+' save rejects a sibling folder name even with overwrite and retains dirty source',()=>{
  const f=creativeFixture(kind),type=kind==='lyrics'?'txt':'flp',state=createPcFolder(f.state,{id:'folder',parentId:'documents',name:'Текст.'+type,nowMinute:1}).state;
  for(const overwrite of [false,true]){const r=savePcDocument(state,{projectId:f.projectId,folderId:'documents',filename:'текст.'+type,nowMinute:2,overwrite});assert.equal(r.ok,false);assert.equal(r.state,state);assert.equal(r.state.fileSystem.files.length,0);}
 });
 test(kind+' Explorer project switch asks before replacing dirty document and Cancel retains edits',()=>{
  const {root,pc}=setup(kind);pc.openProject(pc.state.projects.find(p=>p.id==='b'));
  assert.ok(field(root,'Сохранить изменения?'));findButton(field(root,'Сохранить изменения?'),'Отмена').click();
  assert.equal((kind==='lyrics'?pc.state.writing.activeTextId:pc.state.music.activeBeatId),'a');assert.equal(pc.state.projects.find(p=>p.id==='a').name,'A changed');
  pc.openProject(pc.state.projects.find(p=>p.id==='b'));findButton(field(root,'Сохранить изменения?'),'Сохранить').click();
  assert.equal((kind==='lyrics'?pc.state.writing.activeTextId:pc.state.music.activeBeatId),'b');assert.equal(pc.state.fileSystem.files[0].snapshot.name,'A changed');pc.dispose();
 });
 test(kind+' shutdown restores minimized dirty app before asking to save',()=>{
  const {root,pc,shutdowns}=setup(kind),app=kind==='lyrics'?'rap-notebook':'ft-studio';pc.windowAction({type:'minimize',id:app});pc.open('underweb');pc.requestShutdown();
  assert.ok(field(root,'Сохранить изменения?'));assert.equal(pc.windows.activeId,app);assert.notEqual(pc.windows.windows.find(w=>w.id===app).mode,'minimized');assert.equal(shutdowns(),0);
  findButton(field(root,'Сохранить изменения?'),'Отмена').click();assert.equal(shutdowns(),0);pc.requestShutdown();findButton(field(root,'Сохранить изменения?'),'Не сохранять').click();assert.equal(shutdowns(),1);pc.dispose();
 });
 test(kind+' repeated shutdown preserves the pending Save As picker and its continuation',()=>{
  const {root,pc,shutdowns}=setup(kind);pc.openProject(pc.state.projects.find(p=>p.id==='b'));findButton(field(root,'Сохранить изменения?'),'Не сохранять').click();
  pc.requestShutdown();findButton(field(root,'Сохранить изменения?'),'Сохранить').click();const picker=field(root,'Сохранить как');assert.ok(picker);
  pc.requestShutdown();pc.requestShutdown();assert.equal(field(root,'Сохранить как'),picker);assert.equal(shutdowns(),0);findButton(picker,'Сохранить').click();assert.equal(shutdowns(),1);assert.ok(pc.state.fileSystem.files.some(f=>f.projectId==='b'));pc.dispose();
 });
}
