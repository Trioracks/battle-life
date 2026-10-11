import test from 'node:test';
import assert from 'node:assert/strict';
import {transformVocalSamples} from '../src/vocal-result-dsp.js';

const rate=12000,frames=128000; // Exactly four bars at 90 BPM.
const rms=a=>Math.sqrt(a.reduce((sum,x)=>sum+x*x,0)/a.length);
const voice=Float32Array.from({length:frames},(_,i)=>.16*Math.sin(i/rate*2*Math.PI*230)+.09*Math.sin(i/rate*2*Math.PI*3100)+.06*Math.sin(i/rate*2*Math.PI*4300));
const profile=(quality,seed=15,kind='draft',postGain=0)=>({quality,seed,kind,postGain});
function missingFraction(a){
 let missing=0,total=0;
 for(let i=240;i<a.length-240;i+=240){total++;if(rms(a.subarray(i,i+240))<1e-6)missing++;}
 return missing/total;
}

// A dry bypass or noise after the dropout gate would fill these audible holes.
test('novice vocals lose whole syllables, with no clean voice bleeding through the gaps',()=>{
 for(const seed of [1,15,24913,4294967295]){
  const a=transformVocalSamples(voice,rate,profile(15,seed));
  assert.ok(missingFraction(a)>.2,'a novice draft still has real missing syllables');
  assert.ok(missingFraction(a)<.3,'70% strength must leave more of the vocal than the previous 36% gaps');
  let run=0,longest=0;for(const x of a){run=Math.abs(x)<1e-7?run+1:0;longest=Math.max(longest,run);}
  assert.ok(longest/rate>.2,'dropouts must last a syllable, not just a tiny digital click');
 }
});

// Restoring the old loud auto-level or leaving only subtle grain jitter breaks this.
test('novice recording stays behind the beat and moves vocal attacks well off the grid',()=>{
 const input=Float32Array.from(voice,(v,i)=>(i/rate%(2/3))<.09?v:0);
 let on=0,off=0;
 for(const seed of [1,15,24913,3456]){
  const a=transformVocalSamples(input,rate,profile(15,seed));
  assert.ok(rms(a)<.04,'the damaged recording must not be auto-boosted into a lead vocal');
  for(let i=0;i<a.length;i++){const phase=i/rate%(2/3);if(phase<.14||phase>.63)on+=a[i]*a[i];else off+=a[i]*a[i];}
 }
 assert.ok(off/(on+off)>.35,'timing mistakes remain substantial at 70% strength');
});

// Better takes reduce mistakes, but neither post-processing nor max starter gear bypasses damage.
test('clean and mastered takes repair some gaps without recovering the original',()=>{
 const draft=transformVocalSamples(voice,rate,profile(15)),clean=transformVocalSamples(voice,rate,profile(26,15,'clean')),ceiling=transformVocalSamples(voice,rate,profile(44,15,'clean')),mastered=transformVocalSamples(voice,rate,profile(30,15,'clean',4));
 assert.ok(missingFraction(clean)<missingFraction(draft));
 assert.ok(missingFraction(clean)>.1,'a novice clean take must still contain substantial misses');
 assert.ok(missingFraction(ceiling)<missingFraction(clean));
 assert.notDeepEqual(mastered,clean,'post-production can add a quiet echo into a missed syllable');
 for(const a of [draft,clean,ceiling,mastered]){
  assert.equal(a.length,frames);assert.equal(a[0],0);assert.equal(a.at(-1),0);
  assert.ok(a.every(x=>Number.isFinite(x)&&Math.abs(x)<=.3));
  assert.ok(rms(a)>.003&&rms(a)<.05);
  assert.notDeepEqual(a,voice);
 }
 assert.deepEqual(transformVocalSamples(new Float32Array(frames),rate,profile(15)),new Float32Array(frames),'empty input must not turn into continuous hiss');
});
