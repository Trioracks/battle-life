import test from 'node:test';
import assert from 'node:assert/strict';
import {createBeatPcmProcessor} from '../src/beat-pcm-background.js';
import {processBeatPcmMessage,prepareBeatPcm} from '../src/beat-pcm-runtime.js';
import {resolveBeatPlayback} from '../src/beat-playback.js';
import {chooseSongForm} from '../src/beat-song-form.js';
import {beginnerById} from '../src/beat-beginner-bank.js';
import {calibratedSourceBuffer} from '../src/audio-levels.js';
import {transformBeatBuffer} from '../src/beat-result-dsp.js';
import {transformVocalBuffer} from '../src/vocal-result-dsp.js';
import {arrangeSongBuffer} from '../src/beat-song-form.js';
import {createVocalTake,vocalPlaybackProfile} from '../src/vocal-result.js';
const context={createBuffer(ch,length,sampleRate){const data=Array.from({length:ch},()=>new Float32Array(length));return {length,sampleRate,numberOfChannels:ch,duration:length/sampleRate,getChannelData:i=>data[i],copyToChannel:(a,i)=>data[i].set(a)};}};
const input=()=>{const b=context.createBuffer(2,16000,6000);for(let c=0;c<2;c++)b.copyToChannel(Float32Array.from({length:b.length},(_,i)=>Math.sin(i*.13+c)*.2),c);return b;};
function harness(){const workers=[];const processor=createBeatPcmProcessor({createWorker(){const w={messages:[],postMessage(m,transfer){this.messages.push(structuredClone(m,{transfer}));},terminate(){this.terminated=true;},finish(){const data=processBeatPcmMessage(this.messages.shift());this.onmessage({data});}};workers.push(w);return w;}});return {processor,workers};}
test('worker preparation is sample-exact for calibrated drums, pitched music, vocal and arrangement without detaching sources',async()=>{
 const {processor,workers}=harness(),source=input(),before=source.getChannelData(0).slice();
 const vocal=vocalPlaybackProfile({draft:createVocalTake({seed:15,skills:{flow:10,sound:10},sliders:[2,2,2]}),clean:null,mix:null,master:null});
 for(const variant of [{result:{stage:0,seed:135,skills:{beatmaking:10,sound:10},sliders:[5,5,5],fit:50,quality:10}},{result:{stage:1,seed:135,skills:{beatmaking:10,sound:10},sliders:[5,5,5],fit:50,quality:10}},{vocal}]){
  const part={id:'test',loopSeconds:8/3,sourceGainDb:-6,windows:[{startBar:0,bars:1},{startBar:1,bars:1,sourceBar:0}],...variant};
  const job=processor.prepare(context,source,part,16/3);assert.equal(workers[0].messages.length,1);assert.deepEqual(source.getChannelData(0),before);
  let expected=calibratedSourceBuffer(context,source,-6);expected=part.vocal?transformVocalBuffer(context,expected,part.vocal,part.loopSeconds):transformBeatBuffer(context,expected,part.result,part.loopSeconds);expected=arrangeSongBuffer(context,expected,part.windows,16/3,part.loopSeconds);
  workers[0].finish();const actual=await job;assert.equal(actual.duration,16/3);for(let c=0;c<2;c++)assert.deepEqual(actual.getChannelData(c),expected.getChannelData(c));
 }
 processor.dispose();assert.equal(workers[0].terminated,true);
});
test('cancellation settles pending PCM, ignores stale replies and creates a fresh worker; disposal is final',async()=>{
 const {processor,workers}=harness(),source=input(),part={sourceGainDb:-6};
 const first=processor.prepare(context,source,part,8/3),cancelled=assert.rejects(first,/cancel/i),old=workers[0];processor.cancel();await cancelled;assert.equal(old.terminated,true);
 const second=processor.prepare(context,source,part,8/3);old.finish();workers[1].finish();assert.ok(await second);
 const last=processor.prepare(context,source,part,8/3),disposed=assert.rejects(last,/cancel/i);processor.dispose();await disposed;await assert.rejects(processor.prepare(context,source,part,8/3),/disposed/i);
});

test('saved alternate source windows are sample-exact in worker and synchronous PCM with silent body',async()=>{
 const beat={version:3,id:'song',bpm:90,stages:[{},{},{}],drumId:'beginner-drums-01',audio:{bankVersion:1,bars:4,levelVersion:1,themeId:'beginner-theme-01',arrangementId:'beginner-arrangement-01'},recording:{version:1,revision:1,text:{id:'t',name:'T',revision:1},sourceId:'vocal-01',draft:createVocalTake({seed:15}),mix:{skill:10}}};
 beat.songForm=Array.from({length:100},(_,seed)=>chooseSongForm(beat,{pool:[beginnerById('beginner-drums-02')],seed})).find(f=>f.introSourceId==='beginner-drums-02');
 const descriptor=resolveBeatPlayback(beat).descriptor,part=descriptor.parts.find(p=>p.songSection==='intro');
 assert.ok(part);const rate=1200,source=context.createBuffer(2,12800,rate);
 for(let c=0;c<2;c++)source.copyToChannel(Float32Array.from({length:12800},(_,i)=>(Math.floor(i/3200)+1)*.05*(c+1)),c);
 const {processor,workers}=harness(),job=processor.prepare(context,source,part,descriptor.durationSeconds);workers[0].finish();
 const actual=await job,expected=prepareBeatPcm(context,source,part,descriptor.durationSeconds);
 for(let c=0;c<2;c++){
  assert.deepEqual(actual.getChannelData(c),expected.getChannelData(c));
  const want=(part.windows[0].sourceBar+1)*.05*(c+1)*10**(part.sourceGainDb/20);
  assert.ok(Math.abs(actual.getChannelData(c)[100]-want)<1e-7);
  assert.ok(actual.getChannelData(c).subarray(6400).every(v=>v===0));
 }
 processor.dispose();
});
test('worker failure rejects all jobs without a synchronous expensive fallback and allows explicit replay',async()=>{
 const {processor,workers}=harness(),source=input(),part={sourceGainDb:-6};
 const a=processor.prepare(context,source,part,8/3),b=processor.prepare(context,source,part,8/3),checks=Promise.all([assert.rejects(a,/PCM/),assert.rejects(b,/PCM/)]);workers[0].onerror({preventDefault(){}});await checks;assert.equal(workers[0].terminated,true);
 const next=processor.prepare(context,source,part,8/3);workers[1].finish();assert.ok(await next);processor.dispose();
});
