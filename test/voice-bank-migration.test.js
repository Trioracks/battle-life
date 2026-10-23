import test from 'node:test';
import assert from 'node:assert/strict';
const migration=await import('../src/voice-bank-migration.js').catch(()=>({}));
import * as catalog from '../src/vocal-catalog.js';
const vocalById=catalog.vocalById,voiceCatalog=(...args)=>catalog.voiceCatalog(...args);
import {selectPlayerVocal,selectNpcVocal,normalizeNpcVoices} from '../src/npc-vocal-catalog.js';
import {createBeat,startBeatStage,advanceBeatWork} from '../src/beat-production.js';
import {createLyric,startLyricWork,advanceLyricWork} from '../src/lyric-production.js';
import {startVocalWork,advanceVocalWork} from '../src/vocal-production.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {createAudioExport} from '../src/pc-audio-exports.js';
import {npcPlaybackDescriptor} from '../src/battle-npc-audio.js';
import {ensureNpcRoundTrack} from '../src/battle-npc.js';
const voiceId='npc-voice:kapa-20261018';
const oldBag={voiceId,seed:123,cycle:0,cursor:1,order:['npc-kapa-49'],lastId:'npc-kapa-49'};
function fixture(){
 let s=createVirtualPcState();s=createBeat(s,{id:'b',name:'Бит'},{},()=>.2).state;
 for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=advanceBeatWork(startBeatStage(s,'b',undefined,{},()=>.5).state,1000).state;}
 s=createLyric(s,{id:'t',name:'Текст'},{}).state;
 for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=advanceLyricWork(startLyricWork(s,{projectId:'t',kind:'stage'},{}).state,1000).state;}
 s.music.needs={satiety:100,energy:100};return s;
}

// Break caught: migration discards consumed content, mutates input, or repeats a migration.
test('kapa migration preserves consumed identical takes',()=>{
 assert.equal(typeof migration.migrateVoiceBag,'function');
 const before=structuredClone(oldBag),first=migration.migrateVoiceBag(oldBag,{voiceId,targetVersion:2});
 assert.equal(first.ok,true);assert.equal(first.changed,true);assert.deepEqual(oldBag,before);
 assert.equal(first.bag.voiceId,voiceId);assert.equal(first.bag.catalogVersion,2);
 const second=migration.migrateVoiceBag(first.bag,{voiceId,targetVersion:2});
 assert.equal(second.changed,false);assert.deepEqual(second.bag,first.bag);
 assert.equal(vocalById('npc-kapa-01').sha256,'185a304c2fadcb168711e4a3286fba201e78c359d5a676eb67962a6b49a2c60e');
 assert.equal(vocalById('npc-kapa-v2-08').sha256,vocalById('npc-kapa-01').sha256);
 assert.equal(first.bag.order.includes('npc-kapa-v2-08'),false);assert.equal(first.bag.order.includes('npc-kapa-v2-50'),false);
 assert.deepEqual(voiceCatalog(voiceId,1).parts.map(p=>p.id),['npc-kapa-49']);
 assert.equal(voiceCatalog(voiceId,2).parts.length,48);assert.equal(voiceCatalog(voiceId,99),null);
 assert.equal(migration.migrateVoiceBag({...oldBag,cursor:0},{voiceId,targetVersion:2}).ok,false);
 assert.equal(migration.migrateVoiceBag({...oldBag,catalogVersion:99},{voiceId,targetVersion:2}).ok,false);
 for(const catalogVersion of [null,'1',0,-1])assert.equal(migration.migrateVoiceBag({...oldBag,catalogVersion},{voiceId,targetVersion:2}).ok,false);
 let state={npc:oldBag};const next=selectNpcVocal(state,{characterId:'npc',seed:0});assert.equal(next.ok,true);assert.equal(next.asset.voiceId,voiceId);assert.equal(next.state.npc.catalogVersion,2);
 const forged=structuredClone(first.bag);[forged.order[0],forged.order[1]]=[forged.order[1],forged.order[0]];assert.equal(normalizeNpcVoices({npc:forged}).npc.blocked,true);
});

test('shared playable hashes remain consumed when source IDs change',()=>{
 assert.equal(typeof migration.migrateVoiceBagCatalogs,'function');
 const source={version:1,parts:[{id:'old-a',sha256:'a'},{id:'old-b',sha256:'b'}]},target={version:2,parts:[{id:'new-a',sha256:'a'},{id:'new-b',sha256:'b'},{id:'new-c',sha256:'c'}]};
 // Seed 0 deterministically orders this two-entry source as old-a, old-b.
 const bag={voiceId:'synthetic',seed:0,cycle:0,cursor:1,order:['old-a','old-b'],lastId:'old-a'};
 const r=migration.migrateVoiceBagCatalogs(bag,{voiceId:'synthetic',sourceCatalog:source,targetCatalog:target});
 assert.equal(r.ok,true);assert.equal(r.bag.cursor,1);assert.equal(r.bag.order[0],'new-a');assert.equal(r.bag.lastId,'new-a');assert.ok(!r.bag.order.slice(r.bag.cursor).includes('new-a'));
 assert.deepEqual(bag.order,['old-a','old-b']);
 const again=migration.migrateVoiceBagCatalogs(r.bag,{voiceId:'synthetic',sourceCatalog:source,targetCatalog:target});assert.equal(again.ok,true);assert.equal(again.changed,false);assert.deepEqual(again.bag,r.bag);
});

