import test from 'node:test';
import assert from 'node:assert/strict';
import {createBeat,normalizeBeat} from '../src/beat-production.js';
import {resolveBeatPlayback} from '../src/beat-playback.js';
import {createVocalTake} from '../src/vocal-result.js';
import {captureTrackVersion} from '../src/track-version.js';
import {playTrackVersion} from '../src/track-version-audio.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
const project=()=>{
 const s=createBeat({projects:[]},{id:'level-test',name:'Levels'},{beatmaking:20},()=>.5);
 assert.equal(s.ok,true);const b=s.state.projects[0];
 b.stages=Array.from({length:3},()=>({sliders:[5,5,5],fit:50,quality:20}));
 b.recording={version:1,revision:1,text:{id:'lyrics',name:'Текст',revision:1},sourceId:'vocal-01',draft:createVocalTake({seed:17}),clean:null,mix:null,master:null};
 return b;
};
test('new projects persist level policy and mix/master amplify the entire unchanged performance',()=>{
 const b=project();assert.equal(normalizeBeat(b).audio.levelVersion,1);
 const raw=resolveBeatPlayback(b).descriptor;
 b.recording.mix={skill:20};const mixed=resolveBeatPlayback(b).descriptor;
 b.recording.master={skill:20};const mastered=resolveBeatPlayback(b).descriptor;
 assert.ok(Math.abs(mixed.outputGain/raw.outputGain-1.4125375446)<1e-9);
 assert.ok(Math.abs(mastered.outputGain/raw.outputGain-1.5848931925)<1e-9);
 for(let i=0;i<raw.parts.length;i++){
  assert.deepEqual(mixed.parts[i].result,raw.parts[i].result);
  assert.deepEqual(mastered.parts[i].result,raw.parts[i].result);
  assert.deepEqual(mixed.parts[i].vocal,raw.parts[i].vocal);
  assert.deepEqual(mastered.parts[i].vocal,raw.parts[i].vocal);
 }
 assert.equal(mixed.durationSeconds,64/3);
 assert.equal(resolveBeatPlayback(b,{workStage:0}).descriptor.outputGain,raw.outputGain);
});
test('source balance is captured and Track 1 is attenuated individually',()=>{
 const b=project();b.audio.themeId='beginner-theme-16';
 const d=resolveBeatPlayback(b).descriptor;
 assert.ok(d.parts[1].sourceGainDb < -7 && d.parts[1].sourceGainDb > -8);
 assert.ok(Number.isFinite(d.parts[0].sourceGainDb));
 assert.equal(d.parts.at(-1).sourceGainDb,undefined);
});
test('legacy captured audio descriptors remain byte-identical and playable',async()=>{
 const fixture=submissionFixture();delete fixture.projects.find(p=>p.id==='beat').audio.levelVersion;
 const saved=captureTrackVersion(fixture,{projectId:'beat',nowMinute:600});
 assert.equal(saved.ok,true);const v=saved.state.trackVersions.byId[saved.versionId];
 const before=JSON.stringify(v);let played;
 assert.equal((await playTrackVersion({async playDescriptor(d){played=d;return true;}},v)).ok,true);
 assert.equal(played.outputGain,undefined);assert.equal(JSON.stringify(v),before);
 assert.ok(played.parts.every(p=>p.sourceGainDb===undefined));
});
