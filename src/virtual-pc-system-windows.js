import {pcElement as el,pcButton as button} from './virtual-pc-dom.js?rev=21';
import {createPcIcon} from './virtual-pc-icons.js?rev=21';
import {WALLPAPERS} from './virtual-pc-catalog.js?rev=21';
import {setWallpaper,diskUsage} from './virtual-pc-state.js?rev=21';
import {mountDiskUsage} from './virtual-pc-disk-view.js?rev=21';
export function mountSystemWindow(root,{kind,getState,onPersist,onOpen,onClose,onConfirmShutdown,properties}) {
  const d=root.ownerDocument,wrap=el(d,'div',{className:'pc-system-content pc-dialog'});
  const status=el(d,'p',{className:'pc-system-status',dataset:{pcRole:'system-status'},attributes:{'aria-live':'polite'}});
  root.replaceChildren(wrap);let selection=getState().wallpaper,applied=selection,disposed=false;
  let preview=null,apply=null,diskView=null;const wallpaperButtons=[];
  function drawPreview(){const wallpaper=WALLPAPERS.find(w=>w.id===selection)??WALLPAPERS[0];
    preview.style.setProperty('background-image','url("'+wallpaper.path+'")');preview.setAttribute('aria-label','Предпросмотр: '+wallpaper.label);
    for(const [id,b]of wallpaperButtons)b.setAttribute('aria-pressed',String(id===selection));
    apply.disabled=selection===applied;
  }
  function persist(){const ok=onPersist(setWallpaper(getState(),selection));applied=selection;status.textContent=ok?'':'Настройка действует только в текущем сеансе: браузер не подтвердил сохранение.';drawPreview();}
  if(kind==='display'){
    wrap.append(el(d,'div',{className:'pc-display-tab',text:'Рабочий стол'}));
    const panel=el(d,'section',{className:'pc-display-panel'}),monitor=el(d,'div',{className:'pc-monitor'});
    preview=el(d,'div',{className:'pc-monitor-screen',dataset:{pcRole:'wallpaper-preview'}});monitor.append(preview);panel.append(monitor,el(d,'p',{text:'Фоновый рисунок:'}));
    const list=el(d,'div',{className:'pc-wallpaper-list',attributes:{'aria-label':'Фоновый рисунок'}});
    for(const w of WALLPAPERS){const b=button(d,w.label,{},()=>{selection=w.id;drawPreview();});list.append(b);wallpaperButtons.push([w.id,b]);}
    panel.append(list,el(d,'p',{text:'Выберите изображение для рабочего стола.'}));wrap.append(panel);
    const actions=el(d,'footer',{className:'pc-dialog-actions'});
    apply=button(d,'Применить',{},persist);
    actions.append(button(d,'ОК',{},()=>{persist();onClose();}),button(d,'Отмена',{},onClose),apply);wrap.append(status,actions);drawPreview();
  }else if(kind==='control-panel'){
    wrap.append(el(d,'h3',{text:'Панель управления'}),el(d,'p',{text:'Настройки игрового компьютера'}));
    for(const [id,label]of [['display','Экран'],['disk','Локальный диск (C:)']]){
      const b=button(d,'',{className:'pc-control-item',attributes:{'aria-label':label}},()=>onOpen(id));b.append(createPcIcon(d,id,{size:32}),el(d,'span',{text:label}));wrap.append(b);
    }
  }else if(kind==='shutdown'){
    wrap.className+=' pc-shutdown';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','Выключение компьютера');
    const header=el(d,'h3',{text:'Выключение компьютера'});wrap.append(header,createPcIcon(d,'power',{size:48}),el(d,'p',{text:'Завершить работу игрового компьютера?'}));
    const actions=el(d,'footer',{className:'pc-dialog-actions'});actions.append(button(d,'Выключить',{},onConfirmShutdown),button(d,'Отмена',{},onClose));wrap.append(actions);
  }else{
    wrap.append(createPcIcon(d,'settings',{size:32}),el(d,'h3',{text:properties?.title??'Свойства'}));
    const rows=el(d,'dl',{className:'pc-property-rows'});
    for(const row of properties?.rows??[])if(properties?.kind!=='disk'||row.label==='Тип')rows.append(el(d,'dt',{text:row.label}),el(d,'dd',{text:String(row.value)}));
    if(properties?.kind==='disk'){const info=el(d,'div');diskView=mountDiskUsage(info);diskView.update(diskUsage(getState()));wrap.append(info);}
    wrap.append(rows,el(d,'p',{text:'Виртуальный компьютер в Battle Life. Доступа к устройству пользователя нет.'}),button(d,'ОК',{},onClose));
  }
  return {update(){if(disposed)return;diskView?.update(diskUsage(getState()));if(kind==='display'&&getState().wallpaper!==applied){const old=applied;applied=getState().wallpaper;if(selection===old)selection=applied;drawPreview();}},
    dispose(){disposed=true;diskView?.dispose();root.replaceChildren();}};
}
