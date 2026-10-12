import test from 'node:test';
import assert from 'node:assert/strict';
import * as mix from '../src/text-content-mix.js';
import * as lyric from '../src/lyric-production.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {lyricOutcomes} from '../src/production-outcomes.js';
import {evaluateTrack} from '../src/judge-evaluation.js';
import {JUDGE_PROFILES} from '../src/judge-profiles.js';
const fresh=()=>lyric.createLyric(createVirtualPcState(),{id:'text',name:'Мысль'},{writing:24},()=>.3).state;
test('content budget validates total and does not mistake shares for quality',()=>{
 for(const value of [{topic:80,diss:10,lyric:10},{topic:80,diss:20,lyric:0},{topic:100,diss:0,lyric:0}])assert.deepEqual(mix.normalizeContentMix(value),value);
 for(const value of [null,{},[],{topic:80,diss:70,lyric:40},{topic:NaN,diss:0,lyric:100},{topic:-10,diss:10,lyric:100}])assert.equal(mix.normalizeContentMix(value),null);
 const p={id:'x',stages:[{skill:60,sliders:[8,7,6],resultVersion:1}],contentMix:{topic:80,diss:10,lyric:10}};
 const a=lyricOutcomes({project:p}),b=lyricOutcomes({project:{...p,contentMix:{topic:0,diss:100,lyric:0}}});
 assert.equal(a.qualities.text,b.qualities.text);assert.deepEqual(a.facts.find(f=>f.key==='text.contentMix').value,p.contentMix);
});
test('linked redistribution conserves100, respects step and handles zero neighbors',()=>{
 assert.deepEqual(mix.redistributeContentMix({topic:40,diss:30,lyric:30},{key:'topic',value:80,step:10}),{topic:80,diss:10,lyric:10});
 assert.deepEqual(mix.redistributeContentMix({topic:100,diss:0,lyric:0},{key:'topic',value:0,step:10}),{topic:0,diss:50,lyric:50});
 for(let seed=0;seed<1000;seed++)for(const key of ['topic','diss','lyric']){
  const n=mix.redistributeContentMix(mix.createAutomaticContentMix(seed),{key,value:seed%101,step:10});
  assert.equal(Object.values(n).reduce((a,b)=>a+b),100);assert.ok(Object.values(n).every(x=>x>=0&&x%10===0));
 }
 assert.equal(new Set(Array.from({length:10000},(_,i)=>JSON.stringify(mix.createAutomaticContentMix(i)))).size,66);
});
test('taste distance is symmetric and changes only weighted text, with missing evidence neutral',()=>{
 for(const [a,b,expected]of [[{topic:50,diss:30,lyric:20},{topic:40,diss:35,lyric:25},.9],[{topic:50,diss:30,lyric:20},{topic:60,diss:25,lyric:15},.9],[{topic:50,diss:30,lyric:20},{topic:0,diss:60,lyric:40},.5],[{topic:90,diss:10,lyric:0},{topic:0,diss:100,lyric:0},.1]]){
  assert.ok(Math.abs(mix.textMixRetention(a,b,1)-expected)<1e-9);assert.equal(mix.textMixRetention(a,b,1),mix.textMixRetention(b,a,1));assert.equal(mix.textMixRetention(a,b,0),1);
 }
 const version={id:'x',qualities:{text:8,performance:8,music:8,sound:8},facts:[{id:'mix',key:'text.contentMix',value:{topic:0,diss:60,lyric:40}}]},judge={id:'j',weights:{text:.25,performance:.25,music:.25,sound:.25},preferredContentMix:{topic:50,diss:30,lyric:20},contentMixSensitivity:1};
 assert.equal(evaluateTrack(version,judge,null).raw,7);assert.equal(evaluateTrack({...version,facts:[]},judge,null).raw,8);
 assert.ok(JUDGE_PROFILES.every(j=>mix.normalizeContentMix(j.preferredContentMix)&&j.contentPolicy.provenance==='calibration'&&Object.keys(j.competence).length===4));
});
test('automatic mix persists, manual threshold includes practice and started versions cannot be edited',()=>{
 let s=fresh(),p=s.projects[0];assert.ok(mix.normalizeContentMix(p.contentMix));
 assert.deepEqual(lyric.normalizeLyric(p).contentMix,p.contentMix);
 assert.equal(lyric.setLyricContentMix(s,{projectId:'text',key:'topic',value:80},{writing:24}).ok,false);
 s.writing.practice=1;s=lyric.setLyricContentMix(s,{projectId:'text',key:'topic',value:80},{writing:24}).state;assert.equal(s.projects[0].contentMix.topic,80);
 s=lyric.startLyricWork(s,{projectId:'text'},{writing:24}).state;
 assert.equal(lyric.setLyricContentMix(s,{projectId:'text',key:'topic',value:20},{writing:99}).ok,false);
 const before=structuredClone(s.projects[0]),practice=s.writing.practice;
 assert.equal(lyric.createLyricContentRevision(s,{projectId:'text',id:'next'},{writing:99}).ok,false,'must pause active work first');
 s.writing.job=null;s.projects[0].stages=[{skill:24,quality:24,sliders:[5,5,5]}];
 const r=lyric.createLyricContentRevision(s,{projectId:'text',id:'next',gameDay:2},{writing:99});assert.equal(r.ok,true,r.reason);
 const next=r.state.projects.find(p=>p.id==='next');assert.equal(next.stages.length,0);assert.equal(next.status,'draft');assert.equal(next.revision,2);assert.equal(next.contentSource.id,'text');assert.equal(r.state.writing.practice,practice);assert.deepEqual(r.state.projects[0].contentMix,before.contentMix);
});
test('legacy normalization never invents proportions; explicit new version upgrades without changing source',()=>{
 const s=fresh();delete s.projects[0].contentMix;delete s.projects[0].contentPolicyVersion;
 const old=lyric.normalizeLyric(s.projects[0]);assert.equal(old.contentMix,undefined);assert.equal(old.contentEvidence,'legacy');
 const r=lyric.createLyricContentRevision(s,{projectId:'text',id:'new'},{writing:25});assert.equal(r.ok,true,r.reason);assert.equal(r.state.projects[0].contentMix,undefined);assert.ok(mix.normalizeContentMix(r.state.projects[1].contentMix));
});
