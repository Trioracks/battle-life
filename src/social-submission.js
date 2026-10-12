import {communityById} from './social-catalog.js?rev=37';
import {normalizeSocial} from './social-state.js?rev=37';
import {attemptForWindow} from './battle-windows.js?rev=37';
import {validGameMinute} from './game-minute.js?rev=37';
import {captureTrackVersion,TRACK_DSP_VERSION} from './track-version.js?rev=37';
import {submissionCandidates} from './battle-submission.js?rev=37';
export const ACK_TEMPLATES=Object.freeze([
 'Привет! Трек принят, спасибо за участие. После дедлайна передадим судьям.',
 'Работа на месте, вложение открылось. Ждём окончания приёма.',
 'Забрали твой трек. Теперь можно выдохнуть: заявка сохранена.',
 'Получили, спасибо. Судьи доберутся до работы после закрытия отбора.',
 'Привет. Всё дошло, отметили в списке. Удачи на отборе!',
 'Вложение принято. Второй файл не нужен — судить будем эту версию.',
 'Есть твоя работа! Не потеряли. Дальше общий срок и прослушивание.',
 'Спасибо, запись забрали в отбор. Итоги придут отдельным сообщением.',
 'Трек получен, место в списке закрепили. Пока без оценок, только подтверждение.',
 'На связи админы: работа у нас. После закрытия приёма она появится в аудио сообщества.'
].map((body,i)=>Object.freeze({id:'ack-'+(i+1),body})));
export function acknowledgementFor(id,sentAt){
 let hash=2166136261;for(const c of id){hash^=c.codePointAt(0);hash=Math.imul(hash,16777619)>>>0;}
 return {ackAt:sentAt+1+hash%30,ackTemplateId:ACK_TEMPLATES[(hash>>>5)%ACK_TEMPLATES.length].id};
}
const context=(state,id)=>{const c=communityById(id),window=state.battleWindows?.find(w=>w.battleId===c?.battleId&&w.roundId==='selection'&&!w.issue);return {c,window};};
export function attachSubmissionTrack(state,{communityId,projectId,nowMinute}={}){
 const fail=reason=>({ok:false,state,reason}),{c,window}=context(state,communityId);
 if(!c?.battleId||!window||!validGameMinute(nowMinute))return fail('Открой сообщество баттла и проверь сроки приёма.');
 if(attemptForWindow(state,window))return fail('Работа уже отправлена. Повторная сдача и замена недоступны.');
 const candidate=submissionCandidates(state,c.battleId).find(p=>p.projectId===projectId);if(!candidate||candidate.issue)return fail(candidate?.issue??'Выбери готовый трек с вокалом.');
 const captured=captureTrackVersion(state,{projectId,nowMinute});if(!captured.ok)return captured;
 const social=normalizeSocial(captured.state.social);social.personalAudioIds=[...new Set([...social.personalAudioIds,captured.versionId])];
 social.dialogs[communityId]={messages:[],unread:false,...social.dialogs[communityId],draftVersionId:captured.versionId};
 return {ok:true,state:{...captured.state,social},reason:'',versionId:captured.versionId};
}
export function sendSubmission(state,{communityId,nowMinute}={}){
 const fail=reason=>({ok:false,state,reason}),{c,window}=context(state,communityId);
 if(!c?.battleId||!window||!validGameMinute(nowMinute))return fail('Не удалось определить срок приёма.');
 if(attemptForWindow(state,window))return fail('Работа уже отправлена. Повторная сдача и замена недоступны.');
 if(nowMinute<window.opensAt||nowMinute>=window.closesAt)return fail('Приём работ закрыт.');
 if(!state.battleApplications?.some(a=>a.battleId===c.battleId))return fail('Сначала зарегистрируйся на этот баттл.');
 const social=normalizeSocial(state.social),dialog=social.dialogs[communityId],version=state.trackVersions?.byId?.[dialog?.draftVersionId];
 if(!version||version.recipe?.dspVersion!==TRACK_DSP_VERSION)return fail('Прикрепи доступную сохранённую версию трека.');
 const beat=version.recipe.beat,lyrics=version.recipe.lyrics,check=submissionCandidates({projects:[beat,...(lyrics?[lyrics]:[])]},c.battleId)[0];
 if(!check||check.issue)return fail(check?.issue??'Сохранённая работа недоступна.');
 const id=window.id+':player',row={version:2,id,windowId:window.id,battleId:c.battleId,communityId,roundId:window.roundId,playerId:'player',trackVersionId:version.id,sentAt:nowMinute,...acknowledgementFor(id,nowMinute),status:'pending',topicMatch:lyrics?lyrics.battleId===c.battleId:null};
 social.dialogs[communityId]={...dialog,draftVersionId:null,messages:[...(dialog.messages??[]),{id:id+':sent',kind:'submission',sender:'player',at:nowMinute,trackVersionId:version.id,body:'Работа на отбор'}]};
 return {ok:true,state:{...state,social,battleSubmissions:[...(state.battleSubmissions??[]),row]},reason:''};
}
export function dialogIsTyping(state,communityId,nowMinute){
 return validGameMinute(nowMinute)&&(state.battleSubmissions??[]).some(s=>s.communityId===communityId&&s.status==='pending'&&validGameMinute(s.ackAt)&&nowMinute>=s.ackAt-1&&nowMinute<s.ackAt);
}
export function markDialogRead(state,id){
 const social=normalizeSocial(state.social);if(!social.dialogs[id])return {ok:false,state,reason:'Диалог не найден.'};
 social.dialogs[id].unread=false;return {ok:true,state:{...state,social},reason:''};
}
