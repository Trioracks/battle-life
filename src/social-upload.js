import {communityById} from './social-catalog.js?rev=39';
import {attemptForWindow} from './battle-windows.js?rev=39';
import {validGameMinute} from './game-minute.js?rev=39';
import {captureTrackVersion,TRACK_DSP_VERSION} from './track-version.js?rev=39';
import {submissionCandidates} from './battle-submission.js?rev=39';
import {normalizeSocial} from './social-state.js?rev=39';
export const UPLOAD_BYTES_PER_SECOND=10000;
const clone=v=>JSON.parse(JSON.stringify(v));
const fileBytes=version=>{const seconds=version?.recipe?.descriptor?.durationSeconds;return Number.isFinite(seconds)&&seconds>0&&seconds<=3600?Math.ceil(seconds*192000/8):null;};
export function normalizeOutgoingUpload(raw,trackVersions){
 if(raw==null)return null;
 if(raw.issue&&Object.hasOwn(raw,'recoveryData'))return clone(raw);
 const version=trackVersions?.byId?.[raw.versionId],c=communityById(raw.communityId),bytes=fileBytes(version);
 const valid=raw.version===1&&c?.battleId&&raw.windowId===c.battleId+':selection:1'&&version?.recipe?.dspVersion===TRACK_DSP_VERSION&&bytes!==null&&raw.totalBytes===bytes&&Number.isSafeInteger(raw.uploadedBytes)&&raw.uploadedBytes>=0&&raw.uploadedBytes<=bytes&&Number.isFinite(raw.fractionalBytes)&&raw.fractionalBytes>=0&&raw.fractionalBytes<1&&((raw.status==='uploading'&&raw.uploadedBytes<bytes)||(raw.status==='ready'&&raw.uploadedBytes===bytes&&raw.fractionalBytes===0));
 return valid?clone(raw):{issue:'Загрузка повреждена или её сохранённая версия недоступна. Отмени передачу и выбери файл заново.',recoveryData:clone(raw)};
}
export function startSubmissionUpload(state,{communityId,projectId,nowMinute}={}){
 const fail=reason=>({ok:false,state,reason}),c=communityById(communityId),window=state.battleWindows?.find(w=>w.battleId===c?.battleId&&w.roundId==='selection'&&!w.issue);
 if(state.outgoingUpload)return fail('Сначала заверши или отмени текущую исходящую загрузку.');
 if(state.outgoingMessage)return fail('Сначала заверши отправку текущего сообщения.');
 if(!c?.battleId||!window||!validGameMinute(nowMinute))return fail('Открой сообщество баттла и проверь сроки приёма.');
 if(attemptForWindow(state,window))return fail('Работа уже отправлена. Повторная сдача и замена недоступны.');
 if(nowMinute<window.opensAt||nowMinute>=window.closesAt)return fail('Приём заявок и треков закрыт.');
 if(!state.battleApplications?.some(a=>a.battleId===c.battleId))return fail('Сначала зарегистрируйся на этот баттл.');
 const candidate=submissionCandidates(state,c.battleId).find(p=>p.projectId===projectId);if(!candidate||candidate.issue)return fail(candidate?.issue??'Выбери готовый трек с вокалом.');
 const captured=captureTrackVersion(state,{projectId,nowMinute});if(!captured.ok)return captured;
 const totalBytes=fileBytes(captured.state.trackVersions.byId[captured.versionId]);if(!totalBytes)return fail('Не удалось определить размер аудио.');
 const social=normalizeSocial(captured.state.social);social.dialogs[communityId]={messages:[],unread:false,...social.dialogs[communityId],peer:{kind:'community',id:communityId}};
 return {ok:true,state:{...captured.state,social,outgoingUpload:{version:1,communityId,windowId:window.id,versionId:captured.versionId,totalBytes,uploadedBytes:0,fractionalBytes:0,status:'uploading'}},versionId:captured.versionId,reason:''};
}
export function advanceSubmissionUpload(state,{activeSeconds=0,powered=false,paused=true}={}){
 const unchanged={state,changed:false,completed:false},u=normalizeOutgoingUpload(state.outgoingUpload,state.trackVersions);
 if(!u||u.issue||u.status!=='uploading'||!powered||paused||!Number.isFinite(activeSeconds)||activeSeconds<=0)return unchanged;
 const bytes=Math.min(u.totalBytes-u.uploadedBytes,activeSeconds*UPLOAD_BYTES_PER_SECOND+u.fractionalBytes),whole=Math.floor(bytes+1e-8),uploadedBytes=Math.min(u.totalBytes,u.uploadedBytes+whole),completed=uploadedBytes===u.totalBytes;
 const outgoingUpload={...u,uploadedBytes,fractionalBytes:completed?0:Math.max(0,bytes-whole),status:completed?'ready':'uploading'};
 let social=state.social;
 if(completed){social=normalizeSocial(social);social.personalAudioIds=[...new Set([...social.personalAudioIds,u.versionId])];social.dialogs[u.communityId]={messages:[],unread:false,...social.dialogs[u.communityId],peer:{kind:'community',id:u.communityId},draftVersionId:u.versionId};}
 return {state:{...state,social,outgoingUpload},changed:true,completed};
}
export function cancelSubmissionUpload(state){const recovery=state.outgoingUpload?.issue?[...(state.outgoingUploadRecovery??[]),clone(state.outgoingUpload)]:state.outgoingUploadRecovery??[];return {ok:true,state:{...state,outgoingUpload:null,outgoingUploadRecovery:recovery},reason:''};}
export function uploadPresentation(state){
 const u=normalizeOutgoingUpload(state.outgoingUpload,state.trackVersions);if(!u)return null;
 if(u.issue)return {status:'error',reason:u.issue,percent:0,totalBytes:0,uploadedBytes:0,bytesPerSecond:0,remainingSeconds:null};
 return {...u,percent:Math.floor(u.uploadedBytes/u.totalBytes*100),bytesPerSecond:u.status==='uploading'&&state.power==='on'?UPLOAD_BYTES_PER_SECOND:0,remainingSeconds:Math.ceil((u.totalBytes-u.uploadedBytes-u.fractionalBytes)/UPLOAD_BYTES_PER_SECOND)};
}
