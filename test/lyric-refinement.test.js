import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import * as lyric from '../src/lyric-production.js';
import {createBeat,startBeatStage,advanceBeatWork} from '../src/beat-production.js';

function ready(){
 let s=lyric.createLyric(createVirtualPcState(),{id:'t',name:'Мысль'},{writing:10},()=>.4).state;
 for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=lyric.advanceLyricWork(lyric.startLyricWork(s,{projectId:'t'},{writing:10},()=>.5).state,180).state;}
 s=createBeat(s,{id:'b',name:'Ритм'},{},()=>.3).state;
 for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=advanceBeatWork(startBeatStage(s,'b',undefined,{},()=>.5).state,180).state;}
 s.music.needs={satiety:100,energy:100};return s;
}
const reload=s=>createVirtualPcState(JSON.parse(JSON.stringify(s)));
const start=(s,kind='refine')=>lyric.startLyricWork(s,{projectId:'t',kind,beatId:'b',gameDay:2},{writing:60});

test('three completed refinements and three adaptations use separate persisted limits on the same lyric',()=>{
 let s=ready();
 for(const kind of ['refine','adapt']){
  for(let i=0;i<3;i++){
   s.music.needs={satiety:100,energy:100};const before=structuredClone(s.projects[0]),r=start(s,kind);assert.equal(r.ok,true,r.reason);
   assert.deepEqual(r.state.projects[0],before,'starting does not spend the limit');
   s=reload(lyric.advanceLyricWork(r.state,180).state);
   assert.equal(s.projects.length,2);assert.equal(s.projects[0].revision,before.revision+1);
   assert.equal(s.projects[0][kind==='refine'?'refinementCount':'adaptationCount'],i+1);
   assert.deepEqual(s.projects[0].revisionHistory.at(-1).sections,before.sections);
   assert.ok(s.projects[0].revisionHistory.every(snapshot=>!snapshot.revisionHistory&&!snapshot.job&&!snapshot.writing));
  }
  s.music.needs={satiety:100,energy:100};assert.equal(start(s,kind).ok,false,'fourth completion cannot start');
 }
 assert.equal(s.projects[0].revision,7);assert.equal(s.projects[0].revisionHistory.length,6);
 s.projects[0].name='Переименованный текст';s=reload(s);assert.equal(s.projects[0].refinementCount,3);assert.equal(s.projects[0].adaptationCount,3);assert.equal(start(s).ok,false);assert.equal(start(s,'adapt').ok,false);
 assert.equal(lyric.advanceLyricWork(s,180).state.projects[0].revision,7);
 assert.equal(lyric.createLyricContentRevision(s,{projectId:'t',id:'bypass'},{writing:99}).ok,false);
});
test('revision history is normalized without nested runtime state and completed prior snapshots remain immutable',()=>{
 let s=ready();s=lyric.advanceLyricWork(start(s).state,60).state;const first=structuredClone(s.projects[0].revisionHistory[0]);
 s.music.needs={satiety:100,energy:100};s=lyric.advanceLyricWork(start(s,'adapt').state,180).state;
 assert.deepEqual(reload(s).projects[0].revisionHistory[0],first);
 s.projects[0].revisionHistory[0].revisionHistory=[first];s.projects[0].revisionHistory[0].job={elapsed:50};
 const saved=reload(s);assert.equal(saved.projects[0].revisionHistory[0].revisionHistory,undefined);assert.equal(saved.projects[0].revisionHistory[0].job,undefined);
});

test('partial refinement and cancellation do not consume an attempt or duplicate credit after reload',()=>{
 let s=ready(),r=start(s);assert.equal(r.ok,true,r.reason);assert.equal(r.state.writing.job.total,60);
 s=reload(lyric.advanceLyricWork(r.state,30).state);const practice=s.writing.practice;
 assert.equal(s.projects[0].refinementCount,0);assert.equal(s.projects[0].revision,1);
 s.writing.job=null;assert.equal(reload(s).projects[0].refinementCount,0);
 r=start(s);assert.equal(r.ok,true,r.reason);s=reload(lyric.advanceLyricWork(r.state,30).state);
 const partial=s.writing.practice;s=lyric.advanceLyricWork(s,30).state;
 assert.ok(s.writing.practice-practice<=1/6+1e-9);assert.ok(s.writing.practice-partial<=1/18+1e-9);
 assert.equal(s.projects[0].refinementCount,1);assert.equal(s.projects[0].revision,2);
});

test('refinement is 60 minutes, gains at most two quality and one ninth full creation XP under the skill ceiling',()=>{
 const s=ready(),p=s.projects[0],r=start(s);assert.equal(r.ok,true,r.reason);const finished=lyric.advanceLyricWork(r.state,1000);
 assert.equal(finished.minutes,60);assert.equal(finished.finished,true);
 assert.ok(Math.abs(finished.state.writing.practice-s.writing.practice-1/9)<1e-9);
 for(let i=0;i<3;i++){const gain=finished.state.projects[0].stages[i].quality-p.stages[i].quality;assert.ok(gain>0&&gain<=2);assert.ok(finished.state.projects[0].stages[i].quality<=60);}
 assert.ok(finished.state.projects[0].productionOutcome.qualities.text-p.productionOutcome.qualities.text<=.2+1e-9);
 const capped=structuredClone(s);capped.projects[0].stages=capped.projects[0].stages.map(x=>({...x,quality:100,skill:100}));
 const noGain=start(capped);assert.equal(noGain.ok,false);assert.match(noGain.reason,/навык|письм/i);
});

test('legacy counters normalize safely and an existing adaptation has already spent an attempt',()=>{
 const p=ready().projects[0];delete p.refinementCount;delete p.adaptationCount;p.adaptation={beatId:'b',beatName:'Бит',skill:10};
 const saved=lyric.normalizeLyric(p);assert.equal(saved.refinementCount,0);assert.equal(saved.adaptationCount,1);
 assert.equal(lyric.normalizeLyric({...p,refinementCount:-2,adaptationCount:-1}).refinementCount,0);
 assert.equal(lyric.normalizeLyric({...p,refinementCount:2.8,adaptationCount:2.8}).adaptationCount,2);
});
test('refinement stops at the skill snapshot and rejects malformed saved durations',()=>{
 let s=ready();s.projects[0].stages=s.projects[0].stages.map(stage=>({...stage,quality:10.8,skill:10.8}));
 const r=lyric.startLyricWork(s,{projectId:'t',kind:'refine'},{writing:10});assert.equal(r.ok,true,r.reason);
 const finished=lyric.advanceLyricWork(r.state,60).state;assert.ok(finished.projects[0].stages.every(stage=>stage.quality===11&&stage.skill===11));
 r.state.writing.job.total=600;r.state.writing.job.elapsed=120;assert.equal(reload(r.state).writing.job,null,'a duration from another job must not become a negative-time refinement');
});

test('the legacy content revision command starts bounded work on the ready original and never creates a fresh draft',()=>{
 const s=ready(),r=lyric.createLyricContentRevision(s,{projectId:'t',id:'old-command',gameDay:2},{writing:60});
 assert.equal(r.ok,true,r.reason);assert.equal(r.state.projects.length,2);assert.equal(r.state.writing.job.kind,'refine');assert.equal(r.state.writing.job.projectId,'t');
 assert.deepEqual(r.state.projects,s.projects);
});
