import test from 'node:test';
import assert from 'node:assert/strict';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {createVirtualPcState,loadVirtualPcState,diskUsage} from '../src/virtual-pc-state.js';
import {advanceVirtualPc} from '../src/virtual-pc-runtime.js';
import * as software from '../src/pc-software.js';
import {explorerEntries} from '../src/virtual-pc-explorer.js';
import {pcDocument,findButton,allPc,fire} from './helpers/virtual-pc-dom.js';
const audio={stop(){},dispose(){},unlock:async()=>true};
function desktop(state={}){const d=pcDocument(),root=d.createElement('main'),pc=mountVirtualPc(root,{audio,beatAudio:audio});pc.showDesktop(createVirtualPcState({power:'on',...state}));return {pc,root,d};}
function click(root,name){const b=findButton(root,name);assert.ok(b,'Missing '+name);b.click();}
for(const [id,topic,file]of [['ft','ft-studio','FT-Studio.torrent'],['notebook','notebook','Rap-Notebook.torrent']]){
 test(`${id} torrent download restores the minimized client and starts one visible task`,()=>{
  const {pc,root,d}=desktop({software:{client:{installed:true}},lastGameMinute:0});
  pc.open('torent');pc.windowAction({type:'minimize',id:'torent'});pc.open('underweb');pc.navigateUnderweb('underweb://dump/'+topic);click(root,'Скачать '+file);
  assert.equal(pc.window,'torent');assert.equal(pc.windows.windows.find(w=>w.id==='torent').mode,'normal');assert.equal(pc.state.software.task?.appId,id);assert.ok(pc.focusScope().contains(d.activeElement));
  assert.ok(allPc(pc.shell.getContentRoot('torent')).some(n=>n.textContent?.includes(id==='ft'?'FT-Studio-setup.zip':'Rap-Notebook-setup.exe')));
  pc.softwareAction('pause');pc.syncState(advanceVirtualPc(pc.state,{day:1,minutes:1}).state);const paused=structuredClone(pc.state.software.task);
  pc.open('underweb');pc.navigateUnderweb('underweb://dump/'+topic);click(root,'Открыть '+file);
  assert.equal(pc.window,'torent');assert.deepEqual(pc.state.software.task,paused);assert.equal(pc.windows.windows.filter(w=>w.id==='torent').length,1);
  click(root,'▶ Продолжить');pc.syncState(advanceVirtualPc(pc.state,{day:1,minutes:5}).state);assert.ok(pc.state.software[id].receivedBytes>0);pc.dispose();
 });
 test(`${id} metadata without client survives reload and later opens from Downloads`,()=>{
  const {pc,root}=desktop();pc.open('underweb');pc.navigateUnderweb('underweb://dump/'+topic);click(root,'Скачать '+file);
  assert.equal(pc.window,'underweb');assert.equal(pc.state.software.task,null);assert.ok(allPc(root).some(n=>/Сначала скачай и установи torent/.test(n.textContent)));
  const loaded=loadVirtualPcState({getItem:()=>JSON.stringify(pc.state)}).state;assert.ok(explorerEntries(loaded,'downloads').some(e=>e.name===file));
  pc.syncState({...loaded,software:{...loaded.software,client:{...loaded.software.client,installed:true}}});pc.open('computer');pc.openFolder('downloads');fire(findButton(pc.shell.getContentRoot('computer'),'Открыть '+file),'keydown',{key:'Enter'});
  assert.equal(pc.window,'torent');assert.equal(pc.state.software.task?.appId,id);pc.dispose();
 });
}
test('notebook download API retrieves metadata before allowing client-owned transfer',()=>{
 let s=software.downloadNotebook(createVirtualPcState({power:'on'})).state;assert.equal(s.software.task,null);assert.equal(s.software.notebookMetadata,true);assert.equal(software.openMetadata(s,'notebook').reason,'client-required');
 s=createVirtualPcState({...s,software:{...s.software,client:{installed:true}}});s=software.openMetadata(s,'notebook').state;assert.equal(s.software.task.appId,'notebook');assert.equal(diskUsage(s).downloadMb,.012);
});
test('second torrent preserves the running transfer and minimized installer',()=>{
 const {pc,root}=desktop({lastGameMinute:10,software:{client:{installed:true},ft:{receivedBytes:1234},metadata:true,task:{appId:'ft',baseMinute:10,baseBytes:1234},notebook:{receivedBytes:4000000},installer:{appId:'notebook',step:'install',elapsedSeconds:4}}});
 pc.windowAction({type:'minimize',id:'installer'});pc.open('underweb');pc.navigateUnderweb('underweb://dump/notebook');const task=structuredClone(pc.state.software.task);click(root,'Скачать Rap-Notebook.torrent');
 assert.equal(pc.window,'torent');assert.deepEqual(pc.state.software.task,task);assert.equal(pc.state.software.installer.elapsedSeconds,4);assert.equal(pc.windows.windows.find(w=>w.id==='installer').mode,'minimized');assert.ok(findButton(pc.shell.getContentRoot('torent'),'Открыть установщик Рэпблокнот'));
 pc.syncState(software.advanceInstallation(pc.state,6).state);assert.equal(pc.state.software.notebook.installed,true);assert.equal(pc.window,'torent');assert.equal(pc.windows.windows.find(w=>w.id==='installer').mode,'minimized');pc.dispose();
});
test('notebook cancellation retains metadata and reload reanchors partial transfer',()=>{
 let s=createVirtualPcState({power:'on',lastGameMinute:0,software:{client:{installed:true}}});s=software.openMetadata(software.downloadMetadata(s,'notebook').state,'notebook').state;s=advanceVirtualPc(s,{day:1,minutes:1}).state;assert.ok(s.software.notebook.receivedBytes>0);
 const restored=loadVirtualPcState({getItem:()=>JSON.stringify(s)}).state;assert.equal(advanceVirtualPc(restored,{day:99,minutes:0}).advancedBytes,0);s=software.cancelTransfer(restored).state;assert.equal(s.software.notebook.receivedBytes,0);assert.equal(s.software.notebookMetadata,true);
 s=software.openMetadata(s,'notebook').state;s=advanceVirtualPc(s,{day:1,minutes:1}).state;s=advanceVirtualPc(s,{day:1,minutes:10}).state;const {pc}=desktop(s);pc.open('torent');assert.ok(findButton(pc.shell.getContentRoot('torent'),'Открыть установщик Рэпблокнот'));pc.dispose();
});
test('busy client explains the retained torrent without replacing its active transfer',()=>{
 const {pc,root}=desktop({software:{client:{installed:true},metadata:true,task:{appId:'ft',baseMinute:0,baseBytes:0}}});pc.open('underweb');pc.navigateUnderweb('underweb://dump/notebook');click(root,'Скачать Rap-Notebook.torrent');
 assert.equal(pc.window,'torent');assert.equal(pc.state.software.task.appId,'ft');assert.equal(pc.state.software.notebookMetadata,true);
 assert.ok(allPc(pc.shell.getContentRoot('torent')).some(n=>/Сначала заверши или отмени текущую загрузку/.test(n.textContent)));pc.dispose();
});
test('legacy notebook partials, archives and installers survive normalization without new download credit',()=>{
 for(const receivedBytes of [123456,4000000]){
  const raw={power:'on',lastGameMinute:20,software:{notebook:{receivedBytes},task:receivedBytes<4000000?{appId:'notebook',baseMinute:0,baseBytes:0}:null,installer:receivedBytes===4000000?{appId:'notebook',step:'install',elapsedSeconds:4}:null}};
  const loaded=loadVirtualPcState({getItem:()=>JSON.stringify(createVirtualPcState(raw))}).state;assert.equal(loaded.software.notebook.receivedBytes,receivedBytes);
  assert.equal(advanceVirtualPc(loaded,{day:99,minutes:0}).advancedBytes,0);if(receivedBytes===4000000)assert.equal(loaded.software.installer.elapsedSeconds,4);
 }
});
