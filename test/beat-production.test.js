import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState} from '../src/virtual-pc-state.js?rev=24';
import {DRUMS} from '../src/beat-catalog.js';
import {createBeat,startBeatStage,advanceBeatWork,acquireDrum,restoreMusicNeeds,installRipline,cleanMusicVirus} from '../src/beat-production.js?rev=24';
const seed=()=>createVirtualPcState({power:'on',download:{status:'installed'}});
const make=(state=seed(),skill=10,assetId=null)=>createBeat(state,{id:'beat-1',name:'Ночной двор',genre:'boombap',assetId},{beatmaking:skill},()=>.4).state;
test('catalog preserves fifteen original paths and 90 BPM; free unlock is 40',()=>{
 assert.equal(DRUMS.length,15);assert.ok(DRUMS.every(d=>d.bpm===90));
 assert.match(make(seed(),39).projects[0].drumId,/^beginner-drums-/);
 assert.match(make(seed(),40).projects[0].drumId,/^free-/);
 assert.equal(make().projects[0].bpm,90);
});
test('selected purchase stays audible at low skill and after bad sliders; duplicates do not charge',()=>{
 let r=acquireDrum(seed(),'shop-01','buy',()=>0);assert.equal(r.ok,true);assert.equal(r.state.music.cash,4750);
 const duplicate=acquireDrum(r.state,'shop-01','buy',()=>{throw Error('must not roll');});assert.equal(duplicate.state.music.cash,4750);
 let s=make(r.state,1,'shop-01');s=startBeatStage(s,'beat-1',[0,10,10],{beatmaking:1}).state;
 s=advanceBeatWork(s,600).state;assert.equal(s.projects[0].drumId,'shop-01');assert.equal(s.projects[0].stages.length,1);
});
test('partial job survives normalization, resumes without reset and rewards once',()=>{
 let s=startBeatStage(make(),'beat-1',[9,3,2],{beatmaking:10}).state;
 s=advanceBeatWork(s,10).state;const elapsed=s.music.job.elapsed;
 s=createVirtualPcState(JSON.parse(JSON.stringify(s)));s=startBeatStage(s,'beat-1',[0,0,0],{beatmaking:99}).state;
 assert.equal(s.music.job.elapsed,elapsed);assert.deepEqual(s.music.job.sliders,[9,3,2]);
 s=advanceBeatWork(s,600).state;assert.equal(s.projects[0].stages.length,1);assert.ok(Math.abs(s.music.practice-1/3)<1e-10);
 assert.deepEqual(advanceBeatWork(s,600).state,s);
 for(let stage=1;stage<3;stage++){s=restoreMusicNeeds(s,'sleep',360);s=restoreMusicNeeds(s,'meal');s=startBeatStage(s,'beat-1',[5,5,5],{beatmaking:10}).state;s=advanceBeatWork(s,600).state;}
 assert.equal(s.projects[0].status,'ready');assert.ok(Math.abs(s.music.practice-1)<1e-10);assert.ok(Math.abs(s.music.genrePractice.boombap-1)<1e-10);assert.equal(startBeatStage(s,'beat-1',[5,5,5],{}).ok,false);
});

test('working half a stage awards one sixth practice immediately and preserves its quality snapshot',()=>{
 let s=make();s.music.practice=2.5;s.music.genrePractice.boombap=7.25;
 s=startBeatStage(s,'beat-1',[5,5,5],{beatmaking:10}).state;
 const r=advanceBeatWork(s,s.music.job.total/2);
 assert.ok(Math.abs(r.state.music.practice-2.6666666666666665)<1e-10);
 assert.ok(Math.abs(r.state.music.genrePractice.boombap-7.416666666666667)<1e-10);
 assert.equal(r.state.music.job.skill,12.5);
 s=createVirtualPcState(JSON.parse(JSON.stringify(r.state)));
 s=startBeatStage(s,'beat-1',[0,0,0],{beatmaking:99}).state;
 assert.ok(Math.abs(s.music.practice-2.6666666666666665)<1e-10);
 const done=advanceBeatWork(s,600);
 assert.ok(Math.abs(done.state.music.practice-2.8333333333333335)<1e-10);
 assert.ok(Math.abs(done.state.music.genrePractice.boombap-7.583333333333333)<1e-10);
 assert.ok(Math.abs(done.practiceGained-1/3)<1e-10);
 assert.equal(done.state.projects[0].stages[0].quality,13);
});

