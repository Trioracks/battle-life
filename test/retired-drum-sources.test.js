import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {DRUMS,drumById} from '../src/beat-catalog.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createBeat,acquireDrum,startBeatStage,advanceBeatWork} from '../src/beat-production.js';
import {resolveBeatPlayback} from '../src/beat-playback.js';
import {BeatAudio} from '../src/beat-audio.js';
import {createLyric,startLyricWork,advanceLyricWork} from '../src/lyric-production.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {startCreativeChain,pauseCreativeChain} from '../src/creative-workflow.js';

const retired=['free','shop'].flatMap(bank=>Array.from({length:bank==='free'?5:10},(_,i)=>({
 id:`${bank}-${String(i+1).padStart(2,'0')}`,
 file:`../stems/drums/${bank==='free'?'free':'shops'}/${String(i+1).padStart(2,'0')}.mp3`,
})));
const project=(version,drumId)=>({version,kind:'beat',id:'old',name:'Старый проект',genre:'boombap',bpm:90,drumId,
 stages:[{sliders:[9,3,2],fit:81,quality:32}],status:'draft',
 ...(version===3?{audio:{bankVersion:1,bars:4,themeId:'beginner-theme-01',arrangementId:'beginner-arrangement-01'},productionMode:'automatic'}:{})});

test('all fifteen retired MP3s are absent and never offered by the active catalog',()=>{
 assert.deepEqual(DRUMS,[]);
 for(const {id,file} of retired){
  assert.equal(existsSync(new URL(file,import.meta.url)),false,file);
  assert.equal(drumById(id)?.retired,true,id);
  assert.equal(drumById(id)?.path,undefined,id);
 }
});

test('retired purchases and project decisions survive save/load without replacement or work charges',()=>{
 for(const version of [2,3])for(const {id} of retired){
  const original=project(version,id);
  let s=createVirtualPcState({projects:[original],music:{cash:4321,practice:3,owned:[{id:'shop-01',method:'buy'}],activeBeatId:'old',job:{beatId:'old',stage:1,total:80,elapsed:12,skill:20,sliders:[5,5,5]}}});
  s=createVirtualPcState(JSON.parse(JSON.stringify(s)));
  const saved=s.projects[0];assert.ok(saved,id);assert.equal(saved.drumId,id);
  assert.deepEqual(saved.stages,original.stages);assert.equal(saved.audioIssue,'retired-source');
  assert.deepEqual(s.music.owned,[{id:'shop-01',method:'buy'}]);assert.equal(s.music.activeBeatId,'old');
  assert.equal(s.music.job,null);assert.equal(s.retiredSourceWork[0].job.elapsed,12);assert.equal(s.retiredSourceWork[0].domain,'music');
  assert.equal(startBeatStage(s,'old',undefined,{}).ok,false);
  const advanced=advanceBeatWork(s,80);assert.equal(advanced.minutes,0);
  assert.deepEqual(advanced.state,s);
  const play=resolveBeatPlayback(saved);assert.equal(play.ok,false);assert.match(play.reason,/источник.*недоступен/i);
  const made=createBeat(s,{id:'fresh',name:'Новый бит'},{beatmaking:100});assert.equal(made.ok,true);
  assert.equal(startBeatStage(made.state,'fresh',[5,5,5],{}).ok,true);
  assert.equal(createLyric(s,{id:'fresh-text',name:'Новый текст'}).ok,true);
 }
});

test('retired sources cannot be bought, downloaded, ripped or selected even when previously owned',()=>{
 for(const {id} of retired){
  const s=createVirtualPcState({music:{owned:[{id:'shop-01',method:'buy'}],ripline:true}});
  for(const method of ['buy','torrent','rip']){
   const r=acquireDrum(s,id,method,()=>{throw Error('No risk roll for unavailable content');});
   assert.equal(r.ok,false);assert.match(r.reason,/недоступен/i);assert.deepEqual(r.state,s);
  }
  const r=createBeat(s,{id:'new',name:'Новый',assetId:id},{beatmaking:100});
  assert.equal(r.ok,false);assert.match(r.reason,/недоступен/i);assert.deepEqual(r.state,s);
 }
});

test('retired preview cannot fetch, substitute or replay a cached buffer',async()=>{
 const audio=new BeatAudio({contextFactory:()=>{throw Error('No audio context should be opened');},fetchFn:()=>{throw Error('No request for a retired asset');}});
 for(const {id} of retired){
  audio.cache.set(id,{duration:16/3});
  assert.equal(await audio.play({drumId:id,stage:3}),false);
  assert.match(audio.error,/источник.*недоступен/i);assert.equal(audio.sources.length,0);
 }
 audio.dispose();
});

test('new and saved adaptations cannot spend work on retired beats; saved jobs are archived, not blocking',()=>{
 let s=submissionFixture({vocal:false});
 const started=startLyricWork(s,{projectId:'lyrics',kind:'adapt',beatId:'beat'});assert.equal(started.ok,true);
 const old=structuredClone(started.state);old.projects.find(p=>p.id==='beat').drumId='free-01';
 const advanced=advanceLyricWork(old,1000);assert.equal(advanced.minutes,0);assert.equal(advanced.blocked,true);assert.match(advanced.reason,/недоступен/i);
 const loaded=createVirtualPcState(old);assert.equal(loaded.writing.job,null);
 assert.equal(loaded.retiredSourceWork[0].job.beatId,'beat');assert.equal(loaded.retiredSourceWork[0].domain,'writing');
 assert.deepEqual(createVirtualPcState(JSON.parse(JSON.stringify(loaded))),loaded);
 assert.equal(startLyricWork(loaded,{projectId:'lyrics',kind:'adapt',beatId:'beat'}).ok,false);
 assert.equal(createLyric(loaded,{id:'fresh',name:'Новый текст'}).ok,true);
});

test('a paused chain cannot restore an active job for a retired source',()=>{
 let s=createBeat(createVirtualPcState(),{id:'old',name:'Старый бит'},{}).state;
 s=startCreativeChain(s,{kind:'beat',projectId:'old'},{}).state;s=advanceBeatWork(s,5).state;
 s=pauseCreativeChain(s);const saved=structuredClone(s.creativeWork.items[0].pausedJob);
 s.projects[0].drumId='free-01';s=createVirtualPcState(s);
 const resumed=startCreativeChain(s,{kind:'beat',projectId:'old'},{});
 assert.equal(resumed.ok,false);assert.match(resumed.reason,/недоступен/i);assert.equal(resumed.state.music.job,null);
 assert.deepEqual(resumed.state.creativeWork.items[0].pausedJob,saved);
 const fresh=createBeat(s,{id:'fresh',name:'Новый бит'},{}).state;
 assert.equal(startCreativeChain(fresh,{kind:'beat',projectId:'fresh'},{}).ok,true);
});
