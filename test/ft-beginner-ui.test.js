import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudioWorkspace} from '../src/ft-studio-view.js?rev=27';
import {mountBeatStudio} from '../src/beat-studio-view.js?rev=27';
import {mountVirtualPc} from '../src/virtual-pc-ui.js?rev=27';
import {createVirtualPcState} from '../src/virtual-pc-state.js?rev=27';
import {createBeat,startBeatStage,advanceBeatWork,restoreMusicNeeds} from '../src/beat-production.js?rev=27';
import {createLyric} from '../src/lyric-production.js?rev=27';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
const role=(root,key)=>allPc(root).find(n=>n.dataset.ftRole===key);
function setup(state=createVirtualPcState(),metadata={skills:{beatmaking:10},gameDay:1}){
 const d=pcDocument(),root=d.createElement('section');let work=0,unlocks=0;
 const audio={unlock(){unlocks++;return Promise.resolve();},stop(){},pause(){},playProject:async()=>true,getSnapshot:()=>({status:'stopped',positionSeconds:0,durationSeconds:32/3}),dispose(){}};
 const view=mountBeatStudio(root,{getState:()=>state,getMetadata:()=>metadata,onChange:next=>state=next,onWork:()=>{work++;return true;},audio});
 return {d,root,view,audio,get state(){return state;},set state(next){state=next;view.update();},work:()=>work,unlocks:()=>unlocks};
}

test('FT project picker excludes notebook documents while keeping legacy music projects',()=>{
 let state=createLyric(createVirtualPcState({projects:[{id:'legacy',name:'Старый бит'}]}),{id:'text',name:'Не музыка'}).state;
 const s=setup(state);findButton(s.root,'Открыть проект').click();
 const labels=allPc(role(s.root,'dialog')).filter(n=>n.className==='ft-project-item').map(n=>n.textContent);
 assert.ok(labels.some(x=>x.includes('Старый бит')));assert.ok(labels.every(x=>!x.includes('Не музыка')));s.view.dispose();
});
test('analytics show the saved layer result and sound skill after the character trains',()=>{
 let state=createBeat(createVirtualPcState(),{id:'audio',name:'Sound'},{sound:12}).state;
 state=startBeatStage(state,'audio',[9,3,2],{beatmaking:10,sound:12}).state;state=advanceBeatWork(state,600).state;
 const s=setup(state,{skills:{beatmaking:10,sound:99},gameDay:1});s.view.openProject(state.projects[0]);
 const mix=role(s.root,'mix-character');assert.ok(mix);
 assert.ok(allPc(mix).some(n=>n.textContent?.includes('31.4/110')));
 const analytics=role(s.root,'analytics');
 assert.ok(allPc(analytics).some(n=>n.textContent?.includes('Результат 31.4/110')&&n.textContent.includes('звук 12.0')));
 assert.ok(!allPc(analytics).some(n=>n.textContent?.includes('звук 99')));
 s.view.dispose();
});
test('unrelated preview or project playback does not own this FT transport',()=>{
 let state=createBeat(createVirtualPcState(),{id:'a',name:'Current'},{}).state;
 state=startBeatStage(state,'a',undefined,{}).state;state=advanceBeatWork(state,600).state;
 const s=setup(state);s.view.openProject(state.projects[0]);let played=null;s.audio.playProject=async beat=>{played=beat.id;return true;};
 for(const owner of ['preview','studio']){
  s.audio.getSnapshot=()=>({status:'playing',owner,key:'another-sound',positionSeconds:4,durationSeconds:32/3});s.view.update();
  assert.equal(findButton(s.root,'Play').disabled,false);assert.equal(findButton(s.root,'Pause').disabled,true);
  assert.equal(role(s.root,'playhead').style.left,'0%');assert.equal(role(s.root,'transport-status').textContent,'Готов к прослушиванию');
 }
 findButton(s.root,'Play').click();assert.equal(played,'a');s.view.dispose();
});

