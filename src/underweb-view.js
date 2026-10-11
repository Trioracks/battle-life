import {pcElement as el,pcButton,pcFind} from './virtual-pc-dom.js?rev=21';
import {resolveUnderweb} from './virtual-pc-catalog.js?rev=28';
import {createBeatMarket} from './beat-market-view.js?rev=28';
import {softwareForum,softwareMessage} from './pc-software-view.js?rev=28';
import {downloadPresentation} from './virtual-pc-runtime.js?rev=28';
import {createCommunityView} from './underweb-community-view.js?rev=28';
import {communityDay} from './underweb-community.js?rev=28';
import {homeDateLabel} from './home-calendar.js?rev=28';
import {newsForDay} from './underweb-news.js?rev=28';
import {createNewsPanel,createNewsPage} from './underweb-news-view.js?rev=28';
const button=(d,text,options={},fn)=>pcButton(d,text,{...options,className:'uw-control '+(options.className??'')},fn);

export function mountUnderweb(root,{getState,getMetadata,onApply,onSoftware,onChange,audio,getSoftwareMessage=()=>''}){
 const d=root.ownerDocument,history=['underweb://iskra'];let index=0,route=resolveUnderweb(history[0],getMetadata()),applicationOpen=false,lastApplications='',applicationFocus=null,lastSoftware='',lastDay=0;
 const softwareSignature=()=>{const s=getState().software;return JSON.stringify([s?.client?.installed,s?.client?.receivedBytes===2000000,s?.ft?.installed,s?.ft?.receivedBytes===800000000,s?.notebook?.installed,s?.notebook?.receivedBytes===4000000,s?.metadata,s?.task?.appId,s?.task?.paused,s?.task?.error,getSoftwareMessage()]);};
 const browser=el(d,'section',{className:'uw-browser',attributes:{'aria-label':'Браузер Underweb'}}),toolbar=el(d,'form',{className:'uw-toolbar',attributes:{'aria-label':'Адрес Underweb'}});
 const back=button(d,'←',{attributes:{'aria-label':'Назад в Underweb'}},()=>travel(-1)),forward=button(d,'→',{attributes:{'aria-label':'Вперёд в Underweb'}},()=>travel(1));
 const home=button(d,'⌂',{attributes:{'aria-label':'Главная Underweb'}},()=>navigate('underweb://iskra'));
 const address=el(d,'input',{value:history[0],attributes:{'aria-label':'Адрес или поиск Underweb',autocomplete:'off',spellcheck:'false'}});
 toolbar.append(back,forward,home,el(d,'span',{className:'uw-address-label',text:'Адрес'}),address,button(d,'Перейти',{},()=>navigate(address.value)));
 toolbar.addEventListener('submit',e=>{e.preventDefault();navigate(address.value);});
 const bookmarks=el(d,'nav',{className:'uw-bookmarks',attributes:{'aria-label':'Избранное Underweb'}});
 bookmarks.append(el(d,'strong',{text:'UNDERWEB'}),button(d,'Искра',{},()=>navigate('underweb://iskra')),button(d,'Баттлы',{},()=>navigate('underweb://battles')),button(d,'FT Studio',{},()=>navigate('underweb://software/ft-studio')));
 bookmarks.append(button(d,'Базар',{},()=>navigate('underweb://samples')),button(d,'RIPLINE',{},()=>navigate('underweb://ripline')));
 bookmarks.append(button(d,'Файловая помойка',{},()=>navigate('underweb://dump')));
 bookmarks.append(button(d,'Форум',{},()=>navigate('underweb://forum')));
 const page=el(d,'div',{className:'uw-page'}),status=el(d,'footer',{className:'uw-status',text:'Готово · Локальная сеть'});
 browser.append(toolbar,bookmarks,page,status);root.replaceChildren(browser);
 function searchForm(query=''){
  const form=el(d,'form',{className:'uw-search-form'}),input=el(d,'input',{value:query,attributes:{'aria-label':'Поиск Искры',placeholder:'Баттлы, музыка, программы…',maxlength:'160',autocomplete:'off'}});
  form.append(input,button(d,'Найти',{},()=>navigate(input.value)));
  form.addEventListener('submit',e=>{e.preventDefault();navigate(input.value);});return form;
 }
 function logo(compact=false){const n=el(d,'div',{className:compact?'uw-iskra compact':'uw-iskra'});n.append(el(d,'i',{text:'✳',attributes:{'aria-hidden':'true'}}),el(d,'strong',{text:'Искра'}));return n;}
 function homePage(){
  const home=el(d,'div',{className:'uw-home'});home.append(el(d,'div',{className:'uw-site-top',text:'Твоя точка входа в Underweb'}),logo(),el(d,'p',{className:'uw-tagline',text:'Найди своё в сети.'}),searchForm());
  const frequent=el(d,'section',{className:'uw-frequent'});frequent.append(el(d,'h2',{text:'Часто ищут'}));
  for(const text of ['рэп баттлы','Бетонное эхо','Купить сэмплы','FT Studio'])frequent.append(button(d,text,{},()=>navigate(text)));home.append(frequent);
  const directory=el(d,'div',{className:'uw-home-directory'});
  for(const [number,title,text,url]of [['01','Баттлы рядом','Новые имена. Первые раунды. Твой голос.','underweb://battles'],['02','Файловая помойка','Программы для твоего рабочего стола.','underweb://dump'],['03','Форум «Подземка»','Споры, черновики и разговоры после раунда.','underweb://forum']]){
   const card=el(d,'article');card.append(el(d,'small',{text:number}),button(d,title,{},()=>navigate(url)),el(d,'p',{text}));directory.append(card);
  }
  home.append(directory,createNewsPanel(d,{issue:newsForDay(getMetadata().gameDay),navigate}),el(d,'footer',{className:'uw-site-footer',text:'Искра · Поиск по игровым сайтам · Без ИИ-ответов'}));return home;
 }
 function resultsPage(){
  const result=el(d,'div',{className:'uw-results'}),head=el(d,'header',{className:'uw-results-head'});head.append(logo(true),searchForm(route.query));result.append(head);
  result.append(el(d,'div',{className:'uw-search-tabs',text:'Все результаты'}),el(d,'p',{className:'uw-result-count',text:route.results.length?'Найдено страниц: '+route.results.length:'По этому запросу ничего не найдено.'}));
  for(const item of route.results){const entry=el(d,'article',{className:'uw-result'});entry.append(el(d,'small',{text:item.site}),el(d,'div',{className:'uw-result-url',text:item.url}),button(d,item.title,{className:'uw-text-link',attributes:{'aria-label':'Открыть: '+item.title}},()=>navigate(item.url)),el(d,'p',{text:item.description}));result.append(entry);}
  if(!route.results.length)result.append(el(d,'p',{text:'Попробуй «рэп баттлы», название турнира или «FT Studio».'}));return result;
 }
 function battleHeader(){
  const header=el(d,'header',{className:'uw-battle-header'});header.append(button(d,'РАЙОН / БАТТЛЫ',{className:'uw-battle-brand'},()=>navigate('underweb://battles')),el(d,'span',{text:'НЕЗАВИСИМАЯ РЭП-СЦЕНА'}));return header;
 }
 function poster(b,large=false){const node=el(d,'div',{className:'uw-poster '+b.color+(large?' large':''),attributes:{'aria-label':'Афиша: '+b.title}});node.append(el(d,'small',{text:b.season}),el(d,'strong',{text:b.mark}),el(d,'span',{text:'ГОЛОС / РАЙОН / СЦЕНА'}));return node;}
 function isApplied(id){return getState().battleApplications?.some(a=>a.battleId===id);}
 function catalogPage(){
  const site=el(d,'div',{className:'uw-battle-site'});site.append(battleHeader());
  const intro=el(d,'div',{className:'uw-catalog-intro'});intro.append(el(d,'small',{text:'КАТАЛОГ / АУДИО'}),el(d,'h1',{text:'Здесь начинается раунд.'}),el(d,'p',{text:'Найди свой формат. Прочитай условия. Заяви о себе.'}));site.append(intro);
  site.append(el(d,'div',{className:'uw-catalog-strip',text:'Аудиобаттлы  /  Открытая регистрация  /  '+route.briefs.length+' турнира'}));
  const grid=el(d,'div',{className:'uw-battle-grid'});
  for(const b of route.briefs){
   const card=el(d,'article',{className:'uw-battle-card'}),info=el(d,'div',{className:'uw-card-info'});
   card.append(poster(b));info.append(el(d,'small',{className:'uw-badge',text:isApplied(b.id)?'ЗАЯВКА ПОДАНА':'ПРИЁМ ЗАЯВОК'}),el(d,'h2',{text:b.title}),el(d,'p',{text:b.theme}),el(d,'div',{className:'uw-card-meta',text:b.format+' · Вход свободный'}),el(d,'strong',{className:'uw-prize',text:b.prize}),button(d,'Подробнее →',{className:'uw-detail-link',attributes:{'aria-label':'Подробнее: '+b.title}},()=>navigate('underweb://battles/'+b.id)));card.append(info);grid.append(card);
  }
  site.append(grid,el(d,'footer',{className:'uw-site-footer',text:'РАЙОН · Игровые турниры. Заявки не отправляются на внешние сайты.'}));return site;
 }
 function detailPage(){
  const b=route.brief,site=el(d,'div',{className:'uw-battle-site uw-standalone '+b.color,attributes:{'aria-label':'Сайт баттла '+b.title}}),masthead=el(d,'header',{className:'uw-battle-masthead'});
  masthead.append(el(d,'strong',{text:b.title}),el(d,'span',{text:b.season}),el(d,'small',{text:homeDateLabel(communityDay(getMetadata().gameDay))}));site.append(masthead);
  const nav=el(d,'nav',{className:'uw-battle-tabs',attributes:{'aria-label':'Разделы сайта баттла'}});for(const [id,title]of [['home','Главная'],['rules','Правила'],['rounds','Раунды'],['players','Участники']])nav.append(button(d,title,{attributes:route.tab===id?{'aria-current':'page'}:{}},()=>navigate('underweb://battles/'+b.id+'/'+id)));nav.append(button(d,'Обсуждение на форуме',{},()=>navigate('underweb://forum/'+b.id)));site.append(nav);
  const back=button(d,'← Каталог баттлов',{className:'uw-breadcrumb'},()=>navigate('underweb://battles'));site.append(back);
  const hero=el(d,'div',{className:'uw-detail-hero'}),text=el(d,'div');text.append(el(d,'small',{className:'uw-badge',text:b.season}),el(d,'h1',{text:b.title}),el(d,'p',{text:b.description}));hero.append(poster(b,true),text);site.append(hero);
  const columns=el(d,'div',{className:'uw-detail-columns'}),rules=el(d,'section',{className:'uw-battle-content'});
  if(route.tab==='home'){
   rules.append(el(d,'small',{text:'ОТБОР ОТКРЫТ'}),el(d,'h2',{text:'Тема: «'+b.theme+'»'}),el(d,'p',{text:b.condition}),el(d,'p',{text:'Начни с заявки, открой Рэпблокнот и собери свой текст. Запись и сдача аудиоработ пока не открыты.'}),button(d,'Скачать Рэпблокнот →',{className:'uw-text-link'},()=>navigate('underweb://dump/notebook')));
   const note=el(d,'div',{className:'uw-battle-bulletin'});note.append(el(d,'strong',{text:'На связи организаторы'}),el(d,'p',{text:'Правила уже опубликованы. Вопросы по формату и первые впечатления собираем в общей теме.'}),button(d,'Читать обсуждение →',{},()=>navigate('underweb://forum/topic/'+b.id+'-general')));rules.append(note);
  }else if(route.tab==='rules'){
   rules.append(el(d,'h2',{text:'Регламент отбора'}),el(d,'p',{className:'uw-theme',text:b.theme}));const list=el(d,'ul');for(const text of b.rules)list.append(el(d,'li',{text}));rules.append(list,el(d,'p',{text:'Участие бесплатно. Чужие куплеты, публикация личных данных и травля участников запрещены. Заявки и тексты остаются в игровом мире.'}),button(d,'Задать вопрос о правилах →',{},()=>navigate('underweb://forum/topic/'+b.id+'-rules')));
  }else if(route.tab==='rounds'){
   rules.append(el(d,'h2',{text:'Ход турнира'}));for(const [n,title,text]of [['01','Отбор · «'+b.theme+'»','Регистрация открыта. Можно готовить текст; приём аудио ещё не начался.'],['02','Парные раунды','Пары, темы и сроки пока не объявлены. Оппонент не назначен.'],['03','Итоги','Появятся после проведения турнира.']]){const round=el(d,'article',{className:'uw-round-row'});round.append(el(d,'b',{text:n}),el(d,'h3',{text:title}),el(d,'p',{text}));rules.append(round);}
  }else{
   rules.append(el(d,'h2',{text:'Участники'}));const applications=getState().battleApplications?.filter(a=>a.battleId===b.id)??[];rules.append(el(d,'p',{text:'Подтверждённые заявки в этой игре: '+applications.length}));
   for(const a of applications){const row=el(d,'article',{className:'uw-participant'});row.append(el(d,'strong',{text:a.nickname}),el(d,'span',{text:'Зарегистрирован · отбор · оппонент не назначен'}));rules.append(row);}if(!applications.length)rules.append(el(d,'p',{text:'Твоей заявки ещё нет. Зарегистрируйся ниже, чтобы появиться в списке.'}));
  }
  const facts=el(d,'aside',{className:'uw-facts'});for(const [label,value]of [['Формат',b.format],['Организатор',b.organizer],['Призовой фонд',b.prize],['Взнос','Бесплатно'],['Статус','Регистрация открыта'],['Сдача трека','Будет доступна с игровой механикой']]){facts.append(el(d,'small',{text:label}),el(d,'strong',{text:value}));}
  columns.append(rules,facts);site.append(columns);
  const action=el(d,'section',{className:'uw-application'});
  if(isApplied(b.id)){applicationFocus=el(d,'h2',{text:'Заявка подана',attributes:{tabindex:'-1'}});action.append(applicationFocus,el(d,'p',{text:'Ты зарегистрирован на '+b.title+'. Аудиоработа пока не требуется.'}));}
  else if(applicationOpen){
   const form=el(d,'form'),label=el(d,'label',{text:'Имя участника'}),name=el(d,'input',{value:getMetadata().playerName,attributes:{'aria-label':'Имя участника',maxlength:'32',required:'true'}});label.append(name);
   const note=el(d,'p',{text:'Регистрация участия в игровом баттле. Создание и отправка трека появятся позже.'}),error=el(d,'p',{className:'uw-form-error',attributes:{'aria-live':'polite'}});
   applicationFocus=name;
   function submit(){const value=name.value.trim();if(!value){error.textContent='Укажи имя участника.';name.focus();return;}onApply(b.id,value);applicationOpen=false;render({resetScroll:false,focusApplication:true});}
   form.append(el(d,'h2',{text:'Заявка на участие'}),label,note,error,button(d,'Подтвердить заявку',{className:'uw-primary'},submit),button(d,'Отмена',{},()=>{applicationOpen=false;render({resetScroll:false,focusApplication:true});}));form.addEventListener('submit',e=>{e.preventDefault();submit();});action.append(form);
  }else {applicationFocus=button(d,'Подать заявку',{className:'uw-primary'},()=>{applicationOpen=true;render({resetScroll:false,focusApplication:true});});action.append(applicationFocus,el(d,'span',{text:'Бесплатная регистрация · Без отправки аудио'}));}
  site.append(action,el(d,'footer',{className:'uw-site-footer',text:b.organizer+' · Самостоятельный вымышленный сайт в Underweb'}));return site;
 }
 // A clock refresh can replace dated content without acting like navigation.
 // Snapshot unsent form values and selection before replacing page children.
 function preserveInteraction(){
  const identity=n=>n?.getAttribute?.('aria-label')||n?.dataset?.focusId||n?.id,fields=[];
  function collect(node){if(['INPUT','TEXTAREA','SELECT'].includes(node.tagName)&&identity(node))fields.push({tag:node.tagName,id:identity(node),value:node.value,start:node.selectionStart,end:node.selectionEnd,direction:node.selectionDirection,scrollTop:node.scrollTop,scrollLeft:node.scrollLeft});for(const child of node.children??[])collect(child);}
  collect(page);let focused=page.contains(d.activeElement)?d.activeElement:null;
  for(let node=root;focused&&node;node=node.parentElement)if(node.inert||node.hidden)focused=null;
  return ()=>{
   for(const saved of fields){const current=pcFind(page,n=>n.tagName===saved.tag&&identity(n)===saved.id);if(!current)continue;current.value=saved.value;
    if(Number.isInteger(saved.start)&&Number.isInteger(saved.end)){if(current.setSelectionRange)current.setSelectionRange(saved.start,saved.end,saved.direction??'none');else{current.selectionStart=saved.start;current.selectionEnd=saved.end;current.selectionDirection=saved.direction;}}
    current.scrollTop=saved.scrollTop??0;current.scrollLeft=saved.scrollLeft??0;
   }
   if(focused){const restored=pcFind(page,n=>n.tagName===focused.tagName&&identity(n)&&identity(n)===identity(focused));(restored&&!restored.disabled?restored:address).focus({preventScroll:true});}
  };
 }
 function render({resetScroll=true,focusApplication=false,preserveInputs=false}={}){
  const restore=preserveInputs?preserveInteraction():null;
  const scrollTop=resetScroll?0:page.scrollTop;applicationFocus=null;
  lastDay=JSON.stringify([getMetadata().gameDay]);
  if(!preserveInputs)address.value=route.url;back.disabled=index===0;forward.disabled=index===history.length-1;
  audio?.stop();
  page.replaceChildren(route.type.startsWith('news')?createNewsPage(d,{route,navigate}):route.type.startsWith('forum')?createCommunityView(d,{route,getState,getMetadata,onChange,navigate}):['samples','ripline'].includes(route.type)?createBeatMarket(d,{getState,onChange,audio,navigate,ripline:route.type==='ripline'}):route.type==='home'?homePage():route.type==='search'?resultsPage():route.type==='battles'?catalogPage():route.type==='battle'?detailPage():route.type==='dump'?softwareForum(d,{topic:route.topic,state:getState(),navigate,onAction:onSoftware,message:getSoftwareMessage()}):el(d,'p',{className:'uw-error',text:route.message}));
  lastSoftware=softwareSignature();
  restore?.();page.scrollTop=scrollTop;if(focusApplication)applicationFocus?.focus();
  status.textContent='Готово · '+(route.type==='home'||route.type==='search'?'Искра':'Локальная сеть');lastApplications=JSON.stringify(getState().battleApplications);
 }
 function navigate(input){route=resolveUnderweb(input,getMetadata());history.splice(index+1);history.push(route.url);index=history.length-1;applicationOpen=false;render();}
 function travel(delta){const next=index+delta;if(next<0||next>=history.length)return;index=next;route=resolveUnderweb(history[index],getMetadata());applicationOpen=false;render();}
 render();return {navigate,get snapshot(){return {route,index,history:[...history]};},update(){
  if(lastDay!==JSON.stringify([getMetadata().gameDay])){route=resolveUnderweb(history[index],getMetadata());render({resetScroll:false,preserveInputs:true});}
  else if(lastApplications!==JSON.stringify(getState().battleApplications)&&['battle','battles'].includes(route.type)||route.type==='dump'&&lastSoftware!==softwareSignature())render({resetScroll:false});
  else if(route.type==='dump'){const node=pcFind(page,n=>n.dataset?.pcRole==='forum-transfer');if(node){const p=downloadPresentation(getState());node.textContent=`Загрузка: ${p.receivedMb.toFixed(2)} / ${p.totalMb} МБ · ${p.speedKbPerSecond} КБ/с${p.error?' · '+softwareMessage(p.error):''}`;}}
 },dispose(){root.replaceChildren();}};
}
