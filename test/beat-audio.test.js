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

test('saved source calibration and output gain are applied without mutating cached legacy PCM',async()=>{
 const ctx=context();
 ctx.createBuffer=(channels,length,rate)=>{const data=Array.from({length:channels},()=>new Float32Array(length));return {numberOfChannels:channels,length,sampleRate:rate,duration:length/rate,getChannelData:ch=>data[ch],copyToChannel:(a,ch)=>data[ch].set(a)};};
 const input=ctx.createBuffer(2,470400,44100);input.getChannelData(0).fill(.1);input.getChannelData(1).fill(-.2);
 ctx.decodeAudioData=async()=>input;
 const audio=new BeatAudio({contextFactory:()=>ctx,fetchFn:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})});
 const descriptor={key:'leveled',owner:'studio',durationSeconds:32/3,levelVersion:1,outputGain:.4,parts:[{id:'beginner-theme-16',loopSeconds:32/3,sourceGainDb:-6}]};
 assert.equal(await audio.playDescriptor(descriptor),true);
 assert.equal(audio.gain.gain.value,.4);
 assert.ok(Math.abs(ctx.sources[0].buffer.getChannelData(0)[100]-.050118723)<1e-8);
 assert.ok(Math.abs(ctx.sources[0].buffer.getChannelData(1)[100]+.100237446)<1e-8);
 assert.equal(input.getChannelData(0)[100],Math.fround(.1));
 await audio.playDescriptor({key:'legacy',owner:'studio',durationSeconds:32/3,parts:[{id:'beginner-theme-16',loopSeconds:32/3}]});
 assert.equal(audio.gain.gain.value,.7);assert.equal(ctx.sources.at(-1).buffer,input);
 audio.dispose();
});
