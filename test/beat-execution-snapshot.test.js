import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createBeatResult,normalizeBeatResult} from '../src/beat-result.js';
import {transformBeatSamples,connectBeatResult} from '../src/beat-result-dsp.js';
import {createBeat,startBeatStage,advanceBeatWork} from '../src/beat-production.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {resolveBeatPlayback} from '../src/beat-playback.js';
import {createAudioExport} from '../src/pc-audio-exports.js';
import {captureTrackVersion,normalizeTrackVersions} from '../src/track-version.js';
import {normalizeAudioExports} from '../src/pc-audio-exports.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {prepareBeatPcm,processBeatPcmMessage} from '../src/beat-pcm-runtime.js';
const api=await import('../src/beat-execution-snapshot.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const snapshot=(beatmaking,genreXP)=>({version:1,beatmaking,genreXP,effective:Math.min(beatmaking,genreXP)});
const result={stage:1,seed:41,skills:{beatmaking:65,sound:65},sliders:[5,5,5],fit:50,quality:30};
const input=()=>Float32Array.from({length:6400},(_,i)=>.2*Math.sin(i*.15)*(1+(i%211)/211));
const hash=a=>createHash('sha256').update(Buffer.from(a.buffer)).digest('hex');
const context={createBuffer(count,length,sampleRate){const channels=Array.from({length:count},()=>new Float32Array(length));return {sampleRate,length,numberOfChannels:count,getChannelData:i=>channels[i],copyToChannel:(a,i)=>channels[i].set(a)};}};
function graph(value){const nodes=[],c={sampleRate:6000};for(const method of ['createGain','createBiquadFilter','createWaveShaper','createDelay'])c[method]=()=>{const n={connect(){},disconnect(){},gain:{value:1},frequency:{value:0},Q:{value:0},delayTime:{value:0}};nodes.push(n);return n;};connectBeatResult(c,value,{});return nodes.map(({connect,disconnect,...n})=>n);}

test('genre only limits execution',()=>{
 assert.equal(typeof api.createBeatExecutionSnapshot,'function');
 for(const [beatmaking,genreXP,effective] of [[50,10,10],[10,50,10],[50,100,50],[100,100,100],[25,0,0]]){
  const want={version:1,beatmaking,genreXP,effective};
  assert.deepEqual(api.createBeatExecutionSnapshot({beatmaking,genreXP}),want);
  assert.deepEqual(api.normalizeBeatExecutionSnapshot(want),want);
 }
 for(const bad of [-1,101,undefined,null,'10',NaN,Infinity])for(const field of ['beatmaking','genreXP']){
  assert.throws(()=>api.createBeatExecutionSnapshot({...snapshot(50,10),[field]:bad}));
  assert.equal(api.normalizeBeatExecutionSnapshot({...snapshot(50,10),[field]:bad}),null);
 }
 for(const bad of [null,{}, {...snapshot(50,10),version:2},{...snapshot(50,10),effective:50}])assert.equal(api.normalizeBeatExecutionSnapshot(bad),null);
});

test('legacy result remains byte equivalent',()=>{
 assert.equal(hash(transformBeatSamples(input(),6000,result)),'a2e00e4c9ad05fa486b937f0d87cb6de745dc2fd19d0e8767e74ba02b5092804');
 assert.deepEqual(normalizeBeatResult(result),result);
 assert.equal(typeof api.beatExecutionSkill,'function');
 assert.equal(api.beatExecutionSkill(result),65);
});

test('opposite skill and genre pairs have identical capped timing and filters despite raw skill and quality',()=>{
 const make=(beatmaking,genreXP,sound=100,sliders=[5,5,5],targets=[5,5,5])=>createBeatResult({stage:1,seed:41,skills:{beatmaking,sound},sliders,targets,execution:snapshot(beatmaking,genreXP)});
 const a=make(50,10),b=make(10,50);
 assert.equal(a.skills.beatmaking,50);assert.equal(b.skills.beatmaking,10);
 assert.deepEqual(a.execution,snapshot(50,10));assert.equal(api.beatExecutionSkill(a),10);
 assert.deepEqual(transformBeatSamples(input(),6000,a),transformBeatSamples(input(),6000,b));
 assert.deepEqual(graph(a),graph(b));
 const reference={...result,quality:10,skills:{beatmaking:10,sound:100}};
 assert.deepEqual(transformBeatSamples(input(),6000,{...a,quality:110,postGain:4}),transformBeatSamples(input(),6000,{...reference,postGain:4}));
 assert.deepEqual(graph({...a,quality:110}),graph(reference));
 for(const sound of [0,100])for(const sliders of [[0,0,0],[10,10,10]])for(const postGain of [0,4]){
  const first={...make(50,10,sound,sliders,[10,10,10]),genreProfile:{version:1,id:'experimental',xp:10},postGain};
  const second={...make(10,50,sound,sliders,[10,10,10]),genreProfile:{version:1,id:'experimental',xp:50},postGain};
  assert.equal(first.quality,second.quality);assert.ok(first.quality<=10);
  assert.deepEqual(transformBeatSamples(input(),6000,first),transformBeatSamples(input(),6000,second));
  assert.deepEqual(graph(first),graph(second));
 }
 const poor=make(50,10,0,[0,0,0],[10,10,10]);assert.equal(poor.fit,0);assert.equal(poor.quality,4.4);
 const fractional=make(.06,100);assert.ok(fractional.quality<=.06,'decimal rounding cannot exceed the cap');
 const long=Float32Array.from({length:64000},(_,i)=>.2*Math.sin(i*.15));
 const creativeA={...make(50,100),genreProfile:{version:1,id:'experimental',xp:100},postGain:4};
 const creativeB={...make(100,50),genreProfile:{version:1,id:'experimental',xp:50},postGain:4};
 assert.deepEqual(transformBeatSamples(long,6000,creativeA),transformBeatSamples(long,6000,creativeB));
 assert.deepEqual(graph(creativeA),graph(creativeB));
});

test('damaged marked track and export archives move to recovery with exact original recipes',()=>{
 const captured=captureTrackVersion(submissionFixture(),{projectId:'beat',nowMinute:600});
 const exported=createAudioExport(captured.state,{id:'file',projectId:'beat',kind:'beat',folderId:'exports',filename:'file.wav',nowMinute:601});assert.equal(exported.ok,true);
 for(const path of ['beat','descriptor','descriptorMix']){
  const raw=structuredClone(captured.state.trackVersions),version=raw.byId[captured.versionId];
  const layer=path==='beat'?version.recipe.beat.mix.layers[0]:path==='descriptorMix'?version.recipe.descriptor.mix.layers[0]:version.recipe.descriptor.parts[0].result;
  layer.execution={...snapshot(50,10),effective:50};
  const normalized=normalizeTrackVersions(raw);
  assert.ok(!normalized.byId[captured.versionId],path);assert.deepEqual(normalized.recovery.at(-1).recoveryData,version);
 }
 for(const path of ['parts','mix']){
  const raw=structuredClone(exported.state.audioExports),file=raw.files[0];
  const layer=path==='parts'?file.descriptor.parts[0].result:file.descriptor.mix.layers[0];layer.execution=null;
  const normalized=normalizeAudioExports(raw,captured.state.trackVersions);
  assert.equal(normalized.files.length,0);assert.deepEqual(normalized.recovery.at(-1).recoveryData,file);
 }
});

test('new stage freezes actual execution through reload and growth while legacy stages remain unmarked',()=>{
 let s=createVirtualPcState();s.music.genres.xp.experimental=10;
 s=createBeat(s,{id:'b',name:'B'},{beatmaking:50,sound:100},()=>.2).state;
 assert.equal(s.projects[0].mix.layers[0],null);
 s=startBeatStage(s,'b',[5,5,5],{beatmaking:50,sound:100}).state;
 const frozen=structuredClone(s.projects[0].mix.layers[0]);assert.deepEqual(frozen.execution,snapshot(50,10));
 s=advanceBeatWork(s,1).state;s.music.genres.xp.experimental=100;
 s=createVirtualPcState(JSON.parse(JSON.stringify(s)));
 s=startBeatStage(s,'b',[0,0,0],{beatmaking:100,sound:100}).state;
 assert.deepEqual(s.projects[0].mix.layers[0],frozen);
 assert.deepEqual(resolveBeatPlayback(s.projects[0],{workStage:0}).descriptor.parts[0].result.execution,snapshot(50,10));
 s=advanceBeatWork(s,600).state;s.music.needs={satiety:100,energy:100};
 s=startBeatStage(s,'b',[5,5,5],{beatmaking:50,sound:100}).state;
 assert.ok(s.projects[0].mix.layers[1].execution.beatmaking>50);
 assert.equal(s.projects[0].mix.layers[1].execution.genreXP,100);
 let old=createBeat(createVirtualPcState(),{id:'old',name:'Old'},{beatmaking:50},()=>.2).state;
 delete old.projects[0].practicePolicy;
 old=startBeatStage(old,'old',[5,5,5],{beatmaking:50}).state;
 assert.equal(Object.hasOwn(old.projects[0].mix.layers[0],'execution'),false);
});

test('snapshot round-trips through track version and audio export without recalculating saved quality',()=>{
 let s=submissionFixture(),beat=s.projects.find(p=>p.id==='beat');
 beat.mix.layers[0].execution=snapshot(50,10);beat.mix.layers[0].quality=87.3;
 const captured=captureTrackVersion(s,{projectId:'beat',nowMinute:600});assert.equal(captured.ok,true);s=captured.state;
 const exported=createAudioExport(s,{id:'file',projectId:'beat',kind:'track',folderId:'exports',filename:'file.wav',nowMinute:601});assert.equal(exported.ok,true);
 s=createVirtualPcState(JSON.parse(JSON.stringify(exported.state)));
 const version=s.trackVersions.byId[captured.versionId];
 for(const layer of [s.projects.find(p=>p.id==='beat').mix.layers[0],version.recipe.beat.mix.layers[0],version.recipe.descriptor.parts[0].result,s.audioExports.files[0].descriptor.parts[0].result]){
  assert.deepEqual(layer.execution,snapshot(50,10));assert.equal(layer.quality,87.3);
 }
});

test('corrupt execution blocks work and playback and preserves original project data on reload',()=>{
 for(const execution of [null,{...snapshot(50,10),effective:50},{...snapshot(50,10),genreXP:-1}]){
  let s=createBeat(createVirtualPcState(),{id:'b',name:'B'},{beatmaking:50},()=>.2).state;
  s=startBeatStage(s,'b',[5,5,5],{beatmaking:50}).state;
  s.projects[0].mix.layers[0].execution=execution;
  const raw=structuredClone(s.projects[0]);assert.equal(normalizeBeatResult(raw.mix.layers[0]),null);
  assert.equal(resolveBeatPlayback(raw,{workStage:0}).ok,false);
  assert.equal(startBeatStage(s,'b',[5,5,5],{beatmaking:100}).ok,false);
  assert.equal(advanceBeatWork(s,600).minutes,0);
  const loaded=createVirtualPcState(JSON.parse(JSON.stringify(s)));
  assert.ok(loaded.projects[0].recoveryIssue);assert.deepEqual(loaded.projects[0].recoveryData,raw);
 }
});

test('new execution PCM is sample-identical between main path and worker message',()=>{
 const source=context.createBuffer(1,6400,6000);source.copyToChannel(input(),0);
 const part={loopSeconds:6400/6000,result:{...result,quality:110,execution:snapshot(50,10)}};
 const main=prepareBeatPcm(context,source,part,part.loopSeconds),worker=processBeatPcmMessage({id:1,channels:[input()],sampleRate:6000,part,duration:part.loopSeconds});
 assert.deepEqual(worker.channels[0],main.getChannelData(0));
 assert.notDeepEqual(main.getChannelData(0),source.getChannelData(0));
});
