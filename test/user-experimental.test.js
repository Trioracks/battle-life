import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as bank from '../src/beat-beginner-bank.js';
import {createBeat,normalizeBeat} from '../src/beat-production.js';
import {resolveBeatPlayback} from '../src/beat-playback.js';
import {decodePcm16,pcmStatistics} from '../tools/audio/source-loop.mjs';
import {SOURCE_GAINS_DB as legacyGains} from '../src/source-levels-v1.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createAudioExport,normalizeAudioExports} from '../src/pc-audio-exports.js';
import {submissionFixture,completeSubmissionUpload,completeSubmissionMessage} from './helpers/submission-fixtures.js';
import {attachSubmissionTrack,sendSubmission} from '../src/social-submission.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {captureTrackVersion} from '../src/track-version.js';
import {chooseSongForm} from '../src/beat-song-form.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const isNew=id=>id?.startsWith('user-experimental-20261015-');
const make=(xp,skill,random,genre='experimental')=>createBeat({projects:[],music:{genres:{version:1,chosen:['boombap'],xp:{experimental:xp}}}},{id:'new',name:'New',genre},{beatmaking:skill},()=>random);

test('explicit experimental genre XP gates one third of new selections, independent of global skill',()=>{
 const seen=new Set();
 for(const xp of [0,49.999])for(const skill of [0,49.999,50,100]){
  let count=0;
  for(let i=0;i<1260;i++){
   const r=make(xp,skill,(i+.5)/1260);assert.equal(r.ok,true,r.reason);
   const b=r.state.projects[0];
   if(isNew(b.drumId)){count++;[b.drumId,b.audio.themeId,b.audio.arrangementId].filter(isNew).forEach(id=>seen.add(id));
    const parts=[b.drumId,b.audio.themeId,b.audio.arrangementId].map(bank.beginnerById);
    assert.deepEqual(parts.map(p=>p.kind),['drums','theme','arrangement']);
    if(isNew(b.audio.themeId)){assert.equal(new Set(parts.map(p=>p.family)).size,1);assert.ok(parts[1].key);assert.equal(parts[1].key,parts[2].key);}
   }
  }
  assert.equal(count,420);
 }
 assert.equal(seen.size,28);
 for(const xp of [50,75,100])for(const skill of [0,100])for(let i=0;i<180;i++)assert.equal(isNew(make(xp,skill,(i+.5)/180).state.projects[0].drumId),false);
 for(let i=0;i<180;i++){
  assert.equal(Object.values(bank.chooseBeginnerParts(()=>(i+.5)/180,{skill:0,genre:'boombap',genreXP:0})).some(isNew),false);
  const r=make(0,100,(i+.5)/180,'boombap');assert.equal(r.ok,true);assert.equal(isNew(r.state.projects[0].drumId),false);
 }
});

test('legacy calls and retained half keep the existing conditional one-third user drum policy',()=>{
 let oldAuthors=0;
 for(let i=0;i<90;i++){
  const u=(i+.5)/90,legacy=bank.chooseBeginnerParts(()=>u,{skill:49.999});
  assert.deepEqual(bank.chooseBeginnerParts(()=>1/2+u/2,{skill:49.999,genre:'experimental',genreXP:0}),legacy);
  assert.equal(Object.values(legacy).some(isNew),false);
  if(legacy.drumsId.startsWith('user-drums-20261012-'))oldAuthors++;
  assert.equal(bank.chooseBeginnerParts(()=>u,{skill:50}).drumsId.startsWith('user-drums-20261012-'),false);
 }
 assert.equal(oldAuthors,30);
});

test('28 source archives retain raw bytes, evidence and unique four-bar stereo assets',async()=>{
 assert.equal(bank.USER_EXPERIMENTAL_BANK?.length,28,'new bank registered');
 const manifest=JSON.parse(await readFile('assets/audio/ft/user-experimental-v1/manifest.json'));
 assert.equal(manifest.parts.length,28);assert.equal(new Set(manifest.parts.map(p=>p.sourceHash)).size,28);
 assert.equal(new Set(manifest.parts.map(p=>p.sha256)).size,28);
 for(const p of manifest.parts){
  assert.equal(hash(await readFile(p.source)),p.sourceHash,p.originalName);
  const wav=await readFile(p.path);assert.equal(hash(wav),p.sha256);const pcm=decodePcm16(wav);
  assert.equal(pcm.sampleRate,44100);assert.equal(pcm.channels.length,2);assert.equal(pcm.channels[0].length,470400);
  const stats=pcmStatistics(pcm.channels);assert.ok(stats.peak<1&&stats.rms>.0001);
  for(let bar=0;bar<4;bar++)assert.ok(pcmStatistics(pcm.channels.map(c=>c.subarray(bar*117600,(bar+1)*117600))).rms>.0001,'no padded bar');
  for(const c of pcm.channels){assert.equal(c[0],0);assert.equal(c.at(-1),0);assert.ok(Math.abs(c[235200]-c[235199])<.005,'internal repeat seam');}
  assert.ok(p.evidence.timing&&p.evidence.role&&p.evidence.key);assert.equal(p.cycleBars,2);
  assert.equal(bank.beginnerById(p.id).kind,p.kind);assert.equal(bank.beginnerById(p.id).key,p.key);
  assert.ok(p.calibration.gainDb>=-40&&p.calibration.gainDb<=12);assert.ok(p.calibration.after.truePeak<=-9.95);
  if(!p.calibration.peakLimited)assert.ok(Math.abs(p.calibration.after.lufs-({drums:-30,theme:-27,arrangement:-28.5})[p.kind])<.15);
 }
 assert.notEqual(manifest.parts.find(p=>p.originalName==='untitled - Track 16.wav').key,null,'low harmonic voice is pitched');
});

