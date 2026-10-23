import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveBeatPlayback} from '../src/beat-playback.js';
import {createVocalTake} from '../src/vocal-result.js';
import {createStudioWorkspace,renderStudioTracks} from '../src/ft-studio-view.js';
import {pcDocument,allPc} from './helpers/virtual-pc-dom.js';
import {BeatAudio} from '../src/beat-audio.js';
import {beginnerById} from '../src/beat-beginner-bank.js';
import {normalizeBeat} from '../src/beat-production.js';
import {SOURCE_GAINS_DB} from '../src/source-levels-v1.js';
import {chooseBeginnerParts} from '../src/beat-beginner-bank.js';
const song=await import('../src/beat-song-form.js').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
const beat=(id='song',seed=15)=>({version:3,id,bpm:90,stages:[{},{},{}],drumId:'beginner-drums-01',audio:{bankVersion:1,bars:4,themeId:'beginner-theme-01',arrangementId:'beginner-arrangement-01'},recording:{version:1,revision:1,text:{id:'t',name:'Text',revision:1},sourceId:'vocal-01',draft:createVocalTake({seed}),clean:null,mix:{skill:10},master:null}});

test('abstract intro and outro keep sources and windows inside the chosen paired recipe',()=>{
 const parts=chooseBeginnerParts(()=>0,{genre:'abstract',genreXP:0});assert.ok(parts.abstractRecipe);
 const b={...beat(),genre:'abstract',drumId:parts.drumsId,audio:{bankVersion:1,bars:4,themeId:parts.themeId,arrangementId:parts.arrangementId,abstractRecipe:parts.abstractRecipe}},ids=[parts.drumsId,parts.themeId,parts.arrangementId];
 for(let seed=0;seed<100;seed++){
  const form=song.chooseSongForm(b,{seed});assert.equal(form.introSourceId,ids[form.introStage]);assert.equal(form.outroSourceId,ids[form.outroStage]);
  assert.deepEqual(form.introWindow,{startBar:0,bars:2,sourceBar:0});assert.deepEqual(form.outroWindow,{startBar:6,bars:2,sourceBar:2});
  const broken={...form,introSourceId:'beginner-'+['drums','theme','arrangement'][form.introStage]+'-02'};assert.equal(song.normalizeSongForm(broken,b),null);
 }
});

test('saved alternate drums use a compatible source, its calibrated gain and its own window',()=>{
 assert.equal(typeof song.chooseSongForm,'function');
 const b=beat();b.audio.levelVersion=1;
 const pool=[beginnerById('beginner-drums-02')];
 const forms=Array.from({length:100},(_,seed)=>song.chooseSongForm(b,{pool,seed}));
 const form=forms.find(f=>f.introSourceId==='beginner-drums-02');assert.ok(form,'some intros choose another drum');b.songForm=form;
 const descriptor=resolveBeatPlayback(b).descriptor,part=descriptor.parts.find(p=>p.songSection==='intro');
 assert.equal(part.id,'beginner-drums-02');assert.equal(part.sourceGainDb,SOURCE_GAINS_DB[part.id]);
 assert.deepEqual(part.windows,[form.introWindow]);assert.equal(part.windows[0].startBar,0);assert.equal(part.windows[0].bars,2);
 assert.ok(descriptor.parts.slice(0,3).every(p=>p.windows.every(w=>w.startBar!==0)));
 assert.ok(forms.some(f=>f.introSourceId===b.drumId||f.introSourceId===b.audio.themeId||f.introSourceId===b.audio.arrangementId),'alternates are occasional');
 const root=createStudioWorkspace(pcDocument());renderStudioTracks(root,b);
 const clips=allPc(root).filter(n=>n.dataset.ftRole==='clip'&&n.dataset.sourceId===part.id);
 assert.ok(clips.length);assert.ok(clips.every(c=>c.dataset.sourceBar===String(form.introWindow.sourceBar+1)));
});

test('song selection rejects missing, unavailable, wrong-tempo and incompatible tonal alternatives',()=>{
 assert.equal(typeof song.chooseSongForm,'function');
 const b=beat(),pool=[{...beginnerById('beginner-theme-02'),key:'F# major'},{...beginnerById('beginner-drums-02'),bpm:120},{...beginnerById('beginner-arrangement-02'),available:false},{id:'missing',kind:'drums',bpm:90,bars:4}];
 for(let seed=0;seed<100;seed++){
  const form=song.chooseSongForm(b,{pool,seed}),ids=[b.drumId,b.audio.themeId,b.audio.arrangementId];
  assert.equal(form.introSourceId,ids[form.introStage]);assert.equal(form.outroSourceId,ids[form.outroStage]);
  assert.deepEqual(song.chooseSongForm(b,{pool:[],seed}),form);
 }
});

