import {pcFileById} from './pc-filesystem.js?rev=61';
import {normalizeAudioBacking} from './pc-audio-backing.js?rev=61';
import {normalizeBeat} from './beat-production.js?rev=61';
import {createBeatMix} from './beat-mix.js?rev=61';
import {softwareDiskBytes} from './pc-software.js?rev=61';
export function importAudioBacking(state,{fileId,projectId,name,nowMinute}={}){
 const fail=reason=>({ok:false,state,projectId:null,reason}),entry=pcFileById(state,fileId),file=state.audioExports?.files.find(f=>f.id===(entry?.audioExportId??fileId));
 if(!file||!['wav','mp3'].includes(entry?.type))return fail('Выбери сохранённый WAV или MP3.');
 if(typeof projectId!=='string'||!projectId.trim()||projectId.length>100||state.projects.some(p=>p.id===projectId)||typeof name!=='string'||!name.trim()||name.trim().length>64||!Number.isFinite(nowMinute)||nowMinute<0)return fail('Укажи название нового проекта.');
 if(state.music?.job||state.writing?.job||state.recording?.job)return fail('Сначала прерви текущую работу.');
 if(softwareDiskBytes(state).free<2000000)return fail('Недостаточно места для проекта.');
 const audioBacking=normalizeAudioBacking({version:1,fileId:file.id,filename:file.filename,descriptor:file.descriptor});if(!audioBacking)return fail('Аудиофайл повреждён.');
 // The catalog recipe remains the immutable source of the single backing lane.
 // Placeholder stage metadata is not used as newly earned production evidence.
 const beat=normalizeBeat({version:2,kind:'beat',id:projectId,name:name.trim(),genre:'experimental',drumId:'primitive',mix:createBeatMix(projectId,{}),stages:Array.from({length:3},()=>({sliders:[5,5,5],fit:0,quality:0})),audioBacking});
 if(!beat)return fail('Не удалось прочитать фонограмму.');
 return {ok:true,projectId,state:{...state,projects:[...state.projects,beat],music:{...state.music,activeBeatId:projectId},documentSessions:{version:1,...state.documentSessions,byApp:{...state.documentSessions?.byApp,'ft-studio':{projectId,fileId:null}}}},reason:''};
}
