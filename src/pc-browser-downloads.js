import {SOFTWARE,METADATA_BYTES} from './pc-software-catalog.js?rev=41';
import {normalizeSoftware,withSoftware,softwareDiskBytes} from './pc-software.js?rev=41';
const seconds=n=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
export function normalizeBrowserDownloads(value){
 const seen=new Set(),items=[];
 for(const item of Array.isArray(value?.items)?value.items:[]){
  const app=SOFTWARE[item?.appId],kind=item?.kind,id=item?.appId+':'+kind;
  if(!app||!['installer','metadata'].includes(kind)||kind==='metadata'&&!app.metadataKey||seen.has(id))continue;
  seen.add(id);items.push({id,appId:app.id,kind,elapsedSeconds:seconds(item.elapsedSeconds),error:item.error==='insufficient-space'?item.error:''});
 }
 return {version:1,items};
}
export function browserDownloadEntries(state){
 const s=state.software;
 return (state.browserDownloads?.items??[]).map(item=>{
  const app=SOFTWARE[item.appId],totalBytes=item.kind==='metadata'?METADATA_BYTES:app.downloadBytes;
  const receivedBytes=item.kind==='metadata'?(s[app.metadataKey]?totalBytes:Math.floor(totalBytes*item.elapsedSeconds)):s[item.appId].receivedBytes;
  return {...item,name:item.kind==='metadata'?app.torrent:app.archive,totalBytes,receivedBytes,complete:receivedBytes===totalBytes};
 });
}
export function startBrowserDownload(state,{appId,kind}={}){
 const app=SOFTWARE[appId],fail=reason=>({ok:false,state,reason});
 if(!app||!['installer','metadata'].includes(kind)||kind==='metadata'&&!app.metadataKey)return fail('unknown-app');
 if(state.power!=='on')return fail('pc-off');
 const soft=normalizeSoftware(state.software,state.download),queue=normalizeBrowserDownloads(state.browserDownloads);
 if(queue.items.some(item=>item.appId===appId&&item.kind===kind)||kind==='metadata'&&soft[app.metadataKey]||kind==='installer'&&soft[appId].receivedBytes===app.downloadBytes)return {ok:true,state,reason:''};
 const needed=kind==='metadata'?METADATA_BYTES:app.downloadBytes-soft[appId].receivedBytes;
 if(softwareDiskBytes(state).free<needed)return fail('insufficient-space');
 // A legacy client transfer becomes a browser transfer without losing bytes.
 if(kind==='installer')delete soft.transfers[appId];
 queue.items.push({id:appId+':'+kind,appId,kind,elapsedSeconds:kind==='installer'?soft[appId].receivedBytes/app.downloadBytes:0,error:''});
 return {ok:true,state:withSoftware({...state,browserDownloads:queue},soft),reason:''};
}
export function advanceBrowserDownloads(state,{activeSeconds=0,powered=state.power==='on',paused=false}={}){
 if(!powered||state.power!=='on'||paused||!Number.isFinite(activeSeconds)||activeSeconds<=0)return {state,changed:false,completed:[]};
 const entries=browserDownloadEntries(state).filter(item=>!item.complete);
 if(!entries.length)return {state,changed:false,completed:[]};
 let next=withSoftware({...state,browserDownloads:normalizeBrowserDownloads(state.browserDownloads)},normalizeSoftware(state.software,state.download)),changed=false;const completed=[];
 for(const entry of entries){
  const item=next.browserDownloads.items.find(item=>item.id===entry.id),app=SOFTWARE[item.appId],elapsed=Math.min(1,item.elapsedSeconds+activeSeconds);
  const desired=Math.floor(entry.totalBytes*elapsed)-entry.receivedBytes,added=Math.min(desired,Math.floor(softwareDiskBytes(next).free));
  const received=entry.receivedBytes+added;
  const error=added<desired?'insufficient-space':'';
  if(added===0&&item.error===error)continue;
  item.elapsedSeconds=received/entry.totalBytes;item.error=error;changed=true;
  if(item.kind==='installer')next.software[item.appId].receivedBytes=received;
  else if(received===entry.totalBytes)next.software[app.metadataKey]=true;
  if(received===entry.totalBytes)completed.push(item.id);
 }
 return {state:changed?withSoftware(next,next.software):state,changed,completed};
}
