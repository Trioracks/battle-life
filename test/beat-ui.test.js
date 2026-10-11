import test from 'node:test';
import assert from 'node:assert/strict';
import {mountVirtualPc} from '../src/virtual-pc-ui.js?rev=27';
import {createVirtualPcState} from '../src/virtual-pc-state.js?rev=27';
import {advanceBeatWork,createBeat,startBeatStage,restoreMusicNeeds} from '../src/beat-production.js?rev=27';
import {createStudioProject} from '../src/ft-studio-project.js?rev=27';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
function setup(){const d=pcDocument(),root=d.createElement('section');let launch,work=0;const pc=mountVirtualPc(root,{audio:{stop(){},dispose(){}},beatAudio:{play:async()=>true,stop(){},dispose(){}},setTimeoutFn:f=>(launch=f,1),clearTimeoutFn(){},onWork:()=>{work++;return true;}});pc.showDesktop(createVirtualPcState({power:'on',download:{status:'installed'}}));pc.syncHost({playerName:'Игрок',clockLabel:'10:00',skills:{beatmaking:40}});return {pc,root,launch:()=>launch(),work:()=>work};}
const field=(root,label)=>allPc(root).find(n=>n.getAttribute('aria-label')===label);
test('FT creates a beat without tempo editing and retains inputs across host ticks',()=>{
 const s=setup();s.pc.open('ft-studio');s.launch();findButton(s.root,'Новый проект').click();
 const name=field(s.root,'Название бита');assert.ok(name);name.value='Город';fire(name,'input');name.focus();
 s.pc.syncHost({playerName:'Игрок',clockLabel:'10:01',skills:{beatmaking:40}});assert.equal(field(s.root,'Название бита'),name);assert.equal(name.value,'Город');
 findButton(s.root,'Начать проект').click();assert.equal(s.pc.state.projects[0].name,'Город');assert.match(s.pc.state.projects[0].drumId,/free/);
 assert.equal(allPc(s.root).filter(n=>n.type==='range').length,3);assert.equal(field(s.root,'BPM'),undefined);
 const groove=field(s.root,'Ровный грув');groove.value='9';fire(groove,'input');
 findButton(s.root,'Работать над этапом').click();assert.equal(s.work(),1);assert.ok(s.pc.state.music.job);assert.equal(s.pc.state.music.job.sliders[0],9);
 s.pc.syncState(advanceBeatWork(s.pc.state,600).state);
 const workflow=allPc(s.root).find(n=>n.dataset.ftRole==='workflow');
 assert.ok(allPc(workflow).some(n=>n.textContent?.includes('Музыкальная основа')));
 assert.equal(allPc(s.root).filter(n=>n.dataset.ftRole==='clip').length,3);s.pc.dispose();
});

test('beginner decisions stay hidden at 25 and appear above 25',()=>{
 for(const skill of [10,25,26]){
  const s=setup();s.pc.syncHost({skills:{beatmaking:skill}});
  const state=createBeat(s.pc.state,{id:'tier',name:'Порог'},{beatmaking:skill}).state;s.pc.syncState(state);s.pc.openProject(state.projects[0]);s.launch();
  assert.equal(allPc(s.root).filter(n=>n.type==='range').length,skill<=25?0:3);s.pc.dispose();
 }
});
test('local store buys a sample once and RIPLINE is installable',()=>{
 const s=setup();s.pc.open('underweb');s.pc.navigateUnderweb('underweb://samples');
 findButton(s.root,'Купить Архив / 01').click();assert.equal(s.pc.state.music.owned.length,1);assert.equal(s.pc.state.music.cash,4750);
 s.pc.navigateUnderweb('underweb://ripline');findButton(s.root,'Установить RIPLINE').click();assert.equal(s.pc.state.music.ripline,true);
 s.pc.open('ripline');assert.ok(s.pc.windows.windows.some(w=>w.id==='ripline'));
 assert.ok(allPc(s.root).some(n=>n.textContent?.includes('Только внутриигровая')));
});
test('finished beat keeps base quality hidden and presents a subjective impression',()=>{
 const s=setup();let state=createBeat(s.pc.state,{id:'done',name:'Готовый',genre:'boombap'},{}).state;
 for(let i=0;i<3;i++){state=restoreMusicNeeds(restoreMusicNeeds(state,'meal'),'sleep',360);state=startBeatStage(state,'done',[5,5,5],{}).state;state=advanceBeatWork(state,600).state;}
 s.pc.syncState(state);s.pc.openProject(state.projects[0]);s.launch();assert.equal(allPc(s.root).some(n=>/\d+ \/ 100/.test(n.textContent)),false);
 assert.ok(allPc(s.root).some(n=>n.textContent==='Впечатление героя'));
});
test('reset stops shop audio even when FT has not been opened',()=>{
 const d=pcDocument();let stopped=0;const pc=mountVirtualPc(d.createElement('section'),{beatAudio:{stop(){stopped++;},dispose(){}},audio:{stop(){},dispose(){}}});
 pc.reset(createVirtualPcState());assert.equal(stopped,1);
});
test('Projects navigation preserves live wallet, infection, recovered needs and partial work',()=>{
 const s=setup();let state=createBeat(s.pc.state,{id:'live',name:'Живой',genre:'boombap'},{}).state;
 state=startBeatStage(state,'live',[5,5,5],{}).state;state.music.infected=true;s.pc.syncState(state);s.pc.open('ft-studio');s.launch();
 let live=advanceBeatWork(s.pc.state,9).state;live=restoreMusicNeeds(live,'meal');live.music.cash=4900;live.music.infected=false;
 s.pc.syncState(live);findButton(s.root,'Открыть проект').click();
 assert.deepEqual({...s.pc.state.music,activeBeatId:live.music.activeBeatId},live.music);assert.deepEqual(s.pc.state.projects,live.projects);
});
test('Explorer opening selects a saved beat even while the new-beat form is open',()=>{
 const s=setup(),state=createBeat(s.pc.state,{id:'existing',name:'Существующий',genre:'boombap'},{}).state;s.pc.syncState(state);s.pc.open('ft-studio');s.launch();findButton(s.root,'Новый проект').click();assert.ok(field(s.root,'Название бита'));
 s.pc.openProject(state.projects[0]);assert.equal(Boolean(field(s.root,'Название бита')),false);assert.ok(findButton(s.root,'Работать над этапом'));
});
test('opening a legacy project replaces the active v2 view without rewriting its data',()=>{
 const s=setup(),legacy=createStudioProject({id:'legacy',name:'Архивный проект',battleId:'concrete-echo'}).project;let state=createBeat(s.pc.state,{id:'new',name:'Новый проект',genre:'boombap'},{}).state;state.projects.push(legacy);s.pc.syncState(state);s.pc.open('ft-studio');s.launch();s.pc.openProject(legacy);
 assert.equal(s.pc.state.music.activeBeatId,null);assert.equal(Boolean(findButton(s.root,'Работать над этапом')),false);
 assert.ok(allPc(s.root).some(n=>n.textContent==='Архивный проект'));assert.ok(allPc(s.root).some(n=>n.textContent?.includes('Открыт прежний проект: Архивный проект')));
 assert.deepEqual(s.pc.state.projects,state.projects);
});
