import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {createVirtualPcState,loadVirtualPcState,saveVirtualPcState,VIRTUAL_PC_STORAGE_KEY} from '../src/virtual-pc-state.js';
import {legacySubmissionFixture} from './helpers/submission-fixtures.js';
import {startVocalWork,advanceVocalWork} from '../src/vocal-production.js';
const api=await import('../src/track-version.js').catch(()=>({}));
function capture(state){assert.equal(typeof api.captureTrackVersion,'function');return api.captureTrackVersion(state,{projectId:'beat',nowMinute:600});}

test('unchanged attachment reuses complete signature, while frozen recipe owns its copies',()=>{
 const original=submissionFixture(),saved=capture(original);assert.equal(saved.ok,true);
 const version=saved.state.trackVersions.byId[saved.versionId],frozen=JSON.stringify(version);
 assert.equal(capture(saved.state).versionId,saved.versionId);
 original.projects.find(p=>p.id==='beat').mix.layers[0].quality=100;
 saved.state.projects.find(p=>p.id==='lyrics').name='Переписано';
 saved.state.music.practice=100;saved.state.recording.practice.flow=100;
 assert.equal(JSON.stringify(version),frozen);
 const restored=createVirtualPcState(JSON.parse(JSON.stringify(saved.state)));
 assert.deepEqual(restored.trackVersions.byId[saved.versionId],version);
 restored.projects=[];assert.deepEqual(createVirtualPcState(restored).trackVersions.byId[saved.versionId],version);
});

test('new clean recording produces a new version but old audio and evidence never change',()=>{
 let saved=capture(submissionFixture()),s=saved.state;
 const before=JSON.stringify(s.trackVersions.byId[saved.versionId]);
 s.music.needs={satiety:100,energy:100};
 s=advanceVocalWork(startVocalWork(s,{beatId:'beat',kind:'clean'},{flow:75,sound:75},()=>.8).state,1000).state;
 const next=capture(s);assert.equal(next.ok,true);assert.notEqual(next.versionId,saved.versionId);
 assert.equal(JSON.stringify(next.state.trackVersions.byId[saved.versionId]),before);
});

test('unsupported versions are kept in recovery and unavailable projects are never substituted',()=>{
 const s=submissionFixture(),bad=capture(s);
 bad.state.trackVersions.byId[bad.versionId].schemaVersion=987;
 const recovered=api.normalizeTrackVersions(bad.state.trackVersions);
 assert.equal(Object.keys(recovered.byId).length,0);assert.equal(recovered.recovery.length,1);
 s.projects.find(p=>p.id==='beat').audio.themeId='missing';
 assert.equal(capture(s).ok,false);
 const unfinished=submissionFixture({vocal:false});assert.equal(capture(unfinished).ok,false);
});

test('package migration reserves original data; quota failure cannot rewrite old save',()=>{
 const state=submissionFixture();delete state.trackVersions;
 const raw=JSON.stringify(state),data=new Map([[VIRTUAL_PC_STORAGE_KEY,raw]]);
 const storage={getItem:k=>data.get(k)??null,setItem(k,v){if(k.endsWith('-before-track-versions'))throw Error('quota');data.set(k,v);}};
 const result=loadVirtualPcState(storage);
 assert.equal(result.ok,false);assert.equal(result.reason,'track-versions-backup-failed');
 assert.equal(saveVirtualPcState(storage,result.state),false);
 assert.equal(data.get(VIRTUAL_PC_STORAGE_KEY),raw);
});

test('valid historical submission gets a frozen version once, not the later edited project',()=>{
 let s=legacySubmissionFixture();
 delete s.trackVersions;
 delete s.battleSubmissions[0].trackVersionId;delete s.battleSubmissions[0].timePrecision;
 s.projects.find(p=>p.id==='beat').name='Новая рабочая копия';
 const migrated=createVirtualPcState(s),submission=migrated.battleSubmissions[0];
 assert.ok(submission.trackVersionId);
 const version=migrated.trackVersions.byId[submission.trackVersionId];
 assert.equal(version.name,s.battleSubmissions[0].track.name);
 assert.equal(version.createdAtMinute,1440);
 assert.deepEqual(createVirtualPcState(migrated).trackVersions,migrated.trackVersions);
});
