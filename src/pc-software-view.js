import {PC_IDENTITY} from './pc-identity.js?rev=41';
import {createPcIcon} from './virtual-pc-icons.js?rev=41';
import {pcElement as el,pcButton} from './virtual-pc-dom.js?rev=41';
const button=pcButton;
import {SOFTWARE} from './pc-software-catalog.js?rev=41';
import {softwareDiskBytes} from './pc-software.js?rev=41';
import {downloadPresentation} from './virtual-pc-runtime.js?rev=41';
export const softwareMessage=reason=>({'select-transfer':'Выбери загрузку.','recording-in-progress':'Сначала заверши текущую запись вокала, сведение или мастеринг.','work-in-progress':'Сначала заверши текущую доработку.','downloads-in-progress':'Сначала заверши или отмени загрузки в torent.','client-required':'Сначала скачай и установи torent из темы клиента.','metadata-required':'Сначала скачай файл .torrent нужной программы.','insufficient-space':'Недостаточно места на C:. Загрузка сохранена; освободи место или отмени задачу.','invalid-path':'Укажи папку на игровом C: без .. и специальных символов.','transfer-active':'Сначала заверши или отмени текущую загрузку.','archive-required':'Сначала дождись полной загрузки установщика.','already-installed':'Программа уже установлена.','installer-active':'Сначала закрой текущий мастер установки.','pc-off':'Включи игровой компьютер.'}[reason]??reason??'');
export function softwareForum(d,{topic,state,navigate,onAction,message=''}){
 const button=(doc,text,options={},handler)=>pcButton(doc,text,{...options,className:'uw-control '+(options.className??'')},handler);
 const titles={client:'torent — торрент-клиент',ft:'FT Studio — домашняя студия',notebook:'Рэпблокнот — тексты и рифмы',dossier:'Рэп-досье — наблюдения и источники'};
 const summaries={dossier:'Карточки участников и судей. Сохраняй собственные разборы, сравнивай источники и не путай догадки с фактами.',client:'Маленький клиент для больших файлов. Открывает .torrent и распределяет канал между загрузками.',ft:'Драм-машина, басы, мелодии и запись голоса. Собери первый трек в своей комнате.',notebook:'От первой мысли до законченного текста. Черновики для баттлов, рифмы, образы и адаптация под бит.'};
 const routes={client:'client',ft:'ft-studio',notebook:'notebook',dossier:'dossier'},id=Object.keys(routes).find(id=>routes[id]===topic);
 const site=el(d,'section',{className:'uw-dump dump-tracker'}),head=el(d,'header',{className:'dump-header'});
 head.append(el(d,'small',{text:'ЛОКАЛЬНЫЙ ТРЕКЕР / 2012'}),button(d,'Файловая помойка',{},()=>navigate('underweb://dump')),el(d,'p',{text:'Найди. Скачай. Сделай своё.'}));
 const layout=el(d,'div',{className:'dump-layout'}),side=el(d,'nav',{className:'dump-categories',attributes:{'aria-label':'Категории файлов'}}),main=el(d,'main',{className:'dump-catalog'});
 side.append(el(d,'h2',{text:'Категории'}),button(d,'Доступный софт',{attributes:{'aria-current':id?'false':'page'}},()=>navigate('underweb://dump')));
 for(const name of ['Графика','Игры','Системы'])side.append(el(d,'span',{className:'dump-muted-category',text:name}),el(d,'small',{text:'Раздач пока нет'}));
 side.append(el(d,'hr'),el(d,'p',{text:'Сначала установи torent. Остальные программы скачиваются через него.'}));
 const crumbs=el(d,'nav',{className:'dump-crumbs'});crumbs.append(button(d,'Каталог программ',{},()=>navigate('underweb://dump')),el(d,'span',{text:id?' / '+SOFTWARE[id].name:' / Доступный софт'}));main.append(crumbs);
 function poster(app){const panel=el(d,'div',{className:'dump-release-poster',dataset:{software:app.id}});panel.append(createPcIcon(d,app.iconId,{size:72}),el(d,'strong',{text:app.name}),el(d,'small',{text:PC_IDENTITY.name+' / HOME EDITION'}));return panel;}
 if(!id){
  main.append(el(d,'h1',{text:'Программы и утилиты'}),el(d,'p',{className:'dump-catalog-caption',text:Object.keys(SOFTWARE).length+' проверенные раздачи · Всё для домашней студии'}));
  for(const app of Object.values(SOFTWARE)){
   const card=el(d,'article',{className:'dump-release-card'}),info=el(d,'div');
   info.append(button(d,titles[app.id],{},()=>navigate('underweb://dump/'+routes[app.id])),el(d,'p',{text:summaries[app.id]}),el(d,'small',{text:app.downloadBytes/1000000+' МБ · '+(app.id==='client'?'Прямая загрузка':'Через torent')}));
   card.append(poster(app),info);main.append(card);
  }
 }else{
  const app=SOFTWARE[id],item=state.software[id],article=el(d,'article',{className:'dump-release'}),info=el(d,'div',{className:'dump-release-info'}),facts=el(d,'div',{className:'dump-release-facts'}),actions=el(d,'div',{className:'dump-attachments'});
  main.append(el(d,'h1',{text:titles[id]}));info.append(el(d,'h2',{text:app.name+' / домашняя версия'}),el(d,'p',{text:summaries[id]}));
  for(const text of ['Система: '+PC_IDENTITY.name,'Загрузка: '+app.downloadBytes/1000000+' МБ','После установки: '+app.installedBytes/1000000+' МБ','Установка: '+app.installSeconds+' секунд','Язык: русский','Проверено: sysop / сентябрь 2012'])facts.append(el(d,'span',{text}));
  info.append(facts,el(d,'p',{text:id==='client'?'Скачай установщик, выбери папку на C: и заверши мастер.':'Скачай метаданные: файл .torrent откроет клиент. Там можно поставить загрузку на паузу и выбрать готовый установщик.'}));
  const download=button(d,id==='client'?'Скачать установщик torent':'Скачать '+app.torrent,{},()=>onAction(id==='client'?'download-client':'download-metadata',id));
  download.disabled=id==='client'?item.installed||item.receivedBytes===app.downloadBytes||Boolean(state.software.transfers.client):state.software[app.metadataKey];
  actions.append(download);
  if(app.metadataKey&&state.software[app.metadataKey])actions.append(button(d,'Открыть '+app.torrent,{},()=>onAction('open-metadata',id)));
  if(item.receivedBytes===app.downloadBytes&&!item.installed)actions.append(button(d,'Открыть установщик '+app.name,{},()=>onAction('installer',id)));
  if(item.installed)actions.append(el(d,'strong',{text:app.name+' установлена · '+item.path}));
  if(state.software.transfers[id]){
   if(id==='client'){const p=downloadPresentation(state,id);actions.append(el(d,'p',{dataset:{pcRole:'forum-transfer'},text:'Загрузка: '+p.receivedMb.toFixed(2)+' / '+p.totalMb+' МБ · '+p.speedKbPerSecond+' КБ/с'+(p.error?' · '+softwareMessage(p.error):'')}),button(d,'Отменить загрузку',{},()=>onAction('cancel',id)));}
   else actions.append(button(d,'Показать загрузку в torent',{},()=>onAction('open-metadata',id)));
  }
  info.append(actions);article.append(poster(app),info);main.append(article);
 }
 main.append(el(d,'p',{className:'dump-message',text:message,attributes:{role:'status'}}));
 layout.append(side,main);site.append(head,layout,el(d,'footer',{text:'Файлы существуют только на игровом диске. Локальная симуляция Underweb.'}));return site;
}
export function mountTorrent(root,{getState,onAction,getMessage=()=>''}){
 const d=root.ownerDocument,wrap=el(d,'section',{className:'pc-torrent-client'}),toolbar=el(d,'div',{className:'torrent-toolbar'}),body=el(d,'div',{className:'torrent-body'}),side=el(d,'aside',{className:'torrent-sidebar'}),main=el(d,'div',{className:'torrent-main'});
 let selected=null;const rows=new Map();
 const pause=button(d,'Ⅱ Пауза',{},()=>onAction('pause',selected)),resume=button(d,'▶ Продолжить',{},()=>onAction('resume',selected)),cancel=button(d,'× Отменить',{},()=>onAction('cancel',selected));
 const install=button(d,'Установить',{},()=>onAction(getState().software[selected]?.installed?'uninstall':'installer',selected));
 toolbar.append(button(d,'+ Открыть .torrent',{},()=>onAction('browse-metadata')),pause,resume,cancel,install);
 side.append(el(d,'strong',{text:'torent'}),el(d,'p',{text:'Все задачи'}),el(d,'p',{text:'Загружаются'}),el(d,'p',{text:'Завершены'}));
 const table=el(d,'div',{className:'torrent-table',attributes:{'aria-label':'Задачи загрузки'}}),head=el(d,'div',{className:'torrent-table-head',text:'Имя                 Размер       Прогресс       Сиды / Пиры'}),row=el(d,'div',{className:'torrent-row'}),details=el(d,'div',{className:'torrent-details'}),progress=el(d,'progress',{attributes:{max:'100','aria-label':'Прогресс загрузки'}}),controls=el(d,'div',{className:'torrent-actions'});
 const message=el(d,'p',{attributes:{role:'status'}});
 table.append(head,row);main.append(table,progress,details,controls,message);body.append(side,main);wrap.append(toolbar,body);root.replaceChildren(wrap);let signature='';
 function update(){
  const s=getState(),ids=Object.keys(SOFTWARE).filter(id=>id!=='client').filter(id=>s.software[id].receivedBytes>0||s.software[id].installed||s.software.transfers[id]);
  if(!ids.includes(selected))selected=ids[0]??null;
  for(const [id,b]of rows)if(!ids.includes(id)){b.remove();rows.delete(id);}
  if(!ids.length)row.textContent='Нет задач. Открой файл .torrent из Загрузок.';
  const presentations=new Map();
  for(const id of ids){
   if(!rows.has(id)){if(!rows.size)row.textContent='';const b=button(d,'',{attributes:{'aria-label':'Выбрать загрузку '+SOFTWARE[id].name}},()=>{selected=id;update();});b.addEventListener('dblclick',()=>{selected=id;const app=getState().software[id];if(!app.installed&&app.receivedBytes===SOFTWARE[id].downloadBytes)onAction('installer',id);});rows.set(id,b);row.append(b);}
   const b=rows.get(id),p=downloadPresentation(s,id);presentations.set(id,p);
   b.textContent=SOFTWARE[id].archive+'     '+p.totalMb+' МБ     '+p.percent+'%     '+p.seeds+' / '+p.peers;
   b.setAttribute('aria-pressed',String(selected===id));
  }
  const t=s.software.transfers[selected],p=presentations.get(selected),app=SOFTWARE[selected];
  message.textContent=getMessage();pause.disabled=!t||t.paused;resume.disabled=!t||(!t.paused&&!t.error);cancel.disabled=!t;
  install.textContent=s.software[selected]?.installed?'Удалить':'Установить';install.disabled=!selected||(!s.software[selected].installed&&s.software[selected].receivedBytes!==app.downloadBytes);install.hidden=!selected;
  progress.hidden=!selected;progress.value=selected?p.percent:0;progress.setAttribute('aria-label','Прогресс загрузки '+(app?.name??''));
  details.textContent=selected?p.receivedMb.toFixed(1)+' / '+p.totalMb+' МБ · '+p.speedKbPerSecond+' КБ/с · сиды '+p.seeds+' · пиры '+p.peers+' · осталось '+(p.remainingGameMinutes??'—')+' игровых мин.'+(p.paused?' · Пауза':'')+(p.error?' · '+softwareMessage(p.error):''):'Список загрузок пуст.';
  controls.textContent=selected&&s.software[selected].installed?app.name+' установлена. Проекты и установщик сохранятся при удалении.':'Выбери файл и нажми «Установить» или открой его двойным щелчком.';
 }
 update();return {update,dispose(){root.replaceChildren();}};
}
export function mountInstaller(root,{getState,onAction,getMessage=()=>''}){
 const d=root.ownerDocument;let signature='',error=null,progress=null,status=null;
 function updateProgress(state,w){
  if(error)error.textContent=w.error?softwareMessage(w.error):getMessage();
  if(!progress)return;
  const duration=SOFTWARE[w.appId].installSeconds,elapsed=w.elapsedSeconds??0,percent=Math.min(100,elapsed/duration*100);
  progress.value=percent;
  status.textContent=`Установка файлов: ${Math.floor(percent)}% · осталось ${Math.ceil(Math.max(0,duration-elapsed))} с${state.power==='on'?'':' · Пауза: компьютер выключен'}`;
 }
 function update(){const state=getState(),w=state.software.installer;if(!w)return;const key=JSON.stringify([w.appId,w.step,w.path]);if(key===signature){updateProgress(state,w);return;}signature=key;progress=null;status=null;
  let restoreFocus=root.contains(d.activeElement);for(let node=root;restoreFocus&&node;node=node.parentElement)if(node.inert||node.hidden)restoreFocus=false;
  const app=SOFTWARE[w.appId],wrap=el(d,'section',{className:'pc-installer'}),banner=el(d,'aside',{className:'installer-banner'}),body=el(d,'div',{className:'installer-body'}),content=el(d,'div',{className:'installer-content'}),actions=el(d,'footer',{className:'installer-actions'});
  banner.append(createPcIcon(d,app.iconId,{size:56}),el(d,'strong',{text:app.name}),el(d,'span',{text:'МАСТЕР\nУСТАНОВКИ'}));body.append(content,actions);wrap.append(banner,body);root.replaceChildren(wrap);
  const titles={welcome:'Добро пожаловать',destination:'Выбор папки установки',summary:'Всё готово к установке',install:'Установка',finish:'Установка завершена'};
  const heading=el(d,'h2',{text:titles[w.step],attributes:{tabindex:'-1'}});content.append(heading,el(d,'p',{text:app.name+' · '+PC_IDENTITY.name}));let input=null;
  if(w.step==='welcome')content.append(el(d,'p',{text:'Мастер поможет установить '+app.name+' на игровой компьютер.'}));
  if(w.step==='destination'){const label=el(d,'label',{text:'Папка на диске C:'});input=el(d,'input',{value:w.path,attributes:{'aria-label':'Папка установки',maxlength:'180'}});label.append(input);content.append(label,el(d,'p',{text:'Можно выбрать собственную папку на виртуальном C:.'}));}
  if(['summary','install','finish'].includes(w.step))content.append(el(d,'p',{text:'Папка: '+w.path}));
  if(w.step==='summary')content.append(el(d,'p',{text:`Требуется: ${app.installedBytes/1000000} МБ · Свободно: ${(softwareDiskBytes(state).free/1000000).toFixed(2)} МБ`}),el(d,'p',{text:'Скачанный архив останется в Загрузках.'}));
  if(w.step==='install'){status=el(d,'p');progress=el(d,'progress',{attributes:{max:'100','aria-label':'Прогресс установки '+app.name}});content.append(status,progress);}
  if(w.step==='finish'){
   content.append(el(d,'p',{text:'Программа установлена. Ярлык появился на рабочем столе.'}));
   const label=el(d,'label',{className:'installer-open-after'}),check=el(d,'input',{attributes:{type:'checkbox','aria-label':'Открыть после установки'}});
   check.checked=w.openAfterInstall;check.addEventListener('change',()=>onAction('open-after-install',check.checked));
   label.append(check,el(d,'span',{text:'Открыть после установки'}));content.append(label);
  }
  error=el(d,'p',{className:'pc-error',text:getMessage(),attributes:{role:'status'}});content.append(error);
  const back=button(d,'< Назад',{},()=>onAction('back'));back.disabled=!['destination','summary'].includes(w.step);
  const label={summary:'Установить',install:'Установка…',finish:'Готово'}[w.step]??'Далее >';
  const next=button(d,label,{},()=>onAction('next',input?.value));next.disabled=w.step==='install';actions.append(back,next,button(d,'Отмена',{},()=>onAction('cancel-installer')));
  updateProgress(state,w);
  if(restoreFocus)(input??heading).focus();
 }
 update();return {update,dispose(){root.replaceChildren();}};
}
