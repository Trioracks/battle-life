import {judgeProfile} from './judge-profiles.js?rev=59';
import {battleFormat} from './battle-format.js?rev=59';
import {generateJudgeReview,normalizeJudging,finalizeJudgePanel} from './judge-comments.js?rev=59';
import {communityById} from './social-catalog.js?rev=59';
import {receivePhoneEvents} from './phone-notifications.js?rev=59';
import {SOCIAL_IDENTITY} from './social-identity.js?rev=59';
const clone=v=>JSON.parse(JSON.stringify(v));
export function normalizeJudgingSchedule(raw){
 const result={};for(const [id,s]of Object.entries(raw??{})){
  if(s?.submissionId===id&&Array.isArray(s.items)&&s.items.every(i=>typeof i.resultId==='string'&&typeof i.judgeId==='string'&&Number.isFinite(i.dueAt)))result[id]=clone(s);
 }return result;
}
export function scheduleSubmissionJudging(state,submissionId){
 const schedules=normalizeJudgingSchedule(state.judgingSchedule);if(schedules[submissionId])return {ok:true,state,reason:''};
 const s=state.battleSubmissions?.find(s=>s.id===submissionId&&s.version===2&&s.status!=='recovery'),window=state.battleWindows?.find(w=>w.id===s?.windowId&&!w.issue),version=state.trackVersions?.byId?.[s?.trackVersionId],format=battleFormat(s?.battleId,s?.roundId);
 const fail=reason=>({ok:false,state,reason});if(!s||!window||!version||!format)return fail('Для судейства не хватает сохранённой заявки, версии или условий раунда.');
 const judging=normalizeJudging(state.judging),items=[];
 for(const [i,judgeId]of window.judgeIds.entries()){
  const judge=judgeProfile(judgeId);if(!judge)return fail('Не найден профиль судьи.');
  const generated=generateJudgeReview({version,judge,format},{seed:s.id+':'+judgeId,history:judging.history});
  if(!generated.result||generated.diagnostics.unsupportedClaims.length)return fail('Не удалось сформировать подтверждённый отзыв.');
  const result=generated.result;judging.results[result.id]=result;judging.history=generated.history;
  items.push({resultId:result.id,judgeId,dueAt:window.closesAt+window.judgingOffsets[i]});
 }
 schedules[submissionId]={submissionId,windowId:window.id,trackVersionId:version.id,items};
 return {ok:true,state:{...state,judging,judgingSchedule:schedules},reason:''};
}
export function publicBattleResults(state,submissionId){
 const s=state.battleSubmissions?.find(s=>s.id===submissionId),schedule=state.judgingSchedule?.[submissionId],events=state.socialRuntime?.events??[];
 const publicIds=new Set(events.filter(e=>e.type==='judge-review'&&e.entityId===submissionId).map(e=>e.resultId)),results=[...publicIds].map(id=>state.judging?.results?.[id]).filter(Boolean);
 const panelEvent=events.find(e=>e.type==='judge-panel-complete'&&e.entityId===submissionId),window=state.battleWindows?.find(w=>w.id===s?.windowId);
 return {results,expectedJudgeIds:window?.judgeIds??[],complete:Boolean(panelEvent),panelEvent:panelEvent??null,total:panelEvent?.total??null,qualification:panelEvent?.qualification??state.battleQualifications?.[s?.windowId]?.[s?.playerId]??null};
}
export function publishJudgeEvents(input,nowMinute){
 if(!Number.isFinite(nowMinute))return {state:input,events:[]};
 let state=input;
 for(const s of state.battleSubmissions??[]){
  if(state.tournaments?.byId?.[s.battleId]?.rounds?.[s.roundId])continue;
  const w=state.battleWindows?.find(w=>w.id===s.windowId&&!w.issue);
  if(!w||w.closesAt>nowMinute||s.status==='recovery')continue;
  const scheduled=scheduleSubmissionJudging(state,s.id);if(scheduled.ok)state=scheduled.state;
 }
 const previous=state.socialRuntime?.events??[],seen=new Set(previous.map(e=>e.id)),events=[];
 for(const schedule of Object.values(state.judgingSchedule??{})){
  if(state.tournaments?.byId?.['makarevich-1']&&schedule.windowId?.startsWith('makarevich-1:'))continue;
  const s=state.battleSubmissions?.find(s=>s.id===schedule.submissionId);if(!s)continue;
  const c=communityById(s.communityId),common={source:SOCIAL_IDENTITY.name,sender:c?.name??'Баттл',entityId:s.id,communityId:s.communityId,trackVersionId:s.trackVersionId};
  for(const item of schedule.items){
   const id=item.resultId+':published';if(item.dueAt>nowMinute||seen.has(id))continue;
   const result=state.judging?.results?.[item.resultId];if(!result)continue;
   events.push({...common,id,type:'judge-review',dueAt:item.dueAt,resultId:result.id,judgeId:item.judgeId,text:(judgeProfile(item.judgeId)?.name??item.judgeId)+' оставил отзыв о твоей работе.'});seen.add(id);
  }
  const all=previous.concat(events),published=schedule.items.every(i=>all.some(e=>e.type==='judge-review'&&e.resultId===i.resultId));
  const id=s.id+':panel';if(!published||seen.has(id))continue;
  const panel=finalizeJudgePanel({battleId:s.battleId,roundId:s.roundId,versionIds:[s.trackVersionId],judgeIds:schedule.items.map(i=>i.judgeId),results:state.judging.results});if(!panel.complete)continue;
  events.push({...common,id,type:'judge-panel-complete',dueAt:Math.max(...schedule.items.map(i=>i.dueAt)),resultIds:schedule.items.map(i=>i.resultId),total:panel.totals[s.trackVersionId],text:'Все судьи оценили работу. Общий итог и отзывы доступны в сообществе.'});seen.add(id);
 }
 events.sort((a,b)=>a.dueAt-b.dueAt||a.id.localeCompare(b.id));
 const notices=[];
 for(const entityId of new Set(events.filter(e=>e.type==='judge-review').map(e=>e.entityId))){
  const batch=events.filter(e=>e.type==='judge-review'&&e.entityId===entityId),last=batch.at(-1);
  notices.push({...last,id:'reviews:'+batch.map(e=>e.id).join('|'),type:'judge-review-batch',resultIds:batch.map(e=>e.resultId),text:batch.length===1?last.text:'Новых отзывов о твоей работе: '+batch.length+'. Прочитай их в сообществе.'});
 }
 notices.push(...events.filter(e=>e.type==='judge-panel-complete'));
 return {state:{...state,socialRuntime:{...state.socialRuntime,events:[...previous,...events]},phone:receivePhoneEvents(state.phone,notices)},events};
}
