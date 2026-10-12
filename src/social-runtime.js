import {communityById} from './social-catalog.js?rev=39';
import {normalizeSocial} from './social-state.js?rev=39';
import {ensureBattleWindow} from './battle-windows.js?rev=39';
import {ACK_TEMPLATES,acknowledgementFor} from './social-submission.js?rev=39';
import {validGameMinute} from './game-minute.js?rev=39';
import {receivePhoneEvents} from './phone-notifications.js?rev=39';
import {publishJudgeEvents} from './social-judging-events.js?rev=39';
import {SOCIAL_IDENTITY} from './social-identity.js?rev=39';
import {advancePersonalDialogs} from './social-personal.js?rev=39';
import {advanceBattleLifecycle} from './battle-judging-clock.js?rev=39';
const clone=v=>JSON.parse(JSON.stringify(v));
export function normalizeSocialRuntime(raw){
 const seen=new Set(),events=(Array.isArray(raw?.events)?raw.events:[]).filter(e=>e&&typeof e.id==='string'&&typeof e.type==='string'&&validGameMinute(e.dueAt)&&!seen.has(e.id)&&seen.add(e.id)).map(clone);
 return {version:1,lastMinute:validGameMinute(raw?.lastMinute)?raw.lastMinute:null,events};
}
export function normalizeCommunityAudio(raw){
 return Object.fromEntries(Object.entries(raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{}).filter(([id,v])=>communityById(id)&&Array.isArray(v)).map(([id,v])=>[id,[...new Set(v.filter(x=>typeof x==='string'))]]));
}
export function migrateLegacySocial(input,nowMinute){
 if(!validGameMinute(nowMinute))return {ok:false,state:input,reason:'Не удалось определить игровое время.'};
 let state=input;
 for(const old of input.battleSubmissions??[]){
  if(old.version===2)continue;const c=communityById(old.battleId);if(!c?.battleId)continue;
  const ensured=ensureBattleWindow(state,{battleId:old.battleId,nowMinute});if(!ensured.ok)continue;state=ensured.state;
  const id=ensured.windowId+':player',version=state.trackVersions?.byId?.[old.trackVersionId],recovery=Boolean(old.issue||!version);
  const row={version:2,id,windowId:ensured.windowId,battleId:old.battleId,communityId:c.id,roundId:'selection',playerId:'player',trackVersionId:old.trackVersionId??null,sentAt:null,...acknowledgementFor(id,nowMinute),status:recovery?'recovery':'pending',topicMatch:old.topicMatch??null,migration:{activatedAt:nowMinute,timePrecision:'day-only'},legacyArchive:clone(old)};
  const social=normalizeSocial(state.social);
  social.dialogs[c.id]={peer:{kind:'community',id:c.id},messages:[{id:id+':sent',kind:'submission',sender:'player',at:null,trackVersionId:row.trackVersionId,body:recovery?'Старая работа сохранена, но её источник недоступен. Повторная сдача закрыта.':'Работа сохранена из предыдущей версии. Точное время отправки неизвестно.'}],unread:false,draftVersionId:null};
  if(version)social.personalAudioIds=[...new Set([...social.personalAudioIds,version.id])];
  state={...state,social,battleSubmissions:state.battleSubmissions.map(s=>s===old?row:s)};
 }
 return {ok:true,state,reason:''};
}
export function activateSocial(state,nowMinute,battleId='makarevich-1'){
 const migrated=migrateLegacySocial(state,nowMinute);if(!migrated.ok)return migrated;
 return ensureBattleWindow(migrated.state,{battleId,nowMinute,judgingPolicyVersion:2});
}
export function advanceSocial(input,nowMinute,options={}){
 const runtime=normalizeSocialRuntime(input.socialRuntime);
 if(!validGameMinute(nowMinute)||runtime.lastMinute!==null&&nowMinute<runtime.lastMinute)return {state:input,events:[]};
 const personal=advancePersonalDialogs(migrateLegacySocial(input,nowMinute).state,nowMinute);let state=personal.state;
 const social=normalizeSocial(state.social),communityAudio=normalizeCommunityAudio(state.communityAudio),processed=new Set(runtime.events.map(e=>e.id)),due=[],submissions=(state.battleSubmissions??[]).map(clone);
 for(const s of submissions){
  if(s.version!==2||s.status==='recovery')continue;
  const c=communityById(s.communityId),window=state.battleWindows?.find(w=>w.id===s.windowId&&!w.issue);if(!c||!window)continue;
  const common={source:SOCIAL_IDENTITY.name,sender:c.name,entityId:s.id,trackVersionId:s.trackVersionId,communityId:c.id};
  if(s.status==='pending'&&s.ackAt<=nowMinute)due.push({...common,id:s.id+':ack',type:'submission-ack',dueAt:s.ackAt,text:ACK_TEMPLATES.find(t=>t.id===s.ackTemplateId)?.body??'Работа получена. Подтверждение сохранено.'});
  if(window.closesAt<=nowMinute)due.push({...common,id:s.id+':published',type:'submission-published',dueAt:window.closesAt,text:'Приём закрыт. Работа добавлена в аудиозаписи сообщества.'});
 }
 const events=due.filter(e=>!processed.has(e.id)).sort((a,b)=>a.dueAt-b.dueAt||a.id.localeCompare(b.id));
 for(const e of events){
  const submission=submissions.find(s=>s.id===e.entityId);
  if(e.type==='submission-ack'){
   submission.status='accepted';const dialog=social.dialogs[e.communityId]??{messages:[],draftVersionId:null};
   social.dialogs[e.communityId]={...dialog,peer:{kind:'community',id:e.communityId},unread:true,messages:[...(dialog.messages??[]),{id:e.id,kind:'ack',sender:e.communityId,at:e.dueAt,body:e.text}]};
  }else communityAudio[e.communityId]=[...new Set([...(communityAudio[e.communityId]??[]),e.trackVersionId])];
 }
 state={...state,social,communityAudio,battleSubmissions:submissions,phone:receivePhoneEvents(state.phone,events.filter(e=>e.type==='submission-ack')),socialRuntime:{version:1,lastMinute:nowMinute,events:[...runtime.events,...personal.events,...events]}};
 const lifecycle=advanceBattleLifecycle(state,nowMinute,options);state=lifecycle.state;
 const battleEvents=lifecycle.events.map(e=>({source:SOCIAL_IDENTITY.name,sender:'Макаревич Баттл',...e})),notices=[];
 for(const roundId of new Set(battleEvents.filter(e=>e.type==='judge-review').map(e=>e.roundId))){const batch=battleEvents.filter(e=>e.type==='judge-review'&&e.roundId===roundId),last=batch.at(-1);notices.push({...last,id:'reviews:'+batch.map(e=>e.id).join('|'),type:'judge-review-batch',resultIds:batch.map(e=>e.resultId),text:'Новых отзывов о твоей работе: '+batch.length+'. Прочитай их в сообществе.'});}
 notices.push(...battleEvents.filter(e=>['judge-panel-complete','round-announced','round-result'].includes(e.type)));
 const publishedAudio={...state.communityAudio};for(const e of battleEvents.filter(e=>e.type==='round-closed')){const round=state.tournaments.byId[e.battleId].rounds[e.roundId];publishedAudio[e.communityId]=[...new Set([...(publishedAudio[e.communityId]??[]),...Object.values(round.submissions)])];}
 state={...state,communityAudio:publishedAudio,phone:receivePhoneEvents(state.phone,notices),socialRuntime:{...state.socialRuntime,events:[...state.socialRuntime.events,...battleEvents].sort((a,b)=>a.dueAt-b.dueAt||a.id.localeCompare(b.id))}};
 const judged=publishJudgeEvents(state,nowMinute);
 return {state:judged.state,domainChanged:lifecycle.changed,events:[...personal.events,...events,...battleEvents,...judged.events].sort((a,b)=>a.dueAt-b.dueAt||a.id.localeCompare(b.id))};
}
