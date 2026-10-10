import test from 'node:test';
import assert from 'node:assert/strict';
import {createExplorerState,navigateExplorer,explorerEntries,explorerProperties} from '../src/virtual-pc-explorer.js?rev=26';
import {mountExplorer} from '../src/virtual-pc-explorer-view.js?rev=26';
import {createVirtualPcState} from '../src/virtual-pc-state.js?rev=26';
import {createStudioProject} from '../src/ft-studio-project.js?rev=26';
import {pcDocument,findButton,allPc,fire} from './helpers/virtual-pc-dom.js';
test('history discards forward branch after new navigation and root disables up',()=>{
  let e=createExplorerState();assert.strictEqual(navigateExplorer(e,{type:'up'}),e);
  for(const path of ['disk','documents'])e=navigateExplorer(e,{type:'navigate',path});
  e=navigateExplorer(e,{type:'back'});assert.equal(e.path,'disk');
  assert.equal(navigateExplorer(e,{type:'forward'}).path,'documents');
  e=navigateExplorer(e,{type:'navigate',path:'windows'});
  assert.deepEqual(e.history,['computer','disk','windows']);assert.equal(navigateExplorer(e,{type:'forward'}).path,'windows');
});
test('invalid address preserves current folder and accepts normalized virtual addresses',()=>{
  const e=navigateExplorer(createExplorerState(),{type:'navigate',path:'c:/Мои документы/'});
  assert.equal(e.path,'documents');
  const bad=navigateExplorer(e,{type:'navigate',path:'https://example.org'});
  assert.equal(bad.path,'documents');assert.match(bad.error,/не найден/);
});
test('disk properties use existing accounting and empty projects remain empty',()=>{
  const s=createVirtualPcState({download:{status:'installed'},projects:[{id:'p'}]});
  assert.equal(explorerProperties(s,explorerEntries(s,'computer')[0]).rows.find(r=>r.label==='Свободно').value,'1,2 ГБ (1198 МБ)');
  assert.deepEqual(explorerEntries(createVirtualPcState(),'projects'),[]);
});
test('software Properties distinguish archives, metadata, executables and configuration from folders and projects',()=>{
 const state=createVirtualPcState({software:{client:{installed:true,receivedBytes:2000000,path:'C:\\Tools\\torent'},ft:{installed:true,receivedBytes:800000000,path:'C:\\Tools\\FT'},metadata:true},projects:[{id:'type-project',name:'Бит'}]});
 for(const [path,id,want]of [['downloads','archive:client','Приложение'],['downloads','archive:ft','Архив ZIP'],['downloads','ft-metadata','Файл метаданных BitTorrent'],['C:\\Tools\\torent','exe:client','Приложение'],['C:\\Tools\\FT','exe:ft','Приложение'],['C:\\Tools\\torent','config:client','Файл конфигурации'],['disk','downloads','Папка'],['projects','project:type-project','Проект FT Studio']]){
  const entry=explorerEntries(state,path).find(e=>e.id===id);assert.ok(entry,id);
  assert.equal(explorerProperties(state,entry).rows.find(r=>r.label==='Тип').value,want,id);
 }
 const partial=createVirtualPcState({software:{ft:{receivedBytes:1000000}}});assert.equal(explorerProperties(partial,explorerEntries(partial,'downloads')[0]).rows.find(r=>r.label==='Тип').value,'Незавершённая загрузка');
});
function setup(seed={}) {
  const document=pcDocument(),root=document.createElement('div'),opened=[],properties=[],menus=[];
  const view=mountExplorer(root,{onOpenProject:p=>opened.push(p),onProperties:p=>properties.push(p),onClose(){},onMenu:p=>menus.push(p)});
  view.update(createVirtualPcState(seed));return {root,view,opened,properties,menus};
}
test('projects refresh after save without losing selection or address input',()=>{
  const p=createStudioProject({id:'p',name:'Бит',battleId:'concrete-echo'}).project;
  const {root,view}=setup({projects:[p]});view.navigate('projects');
  findButton(root,'Открыть проект Бит').click();
  const address=allPc(root).find(n=>n.getAttribute('aria-label')==='Адрес папки');address.value='Ввод';
  view.update(createVirtualPcState({projects:[p,{...p,id:'p2',name:'Второй'}]}));
  assert.equal(address.value,'Ввод');assert.equal(findButton(root,'Открыть проект Бит').getAttribute('aria-pressed'),'true');
  assert.ok(findButton(root,'Открыть проект Второй'));
});
test('malformed project shows local error and text names cannot inject markup',()=>{
  const {root,view,opened}=setup({projects:[{id:'bad',name:'<img src=x>'}]});view.navigate('projects');
  fire(findButton(root,'Открыть проект <img src=x>'),'dblclick');
  assert.equal(opened.length,0);
  assert.ok(allPc(root).some(n=>/повреждён/.test(n.textContent??'')));
  assert.equal(allPc(root).filter(n=>n.tagName==='IMG').some(n=>n.getAttribute('src')==='x'),false);
});
test('tree and double click navigate while single click only selects',()=>{
  const {root,view}=setup();const disk=findButton(root,'Открыть диск C:');
  disk.click();assert.equal(allPc(root).find(n=>n.getAttribute('aria-label')==='Адрес папки').value,'Мой компьютер');
  fire(disk,'dblclick');assert.ok(findButton(root,'Открыть папку Мои документы'));
  view.navigate('projects');assert.ok(allPc(root).some(n=>n.textContent==='Объектов: 0'));
});
test('download ticks retain focused file and tree nodes while updating free space',()=>{
  const {root,view}=setup({download:{status:'downloading',receivedBytes:0}});
  const disk=findButton(root,'Открыть диск C:'),tree=findButton(root,'Перейти: Мой компьютер');disk.focus();
  view.update(createVirtualPcState({download:{status:'downloading',receivedBytes:3000000}}));
  assert.equal(findButton(root,'Открыть диск C:')===disk,true);
  assert.equal(findButton(root,'Перейти: Мой компьютер')===tree,true);assert.equal(root.ownerDocument.activeElement===disk,true);
  assert.ok(allPc(disk).some(n=>n.textContent==='Свободно 2,0 ГБ (1988 МБ)'));
  const meter=allPc(disk).find(n=>n.getAttribute('role')==='meter');
  assert.equal(meter.getAttribute('aria-valuenow'),'14011.012');
  view.update(createVirtualPcState({download:{status:'downloading',receivedBytes:4000000}}));
  assert.equal(allPc(disk).find(n=>n.getAttribute('role')==='meter'),meter);
});
test('partial Downloads file keeps selection and focus while its size changes',()=>{
 const {root,view}=setup({download:{status:'downloading',receivedBytes:1000000}});view.navigate('downloads');
 const file=findButton(root,'Открыть FT-Studio-setup.zip.part');file.click();file.focus();
 view.update(createVirtualPcState({download:{status:'downloading',receivedBytes:2000000}}));
 assert.equal(findButton(root,'Открыть FT-Studio-setup.zip.part')===file,true);assert.equal(root.ownerDocument.activeElement===file,true);assert.equal(file.getAttribute('aria-pressed'),'true');
});
