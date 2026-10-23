import {SAVE_KEY,STAT_KEYS,normalizeAppearance,validateProfile} from './avatar-v3-profile.js?rev=57';
import {createWardrobe} from './home-wardrobe.js?rev=57';
import {VIRTUAL_PC_STORAGE_KEY,createVirtualPcState} from './virtual-pc-state.js?rev=57';
import {decodePcSave,encodePcSave} from './pc-save-codec.js?rev=57';
import {normalizeVoiceId} from './vocal-catalog.js?rev=57';

export const NOVICE_JOURNAL_KEY='battle-life-novice-migration-v1';
export const PROFILE_BACKUP_KEY=SAVE_KEY+'-before-novice-v1';
export const PC_BACKUP_KEY=VIRTUAL_PC_STORAGE_KEY+'-before-novice-v1';
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function preservedTargets(profile,pc,token){
 if(!record(profile)||![3,4].includes(profile.version)||typeof profile.name!=='string'||!profile.name.trim()||!record(profile.skills)||!STAT_KEYS.every(key=>Object.hasOwn(profile.skills,key)&&Number.isFinite(profile.skills[key])&&profile.skills[key]>=(profile.skillSchema===2?0:10)&&profile.skills[key]<=(profile.version===3?50:100)))throw Error('Неверный формат героя');
 if(pc!==null&&(!record(pc)||pc.version!==1))throw Error('Неверный формат ПК');
 const voiceId=normalizeVoiceId(profile.voiceId),sourcePc=pc??createVirtualPcState();
 if(pc&&normalizeVoiceId(pc.voiceId)!==voiceId)throw Error('Голос героя не совпадает с состоянием ПК');
 const appearance=normalizeAppearance(profile.appearance);
 return {profile:{...profile,voiceId,version:4,noviceSchema:1,noviceMigration:token,skills:{...profile.skills},appearance,wardrobe:profile.wardrobe??createWardrobe(appearance)},pc:{...sourcePc,voiceId,noviceSchema:1,noviceMigration:token}};
}
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
   if(normalizeVoiceId(journal.profile.voiceId)!==normalizeVoiceId(journal.pc.voiceId))throw Error('Голос героя не совпадает с состоянием ПК');
   let profile;try{profile=profileRaw===null?null:JSON.parse(profileRaw);}catch{/* Valid prepared targets can repair corrupt source JSON. */}
   // A different confirmed hero always wins over an old recovery journal.
   if(profileRaw!==journal.sourceProfile&&profile?.noviceSchema===1&&profile.noviceMigration!==journal.token){abandonNoviceMigration(storage);return {ok:true};}
   // Before zero-start support, prepared upgrades contained destructive reset
   // targets. Recover earned values from the original sources, never those targets.
   if(journal.kind===undefined){
    const backup=storage.getItem(PC_BACKUP_KEY);
    if(typeof journal.sourceProfile!=='string'||backup===null)throw Error('Нет исходных данных для восстановления карьеры');
    const targets=preservedTargets(JSON.parse(journal.sourceProfile),decodePcSave(backup),journal.token);
    journal={...journal,kind:'schema-upgrade',...targets};storage.setItem(NOVICE_JOURNAL_KEY,JSON.stringify(journal));
   }else if(!['new-game','schema-upgrade'].includes(journal.kind))throw Error('Неизвестный вид перехода');
  }else{
   const profile=profileRaw===null?null:JSON.parse(profileRaw),pc=pcRaw===null?null:decodePcSave(pcRaw);
   if(profile!==null&&!record(profile)||pc!==null&&!record(pc))throw Error('Неверный формат сохранения');
   if(!profile)return {ok:true};
   const voiceId=normalizeVoiceId(profile.voiceId);
   if(pc&&normalizeVoiceId(pc.voiceId)!==voiceId)throw Error('Голос героя не совпадает с состоянием ПК');
   if(profile.noviceSchema===1)return {ok:true};
   const token=globalThis.crypto?.randomUUID?.()??'novice-'+Date.now()+'-'+Math.random();
   const targets=preservedTargets(profile,pc,token);
   // Both raw sources and the recoverable target exist before either overwrite.
   for(const [key,raw]of [[PROFILE_BACKUP_KEY,profileRaw],[PC_BACKUP_KEY,pcRaw]])if(storage.getItem(key)===null)storage.setItem(key,raw??'null');
   journal={status:'prepared',kind:'schema-upgrade',token,sourceProfile:profileRaw,...targets};storage.setItem(NOVICE_JOURNAL_KEY,JSON.stringify(journal));
  }
  if(journal.status!=='prepared')return {ok:true};
  // Recovery must enforce the same profile contract as ordinary save/load
  // before either source can be replaced, regardless of the journal kind.
  validateProfile(journal.profile);
  storage.setItem(SAVE_KEY,JSON.stringify(journal.profile));storage.setItem(VIRTUAL_PC_STORAGE_KEY,encodePcSave(journal.pc));
  if(journal.kind==='new-game')storage.setItem('battle-life-apartment-v3-time',JSON.stringify(journal.homeTime));
  storage.setItem(NOVICE_JOURNAL_KEY,JSON.stringify({status:'completed',token:journal.token}));return {ok:true};
 }catch(error){return {ok:false,error:'Переход на новые навыки не сохранён. Автосохранение отключено; перезагрузите страницу для восстановления. '+(error?.message??'')};}
}