function pending(){
 const s=fixture();s.voiceId=voiceId;
 const r=startVocalWork(s,{beatId:'b',textId:'t'},{},()=>.2);assert.equal(r.ok,true);
 // Freeze an actual historical candidate, before the catalog update.
 r.state.recording.job.output.sourceId='npc-kapa-49';r.state.recording.job.vocalBag=structuredClone(oldBag);
 return r.state;
}
test('pending legacy take survives reload',()=>{
 const s=pending(),job=JSON.stringify(s.recording.job),loaded=createVirtualPcState(JSON.parse(JSON.stringify(s)));
 assert.equal(JSON.stringify(loaded.recording.job),job);
 const completed=advanceVocalWork(loaded,1000);assert.equal(completed.finished,true);assert.deepEqual(completed.state.playerVocalBag,oldBag);
 assert.equal(completed.state.projects[0].recording.sourceId,'npc-kapa-49');
 const exported=createAudioExport(completed.state,{id:'old',projectId:'b',kind:'vocal',folderId:'music',filename:'old',nowMinute:600});assert.equal(exported.ok,true);
 const recipe=JSON.stringify(exported.state.trackVersions);assert.equal(JSON.stringify(createVirtualPcState(JSON.parse(JSON.stringify(exported.state))).trackVersions),recipe);
 const next=selectPlayerVocal(completed.state.playerVocalBag,{voiceId,seed:999});assert.equal(next.ok,true);assert.equal(next.bag.catalogVersion,2);assert.ok(next.asset.id.startsWith('npc-kapa-v2-'));
});
test('forged pending bag stays blocked',()=>{
 const s=pending();s.recording.job.vocalBag.seed=456;
 // Same one-take historical permutation is insufficient: committed history must agree.
 s.playerVocalBag={...oldBag,cursor:0,lastId:null};
 const loaded=createVirtualPcState(s);assert.equal(loaded.recording.job,null);assert.equal(loaded.playerVocalBag.blocked,true);
 assert.equal(startVocalWork(loaded,{beatId:'b',textId:'t'}).ok,false);
});
test('all usable takes precede next cycle',()=>{
 for(const id of [voiceId,'npc-voice:daniel-20261020']){
  let bag=null;const heard=[];for(let i=0;i<(id===voiceId?48:51);i++){const r=selectPlayerVocal(bag,{voiceId:id,seed:123});assert.equal(r.ok,true);heard.push(r.asset.id);bag=JSON.parse(JSON.stringify(r.bag));}
  assert.equal(new Set(heard).size,heard.length);assert.equal(bag.cycle,0);
 }
});
test('new cycle does not repeat last take',()=>{
 let bag=migration.migrateVoiceBag(oldBag,{voiceId,targetVersion:2}).bag,last;
 for(let i=0;i<49;i++){const r=selectPlayerVocal(bag,{voiceId,seed:123});assert.equal(r.ok,true);if(i===48)assert.notEqual(r.asset.id,last);last=r.asset.id;bag=r.bag;}
 assert.equal(bag.cycle,1);
});
test('failed commit does not consume voice',()=>{
 const s=pending(),before=structuredClone(s.playerVocalBag);s.recording.job.baseRevision=99;
 const r=advanceVocalWork(s,1000);assert.equal(r.finished,false);assert.deepEqual(r.state.playerVocalBag,before);
});
test('legacy NPC source remains playable through the historical resolver',()=>{
 const s=createVirtualPcState();const r=ensureNpcRoundTrack(s,{characterId:'mak-npc-01',battleId:'makarevich-1',roundId:'selection',nowMinute:600});assert.equal(r.ok,true);
 const v=structuredClone(r.state.trackVersions.byId[r.trackVersionId]);v.npc.voiceId=voiceId;
 const wanted=v.npc.requiredAssets.find(p=>p.kind==='vocal');wanted.id='npc-kapa-49';wanted.voiceId=voiceId;
 const part=v.recipe.descriptor.parts.find(p=>p.vocal);part.id='npc-kapa-49';part.voiceId=voiceId;
 assert.equal(npcPlaybackDescriptor(v).ok,true);
});
