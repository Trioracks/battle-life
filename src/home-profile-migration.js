import {SAVE_KEY,STAT_KEYS,normalizeAppearance} from './avatar-v3-profile.js?rev=28';
import {createWardrobe} from './home-wardrobe.js?rev=28';
import {VIRTUAL_PC_STORAGE_KEY,createVirtualPcState} from './virtual-pc-state.js?rev=34';

export const NOVICE_JOURNAL_KEY='battle-life-novice-migration-v1';
export const PROFILE_BACKUP_KEY=SAVE_KEY+'-before-novice-v1';
export const PC_BACKUP_KEY=VIRTUAL_PC_STORAGE_KEY+'-before-novice-v1';
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function abandonNoviceMigration(storage){
 storage.setItem(NOVICE_JOURNAL_KEY,JSON.stringify({status:'superseded'}));
}
export function prepareNoviceNewGame(storage,profile,pc,homeTime){
 const token=globalThis.crypto?.randomUUID?.()??'new-'+Date.now()+'-'+Math.random();
 const previousJournal=storage.getItem(NOVICE_JOURNAL_KEY),sourceProfile=storage.getItem(SAVE_KEY);
 storage.setItem(NOVICE_JOURNAL_KEY,JSON.stringify({status:'prepared',kind:'new-game',token,sourceProfile,previousJournal,profile:{...profile,noviceMigration:token},pc:{...pc,noviceMigration:token},homeTime}));
 return migrateNoviceSave(storage);
}
export function migrateNoviceSave(storage){
 try{
  if(typeof storage?.getItem!=='function'||typeof storage?.setItem!=='function')throw Error('Хранилище недоступно');
  const profileRaw=storage.getItem(SAVE_KEY),pcRaw=storage.getItem(VIRTUAL_PC_STORAGE_KEY);
  const rawJournal=storage.getItem(NOVICE_JOURNAL_KEY);let journal=rawJournal?JSON.parse(rawJournal):null;
  if(journal?.status==='prepared'){
   if(!record(journal.profile)||journal.profile.version!==4||journal.profile.noviceSchema!==1||!record(journal.pc)||typeof journal.token!=='string'||journal.profile.noviceMigration!==journal.token||journal.pc.noviceMigration!==journal.token)throw Error('Повреждён журнал перехода');
   let profile;try{profile=profileRaw===null?null:JSON.parse(profileRaw);}catch{/* Valid prepared targets can repair corrupt source JSON. */}
   // A different confirmed hero always wins over an old recovery journal.
   if(profileRaw!==journal.sourceProfile&&profile?.noviceSchema===1&&profile.noviceMigration!==journal.token){abandonNoviceMigration(storage);return {ok:true};}
  }else{
   const profile=profileRaw===null?null:JSON.parse(profileRaw),pc=pcRaw===null?null:JSON.parse(pcRaw);
   if(profile!==null&&!record(profile)||pc!==null&&!record(pc))throw Error('Неверный формат сохранения');
   if(!profile||profile.noviceSchema===1)return {ok:true};
   if(profile.version!==3||typeof profile.name!=='string'||!profile.name.trim()||!record(profile.skills))throw Error('Неверный формат героя');
   const token=globalThis.crypto?.randomUUID?.()??'novice-'+Date.now()+'-'+Math.random();
   const appearance=normalizeAppearance(profile.appearance),sourcePc=pc??createVirtualPcState();
   const targetProfile={...profile,version:4,noviceSchema:1,noviceMigration:token,skills:Object.fromEntries(STAT_KEYS.map(key=>[key,10])),appearance,wardrobe:createWardrobe(appearance)};
   const targetPc={...sourcePc,noviceSchema:1,noviceMigration:token,music:{...sourcePc.music,practice:0,genrePractice:Object.fromEntries(Object.keys(sourcePc.music?.genrePractice??{}).map(key=>[key,0]))}};
   // Both raw sources and the recoverable target exist before either overwrite.
   for(const [key,raw]of [[PROFILE_BACKUP_KEY,profileRaw],[PC_BACKUP_KEY,pcRaw]])if(storage.getItem(key)===null)storage.setItem(key,raw??'null');
   journal={status:'prepared',token,sourceProfile:profileRaw,profile:targetProfile,pc:targetPc};storage.setItem(NOVICE_JOURNAL_KEY,JSON.stringify(journal));
  }
  if(journal.status!=='prepared')return {ok:true};
  storage.setItem(SAVE_KEY,JSON.stringify(journal.profile));storage.setItem(VIRTUAL_PC_STORAGE_KEY,JSON.stringify(journal.pc));
  if(journal.kind==='new-game')storage.setItem('battle-life-apartment-v3-time',JSON.stringify(journal.homeTime));
  storage.setItem(NOVICE_JOURNAL_KEY,JSON.stringify({status:'completed',token:journal.token}));return {ok:true};
 }catch(error){return {ok:false,error:'Переход на новые навыки не сохранён. Автосохранение отключено; перезагрузите страницу для восстановления. '+(error?.message??'')};}
}
