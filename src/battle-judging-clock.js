import {beatResultSeed} from './beat-result.js?rev=43';
import {battleRandom} from './battle-seeding.js?rev=43';
import {validGameMinute} from './game-minute.js?rev=43';
import {ensureTournament,advanceTournament,completeTournamentRound} from './battle-tournament.js?rev=45';
import {judgeProfile} from './judge-profiles.js?rev=43';
import {battleFormat} from './battle-format.js?rev=43';
import {generateJudgeReview} from './judge-comments.js?rev=43';
import {SOCIAL_IDENTITY} from './social-identity.js?rev=43';
import {selectRoundLtr} from './battle-round-awards.js?rev=43';
const clone=v=>structuredClone(v),battleId='makarevich-1',order=(a,b)=>a.dueAt-b.dueAt||a.id.localeCompare(b.id);
export function advanceJudgeClock(raw,{deadline,judgeIds,seed,nowMinute,roll,publishedAtByJudge={},notBefore=0}={}){
 const clock=raw?clone(raw):{policyVersion:2,checkedHour:6,completed:{}},ready=[];
 if(!validGameMinute(nowMinute)||!validGameMinute(deadline))return {clock,ready,changed:false};
 if(!raw)for(const judgeId of judgeIds){const at=publishedAtByJudge[judgeId];if(validGameMinute(at)&&at<=nowMinute){clock.completed[judgeId]=at;ready.push({judgeId,completedAt:at});}}
 const end=Math.min(40,Math.floor((nowMinute-deadline)/60));let changed=ready.length>0;
 for(let hour=clock.checkedHour+1;hour<=end;hour++){
  const probability=Math.min(1,(hour-6)*.03);
  for(const judgeId of judgeIds){if(clock.completed[judgeId]!==undefined)continue;
   const value=roll?roll({judgeId,hour,probability}):battleRandom(beatResultSeed([seed,judgeId,hour].join(':')))();
   if(value<probability||hour===40){const completedAt=Math.max(notBefore,deadline+hour*60);if(completedAt<=nowMinute){clock.completed[judgeId]=completedAt;ready.push({judgeId,completedAt});}}
  }clock.checkedHour=hour;changed=true;if(judgeIds.every(id=>clock.completed[id]!==undefined))break;
 }return {clock,ready,changed};
}
const event=(round,type,at,suffix,payload={})=>({id:[battleId,round.roundId,type,suffix].filter(Boolean).join(':'),type,battleId,roundId:round.roundId,communityId:battleId,source:SOCIAL_IDENTITY.name,sender:'Макаревич Баттл',dueAt:at,...payload});
function judgeBatch(input,round,judgeId,at){
 const judging={schemaVersion:1,results:{...input.judging?.results},history:[...(input.judging?.history??[])],recovery:[...(input.judging?.recovery??[])]},judge=judgeProfile(judgeId),format=battleFormat(battleId,round.roundId),resultIds=[];
 if(!judge||!format)throw Error('Не найден сохранённый состав судей.');
 for(const [participantId,versionId]of Object.entries(round.submissions).sort(([a],[b])=>a.localeCompare(b))){
  const version=input.trackVersions.byId[versionId],pair=round.pairs.find(p=>p.participantIds.includes(participantId)),opponentId=pair?.technical?.kind==='judged'?pair.participantIds.find(id=>id!==participantId):null,opponent=input.trackVersions.byId[round.submissions[opponentId]]??null;
  const prior=Object.values(judging.results).find(r=>r.battleId===battleId&&r.roundId===round.roundId&&r.trackVersionId===versionId&&r.judgeId===judgeId);
  const generated=prior?{result:prior,history:judging.history}:generateJudgeReview({version,judge,format,opponent,pairTieSeed:round.id},{seed:[round.id,judgeId,participantId].join(':'),history:judging.history,copyHistory:false});
  if(!generated.result||generated.diagnostics?.unsupportedClaims.length)throw Error('Не удалось сформировать подтверждённый отзыв: '+judgeId);
  const result=generated.result;judging.results[result.id]=result;judging.history=generated.history;resultIds.push(result.id);
 }
 const ltr=selectRoundLtr({versions:Object.entries(round.submissions).map(([participantId,id])=>({participantId,id})),judgeResults:resultIds.map(id=>judging.results[id]),judgeId,seed:round.id});
 return {state:{...input,judging},batch:{judgeId,publishedAt:at,resultIds,policyVersion:2,ltr}};
}
export function advanceRoundJudging(input,{battleId:id=battleId,roundId,nowMinute,roll}={}){
 const original=input.tournaments?.byId?.[id],source=original?.rounds?.[roundId],unchanged={state:input,events:[],changed:false};
 if(id!==battleId||source?.status!=='awaiting_judges')return unchanged;
 const submission=input.battleSubmissions?.find(s=>s.windowId===source.id),publishedAtByJudge=Object.fromEntries((input.socialRuntime?.events??[]).filter(e=>e.type==='judge-review'&&e.entityId===submission?.id).map(e=>[e.judgeId,e.dueAt]));
 const advanced=advanceJudgeClock(source.judgingClock,{deadline:source.closesAt,judgeIds:source.judgeIds,seed:original.seed+':'+roundId,nowMinute,roll,publishedAtByJudge,notBefore:source.judgingMigration?.activatedAt??0});if(!advanced.changed)return unchanged;
 const t=clone(original),round=t.rounds[roundId];round.judgingClock=advanced.clock;round.judgeBatches??={};let state={...input,tournaments:{...input.tournaments,byId:{...input.tournaments.byId,[id]:t}}};const events=[];
 try{
  for(const {judgeId,completedAt}of advanced.ready){
   const made=judgeBatch(state,round,judgeId,completedAt);state=made.state;round.judgeBatches[judgeId]=made.batch;
   events.push(event(round,'battle-judge-complete',completedAt,judgeId,{judgeId,resultIds:made.batch.resultIds,ltr:made.batch.ltr,text:judgeProfile(judgeId).name+' закончил судейство раунда.'}));
   const hero=made.batch.resultIds.map(id=>state.judging.results[id]).find(r=>r.trackVersionId===round.submissions.player),submission=state.battleSubmissions?.find(s=>s.windowId===round.id);
   if(hero&&submission&&!(input.socialRuntime?.events??[]).some(e=>e.type==='judge-review'&&e.resultId===hero.id))events.push(event(round,'judge-review',completedAt,judgeId,{entityId:submission.id,trackVersionId:hero.trackVersionId,resultId:hero.id,judgeId,text:judgeProfile(judgeId).name+' оставил отзыв о твоей работе.'}));
  }
  if(round.judgeIds.every(id=>round.judgeBatches[id])){
   const completedAt=Math.max(...Object.values(round.judgeBatches).map(b=>b.publishedAt)),gradesById={},winnersByNode={};
   const results=Object.values(round.judgeBatches).flatMap(b=>b.resultIds.map(id=>state.judging.results[id]));
   for(const [id,versionId]of Object.entries(round.submissions))gradesById[id]=round.judgeIds.map(j=>results.find(r=>r.judgeId===j&&r.trackVersionId===versionId)?.grade);
   for(const pair of round.pairs.filter(p=>p.technical.kind==='judged')){
    const [a,b]=pair.participantIds,versionId=round.submissions[a],rows=results.filter(r=>r.trackVersionId===versionId);
    if(rows.some(r=>r.decision.kind!=='pair_vote'))throw Error('Паре нужен один бинарный голос каждого судьи.');
    winnersByNode[pair.nodeId]=rows.filter(r=>r.decision.winnerId===versionId).length>rows.length/2?a:b;
   }
   const done=completeTournamentRound(state,{battleId:id,roundId,completedAt,gradesById,winnersByNode});if(!done.ok)throw Error(done.reason);state=done.state;events.push(...done.events);
   const submission=state.battleSubmissions?.find(s=>s.windowId===round.id),heroId=round.submissions.player;
   if(submission&&heroId&&!(input.socialRuntime?.events??[]).some(e=>e.type==='judge-panel-complete'&&e.entityId===submission.id)){const own=results.filter(r=>r.trackVersionId===heroId),pair=round.pairs.find(p=>p.participantIds.includes('player')),qualified=roundId==='selection'?state.tournaments.byId[id].qualifiedIds.includes('player'):pair?.technical.kind==='judged'?winnersByNode[pair.nodeId]==='player':pair?.technical.winnerId==='player';
    events.push(event(round,'judge-panel-complete',completedAt,'player',{entityId:submission.id,trackVersionId:heroId,resultIds:own.map(r=>r.id),qualification:qualified?'qualified':'eliminated',total:roundId==='selection'?own.reduce((n,r)=>n+r.grade,0):own.filter(r=>r.decision.winnerId===heroId).length,text:qualified?'Раунд пройден. Итог доступен в сообществе.':'Раунд завершён. Итог доступен в сообществе.'}));
   }
  }
 }catch(error){return {...unchanged,reason:error.message};}
 return {state,events:events.sort(order),changed:true};
}
export function advanceBattleLifecycle(input,nowMinute,options={}){
 const unchanged={state:input,events:[],changed:false};if(!validGameMinute(nowMinute))return unchanged;
 let state=input,changed=false;const events=[];
 if(!state.tournaments?.byId?.[battleId]){
  if(!state.battleWindows?.some(w=>w.battleId===battleId&&w.judgingPolicyVersion===2))return unchanged;
  const ensured=ensureTournament(state,{battleId,nowMinute});if(!ensured.ok)return {...unchanged,reason:ensured.reason};state=ensured.state;changed=true;
 }
 for(let step=0;step<14;step++){
  const advanced=advanceTournament(state,nowMinute,options);if(advanced.reason)return {...unchanged,reason:advanced.reason};state=advanced.state;changed||=advanced.changed;events.push(...advanced.events);
  const t=state.tournaments.byId[battleId],round=t.rounds[t.currentRoundId];
  const judged=advanceRoundJudging(state,{battleId,roundId:round.roundId,nowMinute});if(judged.reason)return {...unchanged,reason:judged.reason};state=judged.state;changed||=judged.changed;events.push(...judged.events);
  if(!judged.changed||state.tournaments.byId[battleId].rounds[round.roundId].status!=='complete')break;
 }
 return {state,events:events.sort(order),changed};
}
