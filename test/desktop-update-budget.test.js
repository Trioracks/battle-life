import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState,diskUsage} from '../src/virtual-pc-state.js';
import {downloadPresentation} from '../src/virtual-pc-runtime.js';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {mountRapNotebook} from '../src/rap-notebook-view.js';
import {createLyric} from '../src/lyric-production.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';

test('120 fractional-minute updates refresh needs without rebuilding unchanged notebook content',()=>{
 const d=pcDocument(),root=d.createElement('main');
 let state=createLyric(createVirtualPcState(),{id:'text',name:'Строки'}).state,contentRenderCount=0;
 const replace=root.replaceChildren.bind(root);root.replaceChildren=(...nodes)=>{contentRenderCount++;replace(...nodes);};
 const view=mountRapNotebook(root,{getState:()=>state});
 const sheet=allPc(root).find(n=>n.dataset.lyricRole==='document');
 for(let i=1;i<=120;i++){
  state={...state,lastGameMinute:720+i/120,music:{...state.music,needs:{satiety:80-i/100,energy:70-i/100}}};view.update();
 }
 assert.equal(contentRenderCount,1);assert.equal(allPc(root).find(n=>n.dataset.lyricRole==='document'),sheet);
 assert.ok(allPc(root).some(n=>n.textContent==='Сытость 79 · энергия 69'));
 state={...state,projects:state.projects.map(p=>({...p,name:'Новые строки'}))};view.update();
 assert.ok(allPc(root).some(n=>n.textContent==='Новые строки'));view.dispose();
});

test('download and disk presentation do not traverse the project archive',()=>{
 const state=createVirtualPcState({power:'on',download:{status:'downloading',receivedBytes:400000000}});
 state.projects=Array.from({length:40},()=>({get kind(){throw Error('presentation traversed an archived project');}}));
 assert.equal(downloadPresentation(state).receivedMb,400);
 assert.equal(downloadPresentation(state).remainingGameMinutes,221);
 assert.equal(diskUsage(state).projectsMb,80);
});

test('occluded and minimized views do not read projects and their FT RAF resumes only on reveal',()=>{
 const d=pcDocument(),root=d.createElement('main'),frames=new Map();let sequence=0;
 d.defaultView={requestAnimationFrame:fn=>{const id=++sequence;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)};
 const pc=mountVirtualPc(root);pc.showDesktop(createVirtualPcState({power:'on',download:{status:'installed'},software:{client:{installed:true},ft:{installed:true},notebook:{installed:true}}}));
 pc.openNow('ft-studio');assert.equal(frames.size,1);pc.openNow('rap-notebook');
 assert.equal(frames.size,0,'covering maximized FT cancels its visual RAF');
 pc.windowAction({type:'minimize',id:'ft-studio'});pc.windowAction({type:'minimize',id:'rap-notebook'});
 const state=pc.state;pc.syncState({...state,get projects(){throw Error('hidden app read projects');}});
 pc.syncState(state);pc.windowAction({type:'activate',id:'ft-studio'});assert.equal(frames.size,1);
 pc.closeWindow('ft-studio');assert.equal(frames.size,0);pc.dispose();
});

test('FT updates do not serialize archived projects and preserve an open name field',()=>{
 const d=pcDocument(),root=d.createElement('main'),pc=mountVirtualPc(root);
 pc.showDesktop(createVirtualPcState({power:'on',download:{status:'installed'}}));pc.openNow('ft-studio');
 findButton(root,'Новый проект').click();const input=allPc(root).find(n=>n.getAttribute('aria-label')==='Название бита');input.value='Живой ввод';input.focus();
 pc.state.projects.push({id:'archive',get unusedArchive(){throw Error('serialized the archive');}});
 for(let i=0;i<120;i++)pc.syncHost({...pc.metadata,gameMinutes:720+i/120,clockLabel:i<60?'12:00':'12:01'});
 assert.equal(input.value,'Живой ввод');assert.equal(d.activeElement,input);
 assert.ok(allPc(root).some(n=>n.tagName==='TIME'&&n.textContent==='12:01'));pc.dispose();
});

test('FT visual RAF restarts after a transition reveal without requiring a data change',()=>{
 const d=pcDocument(),root=d.createElement('main'),frames=new Map();let sequence=0;
 d.defaultView={requestAnimationFrame:fn=>{const id=++sequence;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)};
 const pc=mountVirtualPc(root);pc.showDesktop(createVirtualPcState({download:{status:'installed'}}));pc.openNow('ft-studio');
 pc.presentTransition({phase:'working',overlay:0,locked:true});assert.equal(frames.size,0);
 pc.presentTransition({phase:'desktop',overlay:1,locked:false});assert.equal(frames.size,1);pc.dispose();
});

test('syncHost detects a host skill mutation even when the host retains its skills object',()=>{
 const d=pcDocument(),root=d.createElement('main'),pc=mountVirtualPc(root),skills={writing:10};
 pc.showDesktop(createVirtualPcState({software:{notebook:{installed:true}}}));pc.openNow('rap-notebook');pc.syncHost({...pc.metadata,skills});
 skills.writing=30;pc.syncHost({...pc.metadata,skills});
 assert.ok(allPc(root).some(n=>n.textContent==='Письмо 30.00 / 100'));pc.dispose();
});