test('new saved IDs survive progression, forms, immutable exports and source recovery validation',()=>{
 assert.equal(bank.USER_EXPERIMENTAL_BANK?.length,28);
 for(let variant=0;variant<14;variant++){
  let s=submissionFixture({mixed:true}),b=s.projects.find(p=>p.id==='beat');
  const selected=make(0,100,(variant+.5)/42).state.projects[0];
  b.drumId=selected.drumId;b.audio={...selected.audio};b.genre='experimental';b.genreProfile=selected.genreProfile;
  b.songForm=chooseSongForm(b,{seed:variant});
  const before=resolveBeatPlayback(b).descriptor;
  assert.ok(before.parts.filter(p=>isNew(p.id)).every(p=>Number.isFinite(p.sourceGainDb)));
  assert.deepEqual(resolveBeatPlayback(normalizeBeat(JSON.parse(JSON.stringify(b)))).descriptor,before);
  const captured=captureTrackVersion(s,{projectId:'beat',nowMinute:600});assert.equal(captured.ok,true,captured.reason);
  for(const kind of ['track','beat','vocal']){const r=createAudioExport(s,{id:kind,projectId:'beat',kind,folderId:'exports',filename:kind+'.wav',nowMinute:600});assert.equal(r.ok,true,r.reason);s=r.state;}
  const saved=structuredClone(s.audioExports),versions=structuredClone(s.trackVersions);
  s=ensureBattleWindow(s,{battleId:'makarevich-1',nowMinute:600}).state;
  const attached=attachSubmissionTrack(s,{communityId:'makarevich-1',fileId:'track',nowMinute:600});assert.equal(attached.ok,true,attached.reason);
  const sent=sendSubmission(completeSubmissionMessage(completeSubmissionUpload(attached.state)),{communityId:'makarevich-1',nowMinute:602});assert.equal(sent.ok,true,sent.reason);s=sent.state;
  assert.deepEqual(s.trackVersions,versions);assert.equal(s.battleSubmissions.at(-1).trackVersionId,saved.files.find(f=>f.kind==='track').trackVersionId);
  s.projects=[];s.music.genres={version:1,xp:{experimental:75}};
  const restored=createVirtualPcState(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.audioExports,saved);assert.equal(restored.audioExports.recovery.length,0);
  const corrupt=structuredClone(saved);corrupt.files.find(f=>f.kind==='beat').descriptor.parts[0].id='missing-source';
  assert.equal(normalizeAudioExports(corrupt,restored.trackVersions).recovery.length,1);
 }
});

test('new sources never leak through default transition alternatives and support saved arbitrary windows',()=>{
 const old=submissionFixture({mixed:true}).projects.find(p=>p.id==='beat');
 for(const genre of ['experimental','boombap'])for(let seed=0;seed<300;seed++){
  const form=chooseSongForm({...old,genre,genreProfile:{version:1,id:genre,xp:75},songForm:undefined},{seed});
  assert.equal(isNew(form.introSourceId)||isNew(form.outroSourceId),false);
 }
 const b=structuredClone(old),ids=bank.USER_EXPERIMENTAL_BANK;
 b.songForm={version:1,bars:8,barSeconds:8/3,durationSeconds:64/3,introStage:1,introSourceId:ids[15].id,introWindow:{startBar:0,bars:2,sourceBar:1},outroStage:2,outroSourceId:ids[1].id,outroWindow:{startBar:6,bars:2,sourceBar:2},vocalOutro:false};
 const d=resolveBeatPlayback(normalizeBeat(b)).descriptor;
 assert.deepEqual(d.parts.filter(p=>p.songSection).map(p=>[p.id,p.windows[0].sourceBar]),[[ids[15].id,1],[ids[1].id,2]]);
 assert.ok(d.parts.filter(p=>p.songSection).every(p=>Number.isFinite(p.sourceGainDb)));
});

test('legacy calibration and playback descriptor remain exact',async()=>{
 assert.equal(hash((await readFile('src/source-levels-v1.js','utf8')).replaceAll('\r\n','\n')),'b3cc042e62b0c567363aed301cb6b4b271b3a6fd6ba29c00d1149d081345bb5f');
 const b={version:3,id:'legacy-calibration',bpm:90,stages:[{},{},{}],drumId:'beginner-drums-17',audio:{bankVersion:1,bars:4,levelVersion:1,themeId:'beginner-theme-16',arrangementId:'beginner-arrangement-17'}};
 const d=resolveBeatPlayback(b).descriptor;
 assert.deepEqual(d.parts.map(p=>p.sourceGainDb),[-.08,-7.33,.34]);assert.equal(d.outputGain,.55);
 assert.deepEqual(d.parts.map(p=>p.sourceGainDb),d.parts.map(p=>legacyGains[p.id]));
 assert.equal(d.key,'["legacy-calibration","studio",null,["beginner-drums-17","beginner-theme-16","beginner-arrangement-17"],null,null,{"levelVersion":1,"outputGain":0.55}]');
 delete b.audio.levelVersion;assert.ok(resolveBeatPlayback(b).descriptor.parts.every(p=>p.sourceGainDb===undefined));
});
