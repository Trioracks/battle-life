import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createBeat,startBeatStage,advanceBeatWork,restoreMusicNeeds,effectiveBeatSkill} from '../src/beat-production.js';
import {startCreativeChain,pauseCreativeChain} from '../src/creative-workflow.js';
import {chooseGenre} from '../src/genre-progression.js';
const close=(actual,want)=>assert.ok(Math.abs(actual-want)<1e-9,`${actual} != ${want}`);
const reload=s=>createVirtualPcState(JSON.parse(JSON.stringify(s)));
function fresh(skill=0){return createBeat(createVirtualPcState({music:{needs:{satiety:100,energy:100}}}),{id:'b',name:'Practice'},{beatmaking:skill},()=>.4).state;}
function complete(s,skill=0){
 for(let stage=s.projects[0].stages.length;stage<3;stage++){
  s=restoreMusicNeeds(restoreMusicNeeds(s,'meal'),'sleep',500);
  const r=startBeatStage(s,'b',[5,5,5],{beatmaking:skill});assert.equal(r.ok,true,r.reason);
  s=advanceBeatWork(r.state,600).state;
 }
 return s;
}
test('new first beat freezes its budget at first start and awards three practice and six genre',()=>{
 let s=fresh();assert.equal(s.projects[0].practicePolicy,2);assert.equal(s.projects[0].practicePlan,undefined);
 s=startBeatStage(s,'b',[5,5,5]).state;
 assert.deepEqual(s.projects[0].practicePlan,{version:2,startSkill:0,totalBudget:3});assert.equal(s.music.job.stageBudget,1);
 s=complete(s);close(s.music.practice,3);close(s.music.genres.xp.experimental,6);close(effectiveBeatSkill(s),3);
});
test('budget uses base plus accumulated practice at first start',()=>{
 let s=fresh(0);s.music.practice=10;
 s=complete(s,40);close(s.music.practice,11);close(s.music.genres.xp.experimental,2);
 assert.deepEqual(s.projects[0].practicePlan,{version:2,startSkill:50,totalBudget:1});
});
test('skill cap leaves positive genre practice',()=>{
 const s=complete(fresh(100),100);close(s.music.practice,0);close(s.music.genres.xp.experimental,1/(10*Math.log(2)));
});
test('split ticks equal continuous work',()=>{
 const start=startBeatStage(fresh(),'b',[5,5,5]).state,total=start.music.job.total;
 const one=advanceBeatWork(start,total).state;let split=start;
 for(let i=0;i<100;i++)split=advanceBeatWork(split,total/100).state;
 close(split.music.practice,one.music.practice);close(split.music.genres.xp.experimental,one.music.genres.xp.experimental);
 assert.equal(split.projects[0].stages.length,1);assert.equal(split.music.job,null);
});
test('pause and reload never duplicate credit or reset frozen budget after skill changes',()=>{
 let s=startCreativeChain(fresh(),{kind:'beat',projectId:'b'},{}).state;
 s=advanceBeatWork(s,s.music.job.total/2).state;close(s.music.practice,.5);close(s.music.genres.xp.experimental,1);
 const job=structuredClone(s.music.job);close(job.practiceCredit,.5);close(job.genreCredit,.5);
 s=reload(pauseCreativeChain(s));assert.deepEqual(s.creativeWork.items[0].pausedJob,job);
 s=startCreativeChain(s,{kind:'beat',projectId:'b'},{beatmaking:50}).state;
 assert.deepEqual(s.music.job,job);s=advanceBeatWork(s,600).state;
 s=complete(reload(s),50);close(s.music.practice,3);close(s.music.genres.xp.experimental,6);
 assert.deepEqual(s.projects[0].practicePlan,{version:2,startSkill:0,totalBudget:3});
 assert.deepEqual(advanceBeatWork(s,600).state,s);
});
test('legacy partial project keeps old rewards',()=>{
 let s=fresh();delete s.projects[0].practicePolicy;
 s=startBeatStage(s,'b',[5,5,5]).state;s=advanceBeatWork(s,s.music.job.total/2).state;
 close(s.music.practice,1/6);close(s.music.genres.xp.experimental,1/6);
 s=complete(reload(s));close(s.music.practice,1);close(s.music.genres.xp.experimental,1);
 assert.equal(s.projects[0].practicePlan,undefined);
});
test('near cap genre uses unclamped budget',()=>{
 let s=fresh();s.music.practice=99.99;s=complete(s);
 close(s.music.practice,100);assert.ok(s.music.genres.xp.experimental>.14);
 close(s.music.genres.xp.experimental,s.projects[0].practicePlan.totalBudget*2);
});
test('new beat credits only its selected genre and respects its cap',()=>{
 let s=createVirtualPcState({music:{needs:{satiety:100,energy:100}}});
 s.music.genres=chooseGenre(s.music.genres,'boombap',50).value;s.music.genres.xp.boombap=99;
 s=createBeat(s,{id:'b',name:'Boom',genre:'boombap'},{beatmaking:50},()=>.4).state;
 s=complete(s,50);close(s.music.practice,1);close(s.music.genres.xp.boombap,100);close(s.music.genres.xp.experimental,0);
});
test('missing new-policy ledgers never recredit saved elapsed work',()=>{
 let s=startCreativeChain(fresh(),{kind:'beat',projectId:'b'},{}).state;
 s=advanceBeatWork(s,s.music.job.total/2).state;
 delete s.music.job.practiceCredit;delete s.music.job.genreCredit;
 s=reload(pauseCreativeChain(s));
 close(s.creativeWork.items[0].pausedJob.practiceCredit,.5);close(s.creativeWork.items[0].pausedJob.genreCredit,.5);
 s=startCreativeChain(s,{kind:'beat',projectId:'b'},{}).state;
 s=advanceBeatWork(s,600).state;close(s.music.practice,1);close(s.music.genres.xp.experimental,2);
});
