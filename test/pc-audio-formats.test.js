import test from 'node:test';
import assert from 'node:assert/strict';
import {audioExportFilename,audioExportBytes,createAudioExport,normalizeAudioExports} from '../src/pc-audio-exports.js';
import {createPcFolder} from '../src/pc-filesystem.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {submissionFixture} from './helpers/submission-fixtures.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {attachSubmissionTrack} from '../src/social-submission.js';
test('WAV and MP3 have explicit extensions and sizes, with legacy WAV defaults',()=>{
 assert.equal(audioExportBytes(180),31752044);assert.equal(audioExportBytes(180,'mp3'),2880000);assert.equal(audioExportFilename('Работа','mp3'),'Работа.mp3');assert.equal(audioExportFilename('Работа.wav','mp3'),null);assert.equal(audioExportFilename('Работа.mp3'),null);assert.equal(audioExportFilename('Работа','bad'),null);
});
test('a completed MP3 from a nested folder can be attached to a battle',()=>{
 let s=ensureBattleWindow(submissionFixture(),{battleId:'makarevich-1',nowMinute:600}).state;s=createPcFolder(s,{id:'round',parentId:'exports',name:'Раунд 1',nowMinute:600}).state;
 s=createAudioExport(s,{id:'round-mp3',projectId:'beat',kind:'track',format:'mp3',folderId:'round',filename:'Отбор',nowMinute:600}).state;
 const r=attachSubmissionTrack(s,{communityId:'makarevich-1',fileId:'round-mp3',nowMinute:601});assert.equal(r.ok,true,r.reason);assert.equal(r.state.outgoingUpload.totalBytes,s.audioExports.files[0].bytes);
});
test('MP3 in a user folder survives normalization and reload without changing legacy WAV bytes',()=>{
 let s=createPcFolder(submissionFixture(),{id:'my-audio',parentId:'music',name:'Баттл',nowMinute:1}).state;
 const r=createAudioExport(s,{id:'mp3',projectId:'beat',kind:'track',format:'mp3',folderId:'my-audio',filename:'Моя работа',nowMinute:2});assert.equal(r.ok,true,r.reason);const f=r.state.audioExports.files[0];assert.equal(f.filename,'Моя работа.mp3');assert.equal(f.bytes,Math.ceil(f.descriptor.durationSeconds*16000));
 assert.deepEqual(createVirtualPcState(JSON.parse(JSON.stringify(r.state))).audioExports,r.state.audioExports);
 const wav=createAudioExport(s,{id:'wav',projectId:'beat',kind:'beat',folderId:'exports',filename:'Старое',nowMinute:2}).state.audioExports.files[0];delete wav.format;assert.deepEqual(normalizeAudioExports({version:1,files:[wav]},s.trackVersions).files,[wav]);
});
