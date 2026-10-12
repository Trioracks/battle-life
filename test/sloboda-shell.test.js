import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PC_IDENTITY} from '../src/pc-identity.js';
import {pcPresentation} from '../src/virtual-pc-presentation.js';
import {EXPLORER_PATHS,createExplorerState} from '../src/virtual-pc-explorer.js';
import {mountPcShell} from '../src/virtual-pc-shell.js';
import {createWindowState} from '../src/virtual-pc-window-state.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
test('Sloboda identity is shared by shell and loading presentation',()=>{
 assert.equal(PC_IDENTITY.name,'Слобода OS');
 assert.equal(pcPresentation({phase:'loading'},'on').title,PC_IDENTITY.name);
 assert.equal(pcPresentation({phase:'desktop'},'on').title,PC_IDENTITY.name);
 const d=pcDocument(),root=d.createElement('div'),shell=mountPcShell(root,{onCommand(){}});
 shell.render({windows:createWindowState(),apps:[],iconPositions:{},metadata:{clockLabel:'12:00'},warning:''});
 assert.ok(findButton(root,'Слобода'));
 assert.ok(allPc(root).some(n=>n.getAttribute?.('aria-label')==='Рабочий стол '+PC_IDENTITY.name));shell.dispose();
});
test('system alias stays compatible while displayed address changes',()=>{
 assert.equal(EXPLORER_PATHS.windows.label,'Система');
 assert.equal(EXPLORER_PATHS.windows.address,PC_IDENTITY.systemAddress);
 assert.equal(createExplorerState('windows').path,'windows');
 assert.equal(createExplorerState(PC_IDENTITY.systemAddress).path,'windows');
});
test('live monitor and OS surfaces do not carry third-party shell branding',async()=>{
 for(const file of ['virtual-pc-shell','virtual-pc-presentation','virtual-pc-ui','virtual-pc-system-windows','virtual-pc-disk-view','virtual-pc-explorer-view','pc-software-view','apartment-v3-computer']){
  const source=await readFile(new URL('../src/'+file+'.js',import.meta.url),'utf8');assert.doesNotMatch(source,/Windows HP|Windows XP|Пуск/);
 }
 const mark=await readFile(new URL('../assets/ui/virtual-pc/icons/start.svg',import.meta.url),'utf8');
 assert.doesNotMatch(mark,/#ed4b21|#78c42c|#f6d329/);
 const css=await readFile(new URL('../virtual-pc.css',import.meta.url),'utf8');assert.doesNotMatch(css,/XP Luna|#0054e3|#32892c/);
});
