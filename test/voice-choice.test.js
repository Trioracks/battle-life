import test from 'node:test';
import assert from 'node:assert/strict';
import * as catalog from '../src/vocal-catalog.js';
import {createProfile,loadProfile,saveProfile,SAVE_KEY} from '../src/avatar-v3-profile.js';
import {createNewGameSession} from '../src/apartment-v3-new-game.js';
import {createVirtualPcState,loadVirtualPcState,saveVirtualPcState} from '../src/virtual-pc-state.js';
import {selectNpcVocal,normalizeNpcVoices,selectPlayerVocal} from '../src/npc-vocal-catalog.js';
import {migrateNoviceSave} from '../src/home-profile-migration.js';
import {VIRTUAL_PC_STORAGE_KEY} from '../src/virtual-pc-state.js';
import {createBeat,startBeatStage,advanceBeatWork} from '../src/beat-production.js';
import {createLyric,startLyricWork,advanceLyricWork} from '../src/lyric-production.js';
import {startVocalWork,advanceVocalWork} from '../src/vocal-production.js';
import {normalizeRecording} from '../src/vocal-result.js';
import {resolveBeatPlayback} from '../src/beat-playback.js';
import {createAudioExport,normalizeAudioExports} from '../src/pc-audio-exports.js';
import {playTrackVersion} from '../src/track-version-audio.js';
import {ensureNpcRoundTrack} from '../src/battle-npc.js';
import {npcPlaybackDescriptor} from '../src/battle-npc-audio.js';
import {BeatAudio} from '../src/beat-audio.js';
import {pcDocument} from './helpers/virtual-pc-dom.js';
import {validateCreatorDraft} from '../src/apartment-v3-creator-session.js';

const ids=['player-voice:original','npc-voice:kapa-20261018','npc-voice:gans-20261018','npc-voice:artem-20261018','npc-voice:jura-20261018'];
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};

// Break caught: selector loses choice/default/reset or invalid choice is reported as a name error.
test('creator selector exposes five labelled choices, defaults and resets without fetching or playing audio',async()=>{
 const ui=await import('../src/character-voice-selector.js').catch(()=>({}));assert.equal(typeof ui.mountVoiceSelector,'function');
 const select=pcDocument().createElement('select'),view=ui.mountVoiceSelector(select);
 assert.deepEqual(select.children.map(n=>n.textContent),['Геннадий Зелёнкин','Глеб Курилков','Ганс Аристократов','Филипп Филов','Юрий Комбучев']);
 assert.equal(view.value,ids[0]);for(const voiceId of ids){select.value=voiceId;assert.equal(view.value,voiceId);}
 view.reset();assert.equal(view.value,ids[0]);assert.ok(validateCreatorDraft({name:'Герой',voiceId:'corrupt'}).errors.voiceId);
});

// Break caught: lost/corrupt committed or pending bag resets take rotation after reload.
test('missing and corrupt player bag cannot consume/reissue a committed or pending take',()=>{
 const initial=ready(ids[2]),started=startVocalWork(initial,{beatId:'b',textId:'t'},{},()=>.2);
 assert.equal(started.ok,true);const partial=advanceVocalWork(started.state,1).state;
 const restored=createVirtualPcState(JSON.parse(JSON.stringify(partial)));assert.deepEqual(restored.recording.job,partial.recording.job);
 const completed=advanceVocalWork(restored,1000).state;completed.projects.push({...structuredClone(completed.projects[0]),id:'new',recording:undefined});completed.music.needs={satiety:100,energy:100};
 for(const raw of [undefined,null,{blocked:true},{...completed.playerVocalBag,voiceId:ids[4]}]){
  const bad={...completed,playerVocalBag:raw},loaded=createVirtualPcState(JSON.parse(JSON.stringify(bad)));
  assert.equal(startVocalWork(loaded,{beatId:'new',textId:'t'}).ok,false);
 }
 const pending=structuredClone(partial);pending.recording.job.vocalBag.cursor=0;
 const loaded=createVirtualPcState(pending);assert.equal(loaded.recording.job,null);assert.equal(startVocalWork(loaded,{beatId:'b',textId:'t'}).ok,false,'corrupt pending history blocks reissuance');
});

test('a forged valid pending bag cannot replace the next committed player take',()=>{
 let s=finish(ready(ids[2]));s.projects.push({...structuredClone(s.projects[0]),id:'next',recording:undefined});s.music.needs={satiety:100,energy:100};
 const started=startVocalWork(s,{beatId:'next',textId:'t'},{},()=>.2);assert.equal(started.ok,true);
 const fake=selectPlayerVocal(null,{voiceId:ids[2],seed:87654});started.state.recording.job.vocalBag=fake.bag;started.state.recording.job.output.sourceId=fake.asset.id;
 const loaded=createVirtualPcState(JSON.parse(JSON.stringify(started.state)));assert.equal(loaded.recording.job,null);assert.equal(startVocalWork(loaded,{beatId:'next',textId:'t'}).ok,false);
});

