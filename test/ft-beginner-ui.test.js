import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudioWorkspace} from '../src/ft-studio-view.js';
import {mountBeatStudio} from '../src/beat-studio-view.js';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createBeat,startBeatStage,advanceBeatWork,restoreMusicNeeds} from '../src/beat-production.js';
import {pcDocument,allPc,findButton,fire} from './helpers/virtual-pc-dom.js';
const role=(root,key)=>allPc(root).find(n=>n.dataset.ftRole===key);
function setup(state=createVirtualPcState()){
 const d=pcDocument(),root=d.createElement('section');let work=0,unlocks=0;
 const audio={unlock(){unlocks++;return Promise.resolve();},stop(){},pause(){},playProject:async()=>true,getSnapshot:()=>({status:'stopped',positionSeconds:0,durationSeconds:32/3}),dispose(){}};
 const view=mountBeatStudio(root,{getState:()=>state,getMetadata:()=>({skills:{beatmaking:10}}),onChange:next=>state=next,onWork:()=>{work++;return true;},audio});
 return {d,root,view,audio,get state(){return state;},set state(next){state=next;view.update();},work:()=>work,unlocks:()=>unlocks};
}
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
test('nine named lanes and top transport, panels toggle independently',()=>{
 const root=createStudioWorkspace(pcDocument()),names=allPc(root).filter(n=>n.dataset.ftRole==='track-label').map(n=>n.textContent);
 assert.deepEqual(names,['Drum Kit','Bass','Percussion','Lead','Atmosphere','Harmony','Sound Design','Sub Bass','FX']);
 const transport=role(root,'transport');assert.ok(transport);for(const name of ['Play','Pause','Stop'])assert.ok(findButton(transport,name));
 assert.equal(role(root,'rhythm').hidden,true);assert.equal(Boolean(role(root,'library').hidden),false);
 findButton(root,'Библиотека').click();assert.equal(role(root,'library').hidden,true);assert.equal(role(root,'rhythm').hidden,true);
 findButton(root,'Ритм-панель').click();assert.equal(role(root,'rhythm').hidden,false);assert.equal(findButton(root,'Ритм-панель').getAttribute('aria-expanded'),'true');
});
test('launch menu, name-only form, cancel and host updates preserve input and focus',()=>{
 const s=setup();assert.ok(role(s.root,'dialog'));findButton(s.root,'Новый бит').click();
 const name=allPc(s.root).find(n=>n.getAttribute('aria-label')==='Название бита');name.value='Пыль';name.focus();s.view.update();
 assert.equal(s.d.activeElement,name);assert.equal(name.value,'Пыль');assert.equal(allPc(s.root).filter(n=>n.tagName==='SELECT'||n.type==='range').length,0);
 findButton(s.root,'Отмена').click();assert.equal(s.state.projects.length,0);findButton(s.root,'Новый бит').click();
 allPc(s.root).find(n=>n.getAttribute('aria-label')==='Название бита').value='Пыль';findButton(s.root,'Начать проект').click();
 assert.equal(s.state.projects.length,1);assert.equal(role(s.root,'dialog'),undefined);assert.equal(s.state.projects[0].name,'Пыль');
 findButton(s.root,'Работать над этапом').click();assert.equal(s.work(),1);assert.equal(s.unlocks(),1);s.view.dispose();
});
test('completed stages fill three lanes each at bar one, menu does not reappear on updates',()=>{
 const s=setup(createBeat(createVirtualPcState(),{id:'a',name:'Сеанс'},{beatmaking:10},()=>0).state);s.view.openProject(s.state.projects[0]);
 for(let stage=0;stage<=3;stage++){
  const clips=allPc(s.root).filter(n=>n.dataset.ftRole==='clip');assert.equal(clips.length,stage*3);assert.ok(clips.every(n=>n.style.marginLeft==='0%'&&n.style.width==='25%'));
  assert.equal(role(s.root,'dialog'),undefined);if(stage===3)break;
  let state=restoreMusicNeeds(restoreMusicNeeds(s.state,'meal'),'sleep',360);state=startBeatStage(state,'a',undefined,{beatmaking:10},()=>0).state;s.state=advanceBeatWork(state,600).state;
 }
 assert.equal(allPc(s.root).filter(n=>/mute|solo/i.test(n.textContent??'')).length,0);s.view.dispose();
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
