import {pcElement as el,pcButton as button} from './virtual-pc-dom.js?rev=42';
import {AUDIO_EXPORT_FOLDERS,AUDIO_EXPORT_KINDS,createAudioExport} from './pc-audio-exports.js?rev=42';
import {EXPLORER_PATHS} from './virtual-pc-explorer.js?rev=42';
import {gameDateTimeLabel} from './home-calendar.js?rev=42';

export function mountAudioExport(root,{getState,projectId,getMetadata=()=>({}),onCommit,onClose=()=>{}}){
 const d=root.ownerDocument,form=el(d,'form'),kind=el(d,'select',{attributes:{'aria-label':'Вид аудиофайла'}}),folder=el(d,'select',{attributes:{'aria-label':'Папка экспорта'}}),name=el(d,'input',{attributes:{'aria-label':'Имя аудиофайла',maxlength:'120'}}),notice=el(d,'p',{className:'ft-warning',attributes:{role:'status'}}),availability=el(d,'p',{className:'ft-production-note'});
 let disposed=false,source=null;
 for(const [value,text]of Object.entries(AUDIO_EXPORT_KINDS))kind.append(el(d,'option',{value,text}));
 for(const value of AUDIO_EXPORT_FOLDERS)folder.append(el(d,'option',{value,text:EXPLORER_PATHS[value].address}));
 const beat=getState().projects.find(p=>p.id===projectId),hasVocal=Boolean(beat?.recording?.draft);
 kind.value=hasVocal?'track':'beat';folder.value='exports';name.value=(beat?.name??'Трек').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')+'.wav';
 function update(){
  if(disposed)return;const beat=getState().projects.find(p=>p.id===projectId);if(beat===source)return;source=beat;
  for(const option of kind.children)option.disabled=option.value!=='beat'&&!beat?.recording?.draft;
  availability.textContent=beat?.recording?.draft?'WAV · 44,1 кГц · 16 бит · стерео. Файл сохранит текущую версию проекта.':'Вокал и полный трек доступны после записи вокала. Можно экспортировать готовый бит.';
 }
 function save(){
  if(disposed)return;
  const meta=getMetadata(),nowMinute=Number.isFinite(meta.gameMinutes)?meta.gameMinutes:getState().lastGameMinute??0;
  const result=createAudioExport(getState(),{id:globalThis.crypto?.randomUUID?.()??'audio-'+Date.now(),projectId,kind:kind.value,folderId:folder.value,filename:name.value,nowMinute});
  if(!result.ok){notice.textContent=result.reason;return;}
  let durable;try{const committed=onCommit(result.state);durable=committed!==false&&committed?.ok!==false;}catch{durable=false;}
  if(!durable){notice.textContent='Не удалось сохранить аудиофайл. Файл не создан. Повтори попытку.';return;}
  onClose(result.fileId);
 }
 const field=(text,input)=>{const label=el(d,'label',{className:'pc-field',text});label.append(input);return label;};
 form.append(field('Экспортировать',kind),field('Папка виртуального диска',folder),field('Имя файла',name),availability,el(d,'p',{className:'ft-production-note',text:'Изменения проекта не изменят этот файл. Файлы доступны в «Моём компьютере».'}),button(d,'Сохранить аудиофайл',{className:'ft-primary'},save),notice,button(d,'Отмена',{},()=>onClose()));
 const submit=e=>{e.preventDefault();save();};form.addEventListener('submit',submit);root.append(form);update();
 return {update,dispose(){disposed=true;form.removeEventListener('submit',submit);form.remove();}};
}

export function mountAudioFilePlayer(root,{audio}){
 const d=root.ownerDocument,node=el(d,'section',{className:'pc-audio-player',attributes:{'aria-label':'Аудиоплеер'}}),title=el(d,'strong'),facts=el(d,'small'),status=el(d,'span',{attributes:{role:'status'}}),controls=el(d,'div');let file=null,disposed=false,generation=0;
 async function play(){
  if(!file||disposed)return;const token=++generation;status.textContent='Загрузка звука…';
  let ok=false;try{ok=await audio?.playDescriptor(file.descriptor);}catch{/* Present the playback error locally. */}
  if(disposed||token!==generation)return;status.textContent=ok?'Играет':audio?.getSnapshot?.().error||'Не удалось воспроизвести аудиофайл.';update();
 }
 const start=button(d,'▶ Слушать файл',{},play),pause=button(d,'Ⅱ Пауза файла',{},()=>{generation++;audio?.pause();update();}),stop=button(d,'■ Стоп файла',{},()=>{generation++;audio?.stop();update();});
 controls.append(start,pause,stop);node.append(title,facts,controls,status);node.hidden=true;root.append(node);
 function update(){
  if(!file||disposed)return;const snapshot=audio?.getSnapshot?.()??{status:'stopped'};
  start.disabled=['loading','playing'].includes(snapshot.status);pause.disabled=!['loading','playing'].includes(snapshot.status);stop.disabled=!['loading','playing','paused'].includes(snapshot.status);
  if(snapshot.status==='playing')status.textContent='Играет';else if(snapshot.status==='paused')status.textContent='Пауза';else if(snapshot.status==='error')status.textContent=snapshot.error;else if(snapshot.status==='stopped')status.textContent='Остановлено';
 }
 return {open(next){if(disposed)return;generation++;audio?.stop();file=next;node.hidden=false;title.textContent=file.filename;facts.textContent=AUDIO_EXPORT_KINDS[file.kind]+' · '+gameDateTimeLabel(file.createdAtMinute)+' · версия '+(file.trackVersionId??file.sourceRevision.beat);void play();},update,dispose(){disposed=true;generation++;audio?.stop();node.remove();}};
}
