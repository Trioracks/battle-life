import test from 'node:test';
import assert from 'node:assert/strict';
import {BeatAudio,primitiveSamples} from '../src/beat-audio.js';
import {loopSeconds} from '../src/beat-catalog.js';
function context(){return {state:'running',currentTime:12,destination:{},sources:[],createBuffer(channels,length,rate){return {duration:length/rate,copyToChannel(){}};},createGain(){return {gain:{value:0},connect(){},disconnect(){}};},createBufferSource(){const s={connect(){},disconnect(){},start(t){this.time=t;},stop(){this.stopped=true;}};this.sources.push(s);return s;},decodeAudioData:async()=>({duration:5.376}),close(){this.closed=true;}};}
test('primitive loops are original deterministic finite PCM on an exact bar boundary',()=>{
 const a=primitiveSamples('drums',8000),b=primitiveSamples('drums',8000);assert.deepEqual(a,b);assert.equal(a.length,Math.round(loopSeconds()*8000));
 assert.ok(a.some(x=>x!==0));assert.ok(a.every(x=>Number.isFinite(x)&&Math.abs(x)<=.8));
});
test('drum and musical layers start on one clock and stop together',async()=>{
 const ctx=context(),audio=new BeatAudio({contextFactory:()=>ctx,fetchFn:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})});
 assert.equal(await audio.play({drumId:'primitive',stage:3}),true);assert.equal(ctx.sources.length,3);
 assert.ok(ctx.sources.every(s=>s.time===12.04&&s.loopEnd===loopSeconds()));audio.stop();assert.ok(ctx.sources.every(s=>s.stopped));
});
test('decode completing after stop cannot start audio',async()=>{
 const ctx=context();let resolve;const audio=new BeatAudio({contextFactory:()=>ctx,fetchFn:()=>new Promise(r=>resolve=r)});
 const pending=audio.play({drumId:'beginner-drums-01',stage:1});await Promise.resolve();audio.stop();resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
 assert.equal(await pending,false);assert.equal(ctx.sources.length,0);
});
test('unknown/missing files fail safely and disposal is final',async()=>{
 const ctx=context(),audio=new BeatAudio({contextFactory:()=>ctx,fetchFn:async()=>({ok:false})});
 assert.equal(await audio.play({drumId:'beginner-drums-01',stage:1}),false);assert.match(audio.error,/звук/i);
 assert.equal(await audio.play({drumId:'../../evil',stage:1}),false);audio.dispose();assert.equal(await audio.play({drumId:'primitive',stage:1}),false);
});
