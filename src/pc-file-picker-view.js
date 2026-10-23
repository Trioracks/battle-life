import {pcElement as el,pcButton as button,pcFocusable} from './virtual-pc-dom.js?rev=57';
import {explorerPaths,navigateExplorer,createExplorerState} from './virtual-pc-explorer.js?rev=57';
import {pcFileEntries,pcDocumentFilename,createPcFolder} from './pc-filesystem.js?rev=57';
export function mountPcFilePicker(root,{getState,mode='open',types,initialFolderId='documents',suggestedName='',filter=()=>true,onSelect,onCancel=()=>{},onChange}={}){
 const d=root.ownerDocument,save=['save','export'].includes(mode),label=save?'Сохранить':mode==='attach'?'Прикрепить':'Открыть';
 const box=el(d,'section',{className:'pc-file-picker',attributes:{role:'dialog','aria-modal':'true','aria-label':save?'Сохранить как':'Выбор файла'}}),folder=el(d,'select',{attributes:{'aria-label':'Папка файла'}}),address=el(d,'input',{attributes:{'aria-label':'Адрес папки файла'}}),list=el(d,'div',{className:'pc-picker-files'}),name=el(d,'input',{value:suggestedName,attributes:{'aria-label':'Имя файла',maxlength:'120'}}),notice=el(d,'p',{attributes:{role:'status'}});
 const search=el(d,'input',{value:'',attributes:{'aria-label':'Поиск файлов',placeholder:'Поиск в папке'}});
 let nav=createExplorerState(),selected=null,disposed=false,signature='',replaceTarget=null;nav={...nav,path:initialFolderId,history:[initialFolderId]};
 const go=path=>{nav=navigateExplorer(nav,{type:'navigate',path},getState());notice.textContent=nav.error;selected=null;update(true);};
 const submit=value=>{const result=onSelect?.(value);if(result?.ok===false){notice.textContent=result.reason??'Действие недоступно.';return false;}return true;};
 const replace=button(d,'Заменить файл',{},()=>{if(!replaceTarget)return;const current=pcFileEntries(getState(),{folderId:replaceTarget.folderId}).find(f=>f.id===replaceTarget.overwriteFileId&&f.filename.toLocaleLowerCase('ru')===replaceTarget.filename.toLocaleLowerCase('ru'));if(!current){notice.textContent='Файл изменился. Выбери его заново.';replace.hidden=true;return;}submit(replaceTarget);});replace.hidden=true;
 const choose=button(d,label,{},()=>{
  if(choose.disabled)return;let value=selected;
  if(save){const filename=pcDocumentFilename(name.value,types?.[0]);if(!filename){notice.textContent='Проверь имя и расширение файла.';return;}value={folderId:nav.path,filename};const collision=pcFileEntries(getState(),{folderId:nav.path}).find(f=>f.filename.normalize('NFC').toLocaleLowerCase('ru')===filename.toLocaleLowerCase('ru'));if(collision){replaceTarget={...value,overwriteFileId:collision.id};replace.hidden=false;notice.textContent='Файл уже существует. Заменить его?';replace.focus();return;}}
  submit(value);
 });
 const toolbar=el(d,'div',{className:'pc-picker-toolbar'}),up=button(d,'↑ Вверх',{},()=>{const parent=explorerPaths(getState())[nav.path]?.parent;if(parent)go(parent);});
 toolbar.append(up,folder,address,button(d,'Перейти',{},()=>go(address.value)));
 const folderName=el(d,'input',{attributes:{'aria-label':'Имя новой папки',placeholder:'Новая папка'}}),newFolder=button(d,'Создать папку',{},()=>{const r=createPcFolder(getState(),{id:'folder:'+(globalThis.crypto?.randomUUID?.()??Date.now()),parentId:nav.path,name:folderName.value,nowMinute:getState().lastGameMinute??0});if(!r.ok){notice.textContent=r.reason;return;}if(onChange?.(r.state)===false){notice.textContent='Не удалось сохранить папку.';return;}folderName.value='';update(true);});
 newFolder.disabled=!onChange;box.append(el(d,'h2',{text:save?'Сохранить как':'Выбор файла'}),toolbar,search,list);if(save)box.append(name);box.append(folderName,newFolder,notice,replace,choose,button(d,'Отмена',{},onCancel));root.replaceChildren(box);
 const siblings=[...(root.parentElement?.children??[])].filter(n=>n!==root).map(n=>({node:n,inert:n.inert}));for(const {node}of siblings)node.inert=true;
 function selection(){choose.disabled=!save&&!pcFileEntries(getState(),{folderId:nav.path,types,filter}).some(f=>f.id===selected);for(const row of list.children)if(row.dataset.fileId)row.setAttribute('aria-pressed',String(row.dataset.fileId===selected));}
 function update(force=false){
  if(disposed)return;const state=getState(),paths=explorerPaths(state),files=pcFileEntries(state,{folderId:nav.path,types,filter}),key=JSON.stringify([paths,files,nav.path]);if(!force&&key===signature)return;signature=key;
  folder.replaceChildren();for(const [id,p]of Object.entries(paths))folder.append(el(d,'option',{value:id,text:p.address}));folder.value=nav.path;address.value=paths[nav.path]?.address??'';up.disabled=!paths[nav.path]?.parent;list.replaceChildren();
  for(const [id,p]of Object.entries(paths).filter(([,p])=>p.parent===nav.path))list.append(button(d,'📁 '+p.label,{},()=>go(id)));
  for(const f of files.filter(f=>f.filename.toLocaleLowerCase('ru').includes(search.value.toLocaleLowerCase('ru')))){const row=button(d,'Выбрать: '+f.filename,{dataset:{fileId:f.id}},()=>{selected=f.id;if(save)name.value=f.filename;selection();});row.addEventListener('dblclick',()=>{selected=f.id;selection();choose.click();});list.append(row);}
  if(!list.children.length)list.append(el(d,'p',{text:'Подходящих файлов нет.'}));selection();
 }
 const change=()=>go(folder.value),key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onCancel();}if(e.key==='Tab'){const items=pcFocusable(box),i=items.indexOf(d.activeElement);if(items.length){e.preventDefault();e.stopPropagation();items[(i+(e.shiftKey?-1:1)+items.length)%items.length]?.focus();}}};folder.addEventListener('change',change);box.addEventListener('keydown',key);
 const searchFiles=()=>update(true);search.addEventListener('input',searchFiles);
 const clearReplacement=()=>{replaceTarget=null;replace.hidden=true;};name.addEventListener('input',clearReplacement);folder.addEventListener('change',clearReplacement);
 update(true);folder.focus();return {update,dispose(){disposed=true;search.removeEventListener('input',searchFiles);folder.removeEventListener('change',change);folder.removeEventListener('change',clearReplacement);name.removeEventListener('input',clearReplacement);box.removeEventListener('keydown',key);for(const {node,inert}of siblings)node.inert=inert;root.replaceChildren();}};
}
