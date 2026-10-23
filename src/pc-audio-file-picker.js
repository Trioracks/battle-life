import {pcElement as el,pcButton as button,pcFocusable} from './virtual-pc-dom.js?rev=43';
import {AUDIO_EXPORT_FOLDERS,AUDIO_EXPORT_KINDS,normalizeAudioExports} from './pc-audio-exports.js?rev=57';
import {EXPLORER_PATHS} from './virtual-pc-explorer.js?rev=57';
import {gameDateTimeLabel} from './home-calendar.js?rev=43';

export function mountAudioFilePicker(root,{getState,onSelect,onClose=()=>{},describe=()=>''}){
 const d=root.ownerDocument,box=el(d,'section',{className:'pc-audio-picker',attributes:{role:'dialog','aria-modal':'true','aria-label':'Прикрепить трек'}}),folder=el(d,'select',{attributes:{'aria-label':'Папка аудиофайла'}}),list=el(d,'div',{className:'pc-audio-picker-files'}),details=el(d,'p',{className:'pc-audio-picker-details'}),status=el(d,'p',{attributes:{role:'status'}}),actions=el(d,'div',{className:'pc-dialog-actions'});
 let selected=null,signature='',files=[],disposed=false;
 for(const value of AUDIO_EXPORT_FOLDERS)folder.append(el(d,'option',{value,text:EXPLORER_PATHS[value].address}));folder.value='exports';
 const attach=button(d,'Прикрепить выбранный трек',{},()=>{
  if(attach.disabled)return;const result=onSelect(selected);if(result?.ok===false){status.textContent=result.reason;return;}onClose();
 });
 actions.append(attach,button(d,'Отмена',{},onClose));box.append(el(d,'h2',{text:'Выбор аудиофайла'}),folder,el(d,'small',{text:'Выбери полный трек WAV. Передача займёт около 2 секунд; отправить работу можно после загрузки.'}),list,details,status,actions);root.replaceChildren(box);
 // The dialog owns keyboard and pointer input while its sibling content is inert.
 const siblings=[...(root.parentElement?.children??[])].filter(n=>n!==root).map(n=>({node:n,inert:n.inert}));for(const {node}of siblings)node.inert=true;
 function selection(){
  const file=files.find(f=>f.id===selected&&f.folderId===folder.value);for(const row of list.children)if(row.dataset.fileId)row.setAttribute('aria-pressed',String(row.dataset.fileId===selected));
  attach.disabled=!file||file.kind!=='track';
  details.textContent=file?AUDIO_EXPORT_KINDS[file.kind]+' · '+file.bytes+' байт · '+file.descriptor.durationSeconds.toFixed(2)+' сек. · создан '+gameDateTimeLabel(file.createdAtMinute)+' · версия '+(file.trackVersionId??file.sourceRevision.beat)+' '+describe(file):'Сначала экспортируй полный трек в FT Studio и выбери сохранённый файл.';
 }
 function update(){
  if(disposed)return;const state=getState(),next=JSON.stringify([state.audioExports,state.projects?.map(p=>({id:p.id,name:p.name})),folder.value]);if(next===signature)return;signature=next;
  files=normalizeAudioExports(state.audioExports,state.trackVersions).files;const focus=d.activeElement?.dataset?.fileId;list.replaceChildren();
  for(const file of files.filter(f=>f.folderId===folder.value)){
   const row=button(d,'Выбрать: '+file.filename,{dataset:{fileId:file.id}},()=>{selected=file.id;status.textContent='';selection();});row.disabled=file.kind!=='track';list.append(row,el(d,'small',{text:AUDIO_EXPORT_KINDS[file.kind]+' · '+(file.bytes/1000000).toFixed(2)+' МБ'+(file.kind==='track'?'':' · для сдачи нужен полный трек')}));
  }
  if(folder.value==='projects')for(const project of state.projects??[]){const row=button(d,project.name??project.id,{},()=>{});row.disabled=true;list.append(row,el(d,'small',{text:'Проект FT Studio · сначала экспортируй полный трек WAV'}));}
  if(!list.children.length)list.append(el(d,'p',{text:'В этой папке нет аудиофайлов. Сначала экспортируй полный трек в FT Studio.'}));
  if(!files.some(f=>f.id===selected&&f.folderId===folder.value))selected=null;selection();if(focus)pcFocusable(list).find(n=>n.dataset.fileId===focus)?.focus();
 }
 const change=()=>{selected=null;status.textContent='';update();};folder.addEventListener('change',change);
 const keydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}else if(e.key==='Tab'){const items=pcFocusable(box),i=items.indexOf(d.activeElement);e.preventDefault();e.stopPropagation();items[(i+(e.shiftKey?-1:1)+items.length)%items.length]?.focus();}};
 root.addEventListener('keydown',keydown);update();folder.focus();
 return {update,dispose(){disposed=true;root.removeEventListener('keydown',keydown);folder.removeEventListener('change',change);for(const {node,inert}of siblings)node.inert=inert;root.replaceChildren();}};
}
