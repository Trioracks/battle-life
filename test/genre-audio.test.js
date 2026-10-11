import test from 'node:test';
import assert from 'node:assert/strict';
import * as performance from '../src/audio-performance.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createBeat,startBeatStage,advanceBeatWork} from '../src/beat-production.js';
import {normalizeBeatResult} from '../src/beat-result.js';
import {resolveBeatPlayback} from '../src/beat-playback.js';
import {createVocalTake,VOCAL_CEILING} from '../src/vocal-result.js';
import {transformBeatSamples} from '../src/beat-result-dsp.js';
import {transformVocalSamples} from '../src/vocal-result-dsp.js';
const profile=(xp,id='experimental')=>({version:1,id,xp});
const result={stage:0,seed:41,skills:{beatmaking:65,sound:65},sliders:[5,5,5],fit:50,quality:30};
test('experimental creative amount follows saved genre curve only after postproduction',()=>{
 assert.equal(typeof performance.creativeProfileAmount,'function');
 for(const [xp,amount] of [[0,0],[24.99,0],[25,.2],[50,.8],[75,.5],[100,.3]]){
  assert.equal(performance.creativeProfileAmount(profile(xp),100,0),0);
  assert.ok(Math.abs(performance.creativeProfileAmount(profile(xp),10,4)-amount)<1e-10);
  assert.ok(Math.abs(performance.creativeProfileAmount(profile(xp),10,2)-amount/2)<1e-10);
 }
 assert.equal(performance.creativeProfileAmount(profile(50,'boombap'),100,4),0);
 assert.equal(performance.creativeProfileAmount(null,65,0),performance.creativeEffectAmount(65));
});
test('each new layer snapshots actual genre XP and playback never reads later training',()=>{
 let s=createVirtualPcState();s.music.genres.xp.experimental=26;
 s=createBeat(s,{id:'b',name:'B'},{beatmaking:65}).state;
 for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=advanceBeatWork(startBeatStage(s,'b',[5,5,5],{beatmaking:65}).state,600).state;}
 const beat=s.projects[0],layer=beat.mix.layers[0];assert.equal(layer.genreProfile.xp,26);assert.deepEqual(normalizeBeatResult(layer),layer);
 assert.ok(beat.mix.layers[2].genreProfile.xp>layer.genreProfile.xp);
 const dry=resolveBeatPlayback(beat).descriptor;assert.equal(dry.parts[0].result.genreProfile.xp,26);
 s.music.genres.xp.experimental=75;assert.deepEqual(resolveBeatPlayback(createVirtualPcState(s).projects[0]).descriptor,dry);
 const draft=createVocalTake({skills:{flow:100,sound:100,musicality:100,confidence:100},sliders:[8,8,8]});
 beat.recording={version:1,revision:3,text:{id:'t',name:'T',revision:1},sourceId:'vocal-01',draft,clean:null,mix:{skill:100},master:{skill:100}};
 const mixed=resolveBeatPlayback(beat).descriptor;assert.equal(mixed.parts[3].vocal.genreProfile.xp,26);assert.equal(mixed.parts[3].vocal.vocalGainDb,4.5);assert.ok(mixed.parts[3].vocal.quality<=VOCAL_CEILING);
 assert.notEqual(mixed.key,dry.key);
});
test('new novice/other-genre DSP removes stylish repetitions while preserving legacy output and timeline',()=>{
 const rate=6000,input=Float32Array.from({length:64000},(_,i)=>.2*Math.sin(i*.15)*(1+(i%211)/211));
 const legacy=transformBeatSamples(input,rate,result);
 const beginner=transformBeatSamples(input,rate,{...result,genreProfile:profile(0),postGain:4});
 const other=transformBeatSamples(input,rate,{...result,genreProfile:profile(50,'boombap'),postGain:4});
 assert.notDeepEqual(legacy,beginner);assert.deepEqual(beginner,other);assert.equal(beginner.length,input.length);
 const creative=transformBeatSamples(input,rate,{...result,genreProfile:profile(50),postGain:4});assert.notDeepEqual(creative,beginner);
 const vocal={quality:30,seed:31,skills:{flow:65},postGain:4,genreProfile:profile(0)};
 assert.deepEqual(transformVocalSamples(input,rate,vocal),transformVocalSamples(input,rate,{...vocal,genreProfile:profile(50,'boombap')}));
 assert.notDeepEqual(transformVocalSamples(input,rate,vocal),transformVocalSamples(input,rate,{...vocal,genreProfile:profile(50)}));
});
