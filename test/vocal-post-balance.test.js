import test from 'node:test';
import assert from 'node:assert/strict';
import {createVocalTake,vocalPlaybackProfile,normalizeRecording} from '../src/vocal-result.js';
import {transformVocalSamples} from '../src/vocal-result-dsp.js';

const recording=()=>({version:1,revision:1,text:{id:'text',name:'Текст',revision:1},sourceId:'vocal-01',draft:createVocalTake({seed:24913,skills:{flow:100,sound:100,musicality:100,confidence:100}}),clean:null,mix:null,master:null});
const rms=a=>Math.sqrt(a.reduce((s,x)=>s+x*x,0)/a.length);

test('mix and master raise only the vocal level by their separate approved amounts',()=>{
 for(const [mix,master,db] of [[false,false,-2],[true,false,-1],[false,true,.5],[true,true,.5]]){
  const r=recording();r.mix=mix?{skill:100}:null;r.master=master?{skill:100}:null;
  const saved=JSON.stringify(r),p=vocalPlaybackProfile(r);
  assert.equal(p.vocalGainDb,db);
  assert.equal(p.quality,44,'gain must not bypass the starter microphone ceiling');
  assert.equal(p.postGain,(mix?2:0)+(master?2:0),'existing repair and echo bonuses remain separate');
  assert.equal(JSON.stringify(r),saved);
  assert.equal(vocalPlaybackProfile(normalizeRecording(JSON.parse(saved))).vocalGainDb,db);
 }
});

test('post level boosts the same damaged PCM without repairing holes or changing timing',()=>{
 const rate=12000,input=Float32Array.from({length:32000},(_,i)=>.08*Math.sin(i/rate*2*Math.PI*3300)),saved=input.slice();
 const r=recording();r.draft=createVocalTake({seed:24913});
 for(const [mix,master,db] of [[false,false,-2],[true,false,-1],[false,true,.5],[true,true,.5]]){
  const factor=10**(db/20);
  r.mix=mix?{skill:10}:null;r.master=master?{skill:10}:null;
  const p=vocalPlaybackProfile(r),before=transformVocalSamples(input,rate,{...p,vocalGainDb:0}),after=transformVocalSamples(input,rate,p);
  assert.ok(Math.abs(rms(after)/rms(before)-factor)<1e-6);
  assert.equal(after.length,input.length);
  for(let i=0;i<after.length;i++){
   assert.ok(Math.abs(after[i]-before[i]*factor)<1e-7);
   assert.ok(Number.isFinite(after[i])&&Math.abs(after[i])<.37);
  }
  assert.ok(before.some(v=>v===0));
 }
 assert.deepEqual(input,saved);
});

test('unprocessed vocals and silence do not acquire automatic loudness makeup',()=>{
 const p=vocalPlaybackProfile(recording()),input=new Float32Array(24000);
 assert.deepEqual(transformVocalSamples(input,12000,p),input);
 const signal=Float32Array.from(input,(_,i)=>.1*Math.sin(i*.7));
 const dry=transformVocalSamples(signal,12000,{...p,vocalGainDb:0}),quiet=transformVocalSamples(signal,12000,p);
 assert.ok(Math.abs(rms(quiet)/rms(dry)-10**(-2/20))<1e-6);
 for(const value of [NaN,Infinity,undefined])assert.deepEqual(transformVocalSamples(signal,12000,{...p,vocalGainDb:value}),dry);
});