test('saved form is normalized without reselection and legacy descriptors stay byte-identical',()=>{
 assert.equal(typeof song.chooseSongForm,'function');
 const b={...beat(),kind:'beat',name:'Song',genre:'experimental',stages:Array.from({length:3},()=>({sliders:[5,5,5],fit:50,quality:10}))};
 const legacy=resolveBeatPlayback(b).descriptor;
 assert.deepEqual(resolveBeatPlayback(normalizeBeat(JSON.parse(JSON.stringify(b)))).descriptor,legacy);
 b.songForm=song.chooseSongForm(b,{seed:5});const before=structuredClone(b.songForm),descriptor=resolveBeatPlayback(b).descriptor;
 const restored=normalizeBeat(JSON.parse(JSON.stringify(b)));assert.deepEqual(restored.songForm,before);
 assert.deepEqual(resolveBeatPlayback(restored).descriptor,descriptor);
 restored.recording.clean=createVocalTake({kind:'clean',seed:999});restored.recording.master={skill:10};
 assert.deepEqual(song.createBeatSongForm(restored),before);
 assert.deepEqual(resolveBeatPlayback(restored).descriptor.parts.map(p=>[p.id,p.windows]),descriptor.parts.map(p=>[p.id,p.windows]));
 assert.notEqual(descriptor.key,legacy.key,'cache identity includes saved form');
});

test('completed recording mix creates eight bars while work and premix keep four',()=>{
 const b=beat(),final=resolveBeatPlayback(b).descriptor;
 assert.equal(final.durationSeconds,64/3);
 assert.equal(final.parts.length,4);
 assert.ok(final.parts.every(part=>part.windows.some(w=>w.startBar===2&&w.bars===4)));
 assert.equal(final.parts.slice(0,3).filter(part=>part.windows.some(w=>w.startBar===0)).length,1);
 assert.equal(final.parts.slice(0,3).filter(part=>part.windows.some(w=>w.startBar===6)).length,1);
 assert.equal(resolveBeatPlayback(b,{workStage:1}).descriptor.durationSeconds,32/3);
 assert.equal(resolveBeatPlayback(b,{recordingPreview:b.recording}).descriptor.durationSeconds,32/3);
 b.recording.mix=null;assert.equal(resolveBeatPlayback(b).descriptor.durationSeconds,32/3);
});

test('form survives serialization, clean replacement, mastering and independent repeated reads',()=>{
 assert.equal(typeof song.createBeatSongForm,'function');
 const b=beat(),form=song.createBeatSongForm(b),before=JSON.stringify(b);
 assert.deepEqual(song.createBeatSongForm(JSON.parse(before)),form);
 assert.equal(JSON.stringify(b),before);
 b.recording.clean=createVocalTake({kind:'clean',seed:999});b.recording.master={skill:10};b.recording.revision++;
 assert.deepEqual(song.createBeatSongForm(b),form);
 const choices=Array.from({length:1200},(_,i)=>song.createBeatSongForm(beat('project-'+i,i+1)));
 const repeated=choices.filter(f=>f.vocalOutro).length;
 assert.ok(repeated>240&&repeated<360,'roughly one quarter of saved projects repeat a vocal fragment');
 assert.deepEqual([...new Set(choices.map(f=>f.introStage+':'+f.outroStage))].sort(),['0:0','0:1','0:2','1:0','1:1','1:2','2:0','2:1','2:2']);
});

test('arranged PCM places exact source bars, silences gaps and repeats one vocal bar',()=>{
 assert.equal(typeof song.arrangeSongSamples,'function');
 const rate=1200,input=Float32Array.from({length:12800},(_,i)=>Math.floor(i/3200)+1);
 const out=song.arrangeSongSamples(input,rate,[{startBar:2,bars:4,sourceBar:0},{startBar:6,bars:1,sourceBar:0}],64/3);
 assert.equal(out.length,25600);
 for(const [index,want] of [[100,0],[6500,1],[9700,2],[12900,3],[16100,4],[19300,1],[22500,0]])assert.equal(out[index],want);
 assert.equal(out[6400],0);assert.equal(out[22400-1],0);
 assert.deepEqual(out,song.arrangeSongSamples(input,rate,[{startBar:2,bars:4,sourceBar:0},{startBar:6,bars:1,sourceBar:0}],64/3));
});

