import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createBeat,startBeatStage,advanceBeatWork,normalizeBeat} from '../src/beat-production.js';
const seed=()=>createVirtualPcState({power:'on',download:{status:'installed'}});
const make=(skill=25,random=()=>0)=>createBeat(seed(),{id:'a',name:'Первый'},{beatmaking:skill},random);

test('v3_only_requires_name and skill_tier_is_pinned through the free-bank boundary',()=>{
 for(const skill of [0,24,25,26,39,40]){
  const r=make(skill);assert.equal(r.ok,true);
  const beat=r.state.projects[0];assert.equal(beat.version,3);assert.equal(beat.bpm,90);
  assert.equal(beat.productionMode,skill<=25?'beginner':'automatic');
  assert.equal(beat.drumId,skill>=40?'free-01':'beginner-drums-01');
  assert.deepEqual(beat.audio,{bankVersion:1,bars:4,themeId:'beginner-theme-01',arrangementId:'beginner-arrangement-01'});
 }
});

test('choices_survive_roundtrip_and_resume without hidden rerolls or duplicate practice',()=>{
 let calls=0;const random=()=>[0,.5,.99][calls++%3],made=make(25,random);
 assert.equal(made.ok,true);assert.equal(calls,3);
 let s=made.state;const original=structuredClone(s.projects[0]);
 s=startBeatStage(s,'a',undefined,{beatmaking:25},()=>.4).state;
 assert.ok(s.music.job);assert.deepEqual(s.music.job.sliders,[4,4,4]);
 s=advanceBeatWork(s,10).state;
 s=createVirtualPcState(JSON.parse(JSON.stringify(s)));
 const resumed=startBeatStage(s,'a',undefined,{beatmaking:26},()=>{throw Error('reroll');});
 assert.equal(resumed.ok,true);assert.deepEqual(resumed.state.music.job,s.music.job);
 assert.deepEqual(resumed.state.projects[0],original);
 const done=advanceBeatWork(resumed.state,600);
 assert.equal(done.finished,true);assert.equal(done.state.music.practice,1);
 assert.equal(done.state.projects[0].productionMode,'beginner');
 assert.equal(advanceBeatWork(done.state,600).state.music.practice,1);
 assert.deepEqual(done.state.projects[0].audio,original.audio);
});

test('sliders_do_not_change_quality for new completions',()=>{
 const qualities=[];
 for(const values of [[0,0,0],[10,10,10],[9,3,2]]){
  // Explicit genre keeps this regression executable against the previous implementation.
  let s=createBeat(seed(),{id:'a',name:'Первый',genre:'boombap'},{beatmaking:25},()=>0).state;
  s=startBeatStage(s,'a',values,{beatmaking:25}).state;
  s=advanceBeatWork(s,600).state;qualities.push(s.projects[0].stages[0].quality);
 }
 assert.deepEqual(qualities,[25,25,25]);
});

test('legacy_job_keeps_sources_and_progress while new completions ignore sliders',()=>{
 const legacy={version:2,kind:'beat',id:'old',name:'Старый',genre:'boombap',bpm:90,drumId:'primitive',stages:[{sliders:[9,3,2],fit:100,quality:61}],status:'draft'};
 let s=createVirtualPcState({...seed(),projects:[legacy],music:{job:{beatId:'old',stage:1,sliders:[5,5,5],total:80,elapsed:12,skill:20},activeBeatId:'old'}});
 assert.deepEqual(s.projects[0],legacy);
 s=startBeatStage(s,'old',undefined,{beatmaking:90},()=>{throw Error('legacy reroll');}).state;
 assert.equal(s.music.job.elapsed,12);assert.equal(s.music.job.skill,20);
 s=advanceBeatWork(s,80).state;
 assert.equal(s.projects[0].version,2);assert.equal(s.projects[0].drumId,'primitive');
 assert.equal(s.projects[0].stages[0].quality,61);assert.equal(s.projects[0].stages[1].quality,20);
});

test('bad_bank_metadata_retains_project and never spends work minutes',()=>{
 const valid={version:3,kind:'beat',id:'bad',name:'Восстановимый',genre:'boombap',bpm:90,drumId:'beginner-drums-01',productionMode:'beginner',audio:{bankVersion:1,bars:4,themeId:'../../other',arrangementId:'beginner-arrangement-01'},stages:[],status:'draft'};
 let s=createVirtualPcState({...seed(),projects:[valid],music:{job:{beatId:'bad',stage:0,sliders:[1,2,3],total:50,elapsed:7,skill:10}}});
 assert.equal(s.projects.length,1);assert.equal(s.projects[0].name,'Восстановимый');assert.equal(s.projects[0].audioIssue,'invalid-bank');
 assert.deepEqual(normalizeBeat(s.projects[0]),s.projects[0]);
 assert.equal(startBeatStage(s,'bad',undefined,{}).ok,false);
 const r=advanceBeatWork(s,20);assert.equal(r.minutes,0);assert.equal(r.blocked,true);
 assert.equal(r.state.music.job.elapsed,7);assert.equal(r.state.music.practice,0);
 assert.deepEqual(r.state.music.needs,s.music.needs);
});
