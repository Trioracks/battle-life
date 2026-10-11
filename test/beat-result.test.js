import test from 'node:test';
import assert from 'node:assert/strict';
import * as mix from '../src/beat-mix.js?rev=28';
import {createVirtualPcState} from '../src/virtual-pc-state.js?rev=28';
import {createBeat,startBeatStage,advanceBeatWork} from '../src/beat-production.js?rev=28';
import {resolveBeatPlayback} from '../src/beat-playback.js?rev=28';
const make=(skills={beatmaking:10,sound:10})=>createBeat(createVirtualPcState(),{id:'result',name:'Результат'},skills,()=>.2).state;

test('new profiles save both skills, bounded novice decisions, and first work layer before completion',()=>{
 const initial=make();assert.equal(initial.projects[0].mix.version,2);
 const qualities=[];
 for(let a=0;a<=10;a++)for(let b=0;b<=10;b++)for(let c=0;c<=10;c++){
  const state=startBeatStage(initial,'result',[a,b,c],{beatmaking:10,sound:10}).state;
  const layer=state.projects[0].mix.layers[0];qualities.push(layer.quality);
  assert.deepEqual(layer.sliders,[a,b,c]);assert.deepEqual(layer.skills,{beatmaking:10,sound:10});
  assert.equal(resolveBeatPlayback(state.projects[0],{workStage:0}).descriptor.parts[0].result.quality,layer.quality);
 }
 assert.ok(Math.max(...qualities)<=35);assert.ok(qualities.filter(q=>q>=5&&q<=20).length>qualities.length*.85);
 const good=startBeatStage(initial,'result',[9,3,2],{beatmaking:10,sound:10}).state.projects[0].mix.layers[0];
 const bad=startBeatStage(initial,'result',[0,10,10],{beatmaking:10,sound:10}).state.projects[0].mix.layers[0];
 const trained=startBeatStage(make(),'result',[9,3,2],{beatmaking:70,sound:70}).state.projects[0].mix.layers[0];
 assert.equal(good.fit,100);assert.ok(good.quality>bad.quality);assert.ok(trained.quality>good.quality);
});

test('excellent decisions cannot hide a novice sound skill behind expert beatmaking',()=>{
 const quality=skills=>startBeatStage(make(skills),'result',[9,3,2],skills).state.projects[0].mix.layers[0].quality;
 assert.ok(quality({beatmaking:100,sound:10})<80);
 assert.ok(quality({beatmaking:10,sound:100})<80);
 assert.ok(quality({beatmaking:100,sound:70})>quality({beatmaking:100,sound:10}));
 assert.equal(quality({beatmaking:100,sound:100}),110);
});

test('started layer result survives work, reload, and growth, with fit and quality in completed stage',()=>{
 let state=startBeatStage(make(),'result',[9,3,2],{beatmaking:10,sound:12}).state;
 const snapshot=structuredClone(state.projects[0].mix);
 state=advanceBeatWork(state,10).state;state=createVirtualPcState(JSON.parse(JSON.stringify(state)));
 state=startBeatStage(state,'result',[0,0,0],{beatmaking:99,sound:99}).state;
 assert.deepEqual(state.projects[0].mix,snapshot);
 state=advanceBeatWork(state,600).state;
 assert.deepEqual(state.projects[0].mix,snapshot);
 assert.equal(state.projects[0].stages[0].fit,100);
 assert.equal(state.projects[0].stages[0].quality,snapshot.layers[0].quality);
 assert.deepEqual(resolveBeatPlayback(state.projects[0]).descriptor.parts[0].result,snapshot.layers[0]);
});

test('legacy mix v1 and absent profiles never acquire v2 on continued work',()=>{
 for(const profile of [null,{version:1,skill:10,character:'thin'}]){
  let state=make();if(profile)state.projects[0].mix=profile;else delete state.projects[0].mix;
  state=startBeatStage(state,'result',[9,3,2],{beatmaking:80,sound:80}).state;
  state=advanceBeatWork(state,600).state;
  assert.deepEqual(state.projects[0].mix,profile??undefined);
  assert.equal(resolveBeatPlayback(state.projects[0]).descriptor.parts[0].result,undefined);
 }
});

test('malformed v2 layers fail closed and quality is constrained to the playable scale',()=>{
 const state=startBeatStage(make(),'result',[9,3,2],{beatmaking:10,sound:10}).state;
 const profile=state.projects[0].mix;assert.equal(profile.version,2);
 assert.equal(mix.normalizeBeatMix({...profile,layers:[{...profile.layers[0],quality:NaN},null,null]}),null);
 assert.equal(mix.normalizeBeatMix({...profile,layers:[{...profile.layers[0],sliders:[1,2]},null,null]}),null);
 assert.equal(mix.normalizeBeatMix({...profile,seed:'arbitrary'}),null);
 const max=mix.normalizeBeatMix({...profile,layers:[{...profile.layers[0],quality:900},null,null]});
 assert.equal(max.layers[0].quality,110);
});

test('legacy curve API safely bypasses valid v2 profiles',()=>{
 const profile=startBeatStage(make(),'result',[9,3,2]).state.projects[0].mix;
 const curve=mix.beatMixCurve(profile);assert.ok(curve.every(Number.isFinite));assert.equal(curve[32768],0);
 assert.equal(curve[16384],-.5);assert.equal(curve[49152],.5);
});

test('analytics do not call a mixture of damaged and boosted layers dry',()=>{
 const profile=startBeatStage(make(),'result',[9,3,2]).state.projects[0].mix;
 profile.layers=[90,100,110].map((quality,stage)=>({...profile.layers[0],stage,quality}));
 assert.notEqual(mix.describeBeatMix(profile).label,'Чистое звучание');
 profile.layers=profile.layers.map(layer=>({...layer,quality:100}));
 assert.equal(mix.describeBeatMix(profile).label,'Чистое звучание');
});

test('a text job prevents a concurrent beat job without changing the beat',()=>{
 const state=make();state.writing={job:{projectId:'text'}};
 const result=startBeatStage(state,'result',[9,3,2]);
 assert.equal(result.ok,false);assert.match(result.reason,/текст/);assert.equal(result.state.music.job,null);
});
