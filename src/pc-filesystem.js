import {normalizeLyric} from './lyric-production.js?rev=59';
import {normalizeBeat} from './beat-production.js?rev=59';
import {normalizeStudioProject} from './ft-studio-project.js?rev=59';
import {softwareDiskBytes} from './pc-software.js?rev=59';
import {validGameMinute} from './game-minute.js?rev=59';

export const PC_USER_FOLDERS=Object.freeze(['disk','documents','projects','music','exports','downloads']);
const base=new Set(PC_USER_FOLDERS),reserved=new Set([...PC_USER_FOLDERS,'computer','windows']),types=new Set(['txt','flp','wav','mp3']),clone=structuredClone;
const key=s=>String(s).normalize('NFC').toLocaleLowerCase('ru');
export const validPcId=id=>typeof id==='string'&&id.length>0&&id.length<=160&&!/[\\/\x00-\x1f]/.test(id)&&!['__proto__','prototype','constructor','.','..'].includes(id);
export function pcEntryName(value){
 if(typeof value!=='string'||value!==value.trim()||!value||value.length>120||/[<>:"/\\|?*\x00-\x1f]/.test(value)||/[. ]$/.test(value)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value)||['.','..'].includes(value))return null;
 return value.normalize('NFC');
}
export function pcDocumentFilename(value,type){
 const name=pcEntryName(value);if(!name||!types.has(type))return null;
 const ext=/\.([^.]+)$/.exec(name);return ext?(ext[1].toLowerCase()===type?name:null):pcEntryName(name+'.'+type);
}
const documentProject=(p,type)=>type==='txt'?normalizeLyric(p):type==='flp'?(normalizeBeat(p)??normalizeStudioProject(p)):null;
const projectType=p=>p?.kind==='lyrics'?'txt':'flp';
export function pcFolderExists(state,id){return base.has(id)||(state.fileSystem?.folders??[]).some(f=>f.id===id);}
function uniqueName(filename,folderId,files,folders=[]){
 const exists=name=>files.some(f=>f.folderId===folderId&&key(f.filename)===key(name))||folders.some(f=>f.parentId===folderId&&key(f.name)===key(name));if(!exists(filename))return filename;
 const dot=filename.lastIndexOf('.'),stem=filename.slice(0,dot),ext=filename.slice(dot);
 for(let n=1;n<=files.length+folders.length+1;n++){const name=stem.slice(0,100)+' ('+n+')'+ext;if(!exists(name))return name;}
}
export function normalizePcFileSystem(raw,{projects=[],audioExports,mentorFiles=[]}={}){
 const out={version:1,folders:[],files:[],recovery:Array.isArray(raw?.recovery)?clone(raw.recovery):[]};
 if(raw==null){
  for(const p of projects){const type=projectType(p),snapshot=documentProject(p,type);if(!snapshot)continue;
   const safe=pcEntryName(p.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/,''))??'Документ',folderId='projects';
   out.files.push({id:'legacy-project:'+p.id,type,filename:uniqueName(safe+'.'+type,folderId,out.files),folderId,projectId:p.id,snapshot:clone(snapshot),source:'legacy-project',bytes:2000000,createdAtMinute:0,modifiedAtMinute:0});
  }
  for(const f of mentorFiles){if(f?.requiresDownload||!f?.project||!validPcId(f.id))continue;const type=projectType(f.project),snapshot=documentProject(f.project,type);if(!snapshot)continue;
   out.files.push({id:'legacy-mentor:'+f.id,type,filename:uniqueName((pcEntryName(f.project.name)??'Вложение')+'.'+type,f.folderId??'downloads',out.files),folderId:f.folderId??'downloads',projectId:f.project.id,snapshot:clone(snapshot),source:'mentor',mentorFileId:f.id,bytes:f.bytes??2000000,createdAtMinute:f.createdAtMinute??0,modifiedAtMinute:f.createdAtMinute??0});
  }
  return out;
 }
 if(raw.version!==1||!Array.isArray(raw.folders)||!Array.isArray(raw.files)){out.recovery.push({reason:'Файловая система повреждена. Исходник сохранён.',recoveryData:clone(raw)});return out;}
 const pending=[...raw.folders],ids=new Set(base),names=new Set();
 for(let pass=0;pass<12&&pending.length;pass++)for(let i=0;i<pending.length;){const f=pending[i],name=pcEntryName(f?.name),id=f?.id,nk=f?.parentId+':'+key(name);
  if(validPcId(id)&&!reserved.has(id)&&!ids.has(id)&&name&&ids.has(f.parentId)&&!names.has(nk)){out.folders.push({id,parentId:f.parentId,name,createdAtMinute:validGameMinute(f.createdAtMinute)?f.createdAtMinute:0});ids.add(id);names.add(nk);pending.splice(i,1);}else i++;
 }
 for(const f of pending)out.recovery.push({reason:'Недоступная, повторная или циклическая папка.',recoveryData:clone(f)});
 const fileIds=new Set();
 for(const f of raw.files){
  const nk=f?.folderId+':'+key(f?.filename),snapshot=documentProject(f?.snapshot,f?.type),audio=['wav','mp3'].includes(f?.type)&&typeof f.audioExportId==='string'&&audioExports?.files?.some(a=>a.id===f.audioExportId);
  if(!validPcId(f?.id)||fileIds.has(f.id)||!ids.has(f.folderId)||pcDocumentFilename(f.filename,f.type)!==f.filename||names.has(nk)||!Number.isSafeInteger(f.bytes)||f.bytes<0||!validGameMinute(f.createdAtMinute)||!validGameMinute(f.modifiedAtMinute)||!snapshot&&!audio){out.recovery.push({reason:'Файл повреждён или имя занято.',recoveryData:clone(f)});continue;}
  fileIds.add(f.id);names.add(nk);out.files.push({...clone(f),...(snapshot?{snapshot:clone(snapshot)}:{})});
 }
 for(const f of mentorFiles){
  if(f?.requiresDownload||out.files.some(existing=>existing.id===f?.id||existing.mentorFileId===f?.id))continue;
  const type=projectType(f?.project),snapshot=documentProject(f?.project,type);if(!snapshot||!validPcId(f?.id)||!ids.has(f.folderId??'downloads'))continue;
  const folderId=f.folderId??'downloads',filename=uniqueName(pcDocumentFilename(f.filename,type)??(pcEntryName(f.project.name)??'Вложение')+'.'+type,folderId,out.files,out.folders);
  out.files.push({id:'legacy-mentor:'+f.id,type,filename,folderId,projectId:f.project.id,snapshot:clone(snapshot),source:'mentor',mentorFileId:f.id,bytes:f.bytes??2000000,createdAtMinute:f.createdAtMinute??0,modifiedAtMinute:f.createdAtMinute??0});
 }
 return out;
}
export function pcFileEntries(state,{folderId,types:allowed,filter=()=>true}={}){
 const files=[...(state.fileSystem?.files??[])],ids=new Set(files.map(f=>f.id));
 for(const f of state.audioExports?.files??[]){if(ids.has(f.id))continue;files.push({...f,type:f.format??'wav',source:'audio',audioExportId:f.id});ids.add(f.id);}
 return files.filter(f=>(folderId===undefined||f.folderId===folderId)&&(!allowed||allowed.includes(f.type))&&filter(f));
}
export const pcFileById=(state,id)=>pcFileEntries(state,{}).find(f=>f.id===id)??null;
export const pcFolderNameTaken=(state,folderId,name)=>(state.fileSystem?.folders??[]).some(f=>f.parentId===folderId&&key(f.name)===key(name));
export function nextPcFolderName(state,parentId){
 const taken=name=>pcFolderNameTaken(state,parentId,name)||pcFileEntries(state,{folderId:parentId}).some(f=>key(f.filename)===key(name));
 let name='Новая папка',index=2;while(taken(name))name='Новая папка ('+(index++)+')';return name;
}
export function renamePcFolder(state,{folderId,name}={}){
 const folder=state.fileSystem?.folders.find(f=>f.id===folderId),safe=pcEntryName(name),fail=reason=>({ok:false,state,reason});
 if(!folder||!safe)return fail('Укажи корректное имя папки.');
 if(state.fileSystem.folders.some(f=>f.id!==folderId&&f.parentId===folder.parentId&&key(f.name)===key(safe))||pcFileEntries(state,{folderId:folder.parentId}).some(f=>key(f.filename)===key(safe)))return fail('Такое имя в этой папке уже занято.');
 return {ok:true,state:{...state,fileSystem:{...state.fileSystem,folders:state.fileSystem.folders.map(f=>f===folder?{...f,name:safe}:f)}},reason:''};
}
export function createPcFolder(state,{id,parentId,name,nowMinute}={}){
 const fail=reason=>({ok:false,state,folderId:null,reason}),safe=pcEntryName(name);
 if(!validPcId(id)||reserved.has(id)||state.fileSystem?.folders?.some(f=>f.id===id)||!safe||!validGameMinute(nowMinute))return fail('Укажи корректное имя новой папки.');
 if(!pcFolderExists(state,parentId))return fail('Выбери пользовательскую папку игрового диска.');
 if((state.fileSystem?.folders??[]).some(f=>f.parentId===parentId&&key(f.name)===key(safe))||pcFileEntries(state,{folderId:parentId}).some(f=>key(f.filename)===key(safe)))return fail('Такое имя в этой папке уже занято.');
 let p=parentId,depth=0;while(!base.has(p)){if(++depth>=12)return fail('Слишком большая вложенность папок.');p=state.fileSystem.folders.find(f=>f.id===p)?.parentId;if(!p)return fail('Папка недоступна.');}
 const fs=state.fileSystem??normalizePcFileSystem(null,state);
 return {ok:true,state:{...state,fileSystem:{...fs,folders:[...fs.folders,{id,parentId,name:safe,createdAtMinute:nowMinute}]}},folderId:id,reason:''};
}
export function savePcDocument(state,{projectId,fileId,folderId,filename,nowMinute,overwrite=false}={}){
 const fail=reason=>({ok:false,state,fileId:null,reason}),raw=state.projects?.find(p=>p.id===projectId),type=projectType(raw),snapshot=documentProject(raw,type),old=fileId?pcFileById(state,fileId):null;
 if(!snapshot||!validGameMinute(nowMinute))return fail('Документ недоступен или повреждён.');
 if(fileId&&(!old||old.type!==type||old.audioExportId))return fail('Файл для сохранения недоступен. Выбери «Сохранить как».');
 folderId??=old?.folderId;filename??=old?.filename;
 filename=pcDocumentFilename(filename,type);
 if(!pcFolderExists(state,folderId)||!filename)return fail('Выбери папку и безопасное имя файла '+type.toUpperCase()+'.');
 if(pcFolderNameTaken(state,folderId,filename))return fail('Такое имя уже занято папкой. Выбери другое имя файла.');
 const collision=pcFileEntries(state,{folderId}).find(f=>key(f.filename)===key(filename)&&f.id!==fileId);
 if(collision&&!overwrite)return fail('Такой файл уже существует. Подтверди замену или выбери другое имя.');
 if(collision&&collision.type!==type)return fail('Нельзя заменить файл другого типа.');
 const fs=state.fileSystem??normalizePcFileSystem(null,state),replaced=old??collision;
 const bytes=type==='flp'?2000000:new TextEncoder().encode(JSON.stringify(snapshot)).length;
 if(softwareDiskBytes(state).free<Math.max(0,bytes-(replaced?.bytes??0)))return fail('Недостаточно места на игровом диске.');
 const id=replaced?.id??'document:'+(globalThis.crypto?.randomUUID?.()??Date.now().toString(36)),file={id,type,folderId,filename,projectId,snapshot:clone(snapshot),source:'document',bytes,createdAtMinute:replaced?.createdAtMinute??nowMinute,modifiedAtMinute:nowMinute};
 const files=replaced?fs.files.map(f=>f.id===replaced.id?file:f):[...fs.files,file],appId=type==='txt'?'rap-notebook':'ft-studio';
 return {ok:true,state:{...state,fileSystem:{...fs,files},documentSessions:{version:1,...state.documentSessions,byApp:{...state.documentSessions?.byApp,[appId]:{projectId,fileId:id}}}},fileId:id,reason:''};
}
export function openPcDocument(state,{fileId,appId}={}){
 const fail=reason=>({ok:false,state,projectId:null,reason}),file=pcFileById(state,fileId),expected=appId==='rap-notebook'?'txt':appId==='ft-studio'?'flp':null;
 const snapshot=documentProject(file?.snapshot,file?.type);if(!file||!snapshot||expected&&file.type!==expected)return fail('Выбери подходящий сохранённый документ.');
 appId??=file.type==='txt'?'rap-notebook':'ft-studio';
 if(state.music?.job||state.writing?.job||state.recording?.job)return fail('Сначала прерви текущую работу.');
 const projectId=file.projectId??snapshot.id,p={...clone(snapshot),id:projectId};
 const projects=state.projects?.some(p=>p.id===projectId)?state.projects.map(old=>old.id===projectId?p:old):[...(state.projects??[]),p];
 const next={...state,projects,creativeWork:{...state.creativeWork,items:(state.creativeWork?.items??[]).filter(i=>i.projectId!==projectId),activeId:state.creativeWork?.activeId===projectId?null:state.creativeWork?.activeId},documentSessions:{version:1,...state.documentSessions,byApp:{...state.documentSessions?.byApp,[appId]:{projectId,fileId}}}};
 if(file.type==='txt')next.writing={...state.writing,activeTextId:projectId};else next.music={...state.music,activeBeatId:projectId};
 return {ok:true,state:next,projectId,reason:''};
}