test('random title uses current game date, rerolls two words, remains editable and is saved once',()=>{
 const metadata={skills:{beatmaking:10},gameDay:1},s=setup(undefined,metadata);findButton(s.root,'Новый проект').click();
 const name=allPc(s.root).find(n=>n.getAttribute('aria-label')==='Название бита'),random=findButton(s.root,'Случайное название');
 assert.ok(random);random.click();const first=name.value;assert.match(first,/^01\.09\.2012 — [А-Яа-яё]+ [А-Яа-яё]+$/u);
 random.click();assert.notEqual(name.value,first);metadata.gameDay=31;random.click();assert.match(name.value,/^01\.10\.2012 — /);
 name.value+=' демо';const final=name.value;findButton(s.root,'Начать проект').click();assert.equal(s.state.projects[0].name,final);
 metadata.gameDay=32;s.view.update();s.view.openProject(s.state.projects[0]);assert.equal(s.state.projects[0].name,final);s.view.dispose();
});
test('empty workspace has one placeholder lane and top transport, panels toggle independently',()=>{
 const root=createStudioWorkspace(pcDocument()),names=allPc(root).filter(n=>n.dataset.ftRole==='track-label').map(n=>n.textContent);
 assert.deepEqual(names,['Дорожка 01']);
 const transport=role(root,'transport');assert.ok(transport);for(const name of ['Play','Pause','Stop'])assert.ok(findButton(transport,name));
 assert.equal(role(root,'rhythm').hidden,true);assert.equal(Boolean(role(root,'library').hidden),false);
 findButton(root,'Библиотека').click();assert.equal(role(root,'library').hidden,true);assert.equal(role(root,'rhythm').hidden,true);
 findButton(root,'Ритм-панель').click();assert.equal(role(root,'rhythm').hidden,false);assert.equal(findButton(root,'Ритм-панель').getAttribute('aria-expanded'),'true');
});
test('launch menu, name-only form, cancel and host updates preserve input and focus',()=>{
 const s=setup();assert.ok(role(s.root,'dialog'));findButton(s.root,'Новый проект').click();
 const name=allPc(s.root).find(n=>n.getAttribute('aria-label')==='Название бита');name.value='Пыль';name.focus();s.view.update();
 assert.equal(s.d.activeElement,name);assert.equal(name.value,'Пыль');assert.equal(allPc(s.root).filter(n=>n.tagName==='SELECT'||n.type==='range').length,0);
 findButton(s.root,'Отмена').click();assert.equal(s.state.projects.length,0);findButton(s.root,'Новый проект').click();
 allPc(s.root).find(n=>n.getAttribute('aria-label')==='Название бита').value='Пыль';findButton(s.root,'Начать проект').click();
 assert.equal(s.state.projects.length,1);assert.equal(role(s.root,'dialog'),undefined);assert.equal(s.state.projects[0].name,'Пыль');
 findButton(s.root,'Работать над этапом').click();assert.equal(s.work(),1);assert.equal(s.unlocks(),1);s.view.dispose();
});
test('completed stages fill three lanes each at bar one, menu does not reappear on updates',()=>{
 const s=setup(createBeat(createVirtualPcState(),{id:'a',name:'Сеанс'},{beatmaking:10},()=>0).state);s.view.openProject(s.state.projects[0]);
 for(let stage=0;stage<=3;stage++){
  const names=allPc(s.root).filter(n=>n.dataset.ftRole==='track-label').map(n=>n.textContent);
  assert.deepEqual(names,stage===0?['Дорожка 01']:['Drum Kit','Bass','Percussion','Lead','Atmosphere','Harmony','Sound Design','Sub Bass','FX'].slice(0,stage*3));
  const clips=allPc(s.root).filter(n=>n.dataset.ftRole==='clip');assert.equal(clips.length,stage*3);assert.ok(clips.every(n=>n.style.marginLeft==='0%'&&n.style.width==='25%'));
  assert.equal(role(s.root,'dialog'),undefined);if(stage===3)break;
  let state=restoreMusicNeeds(restoreMusicNeeds(s.state,'meal'),'sleep',360);state=startBeatStage(state,'a',undefined,{beatmaking:10},()=>0).state;s.state=advanceBeatWork(state,600).state;
 }
 assert.equal(allPc(s.root).filter(n=>/mute|solo/i.test(n.textContent??'')).length,0);s.view.dispose();
});

