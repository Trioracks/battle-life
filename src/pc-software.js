import {SOFTWARE,METADATA_BYTES,DISK_BYTES,SYSTEM_BYTES} from './pc-software-catalog.js?rev=41';
const bytes=(n,max)=>Number.isFinite(n)?Math.max(0,Math.min(max,n)):0;
export function normalizeInstallPath(value){
 if(typeof value!=='string')return null;
 const path=value.trim().replaceAll('/','\\').replace(/\\+/g,'\\').replace(/\\$/,'');
 if(!/^C:\\[^<>:"|?*\x00-\x1f]+$/i.test(path))return null;
 const parts=path.slice(3).split('\\');
 if(path.length>180||parts.some(p=>!p.trim()||p==='.'||p==='..'||/[. ]$/.test(p)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)))return null;
 if(['windows','system'].includes(parts[0].toLowerCase())||parts[0].toLowerCase()==='мои документы')return null;
 return 'C:\\'+parts.join('\\');
}
export function normalizeSoftware(value,legacy={}){
 const source=value&&typeof value==='object'?value:null,old=legacy.status;
 const app=id=>({installed:source?source[id]?.installed===true:id==='ft'&&old==='installed',receivedBytes:source?bytes(source[id]?.receivedBytes,SOFTWARE[id].downloadBytes):id==='ft'&&['downloading','ready-to-install'].includes(old)?(old==='ready-to-install'?800000000:bytes(legacy.receivedBytes,800000000)):0,path:normalizeInstallPath(source?.[id]?.path)??SOFTWARE[id].path});
 const client=app('client'),ft=app('ft');if(!source&&['downloading','ready-to-install'].includes(old))client.installed=true;
 const transfers={},legacyTask=source?.task;
 const candidates=source?.transferVersion===2?source.transfers:legacyTask?{[legacyTask.appId]:legacyTask}:!source&&old==='downloading'?{ft:{appId:'ft'}}:{};
 for(const id of Object.keys(SOFTWARE)){const t=candidates?.[id];if(t&&app(id).receivedBytes<SOFTWARE[id].downloadBytes)transfers[id]={appId:id,paused:t.paused===true,error:t.error==='insufficient-space'?t.error:''};}
 const wizard=source?.installer,id=wizard?.appId,step=wizard?.step;
 const installer=SOFTWARE[id]&&['welcome','destination','summary','install','finish'].includes(step)&&app(id).receivedBytes===SOFTWARE[id].downloadBytes&&(!app(id).installed||step==='finish')?{appId:id,openAfterInstall:wizard.openAfterInstall!==false,step:step==='finish'&&!app(id).installed?'welcome':step,path:normalizeInstallPath(wizard.path)??SOFTWARE[id].path,elapsedSeconds:step==='install'?bytes(wizard.elapsedSeconds,SOFTWARE[id].installSeconds):step==='finish'&&app(id).installed?SOFTWARE[id].installSeconds:0,error:step==='install'&&wizard.error==='insufficient-space'?'insufficient-space':''}:null;
 return {client,ft,notebook:app('notebook'),dossier:app('dossier'),dossierMetadata:source?.dossierMetadata===true,metadata:source?source.metadata===true:['downloading','ready-to-install'].includes(old),notebookMetadata:source?.notebookMetadata===true,transferVersion:2,transfers,installer};
}
export function withSoftware(state,software){
 const ft=software.ft;
 const download={status:ft.installed?'installed':ft.receivedBytes===800000000?'ready-to-install':software.transfers.ft?'downloading':'idle',receivedBytes:ft.installed?0:ft.receivedBytes};
 return {...state,software,download};
}
export function softwareDiskBytes(state){
 const s=normalizeSoftware(state.software,state.download);
 const partialMetadata=(state.browserDownloads?.items??[]).reduce((n,item)=>n+(item.kind==='metadata'&&SOFTWARE[item.appId]?.metadataKey&&!s[SOFTWARE[item.appId].metadataKey]?Math.floor(METADATA_BYTES*Math.max(0,Math.min(1,item.elapsedSeconds||0))):0),0);
 const downloaded=partialMetadata+Object.keys(SOFTWARE).reduce((n,id)=>n+s[id].receivedBytes+(SOFTWARE[id].metadataKey&&s[SOFTWARE[id].metadataKey]?METADATA_BYTES:0),0),installed=Object.keys(SOFTWARE).reduce((n,id)=>n+(s[id].installed?SOFTWARE[id].installedBytes:0),0),projects=(state.projects?.length??0)*2000000;
 const audioExports=(state.audioExports?.files??[]).reduce((n,f)=>n+(Number.isSafeInteger(f.bytes)&&f.bytes>0?f.bytes:0),0);
 return {downloaded,installed,projects,audioExports,used:SYSTEM_BYTES+downloaded+installed+projects+audioExports,free:Math.max(0,DISK_BYTES-SYSTEM_BYTES-downloaded-installed-projects-audioExports)};
}
const result=(state,ok=true,reason='')=>({ok,reason,state,openAppId:null});
const copy=input=>withSoftware(input,normalizeSoftware(input.software,input.download));
export function downloadClient(input){
 const s=copy(input),soft=s.software;
 if(s.power!=='on')return result(s,false,'pc-off');
 if(soft.client.installed||soft.client.receivedBytes===2000000)return result(s);
 if(soft.transfers.client)return result(s);
 if(softwareDiskBytes(s).free<2000000-soft.client.receivedBytes)return result(s,false,'insufficient-space');
 soft.transfers.client={appId:'client',paused:false,error:''};return result(withSoftware(s,soft));
}
export function downloadNotebook(input){
 return downloadMetadata(input,'notebook');
}
export function downloadMetadata(input,id='ft'){
 const s=copy(input),key=SOFTWARE[id]?.metadataKey;if(!key)return result(s,false,'unknown-app');
 if(s.power!=='on')return result(s,false,'pc-off');if(s.software[key])return result(s);
 if(softwareDiskBytes(s).free<METADATA_BYTES)return result(s,false,'insufficient-space');s.software[key]=true;return result(withSoftware(s,s.software));
}
export function openMetadata(input,id='ft'){
 const s=copy(input),soft=s.software,app=SOFTWARE[id];if(!app?.metadataKey)return result(s,false,'unknown-app');
 if(s.power!=='on')return result(s,false,'pc-off');if(!soft.client.installed)return result(s,false,'client-required');if(!soft[app.metadataKey])return result(s,false,'metadata-required');
 if(soft[id].installed||soft[id].receivedBytes===app.downloadBytes||soft.transfers[id])return result(s);
 soft.transfers[id]={appId:id,paused:false,error:''};return result(withSoftware(s,soft));
}
function transferId(s,id){const ids=Object.keys(s.software.transfers);return id??(ids.length===1?ids[0]:null);}
export function pauseTransfer(input,id){const s=copy(input),t=s.software.transfers[transferId(s,id)];if(!t)return result(s,false,'select-transfer');t.paused=true;return result(s);}
export function resumeTransfer(input,id){const s=copy(input),t=s.software.transfers[transferId(s,id)];if(!t)return result(s,false,'select-transfer');if(softwareDiskBytes(s).free<=0)return result(s,false,'insufficient-space');t.paused=false;t.error='';return result(s);}
export function cancelTransfer(input,id){const s=copy(input);id=transferId(s,id);if(!s.software.transfers[id])return result(s,false,'select-transfer');s.software[id].receivedBytes=0;delete s.software.transfers[id];return result(withSoftware(s,s.software));}
export function openInstaller(input,appId){
 const s=copy(input),app=SOFTWARE[appId];if(!app)return result(s,false,'unknown-app');
 if(s.software[appId].installed)return result(s,false,'already-installed');if(s.software[appId].receivedBytes!==app.downloadBytes)return result(s,false,'archive-required');
 if(s.software.installer&&s.software.installer.appId!==appId)return result(s,false,'installer-active');
 s.software.installer??={appId,openAfterInstall:true,step:'welcome',path:app.path,elapsedSeconds:0,error:''};return result(s);
}
export function setInstallerPath(input,path){const s=copy(input),valid=normalizeInstallPath(path);if(!s.software.installer)return result(s,false,'installer-required');if(!valid)return result(s,false,'invalid-path');s.software.installer.path=valid;return result(s);}
export function cancelInstaller(input){const s=copy(input);s.software.installer=null;return result(s);}
export function setInstallerOpenAfter(input,value){const s=copy(input);if(!s.software.installer)return result(s,false,'installer-required');s.software.installer.openAfterInstall=value===true;return result(s);}
export function uninstallSoftware(input,id){
 const s=copy(input);if(!SOFTWARE[id])return result(s,false,'unknown-app');
 if(id==='ft'&&s.recording?.job)return result(s,false,'recording-in-progress');
 if((id==='ft'&&s.music?.job)||(id==='notebook'&&s.writing?.job))return result(s,false,'work-in-progress');
 if(id==='client'&&Object.keys(s.software.transfers).some(id=>id!=='client'))return result(s,false,'downloads-in-progress');
 if(s.software.installer?.appId===id)return result(s,false,'installer-active');
 s.software[id].installed=false;return result(withSoftware(s,s.software));
}
export function advanceInstaller(input,{back=false}={}){
 const s=copy(input),w=s.software.installer;if(!w)return result(s,false,'installer-required');
 const steps=['welcome','destination','summary','install','finish'],index=steps.indexOf(w.step);
 if(back){if(index<3)w.step=steps[Math.max(0,index-1)];return result(s);}
 if(w.step==='summary'&&softwareDiskBytes(s).free<SOFTWARE[w.appId].installedBytes)return result(s,false,'insufficient-space');
 if(w.step==='install')return result(s,false,'installation-running');
 if(w.step==='summary'){w.elapsedSeconds=0;w.error='';}
 if(w.step==='finish'){s.software.installer=null;return {...result(withSoftware(s,s.software)),openAppId:w.openAfterInstall?SOFTWARE[w.appId].desktopAppId:null};}w.step=steps[index+1];return result(withSoftware(s,s.software));
}
// Installation uses only active real-time deltas supplied by the host, never a saved clock.
export function advanceInstallation(input,seconds){
 const s=copy(input),w=s.software.installer,tick={...result(s),advancedSeconds:0,completed:false};
 if(!Number.isFinite(seconds)||seconds<=0||s.power!=='on'||w?.step!=='install')return tick;
 const app=SOFTWARE[w.appId],elapsed=Math.min(app.installSeconds,w.elapsedSeconds+seconds);
 tick.advancedSeconds=elapsed-w.elapsedSeconds;w.elapsedSeconds=elapsed;
 if(elapsed<app.installSeconds)return tick;
 if(softwareDiskBytes(s).free<app.installedBytes){w.error='insufficient-space';return {...tick,ok:false,reason:w.error};}
 s.software[w.appId].installed=true;s.software[w.appId].path=w.path;w.step='finish';w.error='';
 return {...tick,state:withSoftware(s,s.software),completed:true};
}
