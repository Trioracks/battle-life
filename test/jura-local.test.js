import test from 'node:test';
import assert from 'node:assert/strict';
import * as voices from '../src/npc-vocal-catalog.js';
import * as bank from '../src/beat-beginner-bank.js';
import {ensureNpcRoundTrack,normalizeNpcTracks} from '../src/battle-npc.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {npcPlaybackDescriptor} from '../src/battle-npc-audio.js';
import {playTrackVersion} from '../src/track-version-audio.js';
const args=(characterId='mak-npc-02',roundId='selection')=>({characterId,roundId,battleId:'makarevich-1',nowMinute:600});
test('Jura assignment uses base flow boundaries and retains the assigned speaker after progression',()=>{
 assert.equal(typeof voices.selectNpcVocal,'function');
 for(const flow of [0,40])assert.equal(voices.selectNpcVocal({}, {characterId:'npc',seed:71,flow}).asset.voiceId,'npc-voice:jura-20261018');
 assert.equal(voices.selectNpcVocal({}, {characterId:'npc',seed:71,flow:40.01}).asset,null);
 const first=voices.selectNpcVocal({}, {characterId:'npc',seed:71,flow:0});
 assert.equal(voices.selectNpcVocal(first.state,{characterId:'npc',seed:999,flow:100}).asset.voiceId,first.asset.voiceId);
});
test('independent seeded bags use 49 recordings in each of two cycles, survive reload, and never repeat at boundary',()=>{
 assert.equal(typeof voices.selectNpcVocal,'function');assert.equal(voices.NPC_VOCAL_CATALOG.length,49);
 let state={},heard=[];
 const other=voices.selectNpcVocal({}, {characterId:'other',seed:71,flow:20});
 for(let i=0;i<98;i++){
  const before=JSON.stringify(state),r=voices.selectNpcVocal(state,{characterId:'npc',seed:71,flow:20});
  assert.equal(JSON.stringify(state),before,'selection is transactional');assert.equal(r.ok,true);state=JSON.parse(JSON.stringify(r.state));heard.push(r.asset.id);
  if(i===24){const joined={...state,...other.state},a=voices.selectNpcVocal(joined,{characterId:'other',seed:71,flow:20}),b=voices.selectNpcVocal(other.state,{characterId:'other',seed:71,flow:20});assert.deepEqual(a.asset,b.asset);assert.deepEqual(a.state.other,b.state.other);assert.deepEqual(a.state.npc,state.npc);}
 }
 assert.equal(new Set(heard.slice(0,49)).size,49);assert.equal(new Set(heard.slice(49)).size,49);assert.notEqual(heard[48],heard[49]);assert.notDeepEqual(heard.slice(0,49),heard.slice(49));
 assert.notEqual(heard.join(','),Array.from({length:49},()=>{const r=voices.selectNpcVocal(other.state,{characterId:'other',seed:71,flow:20});other.state=r.state;return r.asset.id;}).join(','));
});
test('malformed voice history blocks replay and normalization preserves the recovery marker',()=>{
 assert.equal(typeof voices.selectNpcVocal,'function');
 const r=voices.selectNpcVocal({npc:{voiceId:'npc-voice:jura-20261018',order:['unknown'],cursor:0,cycle:0,seed:1}},{characterId:'npc',seed:71,flow:20});
 assert.equal(r.ok,false);assert.equal(r.asset,null);
 const normalized=normalizeNpcTracks({voices:{'mak-npc-02':{broken:true}}});
 assert.equal(voices.selectNpcVocal(normalized.voices,{characterId:'mak-npc-02',seed:71,flow:20}).ok,false);
 const used=voices.selectNpcVocal({}, {characterId:'npc',seed:71,flow:20}).state;used.npc.cursor=0;
 assert.equal(voices.selectNpcVocal(used,{characterId:'npc',seed:71,flow:20}).ok,false,'a reset cursor with an already used last entry cannot replay the first recording');
});
test('real NPC saved round includes only Jura vocal, social playback, idempotent reads and reload equality',async()=>{
 const first=ensureNpcRoundTrack(createVirtualPcState(),args());assert.equal(first.ok,true,first.reason);
 const v=first.state.trackVersions.byId[first.trackVersionId];assert.equal(v.npc.audioStatus,'complete');assert.equal(v.npc.voiceId,'npc-voice:jura-20261018');
 const vocal=v.recipe.descriptor.parts.filter(p=>p.vocal);assert.equal(vocal.length,1);assert.ok(vocal[0].id.startsWith('npc-jura-'));assert.equal(vocal[0].vocal.ceiling,44);
 assert.equal(npcPlaybackDescriptor(v).ok,true);let played;
 assert.equal((await playTrackVersion({playDescriptor:async d=>{played=d;return true;}},v)).ok,true);assert.equal(played.parts.at(-1).id,vocal[0].id);
 const again=ensureNpcRoundTrack(createVirtualPcState(JSON.parse(JSON.stringify(first.state))),args());assert.deepEqual(again.state.trackVersions.byId[first.trackVersionId],v);assert.deepEqual(again.state.npcTracks.voices,first.state.npcTracks.voices);
 const next=ensureNpcRoundTrack(again.state,args('mak-npc-02','round-2'));assert.equal(next.ok,true,next.reason);assert.notEqual(next.state.trackVersions.byId[next.trackVersionId].recipe.descriptor.parts.at(-1).id,vocal[0].id);
 const bad=ensureNpcRoundTrack(next.state,{...args(),roundId:'invalid'});assert.equal(bad.ok,false);assert.deepEqual(bad.state.npcTracks.voices,next.state.npcTracks.voices);
});
test('six additive experimental sources are reachable only below 50 XP and preserve legacy selection',()=>{
 const seen=new Set();
 for(const xp of [0,49.99])for(let i=0;i<1800;i++)Object.values(bank.chooseBeginnerParts(()=>(i+.5)/1800,{genre:'experimental',genreXP:xp,skill:20})).filter(id=>id.startsWith('jura-experimental-')).forEach(id=>seen.add(id));
 assert.equal(seen.size,6);assert.deepEqual([...seen].map(bank.beginnerById).map(p=>p.kind).sort(),['arrangement','arrangement','drums','drums','theme','theme']);
 for(const [genre,genreXP]of [['experimental',50],['boombap',0],['experimental',-1]])for(let i=0;i<1800;i++)assert.equal(Object.values(bank.chooseBeginnerParts(()=>(i+.5)/1800,{genre,genreXP,skill:20})).some(id=>id.startsWith('jura-experimental-')),false);
});
test('NPC playback rejects extra hero vocals or missing character-bound vocal requirements',()=>{
 const r=ensureNpcRoundTrack(createVirtualPcState(),args()),v=r.state.trackVersions.byId[r.trackVersionId],hero=structuredClone(v);hero.recipe.descriptor.parts.push({...hero.recipe.descriptor.parts.at(-1),id:'vocal-01'});
 assert.equal(npcPlaybackDescriptor(hero).ok,false);
 const missing=structuredClone(v);missing.npc.requiredAssets=missing.npc.requiredAssets.filter(a=>a.kind!=='vocal');assert.equal(npcPlaybackDescriptor(missing).ok,false);
});
