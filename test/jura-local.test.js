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
 for(const flow of [0,9.99])assert.equal(voices.selectNpcVocal({}, {characterId:'npc',seed:71,flow}).asset.voiceId,'npc-voice:jura-20261018');
 assert.equal(voices.selectNpcVocal({}, {characterId:'npc',seed:71,flow:65.01}).asset,null);
 const first=voices.selectNpcVocal({}, {characterId:'npc',seed:71,flow:0});
 assert.equal(voices.selectNpcVocal(first.state,{characterId:'npc',seed:999,flow:100}).asset.voiceId,first.asset.voiceId);
});
test('independent seeded bags use 49 recordings in each of two cycles, survive reload, and never repeat at boundary',()=>{
 assert.equal(typeof voices.selectNpcVocal,'function');assert.equal(voices.NPC_VOCAL_CATALOG.filter(p=>p.voiceId==='npc-voice:jura-20261018').length,49);
 let state={},heard=[];
 const other=voices.selectNpcVocal({}, {characterId:'other',seed:71,flow:0});
 for(let i=0;i<98;i++){
  const before=JSON.stringify(state),r=voices.selectNpcVocal(state,{characterId:'npc',seed:71,flow:0});
  assert.equal(JSON.stringify(state),before,'selection is transactional');assert.equal(r.ok,true);state=JSON.parse(JSON.stringify(r.state));heard.push(r.asset.id);
  if(i===24){const joined={...state,...other.state},a=voices.selectNpcVocal(joined,{characterId:'other',seed:71,flow:0}),b=voices.selectNpcVocal(other.state,{characterId:'other',seed:71,flow:0});assert.deepEqual(a.asset,b.asset);assert.deepEqual(a.state.other,b.state.other);assert.deepEqual(a.state.npc,state.npc);}
 }
 assert.equal(new Set(heard.slice(0,49)).size,49);assert.equal(new Set(heard.slice(49)).size,49);assert.notEqual(heard[48],heard[49]);assert.notDeepEqual(heard.slice(0,49),heard.slice(49));
 assert.notEqual(heard.join(','),Array.from({length:49},()=>{const r=voices.selectNpcVocal(other.state,{characterId:'other',seed:71,flow:0});other.state=r.state;return r.asset.id;}).join(','));
});
test('malformed voice history blocks replay and normalization preserves the recovery marker',()=>{
 assert.equal(typeof voices.selectNpcVocal,'function');
 const r=voices.selectNpcVocal({npc:{voiceId:'npc-voice:jura-20261018',order:['unknown'],cursor:0,cycle:0,seed:1}},{characterId:'npc',seed:71,flow:0});
 assert.equal(r.ok,false);assert.equal(r.asset,null);
 const normalized=normalizeNpcTracks({voices:{'mak-npc-02':{broken:true}}});
 assert.equal(voices.selectNpcVocal(normalized.voices,{characterId:'mak-npc-02',seed:71,flow:0}).ok,false);
 const used=voices.selectNpcVocal({}, {characterId:'npc',seed:71,flow:0}).state;used.npc.cursor=0;
 assert.equal(voices.selectNpcVocal(used,{characterId:'npc',seed:71,flow:0}).ok,false,'a reset cursor with an already used last entry cannot replay the first recording');
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
 const released=[...seen].filter(id=>!/-[34]$/.test(id));assert.equal(released.length,6);assert.deepEqual(released.map(bank.beginnerById).map(p=>p.kind).sort(),['arrangement','arrangement','drums','drums','theme','theme']);
 for(const [genre,genreXP]of [['experimental',50],['boombap',0],['experimental',-1]])for(let i=0;i<1800;i++)assert.equal(Object.values(bank.chooseBeginnerParts(()=>(i+.5)/1800,{genre,genreXP,skill:20})).some(id=>id.startsWith('jura-experimental-')),false);
});
test('NPC playback rejects extra hero vocals or missing character-bound vocal requirements',()=>{
 const r=ensureNpcRoundTrack(createVirtualPcState(),args()),v=r.state.trackVersions.byId[r.trackVersionId],hero=structuredClone(v);hero.recipe.descriptor.parts.push({...hero.recipe.descriptor.parts.at(-1),id:'vocal-01'});
 assert.equal(npcPlaybackDescriptor(hero).ok,false);
 const missing=structuredClone(v);missing.npc.requiredAssets=missing.npc.requiredAssets.filter(a=>a.kind!=='vocal');assert.equal(npcPlaybackDescriptor(missing).ok,false);
});
test('a changed used/future order permutation blocks direct selection and JSON/full save recovery',()=>{
 const selection={characterId:'npc',seed:71,flow:0},first=voices.selectNpcVocal({},selection),second=voices.selectNpcVocal(first.state,selection),damaged=structuredClone(second.state);
 assert.equal(first.asset.id,'npc-jura-09');assert.equal(second.asset.id,'npc-jura-46');
 [damaged.npc.order[0],damaged.npc.order[2]]=[damaged.npc.order[2],damaged.npc.order[0]];
 for(const raw of [damaged,JSON.parse(JSON.stringify(damaged))]){
  const rejected=voices.selectNpcVocal(raw,selection);assert.equal(rejected.ok,false);assert.equal(rejected.asset,null);assert.equal(rejected.state.npc.blocked,true);
  const normalized=normalizeNpcTracks({voices:raw});assert.equal(normalized.voices.npc.blocked,true);
  const loaded=createVirtualPcState(JSON.parse(JSON.stringify({...createVirtualPcState(),npcTracks:{voices:raw}})));assert.equal(loaded.npcTracks.voices.npc.blocked,true);
  assert.equal(createVirtualPcState(JSON.parse(JSON.stringify(loaded))).npcTracks.voices.npc.blocked,true);
  const again=voices.selectNpcVocal(loaded.npcTracks.voices,selection);assert.equal(again.ok,false);assert.equal(again.asset,null);
 }
});
test('later seeded cycle permutations block without losing normal deterministic cycles',()=>{
 const selection={characterId:'npc',seed:71,flow:0};let state={};
 for(let i=0;i<100;i++){const r=voices.selectNpcVocal(JSON.parse(JSON.stringify(state)),selection);assert.equal(r.ok,true);state=r.state;}
 assert.equal(state.npc.cycle,2);assert.equal(state.npc.cursor,2);
 [state.npc.order[0],state.npc.order[2]]=[state.npc.order[2],state.npc.order[0]];
 assert.equal(voices.selectNpcVocal(state,selection).ok,false);
});
test('unflagged hero sources and mismatched required asset kinds never reach NPC audio',async()=>{
 const r=ensureNpcRoundTrack(createVirtualPcState(),args()),v=r.state.trackVersions.byId[r.trackVersionId];
 for(const modify of [
  d=>{d.recipe.descriptor.parts[0].id='vocal-01';},
  d=>{d.recipe.descriptor.parts[0].id='vocal-01';d.npc.requiredAssets[0].id='vocal-01';},
  d=>{d.npc.requiredAssets[0].kind='vocal';},
  d=>{d.recipe.descriptor.parts[0].id='npc-jura-01';d.npc.requiredAssets[0].id='npc-jura-01';},
 ]){
  const damaged=structuredClone(v);modify(damaged);assert.equal(npcPlaybackDescriptor(damaged).ok,false);
  let played=0;const result=await playTrackVersion({stop(){},playDescriptor(){played++;return true;}},damaged);assert.equal(result.ok,false);assert.equal(played,0);
 }
});
