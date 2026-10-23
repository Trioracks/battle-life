import {pcFileEntries} from './pc-filesystem.js?rev=57';
import {normalizeLyric} from './lyric-production.js?rev=57';
import {normalizeBeat} from './beat-production.js?rev=57';
import {normalizeTrackVersions} from './track-version.js?rev=57';
import {normalizeAudioExports} from './pc-audio-exports.js?rev=57';
export const mentorDownloadBytes=file=>file?.exported?.file?.bytes??file?.bytes??0;
export function completeMentorDownload(state,item){
 const g=state.social?.goblin,file=g?.files.find(f=>f.id===item.attachmentId),fail=reason=>({ok:false,state,reason});if(!file)return fail('attachment-unavailable');
 if(g.downloaded?.[file.id])return {ok:true,state,fileId:g.downloaded[file.id]};
 const id='download:'+file.id,folderId='downloads',files=pcFileEntries(state,{folderId}),safe=file.exported?.file.filename??file.filename;
 const dot=safe.lastIndexOf('.'),stem=safe.slice(0,dot),ext=safe.slice(dot);let filename=safe;
 for(let n=1;files.some(f=>f.filename.toLocaleLowerCase('ru')===filename.toLocaleLowerCase('ru'));n++)filename=stem.slice(0,100)+' ('+n+')'+ext;
 let next=state;
 if(file.exported){
  const version=normalizeTrackVersions({byId:{[file.exported.version?.id]:file.exported.version}}).byId[file.exported.version?.id];if(!version)return fail('attachment-unavailable');
  const audio={...structuredClone(file.exported.file),id,filename,folderId,createdAtMinute:item.startedAtMinute},versions={...state.trackVersions,byId:{...state.trackVersions?.byId,[version.id]:version}};
  if(normalizeAudioExports({version:1,files:[audio]},versions,{fileSystem:state.fileSystem}).files.length!==1)return fail('attachment-unavailable');
  next={...state,trackVersions:versions,audioExports:{...state.audioExports,files:[...state.audioExports.files,audio]}};
 }else{
  const type=file.kind==='lyrics'?'txt':'flp',snapshot=type==='txt'?normalizeLyric(file.project):normalizeBeat(file.project);if(!snapshot||snapshot.audioIssue)return fail('attachment-unavailable');
  const document={id,type,filename,folderId,projectId:snapshot.id,snapshot:structuredClone(snapshot),source:'document',bytes:mentorDownloadBytes(file),createdAtMinute:item.startedAtMinute,modifiedAtMinute:item.startedAtMinute,mentorFileId:file.id};
  next={...state,fileSystem:{...state.fileSystem,files:[...state.fileSystem.files,document]}};
 }
 return {ok:true,fileId:id,state:{...next,social:{...next.social,goblin:{...g,downloaded:{...g.downloaded,[file.id]:id}}}}};
}
