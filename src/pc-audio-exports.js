import {pcFolderExists,pcFileEntries} from './pc-filesystem.js?rev=57';
import {normalizeBeat} from './beat-production.js?rev=57';
import {resolveBeatPlayback} from './beat-playback.js?rev=57';
import {captureTrackVersion,canonicalTrackSignature} from './track-version.js?rev=57';
import {softwareDiskBytes} from './pc-software.js?rev=57';
import {drumById} from './beat-catalog.js?rev=57';
import {beginnerById} from './beat-beginner-bank.js?rev=57';
import {vocalById,DEFAULT_VOICE_ID} from './vocal-catalog.js?rev=57';
import {validBeatExecutionDescriptor} from './beat-execution-snapshot.js?rev=57';

export const AUDIO_EXPORT_FOLDERS=Object.freeze(['documents','music','exports','downloads','projects']);
export const AUDIO_EXPORT_KINDS=Object.freeze({beat:'Бит',vocal:'Вокал',track:'Полный трек'});
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const clone=v=>JSON.parse(JSON.stringify(v));
const id=v=>typeof v==='string'&&v.trim()===v&&v.length>0&&v.length<=160&&!/[\\/\x00-\x1f]/.test(v);
const finiteJson=v=>typeof v==='number'?Number.isFinite(v):Array.isArray(v)?v.every(finiteJson):object(v)?Object.values(v).every(finiteJson):true;
export function audioExportFilename(value,format='wav'){
 if(!['wav','mp3'].includes(format))return null;
 if(typeof value!=='string'||!value.trim()||value.length>120||/[<>:"/\\|?*\x00-\x1f]/.test(value)||/[. ]$/.test(value))return null;
 const name=value.trim();
 if(name==='.'||name==='..'||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name))return null;
 const filename=name.toLowerCase().endsWith('.'+format)?name:name.includes('.')?null:name+'.'+format;
 return filename&&filename.length<=120?filename:null;
}
export function audioExportBytes(durationSeconds,format='wav'){return format==='mp3'?Math.ceil(durationSeconds*128000/8):format==='wav'?44+Math.ceil(durationSeconds*44100)*4:NaN;}
const supportedSource=value=>!drumById(value)?.retired&&(['primitive','melody','bass'].includes(value)||Boolean(beginnerById(value)||drumById(value)||vocalById(value)));
function validDescriptor(d){
 return object(d)&&finiteJson(d)&&validBeatExecutionDescriptor(d)&&typeof d.key==='string'&&typeof d.owner==='string'&&Number.isFinite(d.durationSeconds)&&d.durationSeconds>0&&Number.isSafeInteger(audioExportBytes(d.durationSeconds))&&Array.isArray(d.parts)&&d.parts.length>0&&d.parts.every(p=>
  object(p)&&id(p.id)&&supportedSource(p.id)&&Number.isFinite(p.loopSeconds)&&p.loopSeconds>0&&(p.vocal===undefined||object(p.vocal))&&(!vocalById(p.id)||object(p.vocal)&&vocalById(p.id).voiceId===(p.voiceId===undefined?DEFAULT_VOICE_ID:p.voiceId))&&
  (p.windows===undefined||Array.isArray(p.windows)&&p.windows.length>0&&p.windows.every(w=>object(w)&&Number.isFinite(w.startBar)&&w.startBar>=0&&Number.isFinite(w.bars)&&w.bars>0&&Number.isFinite(w.sourceBar)&&w.sourceBar>=0)));
}
const nameKey=v=>v.normalize('NFC').toLowerCase();
function validFile(f,trackVersions,fileSystem){
 const format=f?.format??'wav';
 if(f?.version!==1||!id(f.id)||!id(f.projectId)||!Object.hasOwn(AUDIO_EXPORT_KINDS,f.kind)||!pcFolderExists({fileSystem},f.folderId)||audioExportFilename(f.filename,format)!==f.filename||!Number.isFinite(f.createdAtMinute)||f.createdAtMinute<0||!object(f.sourceRevision)||typeof f.sourceRevision.beat!=='string'||!finiteJson(f.sourceRevision)||!validDescriptor(f.descriptor)||f.bytes!==audioExportBytes(f.descriptor.durationSeconds,format))return false;
 const backingParts=f.descriptor.backingParts??0;if(!Number.isSafeInteger(backingParts)||backingParts<0||backingParts>=f.descriptor.parts.length)return false;
 const vocals=f.descriptor.parts.filter(p=>p.vocal),newVocals=f.descriptor.parts.slice(backingParts).filter(p=>p.vocal);
 if(f.kind!=='beat'&&!newVocals.every(p=>vocalById(p.id)?.voiceId===(f.voiceId===undefined?DEFAULT_VOICE_ID:f.voiceId)))return false;
 if(f.kind==='beat')return vocals.length===0&&f.trackVersionId===null;
 if(f.kind==='vocal')return vocals.length===f.descriptor.parts.length&&f.trackVersionId===null;
 const version=trackVersions?.byId?.[f.trackVersionId];
 return vocals.length>0&&version?.trackId===f.projectId&&canonicalTrackSignature(version.recipe?.descriptor)===canonicalTrackSignature(f.descriptor)&&canonicalTrackSignature(version.sourceRevision)===canonicalTrackSignature(f.sourceRevision);
}
export function normalizeAudioExports(raw,trackVersions,{fileSystem}={}){
 const files=[],recovery=(Array.isArray(raw?.recovery)?raw.recovery:[]).map(clone),ids=new Set(),names=new Set();
 if(raw!=null&&raw.version!==1){recovery.push({id:'audioExports',reason:'Неподдерживаемый архив аудиофайлов. Исходные данные сохранены.',recoveryData:clone(raw)});return {version:1,files,recovery};}
 if(raw?.files!=null&&!Array.isArray(raw.files))recovery.push({id:'audioExports.files',reason:'Повреждён список аудиофайлов. Исходные данные сохранены.',recoveryData:clone(raw.files)});
 for(const file of Array.isArray(raw?.files)?raw.files:[]){
  const key=typeof file?.filename==='string'?file.folderId+':'+nameKey(file.filename):'';
  if(!validFile(file,trackVersions,fileSystem)||ids.has(file.id)||names.has(key)){
   recovery.push({id:file?.id??'audio-file',reason:'Повреждённый аудиофайл или занятое имя. Исходные данные сохранены.',recoveryData:clone(file)});continue;
  }
  ids.add(file.id);names.add(key);files.push(clone(file));
 }
 return {version:1,files,recovery};
}
function revision(beat){let hash=2166136261;for(const c of canonicalTrackSignature(beat))hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;return {beat:hash.toString(16).padStart(8,'0'),lyrics:beat.recording?.text.revision??null,vocal:beat.recording?.revision??null};}
export function createAudioExport(state,{id:fileId,projectId,kind,format='wav',folderId,filename,nowMinute}={}){
 const fail=reason=>({ok:false,state,fileId:null,reason});
 if(!id(fileId)||!Object.hasOwn(AUDIO_EXPORT_KINDS,kind))return fail('Укажи вид аудиофайла и его идентификатор.');
 if(!pcFolderExists(state,folderId))return fail('Выбери доступную папку виртуального диска.');
 const name=audioExportFilename(filename,format);if(!name)return fail('Укажи безопасное имя файла WAV или MP3 без пути и служебных символов.');
 if(!Number.isFinite(nowMinute)||nowMinute<0)return fail('Не удалось определить игровое время.');
 const archive=state.audioExports??{version:1,files:[],recovery:[]};
 if(pcFileEntries(state,{folderId}).some(f=>nameKey(f.filename)===nameKey(name))||archive.files.some(f=>f.id===fileId||f.folderId===folderId&&nameKey(f.filename)===nameKey(name))||folderId==='projects'&&state.projects?.some(p=>typeof p.name==='string'&&nameKey(p.name)===nameKey(name)))return fail('Такое имя или идентификатор уже существует. Выбери другое имя.');
 const raw=state.projects?.find(p=>p.id===projectId&&p.kind==='beat');if(raw?.recoveryIssue)return fail(raw.recoveryIssue);
 const beat=normalizeBeat(raw);if(!beat||beat.status!=='ready')return fail('Для экспорта сначала закончи бит.');
 const playback=resolveBeatPlayback(beat);if(!playback.ok)return fail(playback.reason);
 if(kind==='beat'&&beat.audioBacking?.descriptor.parts.some(p=>p.vocal))return fail('Фонограмма содержит готовый вокал. Отдельные исходные дорожки из неё получить нельзя.');
 if(kind!=='beat'&&!playback.descriptor.parts.some(p=>p.vocal))return fail('Сначала запиши вокал в этом проекте.');
 let next=state,trackVersionId=null,sourceRevision=revision(beat),descriptor;
 if(kind==='track'){
  const captured=captureTrackVersion(state,{projectId,nowMinute});if(!captured.ok)return fail(captured.reason);
  next=captured.state;trackVersionId=captured.versionId;const version=next.trackVersions.byId[trackVersionId];descriptor=clone(version.recipe.descriptor);sourceRevision=clone(version.sourceRevision);
 }else{
  descriptor=clone(playback.descriptor);descriptor.parts=descriptor.parts.filter((p,i)=>kind==='vocal'?Boolean(p.vocal)&&i>=(descriptor.backingParts??0):!p.vocal);delete descriptor.backingParts;
 }
 const bytes=audioExportBytes(descriptor.durationSeconds,format);if(softwareDiskBytes(state).free<bytes)return fail('Недостаточно места на виртуальном диске для аудиофайла.');
 const file={version:1,id:fileId,projectId,kind,format,...(kind!=='beat'?{voiceId:beat.recording.voiceId??DEFAULT_VOICE_ID}:{}),folderId,filename:name,createdAtMinute:nowMinute,bytes,descriptor,sourceRevision,trackVersionId};
 return {ok:true,state:{...next,audioExports:{...archive,files:[...archive.files,file]}},fileId,reason:''};
}