test('profile/PC identity corruption blocks migration without replacing either saved source',()=>{
 for(const bad of [null,'unknown',ids[1]]){
  const saved=storage();createNewGameSession(null,saved,{enter(){},restore(){}}).submit({name:'Герой',voiceId:ids[2]});
  const pc=createVirtualPcState({voiceId:ids[2]});pc.voiceId=bad;saved.setItem(VIRTUAL_PC_STORAGE_KEY,JSON.stringify(pc));
  const before=[saved.getItem(SAVE_KEY),saved.getItem(VIRTUAL_PC_STORAGE_KEY)];assert.equal(migrateNoviceSave(saved).ok,false);assert.deepEqual([saved.getItem(SAVE_KEY),saved.getItem(VIRTUAL_PC_STORAGE_KEY)],before);
 }
});

// Break caught: rejected stored identity becomes an empty recordable beat and is lost on save.
test('invalid saved recording identities retain the full blocked project through save/reload',()=>{
 const base=finish(finish(finish(ready(ids[2])),'mix'),'master');
 const frozen=createAudioExport(base,{id:'frozen',projectId:'b',kind:'track',folderId:'music',filename:'frozen',nowMinute:600});assert.equal(frozen.ok,true);
 for(const corrupt of [r=>r.voiceId=null,r=>r.voiceId='unknown',r=>delete r.voiceId,r=>r.sourceId='vocal-01']){
  const raw=structuredClone(frozen.state);corrupt(raw.projects[0].recording);const original=JSON.parse(JSON.stringify(raw.projects[0])),versions=JSON.stringify(raw.trackVersions);
  const loaded=createVirtualPcState(JSON.parse(JSON.stringify(raw))),project=loaded.projects[0];assert.ok(project.recoveryIssue);assert.deepEqual(project.recoveryData,original);
  const denied=startVocalWork(loaded,{beatId:'b',textId:'t'});assert.equal(denied.ok,false);assert.deepEqual(denied.state.projects[0].recoveryData,original);
  const direct=startVocalWork(raw,{beatId:'b',textId:'t'});assert.equal(direct.ok,false);assert.deepEqual(direct.state.projects[0].recoveryData,original);
  const saved=storage();assert.equal(saveVirtualPcState(saved,loaded),true);const restored=loadVirtualPcState(saved);assert.equal(restored.ok,true);assert.deepEqual(restored.state.projects[0].recoveryData,original);assert.equal(startVocalWork(restored.state,{beatId:'b',textId:'t'}).ok,false);
  assert.equal(JSON.stringify(restored.state.trackVersions),versions);assert.deepEqual(restored.state.playerVocalBag,base.playerVocalBag);
 }
});

test('legacy original recordings without explicit voice identity remain playable and retained by saves',()=>{
 const legacy=finish(ready(ids[0]));delete legacy.projects[0].recording.voiceId;delete legacy.playerVocalBag;
 const recording=JSON.parse(JSON.stringify(legacy.projects[0].recording)),saved=storage();assert.equal(saveVirtualPcState(saved,legacy),true);
 const loaded=loadVirtualPcState(saved);assert.equal(loaded.ok,true);assert.equal(loaded.state.projects[0].recoveryIssue,undefined);assert.deepEqual(loaded.state.projects[0].recording,recording);assert.equal(resolveBeatPlayback(loaded.state.projects[0]).ok,true);
});
function ready(voiceId){
 let s=createVirtualPcState({voiceId});s=createBeat(s,{id:'b',name:'Бит'},{},()=>.2).state;
 for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=advanceBeatWork(startBeatStage(s,'b',undefined,{},()=>.5).state,1000).state;}
 s=createLyric(s,{id:'t',name:'Текст'},{}).state;
 for(let i=0;i<3;i++){s.music.needs={satiety:100,energy:100};s=advanceLyricWork(startLyricWork(s,{projectId:'t',kind:'stage'},{}).state,1000).state;}
 s.music.needs={satiety:100,energy:100};return s;
}
function finish(s,kind='draft',beatId='b'){
 s.music.needs={satiety:100,energy:100};const r=startVocalWork(s,{beatId,textId:'t',kind},{},()=>.2);assert.equal(r.ok,true,r.reason);return advanceVocalWork(r.state,1000).state;
}

