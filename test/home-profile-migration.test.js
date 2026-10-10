import test from 'node:test';
import assert from 'node:assert/strict';
import {SAVE_KEY,STAT_KEYS} from '../src/avatar-v3-profile.js?rev=25';
import {createNewGameSession} from '../src/apartment-v3-new-game.js?rev=25';
import {createVirtualPcState,VIRTUAL_PC_STORAGE_KEY as PC} from '../src/virtual-pc-state.js?rev=25';
import {advanceBeatWork,createBeat,startBeatStage} from '../src/beat-production.js?rev=25';
const migration=await import('../src/home-profile-migration.js?rev=25').catch(()=>({}));
const oldProfile={version:3,name:'Прежний',skills:Object.fromEntries(STAT_KEYS.map(k=>[k,30])),appearance:{hair:'shaggy',beard:'broad',mustache:'chevron',top:'hoodie',topColor:'red'},extra:{keep:true}};
const oldPc={...createVirtualPcState({projects:[{id:'keep',sourceStems:['kick.wav']}],music:{cash:987,practice:14,genrePractice:{boom_bap:8}},household:{fridge:{apple:0,pear:2,banana:3}}}),extra:'untouched'};delete oldPc.noviceSchema;
function fixture(){const values=new Map([[SAVE_KEY,JSON.stringify(oldProfile)],[PC,JSON.stringify(oldPc)]]);let fail='';return {values,set fail(v){fail=v;},getItem:k=>values.get(k)??null,setItem(k,v){if(k===fail){fail='';throw Error('write denied');}values.set(k,String(v));}};}
test('migration resets both skill sources once and preserves unrelated snapshot fields',()=>{
 assert.equal(typeof migration.migrateNoviceSave,'function');const s=fixture();assert.equal(migration.migrateNoviceSave(s).ok,true);const p=JSON.parse(s.getItem(SAVE_KEY)),pc=JSON.parse(s.getItem(PC));
 assert.deepEqual(Object.values(p.skills),[10,10,10,10,10,10,10,10,10]);assert.equal(pc.music.practice,0);assert.ok(Object.values(pc.music.genrePractice).every(v=>v===0));assert.deepEqual(p.extra,{keep:true});
 assert.equal(p.appearance.hair,'bowl');assert.equal(p.appearance.beard,'full');assert.equal(p.appearance.mustache,'classic');assert.deepEqual(p.wardrobe.top,[{id:'hoodie',color:'red'}]);for(const key of ['projects','household','extra'])assert.deepEqual(pc[key],oldPc[key]);assert.equal(pc.music.cash,987);assert.equal(pc.noviceSchema,1);
 let practiced=createBeat(createVirtualPcState(pc),{id:'new',name:'Практика'},p.skills,()=>.1).state;practiced=startBeatStage(practiced,'new',undefined,p.skills,()=>.1).state;practiced=advanceBeatWork(practiced,practiced.music.job.total).state;
 assert.equal(practiced.music.practice,1/3);s.setItem(PC,JSON.stringify(practiced));p.skills.flow=12;s.setItem(SAVE_KEY,JSON.stringify(p));assert.equal(migration.migrateNoviceSave(s).ok,true);assert.equal(JSON.parse(s.getItem(PC)).music.practice,1/3);assert.equal(JSON.parse(s.getItem(SAVE_KEY)).skills.flow,12);
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
