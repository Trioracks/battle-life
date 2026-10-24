import {mentorDownloadBytes,completeMentorDownload} from './pc-mentor-downloads.js?rev=61';
import {GOBLIN_ID} from './goblin-catalog.js?rev=61';
import {SOFTWARE,METADATA_BYTES} from './pc-software-catalog.js?rev=61';
import {normalizeSoftware,withSoftware,softwareDiskBytes} from './pc-software.js?rev=61';
import {restorePcDownloadFolder} from './pc-download-folder.js?rev=61';
const seconds=n=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
export function normalizeBrowserDownloads(value){
 const seen=new Set(),items=[],hiddenHistoryIds=[],recovery=(Array.isArray(value?.recovery)?value.recovery:[]).map(item=>structuredClone(item));
 const recover=raw=>recovery.push({reason:'Повреждённая история загрузок. Исходные данные сохранены.',recoveryData:structuredClone(raw)});
 if(value!=null&&value.version!==1)recover(value);
 if(value?.recovery!=null&&!Array.isArray(value.recovery))recover(value.recovery);
 if(value?.items!=null&&!Array.isArray(value.items))recover(value.items);
 for(const item of Array.isArray(value?.items)?value.items:[]){
  if(item?.kind==='mentor'){
   const id='mentor:'+item.attachmentId;
   if(typeof item.attachmentId!=='string'||!item.attachmentId||seen.has(id)||!Number.isFinite(item.startedAtMinute)||item.startedAtMinute<0||!Number.isFinite(item.elapsedSeconds)||item.elapsedSeconds<0||item.elapsedSeconds>1){recover(item);continue;}
   seen.add(id);items.push({id,kind:'mentor',attachmentId:item.attachmentId,startedAtMinute:item.startedAtMinute,elapsedSeconds:item.elapsedSeconds,error:['insufficient-space','attachment-unavailable'].includes(item.error)?item.error:''});continue;
  }
  const app=Object.hasOwn(SOFTWARE,item?.appId)?SOFTWARE[item.appId]:null,kind=item?.kind,id=item?.appId+':'+kind;
  if(!app||!['installer','metadata'].includes(kind)||kind==='metadata'&&!app.metadataKey||seen.has(id)){recover(item);continue;}
  if(!Number.isFinite(item.elapsedSeconds)||item.elapsedSeconds<0||item.elapsedSeconds>1||!['','insufficient-space',undefined].includes(item.error))recover(item);
  seen.add(id);items.push({id,appId:app.id,kind,elapsedSeconds:seconds(item.elapsedSeconds),error:item.error==='insufficient-space'?item.error:''});
 }
 if(value?.hiddenHistoryIds!=null&&!Array.isArray(value.hiddenHistoryIds))recover(value.hiddenHistoryIds);
 for(const id of Array.isArray(value?.hiddenHistoryIds)?value.hiddenHistoryIds:[]){
  if(typeof id==='string'&&seen.has(id)){if(!hiddenHistoryIds.includes(id))hiddenHistoryIds.push(id);}
  else recover(id);
 }
 return {version:1,items,hiddenHistoryIds,recovery};
}
export function browserDownloadEntries(state,{includeHidden=false}={}){
 const s=state.software,hidden=new Set(state.browserDownloads?.hiddenHistoryIds??[]);
 return (state.browserDownloads?.items??[]).map(item=>{
  if(item.kind==='mentor'){const file=state.social?.goblin?.files.find(f=>f.id===item.attachmentId),totalBytes=mentorDownloadBytes(file),complete=Boolean(state.social?.goblin?.downloaded?.[item.attachmentId]);return {...item,name:file?.exported?.file?.filename??file?.filename??'Вложение',totalBytes,receivedBytes:complete?totalBytes:Math.floor(totalBytes*item.elapsedSeconds),complete,fileId:state.social?.goblin?.downloaded?.[item.attachmentId]};}
  const app=SOFTWARE[item.appId],totalBytes=item.kind==='metadata'?METADATA_BYTES:app.downloadBytes;
  const receivedBytes=item.kind==='metadata'?(s[app.metadataKey]?totalBytes:Math.floor(totalBytes*item.elapsedSeconds)):s[item.appId].receivedBytes;
  return {...item,name:item.kind==='metadata'?app.torrent:app.archive,totalBytes,receivedBytes,complete:receivedBytes===totalBytes};
 }).filter(item=>item.totalBytes>0).filter(item=>includeHidden||!item.complete||!hidden.has(item.id));
}
export function clearCompletedBrowserDownloadHistory(state){
 const queue=normalizeBrowserDownloads(state.browserDownloads),hidden=new Set(queue.hiddenHistoryIds);
 for(const item of browserDownloadEntries(state))if(item.complete)hidden.add(item.id);
 if(hidden.size===queue.hiddenHistoryIds.length)return {ok:true,state};
 return {ok:true,state:{...state,browserDownloads:{...queue,hiddenHistoryIds:[...hidden]}}};
}
export function startBrowserDownload(state,{appId,kind}={}){
 const app=Object.hasOwn(SOFTWARE,appId)?SOFTWARE[appId]:null,fail=reason=>({ok:false,state,reason});
 if(!app||!['installer','metadata'].includes(kind)||kind==='metadata'&&!app.metadataKey)return fail('unknown-app');
 if(state.power!=='on')return fail('pc-off');
 const soft=normalizeSoftware(state.software,state.download),queue=normalizeBrowserDownloads(state.browserDownloads);
 const id=appId+':'+kind,existing=queue.items.find(item=>item.id===id);
 if(existing){
  const complete=kind==='metadata'?soft[app.metadataKey]:soft[appId].receivedBytes===app.downloadBytes;
  if(!queue.hiddenHistoryIds.includes(id)&&(!complete||queue.items.at(-1)===existing))return {ok:true,state:restorePcDownloadFolder(state),reason:''};
  queue.hiddenHistoryIds=queue.hiddenHistoryIds.filter(value=>value!==id);
  queue.items=[...queue.items.filter(item=>item.id!==id),existing];
  return {ok:true,state:restorePcDownloadFolder({...state,browserDownloads:queue}),reason:''};
 }
 if(kind==='metadata'&&soft[app.metadataKey]||kind==='installer'&&soft[appId].receivedBytes===app.downloadBytes){
  queue.items.push({id,appId,kind,elapsedSeconds:1,error:''});
  return {ok:true,state:restorePcDownloadFolder({...state,browserDownloads:queue}),reason:''};
 }
 const needed=kind==='metadata'?METADATA_BYTES:app.downloadBytes-soft[appId].receivedBytes;
 if(softwareDiskBytes(state).free<needed)return fail('insufficient-space');
 // A legacy client transfer becomes a browser transfer without losing bytes.
 if(kind==='installer')delete soft.transfers[appId];
 queue.items.push({id:appId+':'+kind,appId,kind,elapsedSeconds:kind==='installer'?soft[appId].receivedBytes/app.downloadBytes:0,error:''});
 return {ok:true,state:restorePcDownloadFolder(withSoftware({...state,browserDownloads:queue},soft)),reason:''};
}
export function startMentorDownload(state,{attachmentId,nowMinute}={}){
 const file=state.social?.goblin?.files.find(f=>f.id===attachmentId),fail=reason=>({ok:false,state,reason});
 if(state.power!=='on')return fail('Компьютер выключен.');
 if(!file||!Number.isFinite(nowMinute)||nowMinute<0||file.createdAtMinute>nowMinute||!state.social?.dialogs?.[GOBLIN_ID]?.messages.some(m=>m.sender===GOBLIN_ID&&m.fileId===attachmentId))return fail('Вложение ещё не получено.');
 const queue=normalizeBrowserDownloads(state.browserDownloads),id='mentor:'+attachmentId;
 if(queue.items.some(i=>i.id===id))return {ok:true,state:restorePcDownloadFolder({...state,browserDownloads:{...queue,hiddenHistoryIds:queue.hiddenHistoryIds.filter(value=>value!==id)}}),downloadId:id,reason:''};
 const bytes=mentorDownloadBytes(file);if(!Number.isSafeInteger(bytes)||bytes<=0)return fail('Вложение повреждено.');if(softwareDiskBytes(state).free<bytes)return fail('Недостаточно места на диске.');
 queue.items.push({id,kind:'mentor',attachmentId,startedAtMinute:nowMinute,elapsedSeconds:0,error:''});return {ok:true,state:restorePcDownloadFolder({...state,browserDownloads:queue}),downloadId:id,reason:''};
}
export function cancelBrowserDownload(state,id){
 const queue=normalizeBrowserDownloads(state.browserDownloads),item=queue.items.find(i=>i.id===id),entry=browserDownloadEntries(state,{includeHidden:true}).find(i=>i.id===id);if(!item||entry?.complete)return {ok:false,state,reason:'Загрузка уже завершена или недоступна.'};
 const software=normalizeSoftware(state.software,state.download);if(item.kind==='installer')software[item.appId].receivedBytes=0;
 return {ok:true,state:withSoftware({...state,browserDownloads:{...queue,items:queue.items.filter(i=>i.id!==id),hiddenHistoryIds:queue.hiddenHistoryIds.filter(value=>value!==id)}},software),reason:''};
}
export function advanceBrowserDownloads(state,{activeSeconds=0,powered=state.power==='on',paused=false}={}){
 if(!powered||state.power!=='on'||paused||!Number.isFinite(activeSeconds)||activeSeconds<=0)return {state,changed:false,completed:[]};
 const entries=browserDownloadEntries(state).filter(item=>!item.complete);
 if(!entries.length)return {state,changed:false,completed:[]};
 // Commands and load already validated the queue. Copy only live transfer rows;
 // immutable visibility/recovery archives do not need per-frame normalization.
 const queue={...state.browserDownloads,items:state.browserDownloads.items.map(item=>({...item}))};
 let next=withSoftware({...state,browserDownloads:queue},normalizeSoftware(state.software,state.download)),changed=false;const completed=[];
 for(const entry of entries){
  const item=next.browserDownloads.items.find(item=>item.id===entry.id),app=SOFTWARE[item.appId],elapsed=Math.min(1,item.elapsedSeconds+activeSeconds);
  const desired=Math.floor(entry.totalBytes*elapsed)-entry.receivedBytes,added=Math.min(desired,Math.floor(softwareDiskBytes(next).free));
  const received=entry.receivedBytes+added;
  const error=added<desired?'insufficient-space':'';
  if(added===0&&item.error===error)continue;
  item.elapsedSeconds=error?received/entry.totalBytes:elapsed;item.error=error;changed=true;
  if(item.kind==='installer')next.software[item.appId].receivedBytes=received;
  else if(item.kind==='mentor'&&received===entry.totalBytes){const done=completeMentorDownload(next,item);if(done.ok)next=done.state;else{item.error=done.reason;continue;}}
  else if(item.kind!=='mentor'&&received===entry.totalBytes)next.software[app.metadataKey]=true;
  if(received===entry.totalBytes)completed.push(item.id);
 }
 return {state:changed?withSoftware(next,next.software):state,changed,completed};
}
