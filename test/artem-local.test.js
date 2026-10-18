import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,mkdtemp,symlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as voices from '../src/npc-vocal-catalog.js';
import {chooseBeginnerParts,beginnerById} from '../src/beat-beginner-bank.js';
import {ensureNpcRoundTrack} from '../src/battle-npc.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {npcPlaybackDescriptor} from '../src/battle-npc-audio.js';
import {playTrackVersion} from '../src/track-version-audio.js';
const jura='npc-voice:jura-20261018',artem='npc-voice:artem-20261018';
test('all four non-player voices are reachable on both sides of former Flow boundaries',()=>{
 for(const flow of [0,9.99,10,40,40.01,65,65.01,100]){
  const want=[jura,artem,'npc-voice:kapa-20261018','npc-voice:gans-20261018'];
  const got=new Set();for(let seed=0;seed<100;seed++){const r=voices.selectNpcVocal({},{characterId:'npc',seed,flow});if(r.asset)got.add(r.asset.voiceId);}
  assert.deepEqual([...got].sort(),want.sort(),String(flow));
 }
});
test('each voice bag exhausts two independent cycles and keeps persisted assignments across progression',()=>{
 for(const [voiceId,seed,flow,count]of [[jura,71,0,49],[artem,1,53,52]]){
  let state={},heard=[];const options={characterId:'npc',seed,flow};
  assert.equal(voices.selectNpcVocal({},options).asset.voiceId,voiceId);
  const other=voices.selectNpcVocal({},{...options,characterId:'other'});
  for(let i=0;i<count*2;i++){
   const before=JSON.stringify(state),r=voices.selectNpcVocal(state,{...options,flow:i?100:flow});assert.equal(r.ok,true);assert.ok(r.asset);assert.equal(JSON.stringify(state),before);
   state=JSON.parse(JSON.stringify(r.state));heard.push(r.asset.id);
   const joined=voices.selectNpcVocal({...state,...other.state},{...options,characterId:'other'});assert.deepEqual(joined.state.other,voices.selectNpcVocal(other.state,{...options,characterId:'other'}).state.other);
  }
  assert.equal(new Set(heard.slice(0,count)).size,count);assert.equal(new Set(heard.slice(count)).size,count);assert.notEqual(heard[count-1],heard[count]);assert.notDeepEqual(heard.slice(0,count),heard.slice(count));
 }
});
test('old frozen Jura voice states retain exact order seed cursor and next recording',async()=>{
 const prior=JSON.parse(await readFile(new URL('./fixtures/npc-jura-frozen-voice.json',import.meta.url),'utf8'));
 assert.deepEqual(voices.normalizeNpcVoices(prior),prior);
 for(const [characterId,item]of Object.entries(prior)){
  const next=voices.selectNpcVocal(prior,{characterId,seed:999,flow:65});assert.equal(next.ok,true);assert.equal(next.asset.id,item.order[item.cursor]);assert.equal(next.state[characterId].seed,item.seed);
 }
});
test('Artem real NPC replay is frozen and failed rounds cannot consume the next take',async()=>{
 const args={characterId:'mak-npc-30',battleId:'makarevich-1',roundId:'selection',nowMinute:600},r=ensureNpcRoundTrack(createVirtualPcState(),args);assert.equal(r.ok,true,r.reason);
 const v=r.state.trackVersions.byId[r.trackVersionId];assert.equal(v.npc.voiceId,artem);assert.equal(npcPlaybackDescriptor(v).ok,true);
 const reloaded=createVirtualPcState(JSON.parse(JSON.stringify(r.state))),again=ensureNpcRoundTrack(reloaded,args);assert.deepEqual(again.state.trackVersions.byId[r.trackVersionId],v);assert.deepEqual(again.state.npcTracks.voices,r.state.npcTracks.voices);
 const failed=ensureNpcRoundTrack(again.state,{...args,roundId:'invalid'});assert.equal(failed.ok,false);assert.deepEqual(failed.state.npcTracks.voices,r.state.npcTracks.voices);
 const next=ensureNpcRoundTrack(failed.state,{...args,roundId:'round-2'});assert.equal(next.ok,true);assert.notEqual(next.state.trackVersions.byId[next.trackVersionId].recipe.descriptor.parts.at(-1).id,v.recipe.descriptor.parts.at(-1).id);
 for(const id of ['vocal-01','npc-jura-01']){const bad=structuredClone(v);bad.recipe.descriptor.parts[0].id=id;bad.npc.requiredAssets[0].id=id;const result=await playTrackVersion({playDescriptor(){throw Error('must not play');}},bad);assert.equal(result.ok,false);}
 const damaged=structuredClone(r.state.npcTracks.voices);[damaged['mak-npc-30'].order[0],damaged['mak-npc-30'].order[2]]=[damaged['mak-npc-30'].order[2],damaged['mak-npc-30'].order[0]];assert.equal(voices.selectNpcVocal(damaged,{characterId:'mak-npc-30',seed:1,flow:53}).ok,false);
});
test('new six parts mix with released material only in the established experimental XP range',()=>{
 const seen=new Set();let mixed=false;
 for(let i=0;i<4000;i++)for(const genreXP of [0,49.99]){
  const ids=Object.values(chooseBeginnerParts(()=>(i+.5)/4000,{genre:'experimental',genreXP,skill:47}));
  const added=ids.filter(id=>/jura-experimental-20261018-.*-[34]$/.test(id));added.forEach(id=>seen.add(id));if(added.length&&added.length<3)mixed=true;
 }
 assert.equal(seen.size,6);assert.equal(mixed,true);assert.deepEqual([...seen].map(beginnerById).map(p=>p.kind).sort(),['arrangement','arrangement','drums','drums','theme','theme']);
 for(const [genre,genreXP]of [['experimental',50],['experimental',-1],['boombap',0]])for(let i=0;i<400;i++)assert.equal(Object.values(chooseBeginnerParts(()=>(i+.5)/400,{genre,genreXP,skill:47})).some(id=>/jura-experimental-20261018-.*-[34]$/.test(id)),false);
});
