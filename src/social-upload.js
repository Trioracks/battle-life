import {audioFileMatchesBattle} from './battle-file-match.js?rev=58';
import {communityById} from './social-catalog.js?rev=58';
import {attemptForWindow,currentBattleWindow,canSubmitToBattleWindow,isBattleWindowId} from './battle-windows.js?rev=58';
import {validGameMinute} from './game-minute.js?rev=58';
import {TRACK_DSP_VERSION} from './track-version.js?rev=58';
import {normalizeAudioExports} from './pc-audio-exports.js?rev=58';
import {normalizeSocial} from './social-state.js?rev=58';
export const UPLOAD_TOTAL_SECONDS=2;
const clone=v=>JSON.parse(JSON.stringify(v));
const fileBytes=version=>{const seconds=version?.recipe?.descriptor?.durationSeconds;return Number.isFinite(seconds)&&seconds>0&&seconds<=3600?Math.ceil(seconds*192000/8):null;};
const progress=(totalBytes,elapsedSeconds)=>{
 const bytes=Math.min(totalBytes,totalBytes*elapsedSeconds/UPLOAD_TOTAL_SECONDS),uploadedBytes=Math.min(totalBytes,Math.floor(bytes+1e-8));
 return {uploadedBytes,fractionalBytes:Math.max(0,bytes-uploadedBytes)};
};
export function normalizeOutgoingUpload(raw,trackVersions,audioExports){
 if(raw==null)return null;
 if(raw.issue&&Object.hasOwn(raw,'recoveryData'))return clone(raw);
 const version=trackVersions?.byId?.[raw.versionId],c=communityById(raw.communityId),legacy=raw.version===1||raw.version===2&&raw.fileId===null;
 const file=audioExports?.files?.find(f=>f.id===raw.fileId&&f.kind==='track'&&f.trackVersionId===raw.versionId),bytes=legacy?fileBytes(version):file?.bytes;
 let valid=c?.battleId&&isBattleWindowId(raw.windowId,c.battleId)&&version?.recipe?.dspVersion===TRACK_DSP_VERSION&&Number.isSafeInteger(bytes)&&bytes>0&&raw.totalBytes===bytes&&Number.isSafeInteger(raw.uploadedBytes)&&raw.uploadedBytes>=0&&raw.uploadedBytes<=bytes&&Number.isFinite(raw.fractionalBytes)&&raw.fractionalBytes>=0&&raw.fractionalBytes<1&&((raw.status==='uploading'&&raw.uploadedBytes<bytes)||(raw.status==='ready'&&raw.uploadedBytes===bytes&&raw.fractionalBytes===0));
 if(valid&&raw.version===1)return {...clone(raw),version:2,fileId:null,migration:{sourceVersion:1},elapsedSeconds:UPLOAD_TOTAL_SECONDS*(raw.uploadedBytes+raw.fractionalBytes)/bytes,totalSeconds:UPLOAD_TOTAL_SECONDS};
 if(raw.fileId===null)valid&&=raw.migration?.sourceVersion===1;
 valid&&=raw.version===2&&raw.totalSeconds===UPLOAD_TOTAL_SECONDS&&Number.isFinite(raw.elapsedSeconds)&&raw.elapsedSeconds>=0&&raw.elapsedSeconds<=UPLOAD_TOTAL_SECONDS&&((raw.status==='ready')===(raw.elapsedSeconds===UPLOAD_TOTAL_SECONDS));
 if(valid){const derived=progress(bytes,raw.elapsedSeconds);valid=derived.uploadedBytes===raw.uploadedBytes&&Math.abs(derived.fractionalBytes-raw.fractionalBytes)<1e-7;}
 return valid?clone(raw):{issue:'Загрузка повреждена или её сохранённая версия недоступна. Отмени передачу и выбери файл заново.',recoveryData:clone(raw)};
}
export function startSubmissionUpload(state,{communityId,fileId,nowMinute}={}){
 const fail=reason=>({ok:false,state,reason}),c=communityById(communityId),window=currentBattleWindow(state,c?.battleId,nowMinute);
 if(state.outgoingUpload)return fail('Сначала заверши или отмени текущую исходящую загрузку.');
 if(!canSubmitToBattleWindow(state,window))return fail('В этом раунде ты не участвуешь или приём закрыт.');
 if(state.outgoingMessage)return fail('Сначала заверши отправку текущего сообщения.');
 if(!c?.battleId||!window||!validGameMinute(nowMinute))return fail('Открой сообщество баттла и проверь сроки приёма.');
 if(attemptForWindow(state,window))return fail('Работа уже отправлена. Повторная сдача и замена недоступны.');
 if(nowMinute<window.opensAt||nowMinute>=window.closesAt)return fail('Приём заявок и треков закрыт.');
 if(!state.battleApplications?.some(a=>a.battleId===c.battleId))return fail('Сначала зарегистрируйся на этот баттл.');
 const file=normalizeAudioExports(state.audioExports,state.trackVersions,{fileSystem:state.fileSystem}).files.find(f=>f.id===fileId&&f.kind==='track');
 if(!file)return fail('Выбери экспортированный полный трек WAV или MP3. Бит, вокал и проект не подходят.');
 if(!audioFileMatchesBattle(state,file,{battleId:c.battleId,roundId:window.roundId,themeId:state.roundThemes?.[c.battleId+':'+window.roundId]?.id}))return fail('Трек создан для другого баттла или раунда. Выбери работу для текущей темы.');
 const versionId=file.trackVersionId,totalBytes=file.bytes;
 const social=normalizeSocial(state.social);social.dialogs[communityId]={messages:[],unread:false,...social.dialogs[communityId],peer:{kind:'community',id:communityId}};
 return {ok:true,state:{...state,social,outgoingUpload:{version:2,communityId,windowId:window.id,fileId,versionId,totalBytes,uploadedBytes:0,fractionalBytes:0,elapsedSeconds:0,totalSeconds:UPLOAD_TOTAL_SECONDS,status:'uploading'}},versionId,reason:''};
}
export function advanceSubmissionUpload(state,{activeSeconds=0,powered=false,paused=true}={}){
 const unchanged={state,changed:false,completed:false},u=normalizeOutgoingUpload(state.outgoingUpload,state.trackVersions,state.audioExports);
 if(!u||u.issue||u.status!=='uploading'||!powered||paused||!Number.isFinite(activeSeconds)||activeSeconds<=0)return unchanged;
 const nextElapsed=u.elapsedSeconds+activeSeconds,elapsedSeconds=nextElapsed>=UPLOAD_TOTAL_SECONDS-1e-9?UPLOAD_TOTAL_SECONDS:nextElapsed,completed=elapsedSeconds===UPLOAD_TOTAL_SECONDS;
 const outgoingUpload={...u,...progress(u.totalBytes,elapsedSeconds),elapsedSeconds,status:completed?'ready':'uploading'};
 let social=state.social;
 if(completed){social=normalizeSocial(social);social.personalAudioIds=[...new Set([...social.personalAudioIds,u.versionId])];if(u.fileId)social.personalAudioFiles={...social.personalAudioFiles,[u.versionId]:u.fileId};social.dialogs[u.communityId]={messages:[],unread:false,...social.dialogs[u.communityId],peer:{kind:'community',id:u.communityId},draftVersionId:u.versionId};}
 return {state:{...state,social,outgoingUpload},changed:true,completed};
}
export function cancelSubmissionUpload(state){const recovery=state.outgoingUpload?.issue?[...(state.outgoingUploadRecovery??[]),clone(state.outgoingUpload)]:state.outgoingUploadRecovery??[];return {ok:true,state:{...state,outgoingUpload:null,outgoingUploadRecovery:recovery},reason:''};}
export function uploadPresentation(state){
 const u=normalizeOutgoingUpload(state.outgoingUpload,state.trackVersions,state.audioExports);if(!u)return null;
 if(u.issue)return {status:'error',reason:u.issue,percent:0,totalBytes:0,uploadedBytes:0,bytesPerSecond:0,remainingSeconds:null};
 return {...u,percent:Math.floor(u.elapsedSeconds/u.totalSeconds*100),bytesPerSecond:u.status==='uploading'&&state.power==='on'?u.totalBytes/u.totalSeconds:0,remainingSeconds:Math.ceil(u.totalSeconds-u.elapsedSeconds)};
}
