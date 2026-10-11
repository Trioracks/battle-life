import test from 'node:test';
import assert from 'node:assert/strict';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createLyric} from '../src/lyric-production.js';
import {applyToBattle} from '../src/virtual-pc-state.js';
const audio={stop(){},dispose(){},unlock:async()=>true};
test('Underweb offers notebook torrent and installed app opens its document instead of FT',()=>{
 const d=pcDocument(),root=d.createElement('main'),pc=mountVirtualPc(root,{audio,beatAudio:audio});
 pc.showDesktop(createVirtualPcState({power:'on',software:{client:{installed:true}}}));pc.open('underweb');pc.navigateUnderweb('underweb://dump/notebook');
 const download=findButton(root,'Скачать Rap-Notebook.torrent');assert.ok(download);fire(download,'click');assert.equal(pc.window,'torent');assert.equal(pc.state.software.task.appId,'notebook');
 let s=createVirtualPcState({power:'on',software:{notebook:{installed:true}}});s=createLyric(s,{id:'words',name:'Мой текст'}).state;pc.syncState(s);pc.openProject(s.projects[0]);
 assert.equal(pc.window,'rap-notebook');assert.ok(allPc(root).some(n=>n.dataset.lyricRole==='document'));assert.ok(!pc.windows.windows.some(w=>w.appId==='ft-studio'));pc.dispose();
});
test('new battle registration and forum local state survive the central save normalization',()=>{
 let s=applyToBattle(createVirtualPcState(),'makarevich-1','Новичок');assert.equal(s.battleApplications[0]?.battleId,'makarevich-1');
 s.community={replies:[{id:'local-1',topicId:'makarevich-1-general',author:'Я',body:'Мой ответ',gameDay:1}],drafts:{'concrete-echo-general':{body:'Черновик',quoteId:null}}};
 s=createVirtualPcState(s);assert.equal(s.community?.replies[0]?.body,'Мой ответ');assert.equal(s.community.drafts['concrete-echo-general'].body,'Черновик');
});
