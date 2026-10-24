import test from 'node:test';
import assert from 'node:assert/strict';
import * as explorer from '../src/virtual-pc-explorer.js';
import {createVirtualPcState,saveVirtualPcState,loadVirtualPcState} from '../src/virtual-pc-state.js';
import {createPcFolder,pcFolderExists,savePcDocument} from '../src/pc-filesystem.js';
import {openInstaller,advanceInstaller,advanceInstallation,downloadClient,downloadMetadata} from '../src/pc-software.js';
import {startBrowserDownload,startMentorDownload,advanceBrowserDownloads} from '../src/pc-browser-downloads.js';
import {GOBLIN_ID} from '../src/goblin-catalog.js';
import {sendGoblinFile} from '../src/goblin-exchange.js';
import {desktopApps} from '../src/virtual-pc-catalog.js';
import {mountExplorer} from '../src/virtual-pc-explorer-view.js';
import {mountSystemWindow} from '../src/virtual-pc-system-windows.js';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {creativeFixture} from './helpers/creative-fixtures.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {createAudioExport} from '../src/pc-audio-exports.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';

function remove(state,folderId){assert.equal(typeof explorer.deleteExplorerFolder,'function','Explorer must expose virtual folder deletion');return explorer.deleteExplorerFolder(state,{folderId});}
function reload(state){const values=new Map(),storage={setItem:(key,value)=>values.set(key,value),getItem:key=>values.get(key)??null};assert.equal(saveVirtualPcState(storage,state),true);return loadVirtualPcState(storage).state;}

test('deleting a built-in folder removes its virtual descendants and files through save and reload',()=>{
 let state=submissionFixture();
 state=createPcFolder(state,{id:'nested-export',parentId:'exports',name:'Черновики',nowMinute:1}).state;
 const audio=createAudioExport(state,{id:'nested-audio',projectId:'beat',kind:'track',folderId:'nested-export',filename:'Трек',nowMinute:2});assert.equal(audio.ok,true);state=audio.state;
 const removed=remove(state,'music');assert.equal(removed.ok,true);
 for(const next of [removed.state,createVirtualPcState(removed.state),reload(removed.state)]){
  assert.equal(pcFolderExists(next,'music'),false);assert.equal(pcFolderExists(next,'exports'),false);assert.equal(pcFolderExists(next,'nested-export'),false);
  assert.equal(explorer.explorerPaths(next).music,undefined);assert.equal(explorer.explorerPaths(next).exports,undefined);
  assert.equal(next.audioExports.files.length,0);assert.deepEqual(next.projects,state.projects);
  assert.equal(pcFolderExists(next,'documents'),true);assert.equal(pcFolderExists(next,'downloads'),true);
  assert.equal(createPcFolder(next,{id:'new-child',parentId:'exports',name:'Нельзя',nowMinute:3}).ok,false);
 }
});

test('deleting a user folder removes saved documents without resurrecting legacy project entries',()=>{
 let {state,projectId}=creativeFixture('lyrics');
 state=createPcFolder(state,{id:'lyrics-folder',parentId:'documents',name:'Тексты',nowMinute:1}).state;
 state=savePcDocument(state,{projectId,folderId:'lyrics-folder',filename:'Куплет.txt',nowMinute:2}).state;
 const removed=remove(state,'lyrics-folder');assert.equal(removed.ok,true);
 for(const next of [removed.state,reload(removed.state)]){
  assert.equal(next.fileSystem.files.length,0);assert.equal(explorer.explorerEntries(next,'projects').some(entry=>entry.projectId===projectId),false);
  assert.equal(next.projects.some(project=>project.id===projectId),true);
 }
 assert.equal(pcFolderExists(state,'lyrics-folder'),true);assert.equal(state.fileSystem.files.length,1);
});

test('system roots remain protected and deleting a missing folder cannot mutate state',()=>{
 const state=createVirtualPcState();
 for(const folderId of ['computer','disk','windows','missing']){const result=remove(state,folderId);assert.equal(result.ok,false);assert.equal(result.state,state);assert.ok(result.reason);}
});

test('folder existence rejects a cyclic unnormalized parent chain',()=>{
 const state={fileSystem:{folders:[{id:'one',parentId:'two'},{id:'two',parentId:'one'}]}};
 assert.doesNotThrow(()=>assert.equal(pcFolderExists(state,'one'),false));
});

test('deleting an installed application folder blocks launch until the retained installer reinstalls it',()=>{
 const path='C:\\Tools\\Rap Notebook',state=createVirtualPcState({power:'on',software:{notebook:{installed:true,receivedBytes:4000000,path}}});
 const removed=remove(state,path);assert.equal(removed.ok,true);
 let next=reload(removed.state);assert.equal(next.software.notebook.installed,false);assert.equal(next.software.notebook.receivedBytes,4000000);
 assert.equal(desktopApps(next).some(app=>app.id==='rap-notebook'),false);assert.equal(explorer.explorerPaths(next)[path],undefined);
 next=openInstaller(next,'notebook').state;for(let step=0;step<3;step++)next=advanceInstaller(next).state;
 next=advanceInstallation(next,10).state;
 assert.equal(next.software.notebook.installed,true);assert.equal(desktopApps(next).some(app=>app.id==='rap-notebook'),true);
 assert.equal(next.software.notebook.path,path);assert.ok(explorer.explorerPaths(reload(next))[path]);
});

