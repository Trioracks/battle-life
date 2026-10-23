import test from 'node:test';
import assert from 'node:assert/strict';
import {SAVE_KEY,STAT_KEYS,createProfile} from '../src/avatar-v3-profile.js?rev=28';
import {createNewGameSession} from '../src/apartment-v3-new-game.js?rev=28';
import {createVirtualPcState,VIRTUAL_PC_STORAGE_KEY as PC} from '../src/virtual-pc-state.js?rev=28';
import {advanceBeatWork,createBeat,startBeatStage} from '../src/beat-production.js?rev=28';
const migration=await import('../src/home-profile-migration.js?rev=28').catch(()=>({}));
const oldProfile={version:3,name:'Прежний',skills:Object.fromEntries(STAT_KEYS.map(k=>[k,30])),appearance:{hair:'shaggy',beard:'broad',mustache:'chevron',top:'hoodie',topColor:'red'},extra:{keep:true}};
const oldPc={...createVirtualPcState({projects:[{id:'keep',sourceStems:['kick.wav']}],music:{cash:987,practice:14,genrePractice:{boom_bap:8}},household:{fridge:{apple:0,pear:2,banana:3}}}),extra:'untouched'};delete oldPc.noviceSchema;
function fixture(){const values=new Map([[SAVE_KEY,JSON.stringify(oldProfile)],[PC,JSON.stringify(oldPc)]]);let fail='';return {values,set fail(v){fail=v;},getItem:k=>values.get(k)??null,setItem(k,v){if(k===fail){fail='';throw Error('write denied');}values.set(k,String(v));}};}
test('old profile migration preserves earned progress',()=>{
 assert.equal(typeof migration.migrateNoviceSave,'function');const s=fixture();assert.equal(migration.migrateNoviceSave(s).ok,true);const p=JSON.parse(s.getItem(SAVE_KEY)),pc=JSON.parse(s.getItem(PC));
 assert.deepEqual(p.skills,oldProfile.skills);assert.deepEqual(pc.music,oldPc.music);assert.deepEqual(p.extra,{keep:true});
 assert.equal(p.appearance.hair,'bowl');assert.equal(p.appearance.beard,'full');assert.equal(p.appearance.mustache,'classic');assert.deepEqual(p.wardrobe.top,[{id:'hoodie',color:'red'}]);for(const key of ['projects','household','extra'])assert.deepEqual(pc[key],oldPc[key]);assert.equal(pc.music.cash,987);assert.equal(pc.noviceSchema,1);
 let practiced=createBeat(createVirtualPcState(pc),{id:'new',name:'Практика'},p.skills,()=>.1).state;practiced=startBeatStage(practiced,'new',undefined,p.skills,()=>.1).state;practiced=advanceBeatWork(practiced,practiced.music.job.total).state;
 // Effective beat skill44 freezes a total budget1.1409183116147545; this stage earns one third.
 assert.ok(Math.abs(practiced.music.practice-14.380306103871584)<1e-9);s.setItem(PC,JSON.stringify(practiced));p.skills.flow=32;s.setItem(SAVE_KEY,JSON.stringify(p));assert.equal(migration.migrateNoviceSave(s).ok,true);assert.ok(Math.abs(JSON.parse(s.getItem(PC)).music.practice-14.380306103871584)<1e-9);assert.equal(JSON.parse(s.getItem(SAVE_KEY)).skills.flow,32);
});

test('existing v4 careers retain skills, practice, voice, wardrobe, pending work and frozen versions',()=>{
 const s=fixture(),p=createProfile({name:'Старая v4',voiceId:'npc-voice:daniel-20261020'});delete p.skillSchema;
 p.skills=Object.fromEntries(STAT_KEYS.map(k=>[k,37.25]));p.wardrobe.top.push({id:'hoodie',color:'red'});
 const pc={...structuredClone(oldPc),voiceId:p.voiceId,noviceSchema:1,recording:{practice:{flow:4.5,sound:7.25},job:{output:{voiceId:p.voiceId,sourceId:'npc-daniel-01'},elapsed:12}},playerVocalBag:{catalogVersion:1,remaining:['npc-daniel-02']},trackVersions:{byId:{archive:{quality:14,skills:{flow:17}}}}};
 s.setItem(SAVE_KEY,JSON.stringify(p));s.setItem(PC,JSON.stringify(pc));const before=[s.getItem(SAVE_KEY),s.getItem(PC)];
 assert.equal(migration.migrateNoviceSave(s).ok,true);assert.deepEqual([s.getItem(SAVE_KEY),s.getItem(PC)],before);
});

test('interrupted journal recovers without resetting skills',()=>{
 for(const target of [SAVE_KEY,PC]){
  const s=fixture();s.fail=target;assert.equal(migration.migrateNoviceSave(s).ok,false);assert.equal(migration.migrateNoviceSave(s).ok,true);
  assert.deepEqual(JSON.parse(s.getItem(SAVE_KEY)).skills,oldProfile.skills);assert.deepEqual(JSON.parse(s.getItem(PC)).music,oldPc.music);
 }
});

