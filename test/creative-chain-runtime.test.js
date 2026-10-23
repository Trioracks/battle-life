import test from 'node:test';
import assert from 'node:assert/strict';
import {creativeFixture} from './helpers/creative-fixtures.js';
import {startCreativeChain,pauseCreativeChain,creativeChainProgress} from '../src/creative-workflow.js';
import {advanceCreativeWork,creativeWorkDescriptor} from '../src/home-creative-work.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
// Beat fixtures start at the agreed anchor 50: one full beat earns one point.
const begin=kind=>{const f=creativeFixture(kind,kind==='beat'?{skill:50}:{});return {...f,state:startCreativeChain(f.state,{kind,projectId:f.projectId},f.skills,()=>.4).state};};
for(const kind of ['beat','lyrics']){
 test(kind+' three stages one run and same outcome split delta',()=>{
  const f=begin(kind),one=advanceCreativeWork(f.state,24,{day:1,minutes:1400},f.skills);
  assert.equal(one.finished,true);assert.equal(one.state.projects[0].stages.length,3);assert.ok(Math.abs(one.practiceGained-1)<1e-9);
  let s=f.state,minutes=0,previous=0;
  for(let i=0;i<240;i++){const r=advanceCreativeWork(s,.1,{day:1+Math.floor((1400+minutes)/1440),minutes:(1400+minutes)%1440},f.skills);s=r.state;minutes+=r.minutes;const p=creativeChainProgress(s,f.projectId).overall;assert.ok(p+1e-9>=previous);previous=p;}
  // IEEE-754 accumulation may differ by a few ULPs across 240 ticks.
  const rounded=v=>JSON.parse(JSON.stringify(v,(_key,x)=>typeof x==='number'?Math.round(x*1e9)/1e9:x));
  assert.deepEqual(rounded(s.projects),rounded(one.state.projects));assert.ok(Math.abs(minutes-one.minutes)<1e-7);
  assert.ok(Math.abs(s[kind==='beat'?'music':'writing'].practice-1)<1e-9);
 });
 test(kind+' blocked exactly at stage boundary does not start next stage',()=>{
  const f=begin(kind),duration=f.state.creativeWork.items[0].plans[0].total;
  f.state.music.needs.satiety=20+duration*.12;
  const r=advanceCreativeWork(f.state,24,null,f.skills);
  assert.equal(r.finished,false);assert.equal(r.blocked,true);assert.equal(r.state.projects[0].stages.length,1);
  assert.equal(r.state[kind==='beat'?'music':'writing'].job,null);assert.equal(r.state.creativeWork.activeId,null);
 });
 test(kind+' reload every stage and resume without extra XP',()=>{
  const f=begin(kind);let s=f.state;
  for(let stage=0;stage<3;stage++){
   s=advanceCreativeWork(s,4,null,f.skills).state;
   const credit=s[kind==='beat'?'music':'writing'].practice;
   const paused=pauseCreativeChain(s);assert.deepEqual(pauseCreativeChain(paused),paused);
   s=createVirtualPcState(JSON.parse(JSON.stringify(paused)));
   assert.equal(s[kind==='beat'?'music':'writing'].practice,credit);
   s=startCreativeChain(s,{kind,projectId:f.projectId},f.skills).state;s=advanceCreativeWork(s,4,null,f.skills).state;
  }
  assert.equal(s.projects[0].stages.length,3);assert.ok(Math.abs(s[kind==='beat'?'music':'writing'].practice-1)<1e-9);
 });
}
test('invalid deltas are inert and capped practice never invents gains',()=>{
 const f=begin('beat');for(const dt of [0,-1,NaN])assert.deepEqual(advanceCreativeWork(f.state,dt).state,f.state);
 const expert=creativeFixture('beat',{skill:100});const s=startCreativeChain(expert.state,{kind:'beat',projectId:expert.projectId},expert.skills).state;
 const r=advanceCreativeWork(s,24,null,expert.skills);assert.equal(r.practiceGained,0);assert.equal(r.state.music.practice,0);
 assert.equal(creativeWorkDescriptor(f.state).chainProgress.count,3);
});

test('resume retains previously earned practice',()=>{
 for(const kind of ['beat','lyrics']){
  const f=begin(kind),owner=kind==='beat'?'music':'writing';
  const partial=advanceCreativeWork(f.state,2,null,f.skills).state;
  assert.ok(Math.abs(partial[owner].practice-1/12)<1e-12);
  const paused=pauseCreativeChain(partial),credit=paused.creativeWork.items[0].pausedJob.practiceCredit;
  assert.ok(Math.abs(credit-1/12)<1e-12);
  const loaded=createVirtualPcState(JSON.parse(JSON.stringify(paused)));
  const resumed=startCreativeChain(loaded,{kind,projectId:f.projectId},f.skills,()=>.9);
  assert.equal(resumed.ok,true);assert.equal(resumed.state[owner].practice,partial[owner].practice);
  assert.equal(resumed.state[owner].job.practiceCredit,credit);
  const completed=advanceCreativeWork(resumed.state,22,null,f.skills);
  assert.equal(completed.finished,true);
  assert.ok(Math.abs(completed.state[owner].practice-1)<1e-12);
  assert.ok(Math.abs(completed.practiceGained-11/12)<1e-12);
 }
});
