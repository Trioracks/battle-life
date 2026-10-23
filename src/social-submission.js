import acknowledgementTemplates from '../data/social/acknowledgement-templates.json' with {type:'json'};
import {gameDateTimeLabel} from './home-calendar.js?rev=58';
import {battleCharacter} from './battle-demo-config.js?rev=58';
import {normalizeSocial} from './social-state.js?rev=58';
import {validGameMinute} from './game-minute.js?rev=58';
import {startSubmissionUpload} from './social-upload.js?rev=58';
import {normalizeOutgoingMessage} from './social-composer.js?rev=58';
import {submissionSendContext} from './social-submission-validation.js?rev=58';
export const ACK_TEMPLATES=Object.freeze(acknowledgementTemplates.map(t=>Object.freeze({...t,roundKinds:Object.freeze([...t.roundKinds])})));
export function resolveAcknowledgementTemplate(id){return ACK_TEMPLATES.find(t=>t.id===id)??(/^ack-([1-9]|10)$/.test(id)?ACK_TEMPLATES[Number(id.slice(4))-1]:null);}
export function acknowledgementFor(id,sentAt,roundId='selection',{tone='friendly'}={}){
 let hash=2166136261;for(const c of id){hash^=c.codePointAt(0);hash=Math.imul(hash,16777619)>>>0;}
 const kind=roundId==='selection'?'selection':'knockout',tones=tone==='friendly'?['friendly','neutral']:['neutral','dry','strict'],eligible=ACK_TEMPLATES.filter(t=>t.roundKinds.includes(kind)&&tones.includes(t.tone));
 return {ackAt:sentAt+1+hash%30,ackTemplateId:eligible[(hash>>>5)%eligible.length].id};
}
export function acknowledgementBodyFor(state,row){
 const template=resolveAcknowledgementTemplate(row.ackTemplateId)??ACK_TEMPLATES[0],window=(state.battleWindows??[]).find(w=>w.id===row.windowId)??(state.battleWindows??[]).find(w=>w.battleId===row.battleId&&w.roundId===row.roundId),round=state.tournaments?.byId?.[row.battleId]?.rounds?.[row.roundId],pair=round?.pairs?.find(p=>p.participantIds.includes('player')),opponentId=pair?.participantIds.find(id=>id&&id!=='player');
 const facts={deadline:Number.isFinite(window?.closesAt)?gameDateTimeLabel(window.closesAt):'срока из объявления группы',judgingDeadline:Number.isFinite(window?.closesAt)?gameDateTimeLabel(Math.ceil((window.closesAt+2400)/1440)*1440):'срока из объявления группы',opponent:battleCharacter(opponentId)?.name??'участник, указанный в таблице раунда',notificationHint:state.social?.subscriptions?.includes(row.communityId)?'О новых результатах сообщим в уведомлениях.':'Подпишись на группу, чтобы получать уведомления о результатах.'};
 return template.body.replace(/\{(\w+)\}/g,(_,key)=>facts[key]??'');
}
export function attachSubmissionTrack(state,{communityId,fileId,nowMinute}={}){
 return startSubmissionUpload(state,{communityId,fileId,nowMinute});
}
export function sendSubmission(state,{communityId,nowMinute}={}){
 const check=submissionSendContext(state,{communityId,nowMinute});if(!check.ok)return check;
 const {c,window,upload,social,dialog,version,lyrics}=check,message=normalizeOutgoingMessage(state.outgoingMessage,state.trackVersions),fail=reason=>({ok:false,state,reason});
 if(message?.issue)return fail(message.issue);
 if(!message||message.communityId!==communityId||message.windowId!==window.id||message.versionId!==version.id||message.elapsedSeconds<6)return fail('Сначала закончи набор сообщения.');
 const id=window.id+':player',row={version:2,id,windowId:window.id,battleId:c.battleId,communityId,roundId:window.roundId,playerId:'player',trackVersionId:version.id,sentAt:nowMinute,...acknowledgementFor(id,nowMinute,window.roundId,{tone:c.battleId==='makarevich-1'?'friendly':'dry'}),status:'pending',topicMatch:lyrics?lyrics.battleId===c.battleId&&(lyrics.roundId??'selection')===window.roundId&&(!lyrics.themeId||!state.roundThemes?.[c.battleId+':'+window.roundId]||lyrics.themeId===state.roundThemes[c.battleId+':'+window.roundId].id):null};
 social.dialogs[communityId]={...dialog,draftVersionId:null,messages:[...(dialog.messages??[]),{id:id+':sent',kind:'submission',sender:'player',at:nowMinute,trackVersionId:version.id,audioFileId:upload?.fileId??null,body:message.body,...(message.version===2&&message.textAttachment?{textAttachment:structuredClone(message.textAttachment)}:{})}]};
 return {ok:true,state:{...state,social,outgoingMessage:null,outgoingUpload:upload?.communityId===communityId?null:state.outgoingUpload,battleSubmissions:[...(state.battleSubmissions??[]),row]},reason:''};
}
export function dialogIsTyping(state,communityId,nowMinute){
 return validGameMinute(nowMinute)&&(state.battleSubmissions??[]).some(s=>s.communityId===communityId&&s.status==='pending'&&validGameMinute(s.ackAt)&&nowMinute>=s.ackAt-1&&nowMinute<s.ackAt);
}
export function markDialogRead(state,id){
 const social=normalizeSocial(state.social);if(!social.dialogs[id])return {ok:false,state,reason:'Диалог не найден.'};
 social.dialogs[id].unread=false;return {ok:true,state:{...state,social},reason:''};
}
