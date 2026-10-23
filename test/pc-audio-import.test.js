import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {createAudioExport} from '../src/pc-audio-exports.js';
import {importAudioBacking} from '../src/pc-audio-import.js';
import {normalizeBeat} from '../src/beat-production.js';
import {resolveBeatPlayback} from '../src/beat-playback.js';
import {startVocalWork,advanceVocalWork} from '../src/vocal-production.js';
test('a saved audio file remains importable after its source project is gone and supports a new vocal',()=>{
 let s=createAudioExport(submissionFixture({vocal:false}),{id:'wav',projectId:'beat',kind:'beat',folderId:'downloads',filename:'Основа',nowMinute:600}).state;const descriptor=structuredClone(s.audioExports.files[0].descriptor);s.projects=s.projects.filter(p=>p.id!=='beat');s.music.activeBeatId=null;
 const r=importAudioBacking(s,{fileId:'wav',projectId:'imported',name:'Вокал поверх',nowMinute:601});assert.equal(r.ok,true,r.reason);let beat=normalizeBeat(r.state.projects.find(p=>p.id==='imported'));assert.ok(beat.audioBacking);assert.deepEqual(resolveBeatPlayback(beat).descriptor.parts,descriptor.parts);assert.equal(r.state.music.practice,s.music.practice);
 s=r.state;s.music.needs={satiety:100,energy:100};const recording=startVocalWork(s,{beatId:'imported',textId:'lyrics'},{},()=>.4);assert.equal(recording.ok,true,recording.reason);s=advanceVocalWork(recording.state,1000).state;beat=s.projects.find(p=>p.id==='imported');const play=resolveBeatPlayback(beat);assert.equal(play.ok,true,play.reason);assert.equal(play.descriptor.durationSeconds,descriptor.durationSeconds);assert.equal(play.descriptor.parts.length,descriptor.parts.length+1);
 const bad=structuredClone(beat);bad.audioBacking.descriptor.parts[0].id='missing-source';assert.equal(normalizeBeat(bad),null);
});
