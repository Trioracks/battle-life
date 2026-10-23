import {STAT_KEYS,statLabels} from './creator.js?rev=57';
import {normalizeGenreProgression,genreById} from './genre-progression.js?rev=57';

const clamp=value=>Math.max(0,Math.min(100,Number.isFinite(value)?value:0));
const busy=pc=>Boolean(pc?.music?.job||pc?.writing?.job||pc?.recording?.job||pc?.rapAnalysis?.job?.status==='active'||pc?.rapResearch?.job?.status==='active');
const unchanged=(profile,pc,reason)=>({ok:false,profile,pc,store:null,reason});
function effective(profile,pc,id){
 const practice={beatmaking:pc?.music?.practice,writing:pc?.writing?.practice,flow:pc?.recording?.practice?.flow,sound:pc?.recording?.practice?.sound};
 return clamp((profile?.skills?.[id]??0)+clamp(practice[id]));
}
export function testSkillRows(profile,pc){
 const available=Boolean(profile)&&!busy(pc),genres=normalizeGenreProgression(pc?.music?.genres);
 return [...STAT_KEYS.map(id=>({kind:'skill',id,label:statLabels[id],value:effective(profile,pc,id),canRaise:available&&Number.isFinite(profile.skills?.[id])&&effective(profile,pc,id)<100})),
  ...['experimental',...genres.chosen].map(id=>({kind:'genre',id,label:genreById(id).name,value:genres.xp[id],canRaise:available&&genres.xp[id]<100}))];
}
export function raiseTestSkill(profile,pc,request){
 if(busy(pc))return unchanged(profile,pc,'Сначала приостанови текущую работу или изучение.');
 const row=testSkillRows(profile,pc).find(row=>row.kind===request?.kind&&row.id===request?.id);
 if(!row?.canRaise)return unchanged(profile,pc,'Навык недоступен или уже достиг 100.');
 if(row.kind==='skill'){
  // The host migrates old v3 careers before controls become available. v4
  // careers retain every earned value when adopting the fractional schema.
  if(profile.version!==4)return unchanged(profile,pc,'Сначала восстанови сохранение героя.');
  return {ok:true,profile:{...profile,skillSchema:2,skills:{...profile.skills,[row.id]:profile.skills[row.id]+Math.min(1,100-row.value)}},pc,store:'profile',reason:''};
 }
 const genres=pc.music.genres??normalizeGenreProgression();
 return {ok:true,profile,pc:{...pc,music:{...pc.music,genres:{...genres,xp:{...genres.xp,[row.id]:Math.min(100,row.value+1)}}}},store:'pc',reason:''};
}

// Publish the candidate only after its one owning store accepts the write.
export function saveTestSkill(profile,pc,request,{saveProfile,persistPc}){
 const result=raiseTestSkill(profile,pc,request);if(!result.ok)return result;
 try{
  const saved=result.store==='profile'?saveProfile(result.profile):persistPc(result.pc,{atomic:true});
  if(saved!==true&&saved?.ok!==true)return unchanged(profile,pc,saved?.error||'Не удалось сохранить изменение навыка.');
  return {...result,profile:result.store==='profile'?(saved.profile??result.profile):profile};
 }catch(error){return unchanged(profile,pc,error?.message||'Не удалось сохранить изменение навыка.');}
}
