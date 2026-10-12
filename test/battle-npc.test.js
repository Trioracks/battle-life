import test from 'node:test';
import assert from 'node:assert/strict';
import {DEMO_PARTICIPANTS,battleCharacter} from '../src/battle-demo-config.js';
import {ensureNpcRoundTrack,normalizeNpcTracks,npcMeanSkill} from '../src/battle-npc.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {lyricOutcomes,beatOutcomes,vocalOutcomes,combineProductionOutcomes} from '../src/production-outcomes.js';
const args=(id=DEMO_PARTICIPANTS[0].characterId,roundId='selection')=>({characterId:id,battleId:'makarevich-1',roundId,nowMinute:600});
test('32 canonical identities preserve source refs and four unconfirmed aliases without inheriting archive scores',()=>{
 assert.equal(DEMO_PARTICIPANTS.length,32);assert.equal(new Set(DEMO_PARTICIPANTS.map(p=>p.characterId)).size,32);
 assert.equal(DEMO_PARTICIPANTS.filter(p=>p.unconfirmedAliases.length).length,4);
 for(const p of DEMO_PARTICIPANTS){assert.ok(p.sourceRef);assert.equal(p.historicalTotal,undefined);assert.equal(Object.keys(p.skills).length,9);assert.ok(Object.values(p.skills).every(v=>v>=0&&v<=100));assert.equal(p.voiceId,'npc-voice:'+p.characterId);}
 assert.equal(battleCharacter('eparhiya','judge').characterId,battleCharacter('eparhiya','participant').characterId);
 assert.equal(battleCharacter('unknown'),null);
});
test('one NPC round recipe survives repeated calls and PC reload without changing player projects or skills',()=>{
 const s=createVirtualPcState(),before=JSON.stringify(s),first=ensureNpcRoundTrack(s,args());assert.equal(first.ok,true,first.reason);assert.equal(JSON.stringify(s),before);
 const frozen=structuredClone(first.state.trackVersions.byId[first.trackVersionId]);
 const twice=ensureNpcRoundTrack(first.state,{...args(),nowMinute:999});assert.equal(twice.trackVersionId,first.trackVersionId);assert.deepEqual(twice.state.trackVersions.byId[first.trackVersionId],frozen);
 const loaded=createVirtualPcState(JSON.parse(JSON.stringify(twice.state))),again=ensureNpcRoundTrack(loaded,args());assert.deepEqual(again.state.trackVersions.byId[first.trackVersionId],frozen);
 assert.deepEqual(again.state.projects,s.projects);assert.deepEqual(again.state.music,s.music);assert.deepEqual(again.state.writing,s.writing);
 const next=ensureNpcRoundTrack(again.state,args(undefined,'round-2'));assert.equal(next.ok,true,next.reason);assert.notEqual(next.trackVersionId,first.trackVersionId);assert.equal(next.state.trackVersions.byId[next.trackVersionId].npc.voiceId,frozen.npc.voiceId);assert.deepEqual(next.state.trackVersions.byId[first.trackVersionId],frozen);
});
test('NPC qualities use the same production adapters, with distinct scales and stable varied work',()=>{
 let s=createVirtualPcState();const indices=[],recipes=[];
 for(const p of DEMO_PARTICIPANTS){const r=ensureNpcRoundTrack(s,args(p.characterId));assert.equal(r.ok,true,r.reason);s=r.state;const v=s.trackVersions.byId[r.trackVersionId],recipe=v.recipe;
  const shared=combineProductionOutcomes(lyricOutcomes({project:recipe.lyrics}),beatOutcomes({recipe:recipe.beat,descriptor:recipe.descriptor}),vocalOutcomes({take:recipe.npcTake,recording:recipe.npcRecording}));
  assert.deepEqual(v.qualities,shared.qualities);assert.ok(Object.values(v.qualities).every(q=>q>=0&&q<=10));assert.ok(v.npc.diagnosticIndex>=0&&v.npc.diagnosticIndex<=50);assert.equal(v.npc.meanSkill,npcMeanSkill(v.npc.skills));
  assert.ok(v.npc.meanSkill>=0&&v.npc.meanSkill<=100);assert.ok(v.facts.some(f=>f.key==='text.contentMix'));assert.equal(recipe.descriptor.parts.some(p=>p.id.startsWith('vocal-')),false);indices.push(v.npc.diagnosticIndex);recipes.push(recipe.descriptor.parts.map(p=>p.id).join(':'));
 }
 assert.ok(Math.max(...indices)-Math.min(...indices)>20);assert.ok(new Set(recipes).size>20);
});
test('damaged registry is preserved and cannot silently regenerate a previous NPC work',()=>{
 const first=ensureNpcRoundTrack(createVirtualPcState(),args()),s=first.state,key=Object.keys(s.npcTracks.byRound)[0];
 delete s.trackVersions.byId[first.trackVersionId];const recovered=createVirtualPcState(s);assert.equal(ensureNpcRoundTrack(recovered,args()).ok,false);assert.equal(recovered.npcTracks.byRound[key].trackVersionId,first.trackVersionId);
 const bad=normalizeNpcTracks({byRound:{broken:{unknown:'keep'}}});assert.equal(bad.recovery[0].recoveryData.unknown,'keep');assert.equal(ensureNpcRoundTrack(createVirtualPcState(),args('missing')).ok,false);
 assert.equal(ensureNpcRoundTrack(createVirtualPcState(),{...args(),nowMinute:NaN}).ok,false);
});
