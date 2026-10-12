import {BATTLE_BRIEFS} from './virtual-pc-catalog.js?rev=39';
import {normalizeBeat} from './beat-production.js?rev=39';
import {normalizeLyric} from './lyric-production.js?rev=39';
import {resolveBeatPlayback} from './beat-playback.js?rev=39';
import {RETIRED_DRUM_MESSAGE} from './beat-catalog.js?rev=39';
import {validGameMinute} from './game-minute.js?rev=39';
import {BATTLE_ROUND_IDS} from './battle-roster.js?rev=39';
const clone=value=>JSON.parse(JSON.stringify(value));
const day=value=>Number.isSafeInteger(value)&&value>0&&value<100000;
const battle=id=>BATTLE_BRIEFS.some(b=>b.id===id);
function textForTrack(state,track){
 const ref=track.recording?.text;
 const text=normalizeLyric(ref?.snapshot??state.projects?.find(p=>p.id===ref?.id));
 return text?.status==='ready'&&text.id===ref?.id&&text.revision===ref.revision?text:null;
}
function candidate(state,raw,battleId){
 const track=normalizeBeat(raw),lyrics=track&&textForTrack(state,track),play=track&&resolveBeatPlayback(track);
 const issue=raw.recoveryIssue??(!track||track.status!=='ready'?'Сначала закончи три этапа бита.':!track.recording?.draft?'Добавь хотя бы черновую запись вокала.':!play.ok?play.reason:'');
 return {projectId:raw.id,name:raw.name??'Проект',seconds:play?.ok?play.descriptor.durationSeconds:0,postStage:track?.recording?.master?'Мастеринг':track?.recording?.mix?'Сведение':track?.recording?.clean?'Чистовая запись':'Черновая запись',topicMatch:lyrics?lyrics.battleId===battleId:null,issue};
}
export function submissionCandidates(state,battleId){return (state.projects??[]).filter(p=>p.kind==='beat').map(p=>candidate(state,p,battleId));}

export function normalizeBattleSubmissions(value){
 const result=[],seen=new Set();
 for(const raw of Array.isArray(value)?value:[]){
  if(raw?.issue&&raw.recoveryData){result.push(clone(raw));continue;}
  if(raw?.version===2){
   const valid=typeof raw.id==='string'&&typeof raw.windowId==='string'&&battle(raw.battleId)&&raw.communityId===raw.battleId&&BATTLE_ROUND_IDS.includes(raw.roundId)&&raw.windowId===raw.battleId+':'+raw.roundId+':1'&&['pending','accepted','recovery'].includes(raw.status)&&validGameMinute(raw.ackAt)&&typeof raw.ackTemplateId==='string'&&(validGameMinute(raw.sentAt)||raw.sentAt===null&&raw.migration?.timePrecision==='day-only')&&(typeof raw.trackVersionId==='string'||raw.status==='recovery');
   if(!valid){result.push({battleId:raw.battleId,roundId:'selection',issue:'Сохранённую отправку не удалось прочитать. Повторная попытка не открыта.',recoveryData:clone(raw)});continue;}
   if(seen.has(raw.windowId))continue;seen.add(raw.windowId);result.push(clone(raw));continue;
  }
  const track=normalizeBeat(raw?.track),lyrics=normalizeLyric(raw?.lyrics);
  if(lyrics&&(lyrics.id!==track?.recording?.text.id||lyrics.revision!==track?.recording?.text.revision)){
   result.push({battleId:raw.battleId,roundId:'selection',issue:'Версия текста не совпадает с записью. Исходная сдача сохранена.',recoveryData:clone(raw)});continue;
  }
  if(raw?.version!==1||!battle(raw.battleId)||raw.roundId!=='selection'||!Number.isSafeInteger(raw.revision)||raw.revision<1||!day(raw.submittedDay)||raw.status!=='pending'||track?.status!=='ready'||!track.recording?.draft||track.id!==raw.projectId||!resolveBeatPlayback(track).ok||raw.lyrics&&!lyrics){
   result.push({battleId:raw?.battleId??null,roundId:'selection',issue:track?.audioIssue==='retired-source'?RETIRED_DRUM_MESSAGE:'Сохранённую сдачу не удалось прочитать. Исходные данные сохранены.',recoveryData:clone(raw??{})});continue;
  }
  const key=raw.battleId+':selection';if(seen.has(key))continue;seen.add(key);
  result.push({version:1,battleId:raw.battleId,roundId:'selection',revision:raw.revision,submittedDay:raw.submittedDay,projectId:track.id,status:'pending',topicMatch:lyrics?lyrics.battleId===raw.battleId:null,track,lyrics,...(typeof raw.trackVersionId==='string'?{trackVersionId:raw.trackVersionId}:{}),...(raw.timePrecision==='day-only'?{timePrecision:'day-only'}:{})});
 }
 return result;
}

export function submitBattleTrack(state){
 // Legacy entry point is intentionally closed: it must not bypass the draft,
 // exact deadline, immutable attachment, or single-attempt rule.
 return {state,ok:false,reason:'Сдача перенесена в сообщения сообщества. Прикрепи трек и нажми «Отправить» там.'};
}