// Break caught: choice lost at profile/PC migration or silently repaired invalid identity.
test('five character identities persist through creator, new game, profile edits and save codec; cancel preserves save',()=>{
 assert.deepEqual(catalog.VOICE_PACKS?.map(p=>p.label),['Геннадий Зелёнкин','Глеб Курилков','Ганс Аристократов','Филипп Филов','Юрий Комбучев']);
 for(const voiceId of ids){
  const saved=storage();let home;
  const result=createNewGameSession(null,saved,{enter:(p,h)=>home=h,restore(){}}).submit({name:'Герой',voiceId});
  assert.equal(result.ok,true);assert.equal(result.profile.voiceId,voiceId);assert.equal(home.pcState.voiceId,voiceId);
  assert.equal(loadProfile(saved).profile.voiceId,voiceId);assert.equal(loadVirtualPcState(saved).state.voiceId,voiceId);
  const edited={...result.profile,name:'Новое имя'};assert.equal(saveProfile(saved,edited).ok,true);assert.equal(loadProfile(saved).profile.voiceId,voiceId);
  const before=saved.getItem(SAVE_KEY);createNewGameSession(edited,saved,{enter(){assert.fail();},restore(){}}).cancel();assert.equal(saved.getItem(SAVE_KEY),before);
  assert.equal(saveVirtualPcState(saved,home.pcState),true);assert.equal(loadVirtualPcState(saved).state.voiceId,voiceId);
 }
 assert.equal(createProfile({name:'Старый'}).voiceId,ids[0]);assert.equal(createVirtualPcState().voiceId,ids[0]);
 for(const voiceId of [null,'',{},'unknown']){assert.throws(()=>createProfile({name:'Герой',voiceId}));assert.throws(()=>createVirtualPcState({voiceId}));}
});

// Break caught: recording uses original source regardless of choice, or permits foreign pack substitution.
test('each chosen pack records, plays and exports its take with gain metadata and frozen ownership',async()=>{
 for(const voiceId of ids){
  let s=finish(ready(voiceId)),recording=s.projects[0].recording;
  assert.equal(recording.voiceId,voiceId);assert.equal(catalog.vocalById(recording.sourceId).voiceId,voiceId);
  s=finish(createVirtualPcState(JSON.parse(JSON.stringify(s))),'clean');assert.equal(s.projects[0].recording.sourceId,recording.sourceId);
  const play=resolveBeatPlayback(s.projects[0]);assert.equal(play.ok,true);const part=play.descriptor.parts.at(-1),asset=catalog.vocalById(part.id);
  assert.equal(part.voiceId,voiceId);assert.equal(part.sourceGainDb,asset.sourceGainDb??0);
  for(const kind of ['vocal','track']){const r=createAudioExport(s,{id:kind,projectId:'b',kind,folderId:'music',filename:kind,nowMinute:600});assert.equal(r.ok,true,r.reason);s=r.state;}
  s=createVirtualPcState(JSON.parse(JSON.stringify(s)));assert.equal(s.audioExports.files.length,2);
  const version=Object.values(s.trackVersions.byId)[0];let played;
  assert.equal((await playTrackVersion({playDescriptor:async d=>{played=d;return true;}},version)).ok,true);assert.equal(played.parts.at(-1).id,asset.id);
  const corrupt=structuredClone(version);corrupt.recipe.descriptor.parts.at(-1).id=voiceId===ids[0]?'npc-kapa-01':'vocal-01';
  let foreignPlayed=false;assert.equal((await playTrackVersion({stop(){},playDescriptor(){foreignPlayed=true;return true;}},corrupt)).ok,false);assert.equal(foreignPlayed,false);
  const foreign={...recording,sourceId:voiceId===ids[0]?'npc-kapa-01':'vocal-01'};assert.equal(normalizeRecording(foreign),null);
  const badExport=structuredClone(s.audioExports);badExport.files[0].descriptor.parts[0].id=foreign.sourceId;
  assert.equal(normalizeAudioExports(badExport,s.trackVersions).recovery.length,1);
  const nullIdentity=structuredClone(version);nullIdentity.recipe.beat.recording.voiceId=null;
  assert.equal((await playTrackVersion({stop(){},playDescriptor(){return true;}},nullIdentity)).ok,false);
  const missingIdentity=structuredClone(s.audioExports);delete missingIdentity.files[0].voiceId;
  if(voiceId!==ids[0])assert.equal(normalizeAudioExports(missingIdentity,s.trackVersions).recovery.length,1);
 }
});

