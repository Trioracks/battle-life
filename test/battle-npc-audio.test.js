import test from 'node:test';
import assert from 'node:assert/strict';
import {DEMO_PARTICIPANTS} from '../src/battle-demo-config.js';
import {ensureNpcRoundTrack} from '../src/battle-npc.js';
import {npcPlaybackDescriptor} from '../src/battle-npc-audio.js';
import {NPC_VOCAL_CATALOG} from '../src/npc-vocal-catalog.js';
import {createVirtualPcState} from '../src/virtual-pc-state.js';
import {playTrackVersion} from '../src/track-version-audio.js';
import {beginnerById} from '../src/beat-beginner-bank.js';
import {createSocialAudio} from '../src/social-audio-view.js';
import {pcDocument,findButton,allPc} from './helpers/virtual-pc-dom.js';
function version(){const r=ensureNpcRoundTrack(createVirtualPcState(),{characterId:DEMO_PARTICIPANTS[0].characterId,battleId:'makarevich-1',roundId:'selection',nowMinute:600});return r.state.trackVersions.byId[r.trackVersionId];}
test('missing NPC voice stays explicit; cleared beat preview is separate from the full track',async()=>{
 const v=version(),before=JSON.stringify(v),r=npcPlaybackDescriptor(v,NPC_VOCAL_CATALOG);assert.equal(r.ok,false);assert.equal(r.missingAssets.length,1);assert.equal(r.missingAssets[0].kind,'vocal');assert.match(r.reason,/голос/i);
 assert.ok(r.previewDescriptor.parts.length>=3);assert.ok(r.previewDescriptor.parts.every(p=>beginnerById(p.id)));assert.equal(r.previewDescriptor.parts.some(p=>p.vocal),false);
 let called=0;assert.equal((await playTrackVersion({stop(){},playDescriptor(){called++;return true;}},v)).ok,false);assert.equal(called,0);assert.equal(JSON.stringify(v),before);
});
test('later catalog material cannot mutate an old missing-voice snapshot or substitute hero vocals',()=>{
 const v=version(),wanted=v.npc.requiredAssets.find(a=>a.kind==='vocal'),catalog=[{...wanted,path:'assets/audio/future.wav',verified:true}];
 assert.equal(npcPlaybackDescriptor(v,catalog).ok,false);assert.equal(npcPlaybackDescriptor(v,[{...wanted,id:'vocal-01',path:'assets/audio/vocals/01.wav'}]).ok,false);
 const r=npcPlaybackDescriptor(v);r.previewDescriptor.parts[0].id='changed';assert.notEqual(v.recipe.descriptor.parts[0].id,'changed');
});
test('NPC social audio row labels and plays only the explicitly requested beat preview',async()=>{
 const v=version(),d=pcDocument();let played=null;const view=createSocialAudio({playDescriptor:async descriptor=>{played=descriptor;return true;}}),row=view.row(d,{version:v});
 const button=findButton(row,'Предпросмотр бита — без голоса');assert.ok(button);button.click();await new Promise(r=>setImmediate(r));
 assert.equal(played.parts.some(p=>p.vocal),false);assert.ok(allPc(row).some(n=>n.textContent==='Играет бит без голоса'));view.dispose();
});
test('damaged NPC required-assets list fails explicitly instead of throwing through a page',()=>{
 const v=version();v.npc.requiredAssets=null;assert.equal(npcPlaybackDescriptor(v).ok,false);
});
