import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState,diskUsage} from '../src/virtual-pc-state.js';
import * as software from '../src/pc-software.js';
import {advanceVirtualPc} from '../src/virtual-pc-runtime.js';
import {explorerEntries,explorerPaths} from '../src/virtual-pc-explorer.js';
import {desktopApps} from '../src/virtual-pc-catalog.js';
import {createPcIcon} from '../src/virtual-pc-icons.js';
import {pcDocument} from './helpers/virtual-pc-dom.js';
import {access} from 'node:fs/promises';

test('notebook downloads through torrent and installs over ten active seconds with disk accounting',()=>{
 let s=createVirtualPcState({power:'on',software:{client:{installed:true}}});assert.equal(s.software.notebook?.installed,false);
 assert.equal(typeof software.downloadNotebook,'function');
 s=software.openMetadata(software.downloadNotebook(s).state,'notebook').state;
 s=advanceVirtualPc(s,{day:1,minutes:0}).state;s=advanceVirtualPc(s,{day:1,minutes:5}).state;
 assert.equal(s.software.notebook.receivedBytes,4000000);assert.equal(diskUsage(s).usedMb,14012.012);
 assert.equal(explorerEntries(s,'downloads').find(e=>e.appId==='notebook').action,'installer');
 s=software.openInstaller(s,'notebook').state;
 for(let i=0;i<3;i++)s=software.advanceInstaller(s).state;
 s=software.advanceInstallation(s,9).state;assert.equal(s.software.notebook.installed,false);
 s=createVirtualPcState(JSON.parse(JSON.stringify(s)));
 s=software.advanceInstallation(s,1).state;assert.equal(s.software.notebook.installed,true);
 assert.equal(diskUsage(s).usedMb,14024.012);
 const path=Object.keys(explorerPaths(s)).find(k=>explorerPaths(s)[k].address===s.software.notebook.path);
 assert.equal(explorerEntries(s,path).find(e=>e.kind==='application').appId,'rap-notebook');
});

test('cancelled notebook download and interrupted installation do not install or double charge',()=>{
 let s=createVirtualPcState({power:'on'});
 assert.equal(typeof software.downloadNotebook,'function');
 s=software.downloadNotebook(s).state;s=software.cancelTransfer(s).state;
 assert.equal(s.software.notebook.receivedBytes,0);
 s.software.notebook.receivedBytes=4000000;s=software.openInstaller(s,'notebook').state;
 for(let i=0;i<3;i++)s=software.advanceInstaller(s).state;
 s=software.advanceInstallation(s,4).state;s=software.cancelInstaller(s).state;
 assert.equal(s.software.notebook.installed,false);assert.equal(diskUsage(s).installedMb,0);
});

test('installed rap notebook uses its own notepad icon instead of a documents folder',async()=>{
 const app=desktopApps(createVirtualPcState({software:{notebook:{installed:true}}})).find(a=>a.id==='rap-notebook');
 assert.equal(app.iconId,'notebook');
 const icon=createPcIcon(pcDocument(),app.iconId);
 assert.equal(icon.getAttribute('src'),'./assets/ui/virtual-pc/icons/notebook.svg?rev=35');
 await access(new URL('../assets/ui/virtual-pc/icons/notebook.svg',import.meta.url));
});