test('Explorer confirms folder deletion from context menu and Delete, with cancel preserving the folder',()=>{
 const d=pcDocument(),root=d.createElement('div');let state=createVirtualPcState(),menu;
 const view=mountExplorer(root,{onChange:next=>{state=next;return true;},onMenu:value=>menu=value,onProperties(){},onOpenProject(){},onClose(){}});
 view.update(state);view.navigate('music');
 const folder=findButton(root,'Открыть папку Экспорт');fire(folder,'contextmenu');
 const item=menu.items.find(item=>item.id==='delete');assert.ok(item,'folder context menu offers Delete');item.onSelect();
 assert.ok(allPc(root).some(node=>node.getAttribute?.('role')==='dialog'));findButton(root,'Отмена').click();assert.equal(pcFolderExists(state,'exports'),true);
 fire(findButton(root,'Открыть папку Экспорт'),'keydown',{key:'Delete'});findButton(root,'Удалить папку').click();
 assert.equal(pcFolderExists(state,'exports'),false);assert.equal(findButton(root,'Открыть папку Экспорт'),undefined);view.dispose();
});

test('TXT documents use the text document icon in Explorer, legacy entries, and Properties',()=>{
 const {state,projectId}=creativeFixture('lyrics'),saved=savePcDocument(state,{projectId,folderId:'documents',filename:'Куплет.txt',nowMinute:1}).state;
 const legacy=explorer.explorerEntries(state,'projects').find(entry=>entry.projectId===projectId);
 const entry=explorer.explorerEntries(saved,'documents').find(entry=>entry.fileId);
 assert.equal(legacy.iconId,'txt');assert.equal(entry.iconId,'txt');
 const properties=explorer.explorerProperties(saved,entry);assert.equal(properties.iconId,'txt');
 const d=pcDocument(),root=d.createElement('div'),view=mountSystemWindow(root,{kind:'properties',properties,getState:()=>saved,onClose(){}});
 assert.ok(allPc(root).some(node=>node.tagName==='IMG'&&/\/txt\.svg/.test(node.getAttribute('src'))));view.dispose();
 const desktop=d.createElement('div'),pc=mountVirtualPc(desktop);pc.showDesktop(saved);pc.showProperties(properties);
 assert.equal(pc.windows.windows.find(window=>window.id==='system:properties').iconId,'txt');pc.dispose();
});

test('the desktop keeps deletion modal through refresh and closes a deleted program without discarding its draft',()=>{
 const fixture=creativeFixture('lyrics'),state=createVirtualPcState({...fixture.state,software:{notebook:{installed:true,receivedBytes:4000000}}}),d=pcDocument(),root=d.createElement('div');
 const pc=mountVirtualPc(root,{onPersist:()=>true});pc.showDesktop(state);pc.open('rap-notebook');pc.open('computer');pc.openFolder('C:\\Program Files');
 fire(findButton(root,'Открыть папку Rap Notebook'),'keydown',{key:'Delete'});
 const dialog=allPc(root).find(node=>node.getAttribute?.('aria-label')==='Удаление папки');assert.ok(dialog);
 pc.syncHost({...pc.metadata,clockLabel:'12:01'});assert.ok(allPc(root).includes(dialog));findButton(dialog,'Удалить папку').click();
 assert.equal(pc.state.software.notebook.installed,false);assert.equal(pc.windows.windows.some(window=>window.id==='rap-notebook'),false);assert.deepEqual(pc.state.projects,state.projects);
 pc.open('rap-notebook');assert.equal(pc.windows.windows.some(window=>window.id==='rap-notebook'),false);pc.dispose();
});

test('deleting FT Studio during its launch delay cancels the pending launch',()=>{
 const d=pcDocument(),root=d.createElement('div'),timers=new Map();let timerId=0;
 const pc=mountVirtualPc(root,{onPersist:()=>true,setTimeoutFn:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeoutFn:id=>timers.delete(id)});
 pc.showDesktop(createVirtualPcState({power:'on',download:{status:'installed'}}));pc.open('ft-studio');const launch=timers.get(timerId);
 pc.open('computer');pc.openFolder('C:\\Program Files\\Field Tone');fire(findButton(root,'Открыть папку FT Studio'),'keydown',{key:'Delete'});findButton(root,'Удалить папку').click();
 assert.equal(pc.state.software.ft.installed,false);assert.equal(pc.studioLaunch,null);launch();assert.equal(pc.windows.windows.some(window=>window.id==='ft-studio'),false);pc.dispose();
});

