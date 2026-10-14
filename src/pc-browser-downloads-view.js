import {pcElement as el,pcButton as button} from './virtual-pc-dom.js?rev=41';
import {browserDownloadEntries} from './pc-browser-downloads.js?rev=41';
import {softwareMessage} from './pc-software-view.js?rev=41';

export function mountBrowserDownloads(root,{getState,onAction,getMessage=()=>''}){
 const d=root.ownerDocument,rows=new Map(),message=el(d,'p',{attributes:{role:'status'}});let expanded=true;
 root.className='uw-downloads';root.setAttribute('aria-label','Загрузки Underweb');
 root.append(el(d,'strong',{text:'Загрузки'}),message);
 function update(){
  const entries=browserDownloadEntries(getState());
  for(const entry of entries){
   if(!rows.has(entry.id)){
    const row=el(d,'div',{className:'uw-download-row'}),name=el(d,'span',{text:entry.name}),progress=el(d,'progress',{attributes:{max:'100','aria-label':'Загрузка '+entry.name}}),status=el(d,'small');
    const open=button(d,'Открыть файл',{attributes:{'aria-label':'Открыть файл '+entry.name}},()=>onAction(entry.kind==='metadata'?'open-metadata':'installer',entry.appId));
    row.append(name,progress,status,open);root.append(row);rows.set(entry.id,{row,progress,status,open});
   }
   const view=rows.get(entry.id),percent=Math.floor(entry.receivedBytes/entry.totalBytes*100);
   view.progress.value=percent;view.open.disabled=!entry.complete;
   view.status.textContent=entry.error?softwareMessage(entry.error):entry.complete?'Готово':percent+'%';
  }
  for(const [id,view]of rows)if(!entries.some(entry=>entry.id===id)){view.row.remove();rows.delete(id);}
  message.textContent=getMessage();message.hidden=!message.textContent;
  root.hidden=!entries.length||!expanded;
 }
 update();return {update,toggle(){expanded=!expanded;update();},dispose(){root.replaceChildren();}};
}