// Break caught: Flow gates speaker identity or player pack leaks into a new NPC assignment.
test('all other four NPC packs are reachable for each player choice without Flow gates and stay assigned',()=>{
 for(const playerVoiceId of ids)for(const flow of [0,100]){
  const seen=new Set();for(let seed=0;seed<120;seed++){
   const r=selectNpcVocal({},{characterId:'npc',seed,flow,playerVoiceId});assert.equal(r.ok,true);assert.ok(r.asset);assert.notEqual(r.asset.voiceId,playerVoiceId);seen.add(r.asset.voiceId);
   const next=selectNpcVocal(r.state,{characterId:'npc',seed:999,flow:100-flow,playerVoiceId});assert.equal(next.asset.voiceId,r.asset.voiceId);
  }
  assert.deepEqual([...seen].sort(),ids.filter(id=>id!==playerVoiceId).sort());
 }
 assert.equal(selectNpcVocal({},{characterId:'npc',seed:1,playerVoiceId:'broken'}).ok,false);
});

// Break caught: bag repeats before exhaustion, reset after save, or corrupt bag grants a new take.
test('all player and NPC bags exhaust without repeats and corruption blocks replay',()=>{
 for(const voiceId of ids){
  const pack=catalog.VOICE_PACKS?.find(p=>p.id===voiceId);assert.ok(pack);
  let s=ready(voiceId),heard=[];
  for(let i=0;i<pack.parts.length+1;i++){
   if(i){s.projects.push({...structuredClone(s.projects[0]),id:'b'+i,recording:undefined});}
   const beatId=i?'b'+i:'b',r=startVocalWork(s,{beatId,textId:'t'},{},()=>.2);assert.equal(r.ok,true,r.reason);
   const candidate=r.state.recording.job.output.sourceId;assert.deepEqual(r.state.playerVocalBag,s.playerVocalBag,'starting does not consume a take');
   s=advanceVocalWork(r.state,1000).state;heard.push(candidate);s=createVirtualPcState(JSON.parse(JSON.stringify(s)));s.music.needs={satiety:100,energy:100};
  }
  assert.equal(new Set(heard.slice(0,-1)).size,pack.parts.length);if(pack.parts.length>1)assert.notEqual(heard.at(-1),heard.at(-2));
  if(voiceId===ids[1])assert.deepEqual(heard,['npc-kapa-49','npc-kapa-49']);
  const broken=structuredClone(s);broken.playerVocalBag={blocked:true};assert.equal(startVocalWork(broken,{beatId:'missing',textId:'t'}).ok,false);
  let state={},npc=[];const playerVoiceId=ids.find(id=>id!==voiceId);
  for(let seed=0;seed<120;seed++){const r=selectNpcVocal({},{characterId:'npc',seed,playerVoiceId});if(r.asset.voiceId===voiceId){state=r.state;npc.push(r.asset.id);break;}}
  const seed=state.npc.seed;for(let i=1;i<pack.parts.length*2;i++){const r=selectNpcVocal(state,{characterId:'npc',seed:999,playerVoiceId});assert.equal(r.ok,true);state=JSON.parse(JSON.stringify(r.state));npc.push(r.asset.id);}
  assert.equal(state.npc.seed,seed);assert.equal(new Set(npc.slice(0,pack.parts.length)).size,pack.parts.length);if(pack.parts.length>1)assert.notEqual(npc[pack.parts.length-1],npc[pack.parts.length]);
  if(pack.parts.length>2)[state.npc.order[0],state.npc.order[2]]=[state.npc.order[2],state.npc.order[0]];else state.npc.cursor=0;
  assert.equal(normalizeNpcVoices(state).npc.blocked,true);
 }
});

test('NPCs can use original vocals when another pack belongs to player; required ownership still rejects swaps',async()=>{
 let result;
 for(let i=1;i<=40;i++){const characterId='mak-npc-'+String(i).padStart(2,'0');const r=ensureNpcRoundTrack(createVirtualPcState({voiceId:ids[1]}),{characterId,battleId:'makarevich-1',roundId:'selection',nowMinute:600});if(r.ok&&r.state.trackVersions.byId[r.trackVersionId].npc.voiceId===ids[0]){result=r;break;}}
 assert.ok(result);const version=result.state.trackVersions.byId[result.trackVersionId];assert.equal(npcPlaybackDescriptor(version).ok,true);assert.equal((await playTrackVersion({playDescriptor:async()=>true},version)).ok,true);
 const bad=structuredClone(version);bad.recipe.descriptor.parts.at(-1).id='npc-kapa-01';assert.equal(npcPlaybackDescriptor(bad).ok,false);
});

test('short vocal decode uses its actual source duration',async()=>{
 assert.ok(catalog.VOICE_PACKS);
 const asset=catalog.vocalById('npc-gans-01');assert.ok(asset);
 let fetched;const audio=new BeatAudio({contextFactory:()=>({state:'running',close(){},decodeAudioData:async()=>({duration:5.173604166666666})}),fetchFn:async path=>{fetched=path;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};}});
 await audio.unlock();assert.equal((await audio.buffer(asset.id)).duration,5.173604166666666);assert.equal(fetched,asset.path);audio.dispose();
});
