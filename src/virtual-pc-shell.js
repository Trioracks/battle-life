import {pcElement as el,pcButton as button,pcFocusable} from './virtual-pc-dom.js?rev=21';
import {createPcIcon} from './virtual-pc-icons.js?rev=21';
import {homeDateLabel} from './home-calendar.js?rev=24';

export function mountPcShell(root,{onCommand}) {
  const d=root.ownerDocument,win=d.defaultView??globalThis;
  let model=null,disposed=false,selected=null,modalNode=null;
  const cleanups=new Set(),frames=new Map(),icons=new Map();
  const shell=el(d,'section',{className:'pc-shell pc-desktop'});
  const workspace=el(d,'div',{className:'pc-workspace',attributes:{'aria-label':'Рабочий стол Windows XP'}});
  const iconRoot=el(d,'nav',{className:'pc-icons',dataset:{pcRole:'icons'},attributes:{'aria-label':'Приложения компьютера'}});
  const layer=el(d,'div',{className:'pc-window-layer'});
  workspace.append(iconRoot,layer);
  const taskbar=el(d,'footer',{className:'pc-taskbar'});
  const start=el(d,'button',{className:'pc-start',text:'',type:'button',attributes:{'aria-label':'Пуск'}});
  start.append(createPcIcon(d,'start',{size:24}),el(d,'span',{text:'пуск'}));
  const tasks=el(d,'div',{className:'pc-tasks'}),clock=el(d,'time',{className:'pc-clock',dataset:{pcRole:'clock'}});
  taskbar.append(start,tasks,clock);
  const warning=el(d,'div',{className:'pc-storage-warning',dataset:{pcRole:'persistence-warning'},attributes:{'aria-live':'polite'}});
  const menus=el(d,'div',{className:'pc-menu-layer'}),modal=el(d,'div',{className:'pc-modal-layer'});
  modal.hidden=true;shell.append(workspace,taskbar,warning,menus,modal);root.replaceChildren(shell);
  const emit=c=>{if(!disposed&&(!modalNode||(c.type==='window'&&c.action.type==='viewport')))onCommand(c);};
  function listen(n,type,fn,group=cleanups) {
    n.addEventListener(type,fn);const off=()=>{n.removeEventListener(type,fn);cleanups.delete(off);};
    cleanups.add(off);if(group!==cleanups)group.add(off);return off;
  }
  const windowCommand=(type,id,extra={})=>emit({type:'window',action:{type,id,...extra}});
  const bounds=()=>({width:model?.windows.viewport.width??1280,height:(model?.windows.viewport.height??720)-32});
  const current=id=>model?.windows.windows.find(w=>w.id===id);
  function select(id) {selected=id;for(const [key,item]of icons){item.node.dataset.selected=String(key===id);item.node.setAttribute('aria-pressed',String(key===id));}}
  function gesture(host,{getRect,onRect,resize='',group=cleanups}) {
    let drag=null,suppressUntil=0;
    const finish=e=>{
      if(!drag)return;
      if(drag.moved||e.type!=='pointerup')suppressUntil=Date.now()+400;
      drag=null;
      if(host.hasPointerCapture?.(e.pointerId))host.releasePointerCapture(e.pointerId);
    };
    listen(host,'pointerdown',e=>{
      if(e.button!==0||e.isPrimary===false||modalNode)return;
      const control=e.target?.closest?.('button,input,select');if(control&&control!==host)return;
      const rect=getRect();if(!rect)return;
      drag={x:e.clientX,y:e.clientY,rect:{...rect},moved:false,pointerId:e.pointerId};
      host.setPointerCapture?.(e.pointerId);e.preventDefault();
    },group);
    listen(host,'pointermove',e=>{
      if(!drag)return;
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(!drag.moved&&Math.hypot(dx,dy)<4)return;
      drag.moved=true;
      let r={...drag.rect};
      if(!resize){r.x+=dx;r.y+=dy;}
      else {
        if(resize.includes('e'))r.width+=dx;if(resize.includes('s'))r.height+=dy;
        if(resize.includes('w')){r.x+=dx;r.width-=dx;}if(resize.includes('n')){r.y+=dy;r.height-=dy;}
      }
      onRect(r);e.preventDefault();
    },group);
    for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(host,type,finish,group);
    const cancel=()=>{const id=drag?.pointerId;drag=null;if(id!==undefined&&host.hasPointerCapture?.(id))host.releasePointerCapture(id);cleanups.delete(cancel);};cleanups.add(cancel);if(group!==cleanups)group.add(cancel);
    return ()=>Date.now()<suppressUntil;
  }
  function makeIcon(app) {
    const group=new Set(),node=el(d,'button',{type:'button',className:'pc-icon',dataset:{pcRole:'desktop-icon',app:app.id},attributes:{'aria-label':app.label,'aria-pressed':'false',title:app.description??app.label}});
    node.append(createPcIcon(d,app.iconId),el(d,'span',{text:app.label}));
    const item={node,group};icons.set(app.id,item);iconRoot.append(node);
    const suppressed=gesture(node,{group,getRect:()=>model.iconPositions[app.id],onRect:r=>{
      const a=bounds(),p={x:Math.max(0,Math.min(r.x,a.width-80)),y:Math.max(0,Math.min(r.y,a.height-88))};
      emit({type:'move-icon',id:app.id,position:p});
    }});
    listen(node,'click',()=>{if(!suppressed()){select(app.id);node.focus();}},group);
    listen(node,'dblclick',()=>{if(!suppressed())emit({type:'open-app',appId:app.id});},group);
    listen(node,'contextmenu',e=>{e.preventDefault();e.stopPropagation();select(app.id);emit({type:'desktop-menu',targetId:app.id,x:e.clientX,y:e.clientY,anchor:node});},group);
    listen(node,'keydown',e=>{
      if(e.key==='Enter'){e.preventDefault();emit({type:'open-app',appId:app.id});}
      if(e.key==='F10'&&e.shiftKey){e.preventDefault();const r=node.getBoundingClientRect();emit({type:'desktop-menu',targetId:app.id,x:r.left,y:r.bottom,anchor:node});}
      if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const ids=[...icons.keys()],i=ids.indexOf(app.id),delta=['ArrowDown','ArrowRight'].includes(e.key)?1:-1;const id=ids[(i+delta+ids.length)%ids.length];select(id);icons.get(id).node.focus();}
    },group);
  }
  function makeFrame(w) {
    const group=new Set(),frame=el(d,'section',{className:'pc-window',dataset:{pcRole:'window',windowId:w.id},attributes:{'aria-label':w.title}});
    const titlebar=el(d,'header',{className:'pc-window-title',dataset:{pcRole:'titlebar',windowId:w.id}});
    const iconId=w.iconId??model.apps.find(a=>a.id===w.appId)?.iconId??(w.appId==='display'?'display':'settings');
    const title=el(d,'strong',{text:w.title}),buttons=el(d,'div',{className:'pc-title-controls'});
    const titleIcon=createPcIcon(d,iconId,{size:16});titlebar.append(titleIcon,title,buttons);
    const controls={};
    for(const [type,label,id]of [['minimize','Свернуть окно','minimize'],['toggle-maximize','Развернуть окно','maximize'],['close','Закрыть окно','close']]){
      const b=el(d,'button',{type:'button',className:'pc-caption-button '+id,attributes:{'aria-label':label,title:label}});
      b.append(createPcIcon(d,id,{size:12}));listen(b,'click',()=>windowCommand(type,w.id),group);buttons.append(b);controls[type]=b;
    }
    const content=el(d,'div',{className:'pc-app-root',dataset:{pcRole:'app-content',windowId:w.id}});
    frame.append(titlebar,content);layer.append(frame);
    if(w.appId==='ft-studio'){
      frame.dataset.entering='true';
      listen(frame,'animationend',event=>{if(event.target===frame)frame.dataset.entering='false';},group);
    }
    listen(frame,'pointerdown',()=>{if(current(w.id)?.mode!=='minimized'&&model.windows.activeId!==w.id)windowCommand('activate',w.id);},group);
    const suppressed=gesture(titlebar,{group,getRect:()=>current(w.id)?.mode==='normal'?current(w.id).rect:null,onRect:rect=>windowCommand('geometry',w.id,{rect})});
    listen(titlebar,'dblclick',e=>{if(!e.target?.closest?.('button')&&!suppressed())windowCommand('toggle-maximize',w.id);},group);
    for(const side of ['n','ne','e','se','s','sw','w','nw']){
      const grip=el(d,'div',{className:'pc-resize pc-resize-'+side,attributes:{'aria-hidden':'true'}});frame.append(grip);
      gesture(grip,{group,resize:side,getRect:()=>current(w.id)?.mode==='normal'?current(w.id).rect:null,onRect:rect=>windowCommand('geometry',w.id,{rect})});
    }
    const task=el(d,'button',{className:'pc-task',type:'button',dataset:{pcRole:'task',windowId:w.id},attributes:{'aria-label':'Переключить '+w.title}});
    const taskText=el(d,'span',{text:w.title}),taskIcon=createPcIcon(d,iconId,{size:16});task.append(taskIcon,taskText);tasks.append(task);
    listen(task,'click',()=>windowCommand('task',w.id),group);
    const item={frame,title,titleIcon,taskIcon,iconId,content,controls,task,taskText,group};frames.set(w.id,item);return item;
  }
  const rectStyle=(node,r)=>{for(const k of ['x','y','width','height'])node.style.setProperty(k==='x'?'left':k==='y'?'top':k,r[k]+'px');};
  function render(next) {
    if(disposed)return;model=next;
    iconRoot.inert=Boolean(next.masterWindow);taskbar.inert=Boolean(next.masterWindow);menus.inert=Boolean(next.masterWindow);
    shell.style.setProperty('--pc-wallpaper','url("'+next.wallpaper+'")');
    clock.textContent=next.metadata.clockLabel;clock.setAttribute('title',homeDateLabel(next.metadata.gameDay));clock.setAttribute('aria-label','Игровое время '+next.metadata.clockLabel+', '+homeDateLabel(next.metadata.gameDay));
    warning.textContent=next.warning??'';warning.hidden=!next.warning;
    for(const [id,item]of icons)if(!next.apps.some(a=>a.id===id)){item.group.forEach(off=>off());item.node.remove();icons.delete(id);}
    for(const app of next.apps){
      if(!icons.has(app.id))makeIcon(app);
      const p=next.iconPositions[app.id]??{x:8,y:8};
      rectStyle(icons.get(app.id).node,{...p,width:80,height:80});
    }
    for(const [id,item]of frames)if(!next.windows.windows.some(w=>w.id===id)){
      item.group.forEach(off=>off());item.frame.remove();item.task.remove();frames.delete(id);
    }
    for(const w of next.windows.windows) {
      const f=frames.get(w.id)??makeFrame(w),active=next.windows.activeId===w.id;
      f.frame.inert=Boolean(next.masterWindow&&next.masterWindow!==w.id);
      if(next.masterWindow===w.id){f.frame.setAttribute('role','dialog');f.frame.setAttribute('aria-modal','true');}
      f.controls.minimize.disabled=next.masterWindow===w.id;
      rectStyle(f.frame,w.rect);f.frame.style.setProperty('z-index',w.z);
      f.frame.hidden=w.mode==='minimized';f.frame.dataset.active=String(active);f.frame.dataset.mode=w.mode;
      f.title.textContent=w.title;f.taskText.textContent=w.title;f.task.setAttribute('aria-pressed',String(active));f.task.dataset.active=String(active);
      f.task.setAttribute('aria-label','Переключить '+w.title);f.frame.setAttribute('aria-label',w.title);
      if(w.iconId&&w.iconId!==f.iconId){f.iconId=w.iconId;const src=createPcIcon(d,w.iconId).getAttribute('src');f.titleIcon.setAttribute('src',src);f.taskIcon.setAttribute('src',src);}
      f.controls['toggle-maximize'].setAttribute('aria-label',w.mode==='maximized'?'Восстановить окно':'Развернуть окно');
      f.controls['toggle-maximize'].children[0].setAttribute('src',createPcIcon(d,w.mode==='maximized'?'restore':'maximize').getAttribute('src'));
    }
  }
  function focusActive(){const scope=modalNode??frames.get(model?.windows.activeId)?.frame??workspace;pcFocusable(scope)[0]?.focus();}
  function setModal(node,returnFocus) {
    const had=modalNode;modalNode=node;workspace.inert=!!node;taskbar.inert=!!node||Boolean(model?.masterWindow);menus.inert=!!node||Boolean(model?.masterWindow);
    modal.hidden=!node;
    if(node){if(had!==node){modal.replaceChildren(node);pcFocusable(node)[0]?.focus();}}
    else{modal.replaceChildren();if(had){if(returnFocus?.isConnected&&!returnFocus.disabled)returnFocus.focus();else focusActive();}}
  }
  listen(start,'click',()=>emit({type:'start-menu',anchor:start}));
  listen(workspace,'click',e=>{if(e.target===workspace||e.target===iconRoot)select(null);});
  listen(workspace,'contextmenu',e=>{if(e.target!==workspace&&e.target!==iconRoot)return;e.preventDefault();emit({type:'desktop-menu',targetId:null,x:e.clientX,y:e.clientY,anchor:workspace});});
  listen(root,'keydown',e=>{
    if(e.key!=='Tab'||e.defaultPrevented)return;
    const scope=modalNode??(menus.children.length?menus:frames.get(model?.windows.activeId)?.frame??shell);
    const controls=pcFocusable(scope);if(!controls.length)return;
    const i=controls.indexOf(d.activeElement),n=e.shiftKey?(i<=0?controls.length-1:i-1):(i+1)%controls.length;
    e.preventDefault();e.stopPropagation();controls[n].focus();
  });
  const Observer=win.ResizeObserver;
  const observer=Observer?new Observer(()=>{
    const r=root.getBoundingClientRect();
    if(r.width>0&&r.height>0&&(r.width!==model?.windows.viewport.width||r.height!==model?.windows.viewport.height))emit({type:'window',action:{type:'viewport',width:r.width,height:r.height}});
  }):null;observer?.observe(root);
  return {render,getContentRoot:id=>frames.get(id)?.content??null,getMenuRoot:()=>menus,setModal,focusActive,
    dispose(){disposed=true;observer?.disconnect();for(const off of [...cleanups])off();root.replaceChildren();frames.clear();icons.clear();}};
}
