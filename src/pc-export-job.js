import {createAudioExport,normalizeAudioExports} from './pc-audio-exports.js?rev=60';
import {softwareDiskBytes} from './pc-software.js?rev=60';
import {canonicalTrackSignature,normalizeTrackVersions} from './track-version.js?rev=60';
import {pcFileEntries,pcFolderNameTaken} from './pc-filesystem.js?rev=60';
export function normalizeExportJob(raw,{trackVersions,audioExports,fileSystem}={}){
 if(raw==null)return null;
 if(raw.version!==1||typeof raw.id!=='string'||!raw.id||raw.id.length>100||!Number.isFinite(raw.elapsedSeconds)||raw.elapsedSeconds<0||raw.elapsedSeconds>5||raw.totalSeconds!==5)return null;
 if(audioExports?.files.some(f=>f.id===raw.file?.id))return null;
 const savedVersion=raw.trackVersion?normalizeTrackVersions({byId:{[raw.trackVersion.id]:raw.trackVersion}}).byId[raw.trackVersion.id]:null;
 if(raw.trackVersion&&!savedVersion)return null;
 const versions={byId:{...trackVersions?.byId,...(savedVersion?{[savedVersion.id]:savedVersion}:{})}},archive=normalizeAudioExports({version:1,files:[raw.file]},versions,{fileSystem});
 if(archive.files.length!==1)return null;
 return {version:1,id:raw.id,elapsedSeconds:raw.elapsedSeconds,totalSeconds:5,file:archive.files[0],trackVersion:raw.trackVersion?structuredClone(raw.trackVersion):null,error:typeof raw.error==='string'?raw.error:''};
}
export function startExportJob(state,{jobId,...options}={}){
 const fail=reason=>({ok:false,state,reason});if(state.exportJob)return fail('Дождись завершения экспорта или отмени его.');
 if(typeof jobId!=='string'||!jobId||jobId.length>100||/[\x00-\x1f\\/]/.test(jobId))return fail('Не удалось создать задание экспорта.');
 const result=createAudioExport(state,{...options,id:'export:'+jobId});if(!result.ok)return fail(result.reason);
 const file=result.state.audioExports.files.find(f=>f.id===result.fileId),trackVersion=file.trackVersionId?result.state.trackVersions.byId[file.trackVersionId]:null;
 return {ok:true,state:{...state,exportJob:{version:1,id:jobId,elapsedSeconds:0,totalSeconds:5,file:structuredClone(file),trackVersion:trackVersion?structuredClone(trackVersion):null,error:''}},reason:''};
}
export function cancelExportJob(state){return {ok:true,state:state.exportJob?{...state,exportJob:null}:state,reason:''};}
export function advanceExportJob(state,{activeSeconds,visible,powered,paused}={}){
 const result=(next=state,completedFileId=null,events=[])=>({state:next,completedFileId,events,changed:next!==state});
 if(!state.exportJob||!visible||!powered||paused||!Number.isFinite(activeSeconds)||activeSeconds<=0)return result();
 const job=state.exportJob,elapsedSeconds=Math.min(5,job.elapsedSeconds+activeSeconds);
 if(elapsedSeconds<5-1e-8)return result({...state,exportJob:{...job,elapsedSeconds}});
 const archive=state.audioExports??{version:1,files:[],recovery:[]},file=job.file;
 const collision=pcFolderNameTaken(state,file.folderId,file.filename)||pcFileEntries(state,{folderId:file.folderId}).some(f=>f.id===file.id||f.filename.normalize('NFC').toLocaleLowerCase('ru')===file.filename.normalize('NFC').toLocaleLowerCase('ru'));
 const versions={version:1,...state.trackVersions,byId:{...state.trackVersions?.byId}},old=job.trackVersion?versions.byId[job.trackVersion.id]:null;
 const badVersion=old&&canonicalTrackSignature(old)!==canonicalTrackSignature(job.trackVersion);
 if(collision||badVersion||softwareDiskBytes({...state,exportJob:null}).free<file.bytes)return result({...state,exportJob:{...job,elapsedSeconds:5,error:collision?'Имя файла занято. Отмени экспорт и выбери другое.':badVersion?'Версия трека изменилась. Повтори экспорт.':'Недостаточно места на диске.'}});
 if(job.trackVersion&&!old)Object.defineProperty(versions.byId,job.trackVersion.id,{value:structuredClone(job.trackVersion),enumerable:true,writable:true,configurable:true});
 const next={...state,exportJob:null,audioExports:{...archive,files:[...archive.files,structuredClone(file)]},...(job.trackVersion?{trackVersions:versions}:{})};
 return result(next,file.id,[{id:job.id+':complete',type:'audio-export-complete',fileId:file.id}]);
}
export function advanceExportJobDurably(state,options,persist){
 const r=advanceExportJob(state,options);if(!r.completedFileId)return r;
 let saved=false;try{const result=persist(r.state);saved=result!==false&&result?.ok!==false;}catch{/* Retry the same immutable file after storage recovers. */}
 return saved?r:{state,completedFileId:null,events:[],changed:false,reason:'Не удалось сохранить аудиофайл. Повтори попытку.'};
}