test('project actions stay above lanes and analytics contain only results, not workflow buttons',()=>{
 const s=setup(createBeat(createVirtualPcState(),{id:'a',name:'Saved'},{}).state);s.view.openProject(s.state.projects[0]);
 const actions=role(s.root,'project-actions'),workflow=role(s.root,'workflow'),analytics=role(s.root,'analytics');
 assert.ok(actions);assert.ok(workflow);assert.ok(analytics);
 assert.ok(findButton(actions,'Новый проект'));assert.ok(findButton(actions,'Открыть проект'));
 assert.ok(findButton(workflow,'Работать над этапом'));
 assert.equal(allPc(analytics).filter(n=>n.tagName==='BUTTON').length,0);
 assert.equal(s.d.activeElement,findButton(actions,'Новый проект'),'project selection restores focus to a live control');
 assert.equal(analytics.contains(workflow),false);s.view.dispose();
});

test('legacy quality is not misreported as the character historical skill',()=>{
 const legacy={version:2,kind:'beat',id:'legacy',name:'Old',genre:'boombap',bpm:90,drumId:'primitive',stages:[{sliders:[5,5,5],quality:37,fit:100}],status:'draft'};
 const s=setup(createVirtualPcState({projects:[legacy]}));s.view.openProject(legacy);
 assert.equal(allPc(role(s.root,'analytics')).some(n=>n.textContent?.startsWith('Навык при работе:')),false);
 assert.equal(allPc(s.root).filter(n=>n.dataset.ftRole==='clip').length,3);assert.equal(s.state.projects[0].stages[0].quality,37);s.view.dispose();
});
test('project menu reads fresh state, Escape closes dialog and traps Tab',()=>{
 const s=setup(createBeat(createVirtualPcState(),{id:'a',name:'Saved'},{}).state);const dialog=role(s.root,'dialog');assert.ok(dialog);
 const buttons=allPc(dialog).filter(n=>n.tagName==='BUTTON');buttons.at(-1).focus();fire(dialog,'keydown',{key:'Tab'});assert.equal(s.d.activeElement,buttons[0]);
 s.state={...s.state,music:{...s.state.music,cash:1234,needs:{satiety:91,energy:82}}};findButton(s.root,'Открыть проект').click();
 assert.equal(s.state.music.cash,1234);assert.equal(s.state.music.needs.energy,82);
 fire(role(s.root,'dialog'),'keydown',{key:'Escape'});assert.equal(role(s.root,'dialog'),undefined);s.view.dispose();
});
test('Explorer selection survives delayed launch and a later normal launch still shows menu',()=>{
 const d=pcDocument(),root=d.createElement('section');let launch;
 const pc=mountVirtualPc(root,{audio:{stop(){},dispose(){}},beatAudio:{stop(){},dispose(){},getSnapshot:()=>({status:'stopped'})},setTimeoutFn:fn=>(launch=fn,1),clearTimeoutFn(){}});
 const state=createBeat(createVirtualPcState({power:'on',download:{status:'installed'}}),{id:'a',name:'Saved'},{}).state;pc.showDesktop(state);
 pc.openProject(state.projects[0]);launch();assert.equal(role(root,'dialog'),undefined);assert.ok(findButton(root,'Работать над этапом'));
 pc.closeWindow('ft-studio');pc.open('ft-studio');launch();assert.ok(role(root,'dialog'));pc.dispose();
});
