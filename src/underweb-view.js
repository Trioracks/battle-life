import {pcElement as el,pcButton} from './virtual-pc-dom.js?rev=20';
import {resolveUnderweb} from './virtual-pc-catalog.js?rev=20';
import {createBeatMarket} from './beat-market-view.js';
const button=(d,text,options={},fn)=>pcButton(d,text,{...options,className:'uw-control '+(options.className??'')},fn);

export function mountUnderweb(root,{getState,getMetadata,onApply,onDownload,onChange,audio}){
 const d=root.ownerDocument,history=['underweb://iskra'];let index=0,route=resolveUnderweb(history[0]),applicationOpen=false,lastApplications='',applicationFocus=null;
 const browser=el(d,'section',{className:'uw-browser',attributes:{'aria-label':'Браузер Underweb'}}),toolbar=el(d,'form',{className:'uw-toolbar',attributes:{'aria-label':'Адрес Underweb'}});
 const back=button(d,'←',{attributes:{'aria-label':'Назад в Underweb'}},()=>travel(-1)),forward=button(d,'→',{attributes:{'aria-label':'Вперёд в Underweb'}},()=>travel(1));
 const home=button(d,'⌂',{attributes:{'aria-label':'Главная Underweb'}},()=>navigate('underweb://iskra'));
 const address=el(d,'input',{value:history[0],attributes:{'aria-label':'Адрес или поиск Underweb',autocomplete:'off',spellcheck:'false'}});
 toolbar.append(back,forward,home,el(d,'span',{className:'uw-address-label',text:'Адрес'}),address,button(d,'Перейти',{},()=>navigate(address.value)));
 toolbar.addEventListener('submit',e=>{e.preventDefault();navigate(address.value);});
 const bookmarks=el(d,'nav',{className:'uw-bookmarks',attributes:{'aria-label':'Избранное Underweb'}});
 bookmarks.append(el(d,'strong',{text:'UNDERWEB'}),button(d,'Искра',{},()=>navigate('underweb://iskra')),button(d,'Баттлы',{},()=>navigate('underweb://battles')),button(d,'FT Studio',{},()=>navigate('underweb://software/ft-studio')));
 bookmarks.append(button(d,'Базар',{},()=>navigate('underweb://samples')),button(d,'RIPLINE',{},()=>navigate('underweb://ripline')));
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
  for(const [number,title,text,url]of [['01','Баттлы рядом','Новые имена. Первые раунды. Твой голос.','underweb://battles'],['02','Домашняя студия','Программы для твоего рабочего стола.','underweb://software/ft-studio']]){
   const card=el(d,'article');card.append(el(d,'small',{text:number}),button(d,title,{},()=>navigate(url)),el(d,'p',{text}));directory.append(card);
  }
  home.append(directory,el(d,'footer',{className:'uw-site-footer',text:'Искра · Поиск по игровым сайтам · Без ИИ-ответов'}));return home;
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
  site.append(el(d,'div',{className:'uw-catalog-strip',text:'Аудиобаттлы  /  Открытая регистрация  /  3 турнира'}));
  const grid=el(d,'div',{className:'uw-battle-grid'});
  for(const b of route.briefs){
   const card=el(d,'article',{className:'uw-battle-card'}),info=el(d,'div',{className:'uw-card-info'});
   card.append(poster(b));info.append(el(d,'small',{className:'uw-badge',text:isApplied(b.id)?'ЗАЯВКА ПОДАНА':'ПРИЁМ ЗАЯВОК'}),el(d,'h2',{text:b.title}),el(d,'p',{text:b.theme}),el(d,'div',{className:'uw-card-meta',text:b.format+' · Вход свободный'}),el(d,'strong',{className:'uw-prize',text:b.prize}),button(d,'Подробнее →',{className:'uw-detail-link',attributes:{'aria-label':'Подробнее: '+b.title}},()=>navigate('underweb://battles/'+b.id)));card.append(info);grid.append(card);
  }
  site.append(grid,el(d,'footer',{className:'uw-site-footer',text:'РАЙОН · Игровые турниры. Заявки не отправляются на внешние сайты.'}));return site;
 }
 function detailPage(){
  const b=route.brief,site=el(d,'div',{className:'uw-battle-site'});site.append(battleHeader());
  const back=button(d,'← Каталог баттлов',{className:'uw-breadcrumb'},()=>navigate('underweb://battles'));site.append(back);
  const hero=el(d,'div',{className:'uw-detail-hero'}),text=el(d,'div');text.append(el(d,'small',{className:'uw-badge',text:b.season}),el(d,'h1',{text:b.title}),el(d,'p',{text:b.description}));hero.append(poster(b,true),text);site.append(hero);
  const columns=el(d,'div',{className:'uw-detail-columns'}),rules=el(d,'section');rules.append(el(d,'h2',{text:'Тема отбора'}),el(d,'p',{className:'uw-theme',text:b.theme}),el(d,'p',{text:b.condition}),el(d,'h2',{text:'Условия участия'}));
  const list=el(d,'ul');for(const text of b.rules)list.append(el(d,'li',{text}));rules.append(list);
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
  site.append(action);return site;
 }
 function softwarePage(){
  const page=el(d,'div',{className:'uw-software'});page.append(el(d,'small',{text:'UNDERWEB / СОФТ'}),el(d,'div',{className:'uw-software-logo',text:'FT'}),el(d,'h1',{text:'FT Studio'}),el(d,'h2',{text:'Твоя комната. Твоя студия.'}),el(d,'p',{text:'Рабочее пространство для музыкальных идей: библиотека, дорожки и область ритма в одном окне.'}),el(d,'p',{text:'Версия 1.0 · Windows HP · 800 МБ'}),button(d,'Открыть torent',{className:'uw-primary'},onDownload),el(d,'p',{className:'uw-muted',text:'На этом этапе доступен внешний вид студии. Музыкальные действия появятся позже.'}));return page;
 }
 function render({resetScroll=true,focusApplication=false}={}){
  const scrollTop=resetScroll?0:page.scrollTop;applicationFocus=null;
  address.value=route.url;back.disabled=index===0;forward.disabled=index===history.length-1;
  audio?.stop();
  page.replaceChildren(['samples','ripline'].includes(route.type)?createBeatMarket(d,{getState,onChange,audio,navigate,ripline:route.type==='ripline'}):route.type==='home'?homePage():route.type==='search'?resultsPage():route.type==='battles'?catalogPage():route.type==='battle'?detailPage():route.type==='software'?softwarePage():el(d,'p',{className:'uw-error',text:route.message}));
  page.scrollTop=scrollTop;if(focusApplication)applicationFocus?.focus();
  status.textContent='Готово · '+(route.type==='home'||route.type==='search'?'Искра':'Локальная сеть');lastApplications=JSON.stringify(getState().battleApplications);
 }
 function navigate(input){route=resolveUnderweb(input);history.splice(index+1);history.push(route.url);index=history.length-1;applicationOpen=false;render();}
 function travel(delta){const next=index+delta;if(next<0||next>=history.length)return;index=next;route=resolveUnderweb(history[index]);applicationOpen=false;render();}
 render();return {navigate,get snapshot(){return {route,index,history:[...history]};},update(){if(lastApplications!==JSON.stringify(getState().battleApplications)&&['battle','battles'].includes(route.type))render();},dispose(){root.replaceChildren();}};
}