for(const [kind,softwareId,appId]of [['lyrics','notebook','rap-notebook'],['beat','ft','ft-studio']])test('opening a '+kind+' document cannot relaunch its deleted program or replace its surviving dirty draft',()=>{
 const fixture=creativeFixture(kind),saved=savePcDocument(fixture.state,{projectId:fixture.projectId,folderId:'documents',filename:kind==='lyrics'?'Куплет.txt':'Бит.flp',nowMinute:1});assert.equal(saved.ok,true);
 const state=createVirtualPcState({...saved.state,projects:saved.state.projects.map(project=>({...project,name:'Несохранённый черновик'})),software:{[softwareId]:{installed:true}}});
 const d=pcDocument(),root=d.createElement('div'),pc=mountVirtualPc(root,{onPersist:()=>true});pc.showDesktop(state);pc.open('computer');
 const path=state.software[softwareId].path,parent=path.slice(0,path.lastIndexOf('\\'));pc.openFolder(parent);
 fire(findButton(root,'Открыть папку '+path.slice(path.lastIndexOf('\\')+1)),'keydown',{key:'Delete'});findButton(root,'Удалить папку').click();
 const before=structuredClone(pc.state.projects),reason=pc.openDocumentFile(saved.fileId);
 assert.equal(pc.windows.windows.some(window=>window.id===appId),false);assert.deepEqual(pc.state.projects,before);assert.match(reason,/установи|установить/i);
 pc.openNow(appId);assert.equal(pc.windows.windows.some(window=>window.id===appId),false);pc.dispose();
});

test('deleting Downloads persists until an explicit client or metadata download restores its destination',()=>{
 const removed=remove(createVirtualPcState({power:'on'}),'downloads');assert.equal(removed.ok,true);
 const deleted=reload(removed.state);assert.equal(pcFolderExists(deleted,'downloads'),false);
 for(const start of [state=>startBrowserDownload(state,{appId:'client',kind:'installer'}),state=>startBrowserDownload(state,{appId:'notebook',kind:'metadata'}),downloadClient,state=>downloadMetadata(state,'notebook')]){
  const result=start(deleted);assert.equal(result.ok,true);assert.equal(pcFolderExists(result.state,'downloads'),true);
  assert.equal(pcFolderExists(reload(result.state),'downloads'),true);assert.ok(explorer.explorerPaths(result.state).downloads);
 }
 const failed=startBrowserDownload(deleted,{appId:'missing',kind:'installer'});assert.equal(failed.ok,false);assert.equal(pcFolderExists(failed.state,'downloads'),false);
});

test('deleting Downloads clears completed hidden transfer references without recovery errors',()=>{
 const state=createVirtualPcState({power:'on',software:{notebookMetadata:true},browserDownloads:{version:1,items:[{id:'notebook:metadata',appId:'notebook',kind:'metadata',elapsedSeconds:1,error:''}],hiddenHistoryIds:['notebook:metadata'],recovery:[]}});
 const deleted=reload(remove(state,'downloads').state);assert.equal(deleted.browserDownloads.items.length,0);assert.equal(deleted.browserDownloads.recovery.length,0);
});

test('an explicit mentor attachment download restores deleted Downloads and saves a visible TXT file',()=>{
 const fixture=creativeFixture('lyrics'),project=fixture.state.projects[0],attachmentId='mentor-text';
 const state=createVirtualPcState({...fixture.state,social:{goblin:{files:[{id:attachmentId,kind:'lyrics',filename:'Куплет.txt',createdAtMinute:0,author:GOBLIN_ID,requiresDownload:true,project,bytes:2000}]},dialogs:{[GOBLIN_ID]:{messages:[{id:'attachment-message',sender:GOBLIN_ID,body:'Текст',fileId:attachmentId,createdAtMinute:0}]}}}});
 const deleted=reload(remove(state,'downloads').state),started=startMentorDownload(deleted,{attachmentId,nowMinute:1});assert.equal(started.ok,true,started.reason);
 assert.equal(pcFolderExists(started.state,'downloads'),true);
 const completed=advanceBrowserDownloads(started.state,{activeSeconds:1}).state,loaded=reload(completed);
 assert.equal(loaded.fileSystem.files.some(file=>file.mentorFileId===attachmentId&&file.folderId==='downloads'),true);
 assert.equal(explorer.explorerEntries(loaded,'downloads').some(entry=>entry.name==='Куплет.txt'&&entry.iconId==='txt'),true);
});

test('Goblin prepares a remote final-track response independently of the player deleted Downloads folder',()=>{
 const fixture=submissionFixture(),exported=createAudioExport(fixture,{id:'track-for-goblin',projectId:'beat',kind:'track',folderId:'exports',filename:'Трек',nowMinute:500});assert.equal(exported.ok,true);
 const state=exported.state;state.social.goblin.stage='vocal';
 assert.equal(sendGoblinFile(state,exported.fileId,501).ok,true);
 const deleted=remove(state,'downloads').state,result=sendGoblinFile(deleted,exported.fileId,501);assert.equal(result.ok,true,result.reason);
 assert.equal(pcFolderExists(result.state,'downloads'),false);assert.ok(result.state.social.goblin.files.find(file=>file.exported&&file.requiresDownload));
});
