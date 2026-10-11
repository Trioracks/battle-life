import test from 'node:test';
import assert from 'node:assert/strict';
const dsp=await import('../src/beat-result-dsp.js?rev=28').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const result=(quality,stage=0)=>({stage,seed:135,skills:{beatmaking:quality,sound:quality},sliders:[5,5,5],fit:50,quality});
const rms=a=>Math.sqrt(a.reduce((s,x)=>s+x*x,0)/a.length);
const input=(stage,rate=6000)=>Float32Array.from({length:64000},(_,i)=>{
 const beat=i/rate%(2/3),note=Math.floor(i/rate/(2/3))%4;
 return Math.sin(i/rate*2*Math.PI*(stage?110+note*55:70))*Math.exp(-beat*(stage?2:15))*.3;
});

test('novice drum dropouts retain a quiet original attack so the pulse remains readable',()=>{
 const rate=6000,a=new Float32Array(64000);
 // Cell 2 is deliberately missing in the broken groove. A faint kick must survive.
 for(let i=2010;i<2210;i++)a[i]=.25;
 const out=dsp.transformBeatSamples(a,rate,{...result(0),seed:0});
 assert.ok(rms(out.slice(2030,2190))>.035,'glitch must not erase the underlying kick completely');
 assert.ok(rms(out.slice(2030,2190))<.08,'the mistake remains audible, not a clean bypass');
});

test('each low-result layer changes rhythm or pitch, keeps exactly four bars and leaves source PCM unchanged',()=>{
 assert.equal(typeof dsp.transformBeatSamples,'function');
 for(let stage=0;stage<3;stage++){
  const a=input(stage),saved=a.slice(),bad=dsp.transformBeatSamples(a,6000,result(5,stage)),better=dsp.transformBeatSamples(a,6000,result(30,stage)),good=dsp.transformBeatSamples(a,6000,result(90,stage));
  assert.deepEqual(a,saved);assert.equal(bad.length,64000);assert.equal(better.length,64000);assert.equal(good.length,64000);
  assert.ok(bad.every(x=>Number.isFinite(x)&&Math.abs(x)<=1));assert.ok(rms(bad)>.015);
  assert.equal(bad[0],0);assert.equal(bad.at(-1),0,'processed loop has a click-free join');
  const error=b=>rms(b.map((v,i)=>v-a[i]));
  assert.ok(error(bad)>error(good)*2,`stage ${stage} has strongly audible defects`);
  assert.ok(error(better)>error(good),`stage ${stage} improves toward dry`);
  assert.deepEqual(bad,dsp.transformBeatSamples(a,6000,result(5,stage)));
 }
});

test('100 is sample-exact dry and 101..110 never reintroduce timing/pitch degradation',()=>{
 assert.equal(typeof dsp.transformBeatSamples,'function');
 for(let stage=0;stage<3;stage++)for(const quality of [100,101,110]){
  const a=input(stage);assert.deepEqual(dsp.transformBeatSamples(a,6000,result(quality,stage)),a);
 }
});

test('granular detune preserves the four-bar clock for non-integer beat frame counts',()=>{
 assert.equal(typeof dsp.transformBeatSamples,'function');
 const rate=8000,a=new Float32Array(Math.round(32/3*rate));a.fill(.1);
 const changed=dsp.transformBeatSamples(a,rate,result(5,2));
 assert.equal(changed.length,85333);assert.ok(changed.every(Number.isFinite));
 assert.equal(dsp.transformBeatSamples(a,rate,{quality:5}),a,'invalid profiles bypass processing');
});
