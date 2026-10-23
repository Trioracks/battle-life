import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfile,saveProfile,loadProfile,SAVE_KEY,STAT_KEYS} from '../src/avatar-v3-profile.js';
import {createNewGameSession} from '../src/apartment-v3-new-game.js';
import {createVirtualPcState,loadVirtualPcState,VIRTUAL_PC_STORAGE_KEY as PC} from '../src/virtual-pc-state.js';
import {effectiveBeatSkill} from '../src/beat-production.js';
import {effectiveWritingSkill} from '../src/lyric-production.js';
import {effectiveVocalSkill} from '../src/vocal-production.js';
import {effectiveSoundSkill,createVocalTake,normalizeRecording} from '../src/vocal-result.js';
import {migrateNoviceSave,NOVICE_JOURNAL_KEY} from '../src/home-profile-migration.js';

function storage(){
 const records=new Map();let denied='';
 return {getItem:key=>records.get(key)??null,setItem(key,value){if(key===denied){denied='';throw Error('denied');}records.set(key,String(value));},deny(key){denied=key;}};
}

// Catches profile defaults or submit/reload paths that silently grant ten points.
test('new game starts at genuine zero',()=>{
 assert.deepEqual(Object.values(createProfile({name:'Тест'}).skills),Array(9).fill(0));
 const saved=storage();let entered;
 const result=createNewGameSession(null,saved,{enter(profile,home){entered={profile,home};},restore(){}}).submit({name:'Тест'});
 assert.equal(result.saved,true);assert.equal(entered.profile.skillSchema,2);
 const loaded=loadProfile(saved);assert.equal(loaded.ok,true);const profile=loaded.profile,pc=loadVirtualPcState(saved).state;
 assert.deepEqual(Object.values(profile.skills),Array(9).fill(0));
 assert.deepEqual([effectiveWritingSkill(pc,profile.skills),effectiveVocalSkill(pc,profile.skills),effectiveSoundSkill(pc,profile.skills),effectiveBeatSkill(pc,profile.skills),pc.music.genres.xp.experimental],[0,0,0,0,0]);
 assert.equal(pc.writing.practice,0);assert.deepEqual(pc.recording.practice,{flow:0,sound:0});assert.equal(pc.music.practice,0);
 assert.equal(pc.music.needs.satiety,68);assert.equal(pc.music.needs.energy,72);assert.ok(pc.music.cash>0);
});

test('zero-schema validation requires every finite skill in range and preserves a good save',()=>{
 const saved=storage(),profile=createProfile({name:'Нулевой'});profile.skillSchema=2;
 profile.skills=Object.fromEntries(STAT_KEYS.map(key=>[key,0]));profile.skills.flow=100;profile.skills.writing=.25;
 assert.equal(saveProfile(saved,profile).ok,true);const before=saved.getItem(SAVE_KEY);
 assert.deepEqual(loadProfile(saved).profile.skills,profile.skills);
 for(const value of [undefined,null,'0',NaN,Infinity,-.1,100.1]){
  const bad=structuredClone(profile);bad.skills.flow=value;
  assert.equal(saveProfile(saved,bad).ok,false,String(value));assert.equal(saved.getItem(SAVE_KEY),before);
  saved.setItem(SAVE_KEY,JSON.stringify(bad));assert.equal(loadProfile(saved).ok,false);saved.setItem(SAVE_KEY,before);
 }
 const missing=structuredClone(profile);delete missing.skills.sound;
 assert.equal(saveProfile(saved,missing).ok,false);assert.equal(saved.getItem(SAVE_KEY),before);
 const wrongVersion={...profile,version:3};assert.equal(saveProfile(saved,wrongVersion).ok,false);
});

test('live skill defaults and new vocal snapshots never invent ten points',()=>{
 const pc=createVirtualPcState();
 assert.deepEqual([effectiveBeatSkill(pc),effectiveWritingSkill(pc),effectiveSoundSkill(pc),effectiveVocalSkill(pc),effectiveVocalSkill(pc,{},'mix')],[0,0,0,0,0]);
 assert.deepEqual(createVocalTake().skills,{flow:0,sound:0,musicality:0,confidence:0});
});

test('legacy vocal snapshots keep their historic ten-point fallback',()=>{
 const recording=normalizeRecording({version:1,revision:1,sourceId:'vocal-01',text:{id:'old',name:'Архив',revision:1},draft:{kind:'draft',seed:1,skills:{flow:20},sliders:[8,8,8]}});
 assert.deepEqual(recording.draft.skills,{flow:20,sound:10,musicality:10,confidence:10});
 assert.equal(recording.draft.quality,26);assert.equal(recording.draft.resultVersion,undefined);
});

test('interrupted new-game journal recovers the zero profile and chosen voice',()=>{
 const saved=storage();saved.deny(PC);
 const result=createNewGameSession(null,saved,{enter(){},restore(){}}).submit({name:'Восстановленный',voiceId:'npc-voice:daniel-20261020'});
 assert.equal(result.saved,false);assert.equal(JSON.parse(saved.getItem(NOVICE_JOURNAL_KEY)).kind,'new-game');
 assert.equal(migrateNoviceSave(saved).ok,true);assert.equal(loadProfile(saved).ok,true);
 const p=loadProfile(saved).profile,pc=loadVirtualPcState(saved).state;
 assert.deepEqual(Object.values(p.skills),Array(9).fill(0));assert.equal(p.voiceId,'npc-voice:daniel-20261020');assert.equal(pc.voiceId,p.voiceId);
 assert.deepEqual(pc.projects,[]);assert.equal(effectiveBeatSkill(pc,p.skills),0);
});
