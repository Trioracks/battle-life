import test from 'node:test';
import assert from 'node:assert/strict';
import {createVocalTake,vocalPlaybackProfile} from '../src/vocal-result.js';
import {resolveBeatPlayback} from '../src/beat-playback.js';
import {BeatAudio} from '../src/beat-audio.js';
const dsp=await import('../src/vocal-result-dsp.js').catch(()=>({}));
const rec=()=>({version:1,revision:1,text:{id:'t',name:'Текст',revision:1},sourceId:'vocal-01',draft:createVocalTake({seed:15,skills:{flow:10,sound:10},sliders:[2,2,2]}),clean:null,mix:null,master:null});
const beat=()=>({version:3,id:'b',kind:'beat',stages:[{},{},{}],bpm:90,drumId:'beginner-drums-01',audio:{bankVersion:1,bars:4,themeId:'beginner-theme-01',arrangementId:'beginner-arrangement-01'},recording:rec()});
test('vocal damage is deterministic, finite, bounded, duration preserving and never raw',()=>{
 assert.equal(typeof dsp.transformVocalSamples,'function');const rate=12000,a=Float32Array.from({length:128000},(_,i)=>.2*Math.sin(i/rate*2*Math.PI*220)+.04*Math.sin(i/rate*2*Math.PI*3600));
 const r=rec(),draft=dsp.transformVocalSamples(a,rate,vocalPlaybackProfile(r));
 assert.equal(draft.length,a.length);assert.deepEqual(draft,dsp.transformVocalSamples(a,rate,vocalPlaybackProfile(r)));assert.notDeepEqual(draft,a);
 r.clean=createVocalTake({...r.draft,kind:'clean'});const clean=dsp.transformVocalSamples(a,rate,vocalPlaybackProfile(r));assert.notDeepEqual(clean,draft);
 r.mix={skill:10};r.master={skill:10};const master=dsp.transformVocalSamples(a,rate,vocalPlaybackProfile(r));assert.notDeepEqual(master,clean);
 for(const output of [draft,clean,master]){assert.ok(output.every(v=>Number.isFinite(v)&&Math.abs(v)<=.95));assert.equal(output[0],0);assert.equal(output.at(-1),0);}
});
test('playback contains exactly one active vocal, changes after clean and work previews are isolated',()=>{
 let b=beat(),r=resolveBeatPlayback(b);assert.equal(r.descriptor.parts.length,4);assert.equal(r.descriptor.parts.at(-1).vocal.kind,'draft');const key=r.descriptor.key;
 b.recording.clean=createVocalTake({...b.recording.draft,kind:'clean'});r=resolveBeatPlayback(b);assert.equal(r.descriptor.parts.length,4);assert.equal(r.descriptor.parts.at(-1).vocal.kind,'clean');assert.notEqual(r.descriptor.key,key);
 const preview=resolveBeatPlayback(beat(),{recordingPreview:b.recording});assert.equal(preview.descriptor.owner,'work');assert.equal(preview.descriptor.parts.at(-1).vocal.kind,'clean');
 assert.equal(resolveBeatPlayback({...b,recording:{...b.recording,sourceId:'bad'}}).ok,false);
});
test('adding vocal preserves legacy beat EQ on the beat bus, not on the vocal',async()=>{
 const nodes=[],node=()=>{const n={connect(to){this.to=to;},disconnect(){},gain:{value:0},frequency:{value:0},Q:{value:0}};nodes.push(n);return n;};
 const buffer=(ch,n,rate)=>{const data=Array.from({length:ch},()=>new Float32Array(n));return {sampleRate:rate,length:n,numberOfChannels:ch,duration:n/rate,getChannelData:i=>data[i],copyToChannel:(a,i)=>data[i].set(a)};};
 let filters=0;const context={state:'running',sampleRate:8000,currentTime:0,destination:{},createBuffer:buffer,createGain:node,createBiquadFilter(){filters++;return node();},createWaveShaper:node,createBufferSource(){return {...node(),start(){},stop(){}};},decodeAudioData:async()=>buffer(2,85334,8000),close(){}};
 const audio=new BeatAudio({contextFactory:()=>context,fetchFn:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})});
 const b=beat();b.mix={version:1,skill:10,character:'thin'};assert.ok(await audio.playProject(b));assert.ok(filters>=2,'legacy beat tone must not disappear when recording is added');
 assert.notEqual(audio.sources[0].to,audio.sources.at(-1).to,'vocal bypasses legacy beat EQ');audio.dispose();
});