test('pre-change prepared reset journal restores earned sources and pending voice state',()=>{
 for(const partiallyWritten of [false,true]){
  const s=fixture(),token='legacy-reset',sourcePc={...structuredClone(oldPc),recording:{practice:{flow:3.5,sound:6.5},job:{kind:'draft',elapsed:17,output:{voiceId:'player-voice:original',sourceId:'vocal-09'}}},playerVocalBag:{version:1,remaining:['vocal-10']},trackVersions:{byId:{frozen:{quality:19}}}};
  const targetProfile={...oldProfile,version:4,noviceSchema:1,noviceMigration:token,skills:Object.fromEntries(STAT_KEYS.map(k=>[k,10]))};
  const targetPc={...sourcePc,noviceSchema:1,noviceMigration:token,music:{...sourcePc.music,practice:0,genrePractice:{}}};
  s.setItem(migration.PROFILE_BACKUP_KEY,JSON.stringify(oldProfile));s.setItem(migration.PC_BACKUP_KEY,JSON.stringify(sourcePc));
  s.setItem(PC,JSON.stringify(sourcePc));
  s.setItem(migration.NOVICE_JOURNAL_KEY,JSON.stringify({status:'prepared',token,sourceProfile:JSON.stringify(oldProfile),profile:targetProfile,pc:targetPc}));
  if(partiallyWritten){s.setItem(SAVE_KEY,JSON.stringify(targetProfile));s.setItem(PC,JSON.stringify(targetPc));}
  assert.equal(migration.migrateNoviceSave(s).ok,true);
  assert.deepEqual(JSON.parse(s.getItem(SAVE_KEY)).skills,oldProfile.skills);
  const recovered=JSON.parse(s.getItem(PC));for(const key of ['music','projects','recording','playerVocalBag','trackVersions'])assert.deepEqual(recovered[key],sourcePc[key]);
 }
});

test('pre-change recovery rejects missing or malformed earned sources without overwriting targets',()=>{
 for(const damage of ['missing-pc','bad-pc','empty-pc','bad-profile','missing-skill']){
  const s=fixture(),token='legacy-reset',p={...oldProfile,version:4,noviceSchema:1,noviceMigration:token},pc={...oldPc,noviceMigration:token};
  const source=structuredClone(oldProfile);if(damage==='missing-skill')delete source.skills.flow;
  if(damage!=='missing-pc')s.setItem(migration.PC_BACKUP_KEY,damage==='bad-pc'?'not json':damage==='empty-pc'?'{}':JSON.stringify(oldPc));
  s.setItem(migration.NOVICE_JOURNAL_KEY,JSON.stringify({status:'prepared',token,sourceProfile:damage==='bad-profile'?'not json':JSON.stringify(source),profile:p,pc}));
  const before=[s.getItem(SAVE_KEY),s.getItem(PC)];assert.equal(migration.migrateNoviceSave(s).ok,false,damage);assert.deepEqual([s.getItem(SAVE_KEY),s.getItem(PC)],before);
 }
});

