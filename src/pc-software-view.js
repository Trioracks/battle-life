import {pcElement as el,pcButton} from './virtual-pc-dom.js?rev=21';
const button=pcButton;
import {SOFTWARE} from './pc-software-catalog.js?rev=28';
import {softwareDiskBytes} from './pc-software.js?rev=28';
import {downloadPresentation} from './virtual-pc-runtime.js?rev=28';
export const softwareMessage=reason=>({'client-required':'Сначала скачай и установи torent из темы клиента.','metadata-required':'Сначала скачай файл FT-Studio.torrent.','insufficient-space':'Недостаточно места на C:. Загрузка сохранена; освободи место или отмени задачу.','invalid-path':'Укажи папку на игровом C: без .. и специальных символов.','transfer-active':'Сначала заверши или отмени текущую загрузку.','archive-required':'Сначала дождись полной загрузки установщика.','already-installed':'Программа уже установлена.','installer-active':'Сначала закрой текущий мастер установки.','pc-off':'Включи игровой компьютер.'}[reason]??reason??'');
export function softwareForum(d,{topic,state,navigate,onAction,message=''}){
 const button=(doc,text,options={},handler)=>pcButton(doc,text,{...options,className:'uw-control '+(options.className??'')},handler);
 const site=el(d,'section',{className:'uw-dump'}),head=el(d,'header',{className:'dump-header'});
 head.append(el(d,'small',{text:'UNDERWEB / ФОРУМ / СОФТ'}),button(d,'Файловая помойка',{},()=>navigate('underweb://dump')),el(d,'p',{text:'Программы для домашнего компьютера · участники помогают участникам'}));site.append(head);
 const crumbs=el(d,'nav',{className:'dump-crumbs'});crumbs.append(button(d,'Форум',{},()=>navigate('underweb://dump')),el(d,'span',{text:' › Программы › '+(topic==='client'?'Клиенты загрузок':topic==='ft-studio'?'Музыкальные программы':'Все темы')}));site.append(crumbs);
 if(!topic){
  site.append(el(d,'h1',{text:'Программы и утилиты'}));
  const list=el(d,'div',{className:'dump-topic-list'}),heading=el(d,'div',{className:'dump-list-heading'});heading.append(el(d,'span',{text:'Тема / раздел'}),el(d,'span',{text:'Размер'}),el(d,'span',{text:'Статус'}));list.append(heading);
  for(const [category,title,id,description,size]of [['Клиенты загрузок','torent — торрент-клиент','client','Установщик · прямая загрузка','2 МБ'],['Музыкальные программы','FT Studio — домашняя студия','ft-studio','Метаданные 12 КБ · загрузка в клиенте','800 МБ'],['Текстовые редакторы','Рэпблокнот — тексты и рифмы','notebook','Установщик · прямая загрузка','4 МБ']]){
   const row=el(d,'article',{className:'dump-topic-row'}),titleCell=el(d,'div',{className:'dump-topic-title'}),status=el(d,'div',{className:'dump-topic-status'});
   titleCell.append(el(d,'small',{text:category}),button(d,title,{},()=>navigate('underweb://dump/'+id)),el(d,'span',{text:description}));status.append(el(d,'strong',{text:'Закреплено'}),el(d,'small',{text:'sysop · 1 сообщение'}));
   row.append(el(d,'span',{className:'dump-topic-mark',text:'▣',attributes:{'aria-hidden':'true'}}),titleCell,el(d,'span',{className:'dump-topic-size',text:size}),status);list.append(row);
  }
  for(const title of ['Графика','Игры','Системы']){const row=el(d,'article',{className:'dump-category-row'});row.append(el(d,'span',{className:'dump-topic-mark',text:'□',attributes:{'aria-hidden':'true'}}),el(d,'strong',{text:title}),el(d,'span',{text:'Обсуждения · загрузок пока нет'}));list.append(row);}site.append(list);
 }else if(topic==='notebook'){
  const app=SOFTWARE.notebook,installed=state.software.notebook,post=el(d,'article',{className:'dump-post'}),body=el(d,'div'),actions=el(d,'div',{className:'dump-attachments'});
  site.append(el(d,'h1',{text:'Рэпблокнот — тексты и рифмы'}));post.append(el(d,'aside',{text:'slogoman\nУчастник\nС нами с 2011'}));
  body.append(el(d,'small',{text:'Бесплатный редактор · Windows HP'}),el(d,'h2',{text:'Не потеряй первую мысль'}),el(d,'p',{text:'Черновики для баттлов и собственных треков. Три этапа письма, доработка куплетов и адаптация под бит. torent не требуется.'}),el(d,'p',{text:'Установщик: 4 МБ · Программа: 12 МБ · Установка: 10 секунд'}));
  const download=button(d,'Скачать установщик Рэпблокнот',{},()=>onAction('download-notebook'));download.disabled=installed.installed||installed.receivedBytes===app.downloadBytes||state.software.task?.appId==='notebook';actions.append(download);
  if(installed.receivedBytes===app.downloadBytes&&!installed.installed)actions.append(button(d,'Открыть установщик Рэпблокнот',{},()=>onAction('installer','notebook')));
  if(installed.installed)actions.append(el(d,'strong',{text:'Рэпблокнот установлен · '+installed.path}));
  if(state.software.task?.appId==='notebook'){const p=downloadPresentation(state);actions.append(el(d,'p',{dataset:{pcRole:'forum-transfer'},text:`Загрузка: ${p.receivedMb.toFixed(2)} / ${p.totalMb} МБ · ${p.speedKbPerSecond} КБ/с`}),button(d,'Отменить загрузку',{},()=>onAction('cancel')));}
  body.append(actions);post.append(body);site.append(post);
 }else{
  const client=topic==='client',id=client?'client':'ft',app=SOFTWARE[id],post=el(d,'article',{className:'dump-post'}),body=el(d,'div');
  site.append(el(d,'h1',{text:client?'torent — торрент-клиент':'FT Studio — домашняя студия'}));
  post.append(el(d,'aside',{text:'sysop\nМодератор\nС нами с 2010'}));body.append(el(d,'small',{text:'Закреплённая тема · Windows HP'}),el(d,'h2',{text:client?'Клиент для файлов .torrent':'Студия для первого бита'}),el(d,'p',{text:client?'Скачай установщик, выбери папку на C: и заверши мастер. После установки клиент откроется с пустым списком.':'Сначала установи torent из соседней темы. Скачай файл .torrent и открой его: клиент добавит архив FT Studio в очередь.'}),el(d,'p',{text:client?'Установщик: 2 МБ · Программа на диске: 8 МБ':'Метаданные: 12 КБ · Архив: 800 МБ · Установка: ещё 800 МБ'}));
  const actions=el(d,'div',{className:'dump-attachments'});
  if(client){const b=button(d,'Скачать установщик torent',{},()=>onAction('download-client'));b.disabled=state.software.client.installed||state.software.client.receivedBytes===2000000||Boolean(state.software.task?.appId==='client');actions.append(b);}
  else {const b=button(d,'Скачать FT-Studio.torrent',{},()=>onAction('download-metadata'));b.disabled=state.software.metadata;actions.append(b);if(state.software.metadata)actions.append(button(d,'Открыть FT-Studio.torrent',{},()=>onAction('open-metadata')));}
  if(state.software[id].receivedBytes===app.downloadBytes&&!state.software[id].installed)actions.append(button(d,'Открыть установщик '+app.name,{},()=>onAction('installer',id)));
  if(state.software[id].installed)actions.append(el(d,'strong',{text:app.name+' установлена · '+state.software[id].path}));
  if(state.software.task?.appId===id){const p=downloadPresentation(state);actions.append(el(d,'p',{dataset:{pcRole:'forum-transfer'},text:`Загрузка: ${p.receivedMb.toFixed(2)} / ${p.totalMb} МБ · ${p.speedKbPerSecond} КБ/с${p.error?' · '+softwareMessage(p.error):''}`}),button(d,'Отменить загрузку',{},()=>onAction('cancel')));}
  body.append(actions);post.append(body);site.append(post);
 }
 site.append(el(d,'p',{className:'dump-message',text:message,attributes:{role:'status'}}),el(d,'footer',{text:'Файлы существуют только на игровом диске. Локальная симуляция Underweb.'}));return site;
}
export function mountTorrent(root,{getState,onAction}){
 const d=root.ownerDocument,wrap=el(d,'section',{className:'pc-torrent-client'}),toolbar=el(d,'div',{className:'torrent-toolbar'}),body=el(d,'div',{className:'torrent-body'}),side=el(d,'aside',{className:'torrent-sidebar'}),main=el(d,'div',{className:'torrent-main'});
 const pause=button(d,'Ⅱ Пауза',{},()=>onAction('pause')),resume=button(d,'▶ Продолжить',{},()=>onAction('resume')),cancel=button(d,'× Отменить',{},()=>onAction('cancel'));
 toolbar.append(button(d,'+ Открыть .torrent',{},()=>onAction('browse-metadata')),pause,resume,cancel);
 side.append(el(d,'strong',{text:'torent'}),el(d,'p',{text:'Все задачи'}),el(d,'p',{text:'Загружаются'}),el(d,'p',{text:'Завершены'}));
 const table=el(d,'div',{className:'torrent-table',attributes:{role:'table','aria-label':'Задачи загрузки'}}),head=el(d,'div',{className:'torrent-table-head',text:'Имя                 Размер       Прогресс       Сиды / Пиры'}),row=el(d,'div',{className:'torrent-row'}),details=el(d,'div',{className:'torrent-details'}),progress=el(d,'progress',{attributes:{max:'100','aria-label':'Прогресс загрузки FT Studio'}}),controls=el(d,'div',{className:'torrent-actions'});
 table.append(head,row);main.append(table,progress,details,controls);body.append(side,main);wrap.append(toolbar,body);root.replaceChildren(wrap);let signature='';
 function update(){const s=getState(),ft=s.software.ft,t=s.software.task,has=ft.receivedBytes>0||t?.appId==='ft',p=downloadPresentation(s),key=JSON.stringify([has,ft.receivedBytes===800000000,ft.installed,t?.paused]);
  pause.disabled=!t||t.paused;resume.disabled=!t||!t.paused&&!t.error;cancel.disabled=!t;
  row.textContent=has?`FT-Studio-setup.zip     800 МБ     ${Math.floor(ft.receivedBytes/8000000)}%     ${p.seeds} / ${p.peers}`:'Нет задач. Открой файл .torrent из Загрузок.';
  progress.hidden=!has;progress.value=ft.receivedBytes/8000000;
  details.textContent=has?`${(ft.receivedBytes/1000000).toFixed(1)} / 800 МБ · ${p.speedKbPerSecond} КБ/с · сиды ${p.seeds} · пиры ${p.peers} · осталось ${p.remainingGameMinutes??'—'} игровых мин.${p.paused?' · Пауза':''}${p.error?' · '+softwareMessage(p.error):''}`:'Список загрузок пуст.';
  if(key!==signature){signature=key;controls.replaceChildren();if(ft.receivedBytes===800000000&&!ft.installed)controls.append(button(d,'Открыть установщик FT Studio',{},()=>onAction('installer','ft')));if(ft.installed)controls.append(el(d,'p',{text:'FT Studio установлена. Ярлык появился на рабочем столе.'}));}
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
  banner.append(el(d,'strong',{text:app.name}),el(d,'span',{text:'МАСТЕР\nУСТАНОВКИ'}));body.append(content,actions);wrap.append(banner,body);root.replaceChildren(wrap);
  const titles={welcome:'Добро пожаловать',destination:'Выбор папки установки',summary:'Всё готово к установке',install:'Установка',finish:'Установка завершена'};
  const heading=el(d,'h2',{text:titles[w.step],attributes:{tabindex:'-1'}});content.append(heading,el(d,'p',{text:app.name+' · Windows HP'}));let input=null;
  if(w.step==='welcome')content.append(el(d,'p',{text:'Мастер поможет установить '+app.name+' на игровой компьютер.'}));
  if(w.step==='destination'){const label=el(d,'label',{text:'Папка на диске C:'});input=el(d,'input',{value:w.path,attributes:{'aria-label':'Папка установки',maxlength:'180'}});label.append(input);content.append(label,el(d,'p',{text:'Можно выбрать собственную папку на виртуальном C:.'}));}
  if(['summary','install','finish'].includes(w.step))content.append(el(d,'p',{text:'Папка: '+w.path}));
  if(w.step==='summary')content.append(el(d,'p',{text:`Требуется: ${app.installedBytes/1000000} МБ · Свободно: ${(softwareDiskBytes(state).free/1000000).toFixed(2)} МБ`}),el(d,'p',{text:'Скачанный архив останется в Загрузках.'}));
  if(w.step==='install'){status=el(d,'p');progress=el(d,'progress',{attributes:{max:'100','aria-label':'Прогресс установки '+app.name}});content.append(status,progress);}
  if(w.step==='finish')content.append(el(d,'p',{text:'Программа установлена. Ярлык появился на рабочем столе.'}));
  error=el(d,'p',{className:'pc-error',text:getMessage(),attributes:{role:'status'}});content.append(error);
  const back=button(d,'< Назад',{},()=>onAction('back'));back.disabled=!['destination','summary'].includes(w.step);
  const label={summary:'Установить',install:'Установка…',finish:'Готово'}[w.step]??'Далее >';
  const next=button(d,label,{},()=>onAction('next',input?.value));next.disabled=w.step==='install';actions.append(back,next,button(d,'Отмена',{},()=>onAction('cancel-installer')));
  updateProgress(state,w);
  if(restoreFocus)(input??heading).focus();
 }
 update();return {update,dispose(){root.replaceChildren();}};
}
