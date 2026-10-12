import test from 'node:test';
import assert from 'node:assert/strict';
import {mountVirtualPc} from '../src/virtual-pc-ui.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {pcDocument,allPc,findButton} from './helpers/virtual-pc-dom.js';
import {PcSounds} from '../src/virtual-pc-sounds.js';
import {AudioContext} from './helpers/pc-audio.js';
import {createBeat,startBeatStage} from '../src/beat-production.js';
import {ApartmentAnimation} from '../src/apartment-v3-animation.js';
import {creativeFixture} from './helpers/creative-fixtures.js';
import {startCreativeChain} from '../src/creative-workflow.js';
import {advanceCreativeWork} from '../src/home-creative-work.js';
import {AnimationMixer,AnimationClip,QuaternionKeyframeTrack,Object3D,Bone} from '../vendor/three/three.module.js';

test('leaving the computer transfers a partial chain to its project',()=>{
 const f=creativeFixture('beat'),d=pcDocument(),root=d.createElement('section');
 const s=advanceCreativeWork(startCreativeChain(f.state,{kind:'beat',projectId:f.projectId},f.skills).state,2,null,f.skills).state;
 const job=structuredClone(s.music.job),pc=mountVirtualPc(root);
 pc.showDesktop(s);pc.requestLeave();assert.equal(pc.state.music.job,null);
 assert.deepEqual(pc.state.creativeWork.items[0].pausedJob,job);pc.dispose();
});

test('delayed FT launch fills desktop above taskbar, announces sound once and closes only the welcome card',()=>{
 const d=pcDocument(),root=d.createElement('section'),cues=[];let launch;
 const pc=mountVirtualPc(root,{audio:{stop(){},dispose(){}},onAppSound:cue=>cues.push(cue),setTimeoutFn:fn=>(launch=fn,1),clearTimeoutFn(){}});
 pc.showDesktop(createVirtualPcState({power:'on',download:{status:'installed'}}));pc.open('ft-studio');
 assert.equal(cues.length,0);launch();
 const win=pc.windows.windows[0];assert.equal(win.mode,'maximized');
 assert.deepEqual(win.rect,{x:0,y:0,width:pc.windows.viewport.width,height:pc.windows.viewport.height-32});
 assert.deepEqual(cues,['studio']);
 const dialog=allPc(root).find(n=>n.dataset.ftRole==='dialog');
 assert.deepEqual(allPc(dialog).filter(n=>n.tagName==='BUTTON').map(n=>n.textContent),['Новый проект','Открыть проект','Закрыть']);
 findButton(dialog,'Закрыть').click();assert.equal(allPc(root).some(n=>n.dataset.ftRole==='dialog'),false);
 assert.equal(pc.windows.windows.length,1);pc.open('ft-studio');assert.deepEqual(cues,['studio']);
 pc.closeWindow('ft-studio');pc.open('ft-studio');launch();assert.deepEqual(cues,['studio','studio']);pc.dispose();
});

test('system and studio cues sound without external files and have distinct bounded motifs',async()=>{
 const motifs=[];
 for(const cue of ['startup','shutdown','studio']){
  const s=new PcSounds({AudioContext,fetch:()=>{throw Error('must work offline');}});
  assert.equal((await s.play(cue)).ok,true,cue);
  assert.ok(s.context.sources.length>=3);assert.ok(s.context.sources.every(n=>n.stopTime>n.startTime&&n.stopTime<3));
  motifs.push(s.context.sources.map(n=>n.frequency.values));s.stop();assert.equal(s.nodes.size,0);s.dispose();
 }
 assert.notDeepEqual(motifs[0],motifs[1]);assert.notDeepEqual(motifs[0],motifs[2]);
});

test('ordinary FT launch is an empty session without deleting the previous project or unfinished work',()=>{
 const d=pcDocument(),root=d.createElement('section');let launch;
 const pc=mountVirtualPc(root,{audio:{stop(){},dispose(){}},setTimeoutFn:fn=>(launch=fn,1),clearTimeoutFn(){}});
 let state=createBeat(createVirtualPcState({power:'on',download:{status:'installed'}}),{id:'saved',name:'Сохранённый'},{}).state;
 state=startBeatStage(state,'saved',undefined,{}).state;const before=structuredClone(state);
 pc.showDesktop(state);pc.open('ft-studio');launch();findButton(allPc(root).find(n=>n.dataset.ftRole==='dialog'),'Закрыть').click();
 assert.equal(Boolean(findButton(root,'Продолжить этап')),false);assert.deepEqual(pc.state.projects,before.projects);assert.deepEqual(pc.state.music.job,before.music.job);
 pc.openProject(state.projects[0]);assert.ok(findButton(root,'Продолжить этап'));pc.dispose();
});

test('work typing moves both forearms rapidly, freezes on pause, and restores seated base without drift',()=>{
 const root=new Object3D(),left=new Bone(),right=new Bone();left.name='forearm.L';right.name='forearm.R';root.add(left,right);
 const clip=new AnimationClip('seated',1,[new QuaternionKeyframeTrack('forearm.L.quaternion',[0,1],[0,0,0,1,0,0,0,1]),new QuaternionKeyframeTrack('forearm.R.quaternion',[0,1],[0,0,0,1,0,0,0,1])]);
 const animation=new ApartmentAnimation(new AnimationMixer(root),[clip],.84),state={clip:'seated',fade:1,walkDistance:0,working:true};
 animation.update(state,1/60);const pose=left.quaternion.toArray();
 assert.ok(Math.abs(left.quaternion.x)>.01);assert.ok(Math.abs(right.quaternion.x)>.01);
 animation.update(state,1/60);assert.notDeepEqual(left.quaternion.toArray(),pose);
 const paused=left.quaternion.toArray();animation.update(state,1,true);assert.deepEqual(left.quaternion.toArray(),paused);
 for(let i=0;i<120;i++)animation.update(state,1/60);
 assert.ok(Math.abs(left.quaternion.x)<.15,'small wrist-plane taps, not cumulative arm drift');
 animation.update({...state,working:false},0);assert.deepEqual(left.quaternion.toArray(),[0,0,0,1]);
});
