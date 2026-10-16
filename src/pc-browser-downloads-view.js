import {pcElement as el,pcButton} from './virtual-pc-dom.js?rev=44';
import {browserDownloadEntries} from './pc-browser-downloads.js?rev=44';
import {softwareMessage} from './pc-software-view.js?rev=44';
import {createPcIcon} from './virtual-pc-icons.js?rev=44';
const button=(d,text,options,fn)=>pcButton(d,text,{...options,className:'uw-control'},fn);

export function mountBrowserDownloads(root,{anchor,getState,onAction,getMessage=()=>''}){
 const d=root.ownerDocument,rows=new Map(),list=el(d,'div',{className:'uw-download-list'}),message=el(d,'p',{className:'uw-download-message',attributes:{role:'status'}});
 const initial=browserDownloadEntries(getState());
 let expanded=false,details=false,disposed=false,arrival=null,known=new Set(initial.map(item=>item.id)),newest=initial.at(-1)?.id,lastMessage=getMessage();
 root.className='uw-downloads';root.id='underweb-downloads';root.setAttribute('aria-label','Загрузки Underweb');root.setAttribute('role','dialog');
 anchor?.setAttribute('aria-haspopup','dialog');anchor?.setAttribute('aria-controls',root.id);
 const title=el(d,'strong',{text:'Загрузки'}),header=el(d,'header',{className:'uw-download-header'});
 const folder=button(d,'',{attributes:{'aria-label':'Открыть папку загрузок',title:'Открыть папку загрузок'}},()=>{close();onAction('browse-metadata');});
 folder.append(createPcIcon(d,'folder',{size:16}));
 const dismiss=button(d,'×',{attributes:{'aria-label':'Закрыть загрузки'}},()=>close(true));
 header.append(title,folder,dismiss);
 const empty=el(d,'p',{className:'uw-download-empty',text:'Пока нет загрузок.'}),footer=el(d,'footer',{className:'uw-download-footer'});
 const clear=button(d,'Очистить',{attributes:{'aria-label':'Очистить завершённые загрузки'}},()=>{onAction('clear-download-history');update();});
 const more=button(d,'Подробнее',{attributes:{'aria-label':'Подробнее о загрузках'}},()=>{details=!details;update();});
 footer.append(clear,more);root.append(header,message,list,empty,footer);
 function close(focus=false){expanded=false;details=false;root.hidden=true;anchor?.setAttribute('aria-expanded','false');if(focus)anchor?.focus({preventScroll:true});}
 function acknowledge(){
  arrival?.remove();
  if(anchor){const current=el(d,'span',{className:'uw-download-arrival',text:'↓',attributes:{'aria-hidden':'true'}});arrival=current;anchor.append(current);current.addEventListener('animationend',()=>{current.remove();if(arrival===current)arrival=null;},{once:true});}
 }
 function update(){
  if(disposed)return;
  const entries=browserDownloadEntries(getState()),nextMessage=getMessage();
  const repeated=entries.length===known.size&&entries.at(-1)?.id!==newest;
  if(repeated||entries.some(item=>!known.has(item.id))){expanded=true;details=false;acknowledge();}
  if(nextMessage&&nextMessage!==lastMessage)expanded=true;
  known=new Set(entries.map(item=>item.id));newest=entries.at(-1)?.id;lastMessage=nextMessage;
  const shown=[...entries].reverse().slice(0,details?entries.length:3),shownIds=new Set(shown.map(item=>item.id));
  for(const [id,view]of rows)if(!shownIds.has(id)){view.row.remove();rows.delete(id);}
  for(const entry of shown){
   if(!rows.has(entry.id)){
    const row=el(d,'div',{className:'uw-download-row'}),name=el(d,'span',{className:'uw-download-name',text:entry.name}),progress=el(d,'progress',{attributes:{max:'100','aria-label':'Загрузка '+entry.name}}),status=el(d,'small'),label=el(d,'span'),remaining=el(d,'span');
    const open=button(d,'Открыть файл',{attributes:{'aria-label':'Открыть файл '+entry.name}},()=>onAction(entry.kind==='metadata'?'open-metadata':'installer',entry.appId));
    status.append(label,remaining);row.append(name,progress,status,open);rows.set(entry.id,{row,progress,label,remaining,open});
   }
   const view=rows.get(entry.id),percent=Math.floor(entry.receivedBytes/entry.totalBytes*100);
   view.progress.value=percent;view.open.disabled=!entry.complete;
   const text=entry.error?softwareMessage(entry.error):entry.complete?'Готово':percent+'%';
   if(view.label.textContent!==text)view.label.textContent=text;
   const remaining=!entry.error&&!entry.complete?' · Осталось '+Math.max(1,Math.ceil(1-entry.elapsedSeconds))+' с':'';
   if(view.remaining.textContent!==remaining)view.remaining.textContent=remaining;
  }
  if(shown.some((entry,index)=>list.children[index]!==rows.get(entry.id).row))for(const entry of shown)list.append(rows.get(entry.id).row);
  title.textContent=details?'История загрузок':'Загрузки';clear.disabled=!entries.some(entry=>entry.complete);
  more.textContent=details?'Назад':'Подробнее';more.setAttribute('aria-label',details?'Последние загрузки':'Подробнее о загрузках');
  more.disabled=!details&&entries.length<=3;empty.hidden=entries.length>0;
  message.textContent=nextMessage;message.hidden=!nextMessage;
  root.hidden=!expanded;anchor?.setAttribute('aria-expanded',String(expanded));
 }
 const outside=event=>{if(expanded&&!root.contains(event.target)&&!anchor?.contains(event.target))close();};
 const keydown=event=>{if(expanded&&event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}};
 d.addEventListener?.('pointerdown',outside,true);d.addEventListener?.('keydown',keydown,true);
 update();return {update,toggle(){expanded=!expanded;if(!expanded)details=false;update();},dispose(){disposed=true;d.removeEventListener?.('pointerdown',outside,true);d.removeEventListener?.('keydown',keydown,true);close();arrival?.remove();root.replaceChildren();}};
}
