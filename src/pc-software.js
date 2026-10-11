import {SOFTWARE,METADATA_BYTES,DISK_BYTES,SYSTEM_BYTES} from './pc-software-catalog.js?rev=28';
const bytes=(n,max)=>Number.isFinite(n)?Math.max(0,Math.min(max,n)):0;
export function normalizeInstallPath(value){
 if(typeof value!=='string')return null;
 const path=value.trim().replaceAll('/','\\').replace(/\\+/g,'\\').replace(/\\$/,'');
 if(!/^C:\\[^<>:"|?*\x00-\x1f]+$/i.test(path))return null;
 const parts=path.slice(3).split('\\');
 if(path.length>180||parts.some(p=>!p.trim()||p==='.'||p==='..'||/[. ]$/.test(p)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)))return null;
 if(parts[0].toLowerCase()==='windows'||parts[0].toLowerCase()==='мои документы')return null;
 return 'C:\\'+parts.join('\\');
}
export function normalizeSoftware(value,legacy={}){
 const source=value&&typeof value==='object'?value:null,old=legacy.status;
 const app=id=>({installed:source?source[id]?.installed===true:id==='ft'&&old==='installed',receivedBytes:source?bytes(source[id]?.receivedBytes,SOFTWARE[id].downloadBytes):id==='ft'&&['downloading','ready-to-install'].includes(old)?(old==='ready-to-install'?800000000:bytes(legacy.receivedBytes,800000000)):0,path:normalizeInstallPath(source?.[id]?.path)??SOFTWARE[id].path});
 const client=app('client'),ft=app('ft');if(!source&&['downloading','ready-to-install'].includes(old))client.installed=true;
 let task=null;const t=source?.task;
 if(t&&SOFTWARE[t.appId]&&app(t.appId).receivedBytes<SOFTWARE[t.appId].downloadBytes)task={appId:t.appId,paused:t.paused===true,error:t.error==='insufficient-space'?t.error:'',baseMinute:Number.isFinite(t.baseMinute)?t.baseMinute:null,baseBytes:bytes(t.baseBytes,SOFTWARE[t.appId].downloadBytes)};
 else if(!source&&old==='downloading'&&ft.receivedBytes<800000000)task={appId:'ft',paused:false,error:'',baseMinute:null,baseBytes:ft.receivedBytes};
 const wizard=source?.installer,id=wizard?.appId,step=wizard?.step;
 const installer=SOFTWARE[id]&&['welcome','destination','summary','install','finish'].includes(step)&&app(id).receivedBytes===SOFTWARE[id].downloadBytes&&(!app(id).installed||step==='finish')?{appId:id,step:step==='finish'&&!app(id).installed?'welcome':step,path:normalizeInstallPath(wizard.path)??SOFTWARE[id].path,elapsedSeconds:step==='install'?bytes(wizard.elapsedSeconds,SOFTWARE[id].installSeconds):step==='finish'&&app(id).installed?SOFTWARE[id].installSeconds:0,error:step==='install'&&wizard.error==='insufficient-space'?'insufficient-space':''}:null;
 return {client,ft,notebook:app('notebook'),metadata:source?source.metadata===true:['downloading','ready-to-install'].includes(old),task,installer};
}
export function withSoftware(state,software){
 const ft=software.ft;
 const download={status:ft.installed?'installed':ft.receivedBytes===800000000?'ready-to-install':software.task?.appId==='ft'?'downloading':'idle',receivedBytes:ft.installed?0:ft.receivedBytes};
 return {...state,software,download};
}
export function softwareDiskBytes(state){
 const s=normalizeSoftware(state.software,state.download);
 const downloaded=Object.keys(SOFTWARE).reduce((n,id)=>n+s[id].receivedBytes,0)+(s.metadata?METADATA_BYTES:0),installed=Object.keys(SOFTWARE).reduce((n,id)=>n+(s[id].installed?SOFTWARE[id].installedBytes:0),0),projects=(state.projects?.length??0)*2000000;
 return {downloaded,installed,projects,used:SYSTEM_BYTES+downloaded+installed+projects,free:Math.max(0,DISK_BYTES-SYSTEM_BYTES-downloaded-installed-projects)};
}
const result=(state,ok=true,reason='')=>({ok,reason,state});
const copy=input=>withSoftware(input,normalizeSoftware(input.software,input.download));
export function downloadClient(input){
 const s=copy(input),soft=s.software;
 if(s.power!=='on')return result(s,false,'pc-off');
 if(soft.client.installed||soft.client.receivedBytes===2000000)return result(s);
 if(soft.task)return result(s,soft.task.appId==='client',soft.task.appId==='client'?'':'transfer-active');
 if(softwareDiskBytes(s).free<2000000-soft.client.receivedBytes)return result(s,false,'insufficient-space');
 soft.task={appId:'client',paused:false,error:'',baseMinute:s.lastGameMinute??null,baseBytes:soft.client.receivedBytes};return result(withSoftware(s,soft));
}
export function downloadNotebook(input){
 const s=copy(input),soft=s.software,id='notebook',app=SOFTWARE[id];
 if(s.power!=='on')return result(s,false,'pc-off');
 if(soft[id].installed||soft[id].receivedBytes===app.downloadBytes)return result(s);
 if(soft.task)return result(s,soft.task.appId===id,soft.task.appId===id?'':'transfer-active');
 if(softwareDiskBytes(s).free<app.downloadBytes-soft[id].receivedBytes)return result(s,false,'insufficient-space');
 soft.task={appId:id,paused:false,error:'',baseMinute:s.lastGameMinute??null,baseBytes:soft[id].receivedBytes};return result(withSoftware(s,soft));
}
export function downloadMetadata(input){
 const s=copy(input);if(s.power!=='on')return result(s,false,'pc-off');if(s.software.metadata)return result(s);
 if(softwareDiskBytes(s).free<METADATA_BYTES)return result(s,false,'insufficient-space');s.software.metadata=true;return result(withSoftware(s,s.software));
}
export function openMetadata(input){
 const s=copy(input),soft=s.software;
 if(!soft.client.installed)return result(s,false,'client-required');if(!soft.metadata)return result(s,false,'metadata-required');
 if(soft.ft.installed||soft.ft.receivedBytes===800000000||soft.task?.appId==='ft')return result(s);
 if(soft.task)return result(s,false,'transfer-active');if(s.power!=='on')return result(s,false,'pc-off');
 soft.task={appId:'ft',paused:false,error:'',baseMinute:s.lastGameMinute??null,baseBytes:soft.ft.receivedBytes};return result(withSoftware(s,soft));
}
export function pauseTransfer(input){const s=copy(input);if(s.software.task)s.software.task.paused=true;return result(s);}
export function resumeTransfer(input){const s=copy(input),t=s.software.task;if(t){if(softwareDiskBytes(s).free<=0)return result(s,false,'insufficient-space');t.paused=false;t.error='';t.baseMinute=s.lastGameMinute;t.baseBytes=s.software[t.appId].receivedBytes;}return result(s);}
export function cancelTransfer(input){const s=copy(input),t=s.software.task;if(t){s.software[t.appId].receivedBytes=0;s.software.task=null;}return result(withSoftware(s,s.software));}
export function openInstaller(input,appId){
 const s=copy(input),app=SOFTWARE[appId];if(!app)return result(s,false,'unknown-app');
 if(s.software[appId].installed)return result(s,false,'already-installed');if(s.software[appId].receivedBytes!==app.downloadBytes)return result(s,false,'archive-required');
 if(s.software.installer&&s.software.installer.appId!==appId)return result(s,false,'installer-active');
 s.software.installer??={appId,step:'welcome',path:app.path,elapsedSeconds:0,error:''};return result(s);
}
export function setInstallerPath(input,path){const s=copy(input),valid=normalizeInstallPath(path);if(!s.software.installer)return result(s,false,'installer-required');if(!valid)return result(s,false,'invalid-path');s.software.installer.path=valid;return result(s);}
export function cancelInstaller(input){const s=copy(input);s.software.installer=null;return result(s);}
export function advanceInstaller(input,{back=false}={}){
 const s=copy(input),w=s.software.installer;if(!w)return result(s,false,'installer-required');
 const steps=['welcome','destination','summary','install','finish'],index=steps.indexOf(w.step);
 if(back){if(index<3)w.step=steps[Math.max(0,index-1)];return result(s);}
 if(w.step==='summary'&&softwareDiskBytes(s).free<SOFTWARE[w.appId].installedBytes)return result(s,false,'insufficient-space');
 if(w.step==='install')return result(s,false,'installation-running');
 if(w.step==='summary'){w.elapsedSeconds=0;w.error='';}
 if(w.step==='finish')s.software.installer=null;else w.step=steps[index+1];return result(withSoftware(s,s.software));
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
