import {pcFileById,openPcDocument} from './pc-filesystem.js?rev=57';
const appIds=['rap-notebook','ft-studio'];
export function normalizeDocumentSessions(raw,{fileSystem,projects=[]}={}){
 const out={version:1,byApp:{},recovery:Array.isArray(raw?.recovery)?structuredClone(raw.recovery):[]};
 for(const [app,s]of Object.entries(raw?.byApp??{})){
  if(appIds.includes(app)&&projects.some(p=>p.id===s?.projectId)&&(!s.fileId||fileSystem?.files.some(f=>f.id===s.fileId)))out.byApp[app]={projectId:s.projectId,fileId:s.fileId??null};
  else out.recovery.push({app,recoveryData:structuredClone(s),reason:'Сеанс документа недоступен.'});
 }return out;
}
export function documentSession(state,appId){return state.documentSessions?.byApp?.[appId]??{projectId:appId==='rap-notebook'?state.writing?.activeTextId:state.music?.activeBeatId,fileId:null};}
export function documentIsDirty(state,appId){
 const s=documentSession(state,appId),p=state.projects?.find(p=>p.id===s.projectId);if(!p)return false;
 const file=s.fileId?pcFileById(state,s.fileId):null;return !file||JSON.stringify(p)!==JSON.stringify(file.snapshot);
}
export function discardPcDocument(state,appId){
 const s=documentSession(state,appId);
 if(s.fileId)return openPcDocument(state,{fileId:s.fileId,appId});
 const next={...state,projects:(state.projects??[]).filter(p=>p.id!==s.projectId),documentSessions:{version:1,...state.documentSessions,byApp:{...state.documentSessions?.byApp}}};delete next.documentSessions.byApp[appId];
 if(appId==='rap-notebook')next.writing={...state.writing,activeTextId:null};else next.music={...state.music,activeBeatId:null};
 return {ok:true,state:next,reason:''};
}
