import {communityById} from './social-catalog.js?rev=43';
import {TRACK_DSP_VERSION} from './track-version.js?rev=43';
import {submissionSendContext} from './social-submission-validation.js?rev=43';
import {isBattleWindowId} from './battle-windows.js?rev=43';
const clone=v=>JSON.parse(JSON.stringify(v));
export const SUBMISSION_MESSAGE_SECONDS=6;
export function submissionMessageBody(version){
 const sections=version?.recipe?.lyrics?.sections;
 // Frozen recipes are retained verbatim, including damaged legacy data. A bad
 // text must block only this composer, never throw through the whole PC loader.
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),optionalText=v=>v==null||typeof v==='string';
 if(!optionalText(version?.name)||sections!=null&&(!Array.isArray(sections)||sections.some(section=>!object(section)||!optionalText(section.title)||section.lines!=null&&(!Array.isArray(section.lines)||section.lines.some(line=>!object(line)||!optionalText(line.note)||line.indent!=null&&!Number.isFinite(line.indent)||line.words!=null&&(!Array.isArray(line.words)||line.words.some(word=>!object(word)||typeof word.text!=='string')))))))return null;
 const text=Array.isArray(sections)?sections.map(section=>{
  let body='';for(const line of section.lines??[]){const words=(line.words??[]).map(w=>w.text).filter(t=>typeof t==='string').join(' ');if(!words)continue;
   if(body)body+=line.gapBefore?'\n\n':section.presentation==='prose'?' ':'\n';
   body+=(section.presentation==='prose'?'':'  '.repeat(Math.min(3,Math.max(0,Math.floor(line.indent??0)))))+words+(line.note?' // '+line.note:'');
  }return (section.title?section.title+'\n':'')+body;
 }).join('\n\n'):'Текст к этой версии не сохранён.';
 return 'Привет! Отправляю работу «'+(version?.name??'Без названия')+'» на ваш баттл.\n\n'+text+'\n\nСпасибо!';
}
export function normalizeOutgoingMessage(raw,trackVersions){
 if(raw==null)return null;if(raw.issue&&Object.hasOwn(raw,'recoveryData'))return clone(raw);
 const v=trackVersions?.byId?.[raw.versionId],c=communityById(raw.communityId);
 const valid=raw.version===1&&c?.battleId&&isBattleWindowId(raw.windowId,c.battleId)&&v?.recipe?.dspVersion===TRACK_DSP_VERSION&&raw.totalSeconds===SUBMISSION_MESSAGE_SECONDS&&Number.isFinite(raw.elapsedSeconds)&&raw.elapsedSeconds>=0&&raw.elapsedSeconds<=SUBMISSION_MESSAGE_SECONDS&&typeof raw.body==='string'&&raw.body.length<=524288&&raw.body===submissionMessageBody(v);
 return valid?clone(raw):{issue:'Набор сообщения повреждён. Отмени его и начни заново; вложение сохранено.',recoveryData:clone(raw)};
}
export function startSubmissionMessage(state,options={}){
 const check=submissionSendContext(state,options);if(!check.ok)return check;
 const existing=normalizeOutgoingMessage(state.outgoingMessage,state.trackVersions),fail=reason=>({ok:false,state,reason});
 if(existing){if(existing.issue)return fail(existing.issue);if(existing.communityId!==options.communityId||existing.windowId!==check.window.id||existing.versionId!==check.version.id)return fail('Сначала заверши или отмени текущее сообщение.');return {ok:true,state,reason:''};}
 const body=submissionMessageBody(check.version);if(body===null)return fail('Текст этой версии повреждён. Вложение и исходная версия сохранены; выбери другую работу.');if(body.length>524288)return fail('Текст этой версии слишком большой. Вложение сохранено.');
 return {ok:true,state:{...state,outgoingMessage:{version:1,communityId:options.communityId,windowId:check.window.id,versionId:check.version.id,body,elapsedSeconds:0,totalSeconds:SUBMISSION_MESSAGE_SECONDS}},reason:''};
}
export function advanceSubmissionMessage(state,{activeSeconds=0,visible=false,powered=false,paused=true}={}){
 const message=normalizeOutgoingMessage(state.outgoingMessage,state.trackVersions),unchanged={state,readyToSend:false};if(!message||message.issue||!visible||!powered||paused||!Number.isFinite(activeSeconds)||activeSeconds<0)return unchanged;
 const elapsedSeconds=Math.min(SUBMISSION_MESSAGE_SECONDS,message.elapsedSeconds+activeSeconds);return {state:{...state,outgoingMessage:{...message,elapsedSeconds}},readyToSend:elapsedSeconds===SUBMISSION_MESSAGE_SECONDS};
}
export function cancelSubmissionMessage(state){return {ok:true,state:{...state,outgoingMessage:null,outgoingMessageRecovery:state.outgoingMessage?.issue?[...(state.outgoingMessageRecovery??[]),clone(state.outgoingMessage)]:state.outgoingMessageRecovery??[]},reason:''};}