test('studio clips mirror audible intro, body and outro on the sixteen-bar ruler',()=>{
 const b=beat(),root=createStudioWorkspace(pcDocument());renderStudioTracks(root,b);
 const descriptor=resolveBeatPlayback(b).descriptor,rows=allPc(root).filter(n=>n.className==='ft-lane');
 for(let i=0;i<rows.length;i++){
  const windows=descriptor.parts[i<9?Math.floor(i/3):3].windows;
  const clips=allPc(rows[i]).filter(n=>n.dataset.ftRole==='clip');
  assert.deepEqual(clips.map(c=>[c.style.marginLeft,c.style.width]),windows.map(w=>[(w.startBar*6.25)+'%',(w.bars*6.25)+'%']));
  assert.ok(clips.every(c=>c.style.position==='absolute'),'multiple clips must share one horizontal lane');
 }
 b.recording.clean=createVocalTake({kind:'clean',seed:91});renderStudioTracks(root,b);
 assert.ok(allPc(root).some(n=>n.dataset.muted==='true'));
});

function audioContext(){
 const node=()=>({gain:{value:0},connect(){},disconnect(){}});
 const buffer=(channels,length,rate)=>{const data=Array.from({length:channels},()=>new Float32Array(length));return {sampleRate:rate,length,numberOfChannels:channels,duration:length/rate,getChannelData:channel=>data[channel],copyToChannel:(values,channel)=>data[channel].set(values)};};
 return {state:'running',currentTime:0,sampleRate:8000,destination:{},sources:[],createGain:node,createWaveShaper:node,createBuffer:buffer,createBufferSource(){const source={...node(),start(time,offset){Object.assign(this,{time,offset});},stop(){this.stopped=true;}};this.sources.push(source);return source;},async decodeAudioData(){const out=buffer(2,85333,8000);out.getChannelData(0).fill(.1);out.getChannelData(1).fill(.2);return out;},close(){}};
}

test('audio plays the arranged stereo PCM and pauses beyond the former four-bar boundary',async()=>{
 const context=audioContext(),audio=new BeatAudio({contextFactory:()=>context,fetchFn:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})}),b=beat();
 assert.equal(await audio.playProject(b),true);
 assert.equal(context.sources.length,4);
 assert.ok(context.sources.every(source=>source.loopEnd===64/3&&source.buffer.length===170667));
 const intro=context.sources.slice(0,3).filter(source=>source.buffer.getChannelData(0)[800]!==0);
 assert.equal(intro.length,1);assert.ok(Math.abs(intro[0].buffer.getChannelData(1)[800]-.2)<1e-7);
 assert.equal(context.sources[3].buffer.getChannelData(0)[800],0,'vocal is silent throughout the intro');
 assert.ok(context.sources.every(source=>source.buffer.getChannelData(0).subarray(50000,60000).some(value=>value!==0)));
 context.currentTime=15.04;audio.pause();assert.ok(Math.abs(audio.getSnapshot().positionSeconds-15)<1e-8);
 context.currentTime=20;await audio.playProject(b);assert.ok(context.sources.slice(4).every(source=>Math.abs(source.offset-15)<1e-8));
 context.currentTime=20.04+64/3-15+1;assert.ok(Math.abs(audio.getSnapshot().positionSeconds-1)<1e-8);
 audio.stop();assert.equal(audio.getSnapshot().positionSeconds,0);assert.ok(context.sources.every(source=>source.stopped));audio.dispose();
});

test('recording post gain reaches each instrumental result without changing the saved mix',()=>{
 const b=beat();b.mix={version:2,seed:10,skills:{beatmaking:10,sound:10},layers:[0,1,2].map(stage=>({stage,seed:10,skills:{beatmaking:10,sound:10},sliders:[5,5,5],fit:100,quality:10}))};
 const saved=JSON.stringify(b.mix);
 for(const part of resolveBeatPlayback(b).descriptor.parts.slice(0,3)){assert.equal(part.result.quality,12);assert.equal(part.result.postGain,2);}
 b.recording.master={skill:10};assert.equal(resolveBeatPlayback(b).descriptor.parts[0].result.postGain,4);
 assert.equal(JSON.stringify(b.mix),saved);
 assert.equal(resolveBeatPlayback(b,{workStage:0}).descriptor.parts[0].result.postGain,undefined);
});
