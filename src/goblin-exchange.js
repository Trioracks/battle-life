import {pcFileById,savePcDocument} from './pc-filesystem.js?rev=59';
import {GOBLIN_ID,GOBLIN_SKILLS,GOBLIN_DIALOGUE,normalizeGoblin} from './goblin-catalog.js?rev=59';
import {queueGoblinAttachment} from './goblin-mentor.js?rev=59';
import {normalizeLyric,startLyricWork,advanceLyricWork} from './lyric-production.js?rev=59';
import {normalizeBeat,createBeat,startBeatStage,advanceBeatWork} from './beat-production.js?rev=59';
import {normalizeRecording} from './vocal-result.js?rev=59';
import {chooseSongForm} from './beat-song-form.js?rev=59';
import {createAudioExport} from './pc-audio-exports.js?rev=59';
import {softwareDiskBytes} from './pc-software.js?rev=59';
import {validGameMinute} from './game-minute.js?rev=59';
const clone=structuredClone;
const fail=(state,reason)=>({ok:false,state,reason});
function write(state,g){return {...state,social:{...state.social,goblin:g}};}
const busy=state=>state.music?.job||state.writing?.job||state.recording?.job;
const day=now=>Math.floor(now/1440)+1;
function studio(state){
 return {...state,projects:[],audioExports:{version:1,files:[],recovery:[]},trackVersions:{byId:{},recovery:[]},
  creativeWork:null,rapAnalysis:null,rapResearch:null,
  music:{...state.music,practice:0,job:null,needs:{satiety:100,energy:100},genres:{version:1,chosen:[],primary:null,xp:{experimental:25}}},
  writing:{practice:0,job:null,activeTextId:null},recording:{practice:{flow:0,sound:0},job:null}};
}
export function exportLyricFile(input,projectId,now){
 const p=normalizeLyric(input.projects?.find(p=>p.id===projectId));
 if(!validGameMinute(now)||!p||p.status!=='ready')return fail(input,'Для экспорта нужен готовый текст.');
 const g=normalizeGoblin(input.social?.goblin),id='text-file:'+p.id+':'+p.revision;
 const previous=g.files.find(f=>f.author==='player'&&f.kind==='lyrics'&&f.project?.id===p.id&&f.project?.revision===p.revision);
 if(previous)return {ok:true,state:input,fileId:previous.id,reason:'Эта версия уже сохранена.'};
 const filename=p.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')+'.v'+p.revision+'.rap.txt';
 const saved=savePcDocument(input,{projectId,folderId:'documents',filename:p.name.replace(/[<>:"/\\|?*]/g,'_')+'.txt',nowMinute:now});if(!saved.ok)return saved;
 const file={id:saved.fileId,kind:'lyrics',filename:saved.state.fileSystem.files.find(f=>f.id===saved.fileId).filename,folderId:'documents',createdAtMinute:now,author:'player',project:clone(p),bytes:0};g.files.push(file);
 return {ok:true,state:write(saved.state,g),fileId:saved.fileId,reason:'Текст сохранён. Можно отправить Гоблину.'};
}
function improvedText(input,p,now){
 const id='goblin-edit-'+p.id,skills={...GOBLIN_SKILLS};
 let s=studio(input);
 // Same seed/theme/content, recreated stages; original stays untouched.
 const base=normalizeLyric({...clone(p),id,name:(p.name+' · правки Гоблина').slice(0,64),revision:p.revision+1,stages:[],sections:[],revisionHistory:[],adaptation:null,adaptationCount:0,additions:[],updatedDay:day(now)});
 delete base.productionOutcome;
 s.projects=[base];
 for(let i=0;i<3;i++){
  s.writing.practice=0;s.music.needs={satiety:100,energy:100};
  skills.writing=Math.max(25,p.stages[i]?.skill??0);
  let r=startLyricWork(s,{projectId:id,sliders:[8,8,6],gameDay:day(now)},skills,()=>.5);
  if(!r.ok)throw Error(r.reason);
  s=advanceLyricWork(r.state,600).state;
 }
 const text=s.projects.find(p=>p.id===id);
 // A skilled player's stronger lines remain the stronger version.
 const oldQuality=p.stages.reduce((sum,s)=>sum+s.quality,0),newQuality=text.stages.reduce((sum,s)=>sum+s.quality,0);
 return oldQuality>newQuality?normalizeLyric({...clone(p),id,name:base.name,revision:p.revision+1}):text;
}
function mentorBeat(input,now,source=null){
 if(source?.audioBacking)return {...clone(source),id:'goblin-edit-'+source.id,name:(source.name+' · правки Гоблина').slice(0,64)};
 let s=studio(input),r=createBeat(s,{id:'goblin-first-beat',name:'Гоблин · первый совместный',genre:'experimental',gameDay:day(now)},GOBLIN_SKILLS,()=>.43);
 if(!r.ok)throw Error(r.reason);s=r.state;
 if(source){s.projects=[normalizeBeat({...clone(source),id:'goblin-first-beat',name:(source.name+' · правки Гоблина').slice(0,64),stages:[],recording:null,songForm:undefined,mix:source.mix?.version===2?{...clone(source.mix),layers:[null,null,null]}:source.mix})];}
 for(let i=0;i<3;i++){
  s.music.practice=0;s.music.genres.xp.experimental=25;s.music.needs={satiety:100,energy:100};
  r=startBeatStage(s,'goblin-first-beat',[8,8,6],GOBLIN_SKILLS,()=>.43);
  if(!r.ok)throw Error(r.reason);s=advanceBeatWork(r.state,600).state;
 }
 const reworked=s.projects.find(p=>p.id==='goblin-first-beat');
 if(source)for(let i=0;i<3;i++)if(source.stages[i].quality>reworked.stages[i].quality){reworked.stages[i]=clone(source.stages[i]);if(reworked.mix?.version===2&&source.mix?.version===2)reworked.mix.layers[i]=clone(source.mix.layers[i]);}
 return reworked;
}
export function sendGoblinFile(input,fileId,now){
 if(!validGameMinute(now))return fail(input,'Не удалось определить игровое время.');
 const g=normalizeGoblin(input.social?.goblin),savedFile=pcFileById(input,fileId),lyric=savedFile?.type==='txt'?{project:savedFile.snapshot}:g.files.find(f=>f.id===fileId&&f.author==='player'&&f.kind==='lyrics');
 const audio=input.audioExports?.files?.find(f=>f.id===fileId&&['beat','track'].includes(f.kind));
 const projectFile=savedFile?.type==='flp'?savedFile:null,kind=lyric?'text':projectFile?'project':audio?.kind;
 if(!kind)return fail(input,'Выбери экспортированный текст, бит или полный трек.');
 if(!input.battleApplications?.some(a=>a.battleId==='makarevich-1'))return fail(input,'Сначала зарегистрируйся на Макаревич Battle в сообщениях группы. Подписка и заявка — разные вещи.');
 const stages={text:['text'],beat:['beat'],project:['beat-project'],track:['vocal']};
 if(!stages[kind].includes(g.stage)||g.sent[kind])return fail(input,'Сейчас друг ждёт другое вложение. Повторная помощь на этом этапе уже не нужна.');
 let project,exported=null,body;
 try{
  if(kind==='text'){
   const p=normalizeLyric(lyric.project);if(!p||p.status!=='ready')return fail(input,'Вложение текста повреждено.');
   project=improvedText(input,p,now);
   body=GOBLIN_DIALOGUE['return:text'];
  }else if(kind==='beat'){
   g.sent.beat=fileId;let state=queueGoblinAttachment(write(input,g),{key:'heard-beat',now,body:'Послушал. Хорошо, что начал) А скинь ещё FLP — сам проект. WAV или MP3 уже не разложить обратно на дорожки. В студии нажми «Сохранить» и прикрепи получившийся FLP.',nextStage:'waiting-beat'});state.social.goblin.pending.find(m=>m.id==='heard-beat').nextStage='beat-project';
   const dialog=clone(state.social.dialogs[GOBLIN_ID]);dialog.messages.push({id:'goblin:sent:beat',sender:'player',kind:'personal',at:now,body:'Вот мой бит, зацени!',exportId:fileId});state.social.dialogs[GOBLIN_ID]=dialog;return {ok:true,state,reason:''};
  }else if(kind==='project'){
   const original=input.audioExports.files.find(f=>f.id===g.sent.beat),source=normalizeBeat(projectFile.snapshot);if(!source||source.status!=='ready'||source.audioIssue||source.id!==original?.projectId)return fail(input,'Нужен сохранённый FLP именно того бита, который ты прислал.');
   project=mentorBeat(input,now,source);body=GOBLIN_DIALOGUE['return:beat'];
  }else{
   const version=input.trackVersions?.byId?.[audio.trackVersionId];
   project=normalizeBeat(version?.recipe?.beat);
   if(!project?.recording)return fail(input,'В экспортированном треке нет сохранённого вокала.');
   project={...clone(project),id:'goblin-mix-'+audio.id,name:(project.name+' · свёл Гоблин').slice(0,64)};
   const r=normalizeRecording(project.recording);
   r.mix={skill:Math.max(25,r.mix?.skill??0),gain:2};r.master={skill:Math.max(25,r.master?.skill??0),gain:2};r.revision++;
   project.recording=r;if(project.songFormVersion===1&&!project.songForm)project.songForm=chooseSongForm(project);
   let sandbox={...studio(input),projects:[project],trackVersions:input.trackVersions};
   const result=createAudioExport(sandbox,{id:'goblin-final-'+audio.id,projectId:project.id,kind:'track',folderId:'downloads',filename:'Гоблин - '+project.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')+'.wav',nowMinute:now});
   if(!result.ok)return fail(input,result.reason);
   exported={file:result.state.audioExports.files[0],version:result.state.trackVersions.byId[result.state.audioExports.files[0].trackVersionId]};
   body=GOBLIN_DIALOGUE['return:track'];
  }
 }catch(e){return fail(input,e.message||'Не удалось подготовить ответ. Исходник сохранён.');}
 const id='goblin-return-'+kind;
 const response={id,kind:project.kind,requiresDownload:true,filename:project.name+(project.kind==='lyrics'?'.txt':'.flp'),folderId:'downloads',createdAtMinute:now+20,author:GOBLIN_ID,project,exported};
 response.bytes=project.kind==='beat'&&!exported?2000000:new TextEncoder().encode(JSON.stringify(response)).length;
 if(softwareDiskBytes(input).free<response.bytes)return fail(input,'Недостаточно места для ответного вложения. Освободи виртуальный диск.');
 g.files.push(response);g.sent[kind]=fileId;
 const social={...input.social,goblin:g,dialogs:{...input.social?.dialogs}};
 const dialog=clone(social.dialogs[GOBLIN_ID]??{peer:{kind:'person',id:GOBLIN_ID},messages:[],unread:false});
 dialog.messages.push({id:'goblin:sent:'+kind,sender:'player',kind:'personal',at:now,body:kind==='text'?'Чувак, вот мой текст. Глянешь?':kind==='beat'?'Вот мой бит, зацени!':'Братан, вот с моим голосом получилось.',fileId,exportId:audio?.id,...(savedFile?.snapshot?{attachmentSnapshot:{type:savedFile.type,filename:savedFile.filename,snapshot:clone(savedFile.snapshot)}}:{})});
 social.dialogs[GOBLIN_ID]=dialog;
 // Advance only when the reply arrives, not while it is still pending.
 let state=queueGoblinAttachment({...input,social},{key:'return:'+kind,now,body,fileId:id,nextStage:'waiting-'+kind});
 const next={text:'beat',project:'vocal',track:'finished'}[kind];
 state.social.goblin.pending.find(m=>m.id==='return:'+kind).nextStage=next;
 return {ok:true,state,reason:''};
}
export function importGoblinFile(input,fileId,now){
 const g=normalizeGoblin(input.social?.goblin),f=g.files.find(f=>f.id===fileId);
 if(!f||!validGameMinute(now)||f.createdAtMinute>now||f.requiresDownload&&!g.downloaded?.[fileId])return fail(input,'Вложение ещё не получено.');
 const app=f.kind==='lyrics'?'notebook':'ft';
 if(!input.software?.[app]?.installed)return fail(input,'Сначала установи '+(app==='ft'?'FT Studio.':'Рэпблокнот.'));
 const p=f.kind==='lyrics'?normalizeLyric(f.project):normalizeBeat(f.project);
 if(!p||p.audioIssue)return fail(input,'Проект вложения недоступен. Исходные данные не изменены.');
 if(busy(input))return fail(input,'Сначала заверши текущую работу, затем открой вложение.');
 const id=g.received[fileId]??'import-'+fileId;
 const existing=input.projects?.find(p=>p.id===id);
 const required=existing?0:2000000+(f.exported?.file?.bytes??0);
 if(softwareDiskBytes(input).free<required)return fail(input,'Недостаточно места на виртуальном диске.');
 const imported=existing??{...clone(p),id};
 let state={...input,projects:existing?input.projects:[...input.projects,imported]};
 g.received[fileId]=id;state=write(state,g);
 if(p.kind==='lyrics')state.writing={...state.writing,activeTextId:id};
 else state.music={...state.music,activeBeatId:id};
 // Re-export the imported final project through the ordinary immutable export
 // path, so submission validation sees the actual project and version identity.
 if(f.exported&&!state.audioExports.files.some(a=>a.id==='received-'+fileId)){
  const result=createAudioExport(state,{id:'received-'+fileId,projectId:id,kind:'track',folderId:'downloads',filename:'От Гоблина - '+p.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')+'.wav',nowMinute:now});
  if(!result.ok)return fail(input,result.reason);state=result.state;
 }
 return {ok:true,state,projectId:id,appId:app==='ft'?'ft-studio':'rap-notebook',reason:f.exported?'Сведённый WAV сохранён в «Загрузках». Его можно отправить на баттл.':'Проект открыт. Переключись на '+(app==='ft'?'FT Studio.':'Рэпблокнот.')};
}
