import test from 'node:test';
import assert from 'node:assert/strict';
import {createVirtualPcState} from '../src/virtual-pc-state.js?rev=25';
import {createBeat,startBeatStage,advanceBeatWork} from '../src/beat-production.js?rev=25';
import {resolveBeatPlayback} from '../src/beat-playback.js?rev=25';
const create=(sound=10)=>createBeat(createVirtualPcState(),{id:'sound-test',name:'Звучание'},{beatmaking:10,sound},()=>.1).state;
const mixModule=await import('../src/beat-mix.js?rev=25');

test('a new beat saves its sound skill; training and reload never rewrite that snapshot',()=>{
 let state=create(12);
 assert.equal(state.projects[0].mix?.skill,12);
 const snapshot=structuredClone(state.projects[0].mix);
 state=startBeatStage(state,'sound-test',[0,0,0],{beatmaking:10,sound:90}).state;
 state=advanceBeatWork(state,600).state;
 state=createVirtualPcState(JSON.parse(JSON.stringify(state)));
 assert.deepEqual(state.projects[0].mix,snapshot);
 assert.deepEqual(resolveBeatPlayback(state.projects[0]).descriptor.mix,snapshot);
 assert.deepEqual(resolveBeatPlayback(state.projects[0],{workStage:1}).descriptor.mix,snapshot);
});

test('sound is independent of hidden sliders and available to the work scene before the first completed layer',()=>{
 const state=create();
 assert.equal(state.projects[0].mix?.skill,10);
 const first=resolveBeatPlayback(state.projects[0],{workStage:0}).descriptor;
 for(const sliders of [[0,0,0],[10,10,10]]){
  const next=startBeatStage(state,'sound-test',sliders,{sound:99}).state;
  assert.deepEqual(resolveBeatPlayback(next.projects[0],{workStage:0}).descriptor,first);
 }
});

test('a different saved mix invalidates playback identity, but old projects remain unprocessed',()=>{
 const beat=create().projects[0];beat.stages=[{sliders:[5,5,5],quality:10,fit:0}];
 const legacy=structuredClone(beat);delete legacy.mix;
 assert.equal(resolveBeatPlayback(legacy).descriptor.mix,null);
 const good=create(90).projects[0];good.stages=beat.stages;
 assert.notEqual(resolveBeatPlayback(beat).descriptor.key,resolveBeatPlayback(good).descriptor.key);
 assert.equal(createVirtualPcState({projects:[legacy]}).projects[0].mix,undefined);
});

test('invalid or future saved presets bypass processing instead of applying arbitrary DSP parameters',()=>{
 for(const value of [null,{version:2,skill:0,character:'thin'},{version:1,skill:NaN,character:'thin'},{version:1,skill:10,character:'other'}])assert.equal(mixModule.normalizeBeatMix(value),null);
 assert.equal(mixModule.createBeatMix('x',Infinity).skill,10);
 assert.equal(mixModule.createBeatMix('x',-20).skill,0);
 assert.equal(mixModule.createBeatMix('x',300).skill,100);
});

test('digital coloration preserves silence and polarity, limits peaks and approaches the original with skill',()=>{
 assert.equal(typeof mixModule.beatMixCurve,'function');
 const samples=[-.95,-.2,-.035,0,.035,.2,.95];
 const distance=skill=>{
  const curve=mixModule.beatMixCurve({version:1,skill,character:'crushed'});
  assert.ok(curve.every(n=>Number.isFinite(n)&&Math.abs(n)<=1));
  assert.equal(curve[(curve.length-1)/2],0);
  let error=0;
  for(const x of samples){const i=Math.round((x+1)/2*(curve.length-1));error+=Math.abs(curve[i]-x);assert.ok(Math.abs(curve[i]+curve[curve.length-1-i])<1e-6);}
  return error;
 };
 assert.ok(distance(10)>distance(50)*1.5);
 assert.ok(distance(50)>distance(90)*20);
});
