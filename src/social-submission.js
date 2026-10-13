import {normalizeSocial} from './social-state.js?rev=40';
import {validGameMinute} from './game-minute.js?rev=40';
import {startSubmissionUpload} from './social-upload.js?rev=40';
import {normalizeOutgoingMessage} from './social-composer.js?rev=40';
import {submissionSendContext} from './social-submission-validation.js?rev=40';
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
export function acknowledgementFor(id,sentAt,roundId='selection'){
 let hash=2166136261;for(const c of id){hash^=c.codePointAt(0);hash=Math.imul(hash,16777619)>>>0;}
 const eligible=roundId==='selection'?ACK_TEMPLATES:ACK_TEMPLATES.filter(t=>!/отбор/i.test(t.body));
 return {ackAt:sentAt+1+hash%30,ackTemplateId:eligible[(hash>>>5)%eligible.length].id};
}
export function attachSubmissionTrack(state,{communityId,projectId,nowMinute}={}){
 return startSubmissionUpload(state,{communityId,projectId,nowMinute});
}
export function sendSubmission(state,{communityId,nowMinute}={}){
 const check=submissionSendContext(state,{communityId,nowMinute});if(!check.ok)return check;
 const {c,window,upload,social,dialog,version,lyrics}=check,message=normalizeOutgoingMessage(state.outgoingMessage,state.trackVersions),fail=reason=>({ok:false,state,reason});
 if(message?.issue)return fail(message.issue);
 if(!message||message.communityId!==communityId||message.windowId!==window.id||message.versionId!==version.id||message.elapsedSeconds<6)return fail('Сначала закончи набор сообщения.');
 const id=window.id+':player',row={version:2,id,windowId:window.id,battleId:c.battleId,communityId,roundId:window.roundId,playerId:'player',trackVersionId:version.id,sentAt:nowMinute,...acknowledgementFor(id,nowMinute,window.roundId),status:'pending',topicMatch:lyrics?lyrics.battleId===c.battleId&&(lyrics.roundId??'selection')===window.roundId&&(!lyrics.themeId||!state.roundThemes?.[c.battleId+':'+window.roundId]||lyrics.themeId===state.roundThemes[c.battleId+':'+window.roundId].id):null};
 social.dialogs[communityId]={...dialog,draftVersionId:null,messages:[...(dialog.messages??[]),{id:id+':sent',kind:'submission',sender:'player',at:nowMinute,trackVersionId:version.id,body:message.body}]};
 return {ok:true,state:{...state,social,outgoingMessage:null,outgoingUpload:upload?.communityId===communityId?null:state.outgoingUpload,battleSubmissions:[...(state.battleSubmissions??[]),row]},reason:''};
}
export function dialogIsTyping(state,communityId,nowMinute){
 return validGameMinute(nowMinute)&&(state.battleSubmissions??[]).some(s=>s.communityId===communityId&&s.status==='pending'&&validGameMinute(s.ackAt)&&nowMinute>=s.ackAt-1&&nowMinute<s.ackAt);
}
export function markDialogRead(state,id){
 const social=normalizeSocial(state.social);if(!social.dialogs[id])return {ok:false,state,reason:'Диалог не найден.'};
 social.dialogs[id].unread=false;return {ok:true,state:{...state,social},reason:''};
}
