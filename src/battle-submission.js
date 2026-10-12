import {BATTLE_BRIEFS} from './virtual-pc-catalog.js?rev=35';
import {normalizeBeat} from './beat-production.js?rev=36';
import {normalizeLyric} from './lyric-production.js?rev=36';
import {resolveBeatPlayback} from './beat-playback.js?rev=36';
import {RETIRED_DRUM_MESSAGE} from './beat-catalog.js?rev=36';
import {captureTrackVersion} from './track-version.js?rev=36';
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

export function submitBattleTrack(state,{battleId,projectId,gameDay,replace=false}={}){
 const fail=reason=>({state,ok:false,reason});
 if(!battle(battleId)||!state.battleApplications?.some(a=>a.battleId===battleId))return fail('Сначала зарегистрируйся на этот баттл.');
 if(!day(gameDay))return fail('Не удалось определить игровую дату.');
 const raw=state.projects?.find(p=>p.id===projectId&&p.kind==='beat');if(!raw)return fail('Выбери трек из папки «Мои проекты».');
 const info=candidate(state,raw,battleId);if(info.issue)return fail(info.issue);
 const track=clone(normalizeBeat(raw)),lyrics=clone(textForTrack(state,track)),submissions=normalizeBattleSubmissions(state.battleSubmissions);
 const index=submissions.findIndex(s=>s.battleId===battleId&&s.roundId==='selection'),previous=submissions[index];
 if(previous&&!previous.issue&&JSON.stringify([previous.track,previous.lyrics])===JSON.stringify([track,lyrics]))return {state,ok:true,reason:'Эта версия уже отправлена.'};
 if(previous&&!replace)return fail('Работа уже отправлена. Подтверди замену версии.');
 const captured=captureTrackVersion(state,{projectId,nowMinute:(gameDay-1)*1440});if(!captured.ok)return fail(captured.reason);
 const submitted={version:1,battleId,roundId:'selection',revision:(previous?.revision??0)+1,submittedDay:gameDay,projectId,status:'pending',topicMatch:info.topicMatch,track,lyrics,trackVersionId:captured.versionId,timePrecision:'day-only'};
 if(index<0)submissions.push(submitted);else submissions[index]=submitted;
 return {state:{...captured.state,battleSubmissions:submissions},ok:true,reason:'Работа отправлена. Ожидает проверки.'};
}
