import {pcElement as el,pcButton as button} from './virtual-pc-dom.js?rev=59';
import {AUDIO_EXPORT_KINDS} from './pc-audio-exports.js?rev=59';
import {mountPcFilePicker} from './pc-file-picker-view.js?rev=59';
import {startExportJob,cancelExportJob} from './pc-export-job.js?rev=59';
import {EXPLORER_PATHS} from './virtual-pc-explorer.js?rev=59';
import {gameDateTimeLabel} from './home-calendar.js?rev=59';

export function mountAudioExport(root,{getState,projectId,getMetadata=()=>({}),onCommit,onClose=()=>{}}){
 const d=root.ownerDocument,form=el(d,'form'),kind=el(d,'select',{attributes:{'aria-label':'Вид аудиофайла'}}),format=el(d,'select',{attributes:{'aria-label':'Формат аудиофайла'}}),notice=el(d,'p',{className:'ft-warning',attributes:{role:'status'}}),facts=el(d,'p',{className:'ft-production-note'}),progress=el(d,'section',{className:'ft-export-progress',attributes:{'aria-label':'Экспорт аудио'}}),bar=el(d,'progress'),percent=el(d,'strong'),filename=el(d,'p');
 let disposed=false,picker=null,pickerRoot=null,ownJob=getState().exportJob?.id??null,fileId=getState().exportJob?.file.id??null,closed=false;
 for(const [value,text]of Object.entries(AUDIO_EXPORT_KINDS))kind.append(el(d,'option',{value,text}));for(const value of ['wav','mp3'])format.append(el(d,'option',{value,text:value.toUpperCase()}));
 kind.value=getState().projects.find(p=>p.id===projectId)?.recording?.draft?'track':'beat';format.value='wav';bar.max=5;
 function commit(next){try{const r=onCommit(next);return r!==false&&r?.ok!==false;}catch{return false;}}
 function closePicker(){picker?.dispose();picker=null;pickerRoot?.remove();pickerRoot=null;}
 function choose(){
  if(disposed||getState().exportJob)return;closePicker();pickerRoot=el(d,'div',{className:'ft-export-picker'});root.append(pickerRoot);
  const beat=getState().projects.find(p=>p.id===projectId);
  picker=mountPcFilePicker(pickerRoot,{getState,mode:'export',types:[format.value],initialFolderId:'exports',suggestedName:(beat?.name??'Трек').replace(/[<>:"/\\|?*]/g,'_')+'.'+format.value,onChange:onCommit,onCancel:closePicker,onSelect:value=>{
   const r=startExportJob(getState(),{jobId:globalThis.crypto?.randomUUID?.()??'render-'+Date.now(),projectId,kind:kind.value,format:format.value,folderId:value.folderId,filename:value.filename,nowMinute:getMetadata().gameMinutes??getState().lastGameMinute??0});
   if(!r.ok)return r;if(!commit(r.state))return {ok:false,reason:'Не удалось сохранить задание экспорта. Повтори попытку.'};ownJob=r.state.exportJob.id;fileId=r.state.exportJob.file.id;closePicker();update();return {ok:true};
  }});
 }
 const field=(text,input)=>{const label=el(d,'label',{className:'pc-field',text});label.append(input);return label;};
 const exportButton=button(d,'Экспортировать',{className:'ft-primary'},choose);form.append(field('Экспортировать',kind),field('Формат',format),facts,exportButton,notice,button(d,'Отмена',{},()=>onClose()));
 progress.append(el(d,'h3',{text:'Рендеринг аудио'}),filename,bar,percent,button(d,'Отменить экспорт',{},()=>{if(commit(cancelExportJob(getState()).state))onClose();}));root.append(form,progress);
 function update(){
  if(disposed)return;picker?.update();const s=getState(),job=s.exportJob,beat=s.projects.find(p=>p.id===projectId),ours=job&&job.id===ownJob;form.hidden=Boolean(ours);progress.hidden=!ours;
  for(const option of kind.children)option.disabled=option.value!=='beat'&&!beat?.recording?.draft;
  facts.textContent=format.value==='mp3'?'MP3 · 128 кбит/с · 44,1 кГц · стерео · исходник 16 бит':'WAV · 44,1 кГц · 16 бит · стерео';
  exportButton.disabled=Boolean(job);notice.textContent=job&&!ours?'Другой экспорт ещё не завершён.':'';
  if(ours){bar.value=job.elapsedSeconds;percent.textContent=Math.floor(job.elapsedSeconds/5*100)+'%';filename.textContent=job.file.filename+' · '+job.file.bytes+' байт';if(job.error)percent.textContent=job.error;}
  else if(fileId&&s.audioExports.files.some(f=>f.id===fileId)&&!closed){closed=true;onClose(fileId);}
 }
 const submit=e=>{e.preventDefault();choose();};form.addEventListener('submit',submit);format.addEventListener('change',update);update();
 return {update,dispose(){disposed=true;closePicker();form.removeEventListener('submit',submit);format.removeEventListener('change',update);form.remove();progress.remove();}};
}

export function mountAudioFilePlayer(root,{audio}){
 const d=root.ownerDocument,node=el(d,'section',{className:'pc-audio-player',attributes:{'aria-label':'Аудиоплеер'}}),title=el(d,'strong'),facts=el(d,'small'),status=el(d,'span',{attributes:{role:'status'}}),controls=el(d,'div');let file=null,disposed=false,generation=0;
 async function play(){
  if(!file||disposed||audio?.capabilities?.recordedPlayback===false)return;const token=++generation;status.textContent='Загрузка звука…';
  let ok=false;try{ok=await audio?.playDescriptor(file.descriptor);}catch{/* Present the playback error locally. */}
  if(disposed||token!==generation)return;status.textContent=ok?'Играет':audio?.getSnapshot?.().error||'Не удалось воспроизвести аудиофайл.';update();
 }
 const start=button(d,'▶ Слушать файл',{},play),pause=button(d,'Ⅱ Пауза файла',{},()=>{generation++;audio?.pause();update();}),stop=button(d,'■ Стоп файла',{},()=>{generation++;audio?.stop();update();});
 controls.append(start,pause,stop);node.append(title,facts,controls,status);node.hidden=true;root.append(node);
 function update(){
  if(!file||disposed)return;const snapshot=audio?.getSnapshot?.()??{status:'stopped'};
  if(audio?.capabilities?.recordedPlayback===false){start.disabled=pause.disabled=stop.disabled=true;status.textContent=audio.capabilities.reason;return;}
  start.disabled=['loading','playing'].includes(snapshot.status);pause.disabled=!['loading','playing'].includes(snapshot.status);stop.disabled=!['loading','playing','paused'].includes(snapshot.status);
  if(snapshot.status==='playing')status.textContent='Играет';else if(snapshot.status==='paused')status.textContent='Пауза';else if(snapshot.status==='error')status.textContent=snapshot.error;else if(snapshot.status==='stopped')status.textContent='Остановлено';
 }
 return {open(next){if(disposed)return;generation++;audio?.stop();file=next;node.hidden=false;title.textContent=file.filename;facts.textContent=AUDIO_EXPORT_KINDS[file.kind]+' · '+gameDateTimeLabel(file.createdAtMinute)+' · версия '+(file.trackVersionId??file.sourceRevision.beat);if(audio?.capabilities?.recordedPlayback===false)update();else void play();},update,dispose(){if(disposed)return;disposed=true;generation++;audio?.stop();node.remove();}};
}
