import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionFixture} from './helpers/submission-fixtures.js';
const versions=await import('../src/track-version.js').catch(()=>({}));
const api=await import('../src/track-version-audio.js').catch(()=>({}));

test('version playback only sends the saved descriptor and isolates it from player mutation',async()=>{
 assert.equal(typeof versions.captureTrackVersion,'function');assert.equal(typeof api.playTrackVersion,'function');
 const saved=versions.captureTrackVersion(submissionFixture(),{projectId:'beat',nowMinute:600}),version=saved.state.trackVersions.byId[saved.versionId];
 const before=JSON.stringify(version),played=[];
 const audio={async playDescriptor(d){played.push(structuredClone(d));d.parts[0].id='changed-by-player';return true;}};
 saved.state.projects=[];const result=await api.playTrackVersion(audio,version);
 assert.equal(result.ok,true);assert.deepEqual(played[0].parts,version.recipe.descriptor.parts);
 assert.equal(JSON.stringify(version),before);
});

test('unknown DSP is a visible limitation and cannot silently recalculate playback',async()=>{
 assert.equal(typeof api.playTrackVersion,'function');
 const version={schemaVersion:1,recipe:{dspVersion:999,descriptor:{parts:[]}}};
 let called=false;const result=await api.playTrackVersion({playDescriptor(){called=true;}},version);
 assert.equal(result.ok,false);assert.match(result.reason,/верси|обработ/i);assert.equal(called,false);
});