test('prepared targets reject missing or invalid zero-schema skills before replacing either save',()=>{
 const cases=[...STAT_KEYS.map(key=>({key,value:undefined})),...[null,'0',NaN,Infinity,-.1,100.1].map(value=>({key:'flow',value}))];
 for(const kind of ['new-game','schema-upgrade'])for(const {key,value} of cases){
  const s=fixture(),source=createProfile({name:'Текущая карьера'}),target=createProfile({name:'Цель журнала'}),token='invalid-zero-target';source.skills.flow=23.5;
  s.setItem(SAVE_KEY,JSON.stringify(source));target.noviceMigration=token;
  if(value===undefined)delete target.skills[key];else target.skills[key]=value;
  let raw=JSON.stringify({status:'prepared',kind,token,sourceProfile:s.getItem(SAVE_KEY),profile:target,pc:{...oldPc,noviceMigration:token},homeTime:{day:1,minutes:1410}});
  // JSON.stringify maps Infinity to null; numeric overflow exercises the real
  // non-finite value JSON.parse can recover from a damaged persisted journal.
  if(value===Infinity)raw=raw.replace('"flow":null','"flow":1e400');
  s.setItem(migration.NOVICE_JOURNAL_KEY,raw);
  const before=[s.getItem(SAVE_KEY),s.getItem(PC)],journal=s.getItem(migration.NOVICE_JOURNAL_KEY);
  assert.equal(migration.migrateNoviceSave(s).ok,false,`${kind}: ${key}=${String(value)}`);
  assert.deepEqual([s.getItem(SAVE_KEY),s.getItem(PC)],before);assert.equal(s.getItem(migration.NOVICE_JOURNAL_KEY),journal);assert.equal(JSON.parse(journal).status,'prepared');
 }
});
test('backup and journal failure never overwrite either source',()=>{
 assert.equal(typeof migration.migrateNoviceSave,'function');for(const key of [migration.PROFILE_BACKUP_KEY,migration.PC_BACKUP_KEY,migration.NOVICE_JOURNAL_KEY]){const s=fixture(),before=[s.getItem(SAVE_KEY),s.getItem(PC)];s.fail=key;assert.equal(migration.migrateNoviceSave(s).ok,false);assert.deepEqual([s.getItem(SAVE_KEY),s.getItem(PC)],before);}
});
test('failure at either target resumes the original prepared journal',()=>{
 assert.equal(typeof migration.migrateNoviceSave,'function');for(const key of [SAVE_KEY,PC]){const s=fixture();s.fail=key;assert.equal(migration.migrateNoviceSave(s).ok,false);const journal=s.getItem(migration.NOVICE_JOURNAL_KEY);assert.equal(migration.migrateNoviceSave(s).ok,true);assert.equal(s.getItem(migration.PROFILE_BACKUP_KEY),JSON.stringify(oldProfile));assert.equal(JSON.parse(s.getItem(SAVE_KEY)).name,'Прежний');assert.ok(journal);}
});
test('cancel preserves incomplete migration but confirmed new game invalidates it before writing a hero',()=>{
 assert.equal(typeof migration.migrateNoviceSave,'function');const s=fixture();s.fail=PC;assert.equal(migration.migrateNoviceSave(s).ok,false);const journal=s.getItem(migration.NOVICE_JOURNAL_KEY);createNewGameSession(oldProfile,s,{enter(){assert.fail();},restore(){}}).cancel();assert.equal(s.getItem(migration.NOVICE_JOURNAL_KEY),journal);
 const newGame=createNewGameSession(oldProfile,s,{enter(){},restore(){}});assert.equal(newGame.submit({name:'Новый'}).ok,true);s.setItem(migration.NOVICE_JOURNAL_KEY,journal);assert.equal(migration.migrateNoviceSave(s).ok,true);assert.equal(JSON.parse(s.getItem(SAVE_KEY)).name,'Новый');assert.deepEqual(JSON.parse(s.getItem(PC)).projects,[]);
});
test('failure writing completion marker keeps both targets and resumes without replacing backups',()=>{
 const s=fixture(),write=s.setItem.bind(s);let journalWrites=0;s.setItem=(key,value)=>{if(key===migration.NOVICE_JOURNAL_KEY&&++journalWrites===2)throw Error('completion denied');write(key,value);};
 assert.equal(migration.migrateNoviceSave(s).ok,false);assert.equal(JSON.parse(s.getItem(SAVE_KEY)).noviceSchema,1);assert.equal(JSON.parse(s.getItem(PC)).noviceSchema,1);assert.equal(JSON.parse(s.getItem(migration.NOVICE_JOURNAL_KEY)).status,'prepared');assert.equal(migration.migrateNoviceSave(s).ok,true);assert.equal(s.getItem(migration.PC_BACKUP_KEY),JSON.stringify(oldPc));
});
test('confirmed new game repairs corrupt old JSON while keeping its recovery journal',()=>{
 const s=fixture();s.setItem(SAVE_KEY,'not JSON');s.setItem(PC,'not JSON either');let home;
 const result=createNewGameSession(null,s,{enter(p,h){home=h;},restore(){}}).submit({name:'Восстановленный'});assert.equal(result.saved,true);assert.equal(home.migrationReady,true);assert.equal(JSON.parse(s.getItem(SAVE_KEY)).name,'Восстановленный');assert.deepEqual(JSON.parse(s.getItem(PC)).projects,[]);
});
test('new-game journal and either target failure preserve a recoverable old transition and resume new hero',()=>{
 for(const target of [migration.NOVICE_JOURNAL_KEY,SAVE_KEY,PC]){
  const s=fixture();s.fail=PC;migration.migrateNoviceSave(s);const prior=s.getItem(migration.NOVICE_JOURNAL_KEY),before=[s.getItem(SAVE_KEY),s.getItem(PC)];s.fail=target;let home;
  const result=createNewGameSession(oldProfile,s,{enter(p,h){home=h;},restore(){}}).submit({name:'Новый после ошибки'});assert.equal(result.saved,false);assert.equal(home.migrationReady,false);
  if(target===migration.NOVICE_JOURNAL_KEY){assert.equal(s.getItem(migration.NOVICE_JOURNAL_KEY),prior);assert.deepEqual([s.getItem(SAVE_KEY),s.getItem(PC)],before);}
  else assert.equal(JSON.parse(s.getItem(migration.NOVICE_JOURNAL_KEY)).previousJournal,prior);
  assert.equal(migration.migrateNoviceSave(s).ok,true);assert.equal(JSON.parse(s.getItem(SAVE_KEY)).name,target===migration.NOVICE_JOURNAL_KEY?'Прежний':'Новый после ошибки');
 }
});
