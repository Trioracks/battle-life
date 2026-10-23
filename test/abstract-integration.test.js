import test from 'node:test';
import assert from 'node:assert/strict';
import {abstractRecordingFixture,VOICES} from './helpers/abstract-recording-fixture.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {resolveBeatPlayback} from '../src/beat-playback.js';
import {captureTrackVersion} from '../src/track-version.js';
import {createAudioExport} from '../src/pc-audio-exports.js';
import {ensureBattleWindow} from '../src/battle-windows.js';
import {attachSubmissionTrack,sendSubmission} from '../src/social-submission.js';
import {completeSubmissionUpload,completeSubmissionMessage} from './helpers/submission-fixtures.js';
import {ensureNpcRoundTrack} from '../src/battle-npc.js';
import {npcPlaybackDescriptor} from '../src/battle-npc-audio.js';
import {DEMO_PARTICIPANTS} from '../src/battle-demo-config.js';
import {vocalById} from '../src/vocal-catalog.js';

// Catches a dropped recipe/snapshot/queue at any production, codec or archive boundary.
test('abstract recording survives submit export and reload',()=>{
 for(const family of [0,1,2,3])for(const genreXP of [0,100])for(const voiceId of [VOICES[5],VOICES[1]]){
  let s=abstractRecordingFixture({family,genreXP,voiceId});
  const beat=s.projects.find(p=>p.id==='beat'),play=resolveBeatPlayback(beat);assert.equal(play.ok,true);
  assert.equal(beat.audio.abstractRecipe.family,'Track 0'+(family+1));assert.deepEqual(beat.audio.abstractRecipe.indices,[1,2]);
  assert.equal(beat.practicePolicy,2);assert.equal(beat.practicePlan.version,2);
  assert.deepEqual(beat.mix.layers[0].execution,{version:1,beatmaking:100,genreXP,effective:genreXP});
  assert.ok(beat.mix.layers.every(p=>p.execution.effective===Math.min(p.execution.beatmaking,p.execution.genreXP)));
  assert.equal(beat.recording.voiceId,voiceId);assert.equal(s.playerVocalBag.catalogVersion,voiceId===VOICES[1]?2:1);
  assert.equal(vocalById(beat.recording.sourceId).voiceId,voiceId);
  if(voiceId===VOICES[1])assert.match(beat.recording.sourceId,/^npc-kapa-v2-/);
  const captured=captureTrackVersion(s,{projectId:'beat',nowMinute:600});assert.equal(captured.ok,true,captured.reason);s=captured.state;
  const version=structuredClone(s.trackVersions.byId[captured.versionId]);
  assert.deepEqual(version.recipe.beat,beat);assert.deepEqual(version.recipe.descriptor,play.descriptor);
  const exported=createAudioExport(s,{id:'full',projectId:'beat',kind:'track',folderId:'exports',filename:'full.wav',nowMinute:600});assert.equal(exported.ok,true,exported.reason);s=exported.state;
  const file=structuredClone(s.audioExports.files[0]);assert.equal(file.trackVersionId,version.id);assert.deepEqual(file.descriptor,play.descriptor);
  s=ensureBattleWindow(s,{battleId:'makarevich-1',nowMinute:600}).state;
  const attached=attachSubmissionTrack(s,{communityId:'makarevich-1',fileId:'full',nowMinute:601});assert.equal(attached.ok,true,attached.reason);
  s=completeSubmissionMessage(completeSubmissionUpload(attached.state));
  const sent=sendSubmission(s,{communityId:'makarevich-1',fileId:'full',nowMinute:601});assert.equal(sent.ok,true,sent.reason);s=sent.state;
  s=createVirtualPcState(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(s.projects.find(p=>p.id==='beat'),beat);assert.deepEqual(s.playerVocalBag,exported.state.playerVocalBag);
  assert.deepEqual(s.audioExports.files[0],file);assert.deepEqual(s.trackVersions.byId[version.id],version);
  assert.equal(s.battleSubmissions[0].trackVersionId,version.id);
  // Current source edits and skill growth must not recalculate an archived attachment.
  s.projects.find(p=>p.id==='beat').mix.layers[0].quality=77;s.music.genres.xp.abstract=100;s.projects=[];
  s=createVirtualPcState(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(s.trackVersions.byId[version.id],version);assert.deepEqual(s.audioExports.files[0],file);
 }
});

// Catches per-round reassignment, hero collision and take reuse in the actual NPC generator.
test('new npc voice is persistent and never the hero voice',()=>{
 for(const voiceId of VOICES){
  for(const person of DEMO_PARTICIPANTS){
   let s=createVirtualPcState({voiceId});
   const versions=[];
   for(const roundId of ['selection','round-2']){
    const r=ensureNpcRoundTrack(s,{characterId:person.characterId,battleId:'makarevich-1',roundId,nowMinute:600});assert.equal(r.ok,true,r.reason);s=r.state;
    const version=s.trackVersions.byId[r.trackVersionId];assert.equal(npcPlaybackDescriptor(version).ok,true);
    assert.notEqual(version.npc.voiceId,voiceId);assert.equal(version.recipe.beat.genre,person.style);
    assert.equal(s.npcTracks.voices[person.characterId].catalogVersion,version.npc.voiceId===VOICES[1]?2:1);
    versions.push(structuredClone(version));s=createVirtualPcState(JSON.parse(JSON.stringify(s)));
    const repeat=ensureNpcRoundTrack(s,{characterId:person.characterId,battleId:'makarevich-1',roundId,nowMinute:999});assert.deepEqual(repeat.state.trackVersions.byId[r.trackVersionId],version);
   }
   assert.equal(versions[0].npc.voiceId,versions[1].npc.voiceId);
   assert.notEqual(versions[0].recipe.descriptor.parts.at(-1).id,versions[1].recipe.descriptor.parts.at(-1).id);
  }
 }
});