test('legacy partial work keeps earned totals at load and credits its unawarded effort only once',()=>{
 let s=make();s.music.practice=7.5;s.music.genrePractice.boombap=4.25;
 s.music.job={beatId:'beat-1',stage:0,sliders:[5,5,5],total:60,elapsed:30,skill:17.5};
 s=createVirtualPcState(JSON.parse(JSON.stringify(s)));
 assert.equal(s.music.practice,7.5);assert.equal(s.music.genrePractice.boombap,4.25);
 s=advanceBeatWork(s,15).state;
 assert.equal(s.music.practice,7.75);assert.equal(s.music.genrePractice.boombap,4.5);
 s=createVirtualPcState(JSON.parse(JSON.stringify(s)));
 s=advanceBeatWork(s,15).state;
 assert.ok(Math.abs(s.music.practice-7.833333333333333)<1e-10);
 assert.ok(Math.abs(s.music.genrePractice.boombap-4.583333333333333)<1e-10);
 assert.deepEqual(advanceBeatWork(s,60).state,s);
});

test('no elapsed work gives no practice and needs-limited work credits only successful minutes',()=>{
 let s=startBeatStage(make(),'beat-1',[5,5,5],{beatmaking:10}).state;
 for(const requested of [0,-1,NaN,Infinity])assert.equal(advanceBeatWork(s,requested).state.music.practice,0);
 s.music.needs.satiety=20.12;s.music.job.total=60;
 const r=advanceBeatWork(s,60);
 assert.ok(Math.abs(r.minutes-1)<1e-10);assert.ok(Math.abs(r.state.music.practice-1/180)<1e-10);
 assert.ok(Math.abs(r.state.music.genrePractice.boombap-1/180)<1e-10);
 assert.equal(r.blocked,true);
 assert.deepEqual(advanceBeatWork(r.state,60).state,r.state);
});

test('fractional training stays capped at 100 and completion reports only gained skill',()=>{
 let s=make();s.music.practice=99.9;s.music.genrePractice.boombap=99.9;
 s=startBeatStage(s,'beat-1',[5,5,5],{beatmaking:0}).state;
 const r=advanceBeatWork(s,600);
 assert.equal(r.state.music.practice,100);assert.equal(r.state.music.genrePractice.boombap,100);
 assert.ok(Math.abs(r.practiceGained-.1)<1e-10);
});
test('needs stop work at threshold, charge only worked minutes and allow resume after food',()=>{
 let s=make();s.music.needs.satiety=21;s=startBeatStage(s,'beat-1',[5,5,5],{}).state;
 const r=advanceBeatWork(s,60);assert.equal(r.blocked,true);assert.ok(r.minutes<10);assert.equal(r.state.projects[0].stages.length,0);
 assert.equal(startBeatStage(r.state,'beat-1',[5,5,5],{}).reason,'Хочу поесть. Сейчас не могу работать.');
 s=restoreMusicNeeds(r.state,'meal');assert.equal(startBeatStage(s,'beat-1',[5,5,5],{}).ok,true);
});
test('unofficial acquisition is local, requires RIPLINE for video and rolls infection once',()=>{
 assert.equal(acquireDrum(seed(),'shop-01','rip',()=>0).ok,false);
 let s=installRipline(seed());s=acquireDrum(s,'shop-01','rip',()=>0).state;assert.equal(s.music.infected,true);
 s=cleanMusicVirus(s).state;assert.equal(s.music.infected,false);
 s=acquireDrum(s,'shop-01','torrent',()=>{throw Error('duplicate roll');}).state;assert.equal(s.music.infected,false);
 assert.equal(acquireDrum(s,'https://evil.test/a.mp3','buy').ok,false);
 assert.equal(acquireDrum(s,'shop-02','unknown').ok,false);
});
test('validation refuses incompatible/unowned assets, duplicate ids and preserves old projects',()=>{
 assert.equal(createBeat(seed(),{id:'x',name:'',genre:'boombap'},{}).ok,false);
 assert.equal(createBeat(seed(),{id:'x',name:'x',genre:'trap'},{}).ok,false);
 assert.equal(createBeat(seed(),{id:'x',name:'x',genre:'boombap',assetId:'shop-01'},{}).ok,false);
 let s=make();assert.equal(createBeat(s,{id:'beat-1',name:'x',genre:'boombap'},{}).ok,false);
 const old={id:'old',version:1,name:'Old',other:'keep'};s=createVirtualPcState({...s,projects:[old,...s.projects],music:{...s.music,cash:NaN,job:{beatId:'missing'}}});
 assert.deepEqual(s.projects[0],old);assert.equal(s.music.cash,5000);assert.equal(s.music.job,null);
 const legacy=createVirtualPcState({projects:[old]});assert.equal(legacy.music.activeBeatId,null);
});
