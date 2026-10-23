import {pcElement as el,pcButton} from './virtual-pc-dom.js?rev=57';
const date=value=>typeof value==='string'?value.split('-').reverse().join('.'):'';
const link=(d,text,fn,className='')=>pcButton(d,text,{className:'uw-control uw-news-link '+className},fn);
const articleUrl=issue=>'underweb://iskra/news/'+issue.id;
function metadata(d,issue){return el(d,'p',{className:'uw-news-meta',text:'Выпуск: '+date(issue.publishDate)+' · Событие: '+date(issue.eventDate)+' · '+issue.sourceTitle});}
export function createNewsPanel(d,{issue,navigate}){
 const section=el(d,'section',{className:'uw-news-panel',attributes:{'aria-label':'Новости Искры'}}),head=el(d,'header');
 head.append(el(d,'h2',{text:'В мире сегодня'}),link(d,'Архив выпусков →',()=>navigate('underweb://iskra/archive')));section.append(head);
 if(!issue){section.append(el(d,'p',{text:'На эту дату нет опубликованных выпусков.'}));return section;}
 const content=el(d,'article');content.append(el(d,'small',{className:'uw-news-category',text:issue.category}),link(d,issue.title,()=>navigate(articleUrl(issue)),'uw-news-headline'),metadata(d,issue),el(d,'p',{className:'uw-news-snippet',text:(issue.body[0]??'').length>210?(issue.body[0].slice(0,207)+'…'):(issue.body[0]??'')}));section.append(content);return section;
}
export function createNewsPage(d,{route,navigate}){
 const page=el(d,'section',{className:'uw-news-page'}),head=el(d,'header',{className:'uw-news-masthead'});head.append(link(d,'✳ Искра',()=>navigate('underweb://iskra')),el(d,'span',{text:'НОВОСТИ / АРХИВ ЭПОХИ'}));page.append(head);
 const nav=el(d,'nav',{className:'uw-news-breadcrumb'});nav.append(link(d,'← Главная Искры',()=>navigate('underweb://iskra')));if(route.type==='news')nav.append(link(d,'Архив выпусков →',()=>navigate('underweb://iskra/archive')));page.append(nav);
 if(route.type==='news'){
  const issue=route.issue,article=el(d,'article',{className:'uw-news-article'});article.append(el(d,'small',{className:'uw-news-category',text:issue.category}),el(d,'h1',{text:issue.title}),metadata(d,issue));
  for(const paragraph of issue.body)article.append(el(d,'p',{className:'uw-news-body',text:paragraph}));
  const source=el(d,'aside',{className:'uw-news-source'});source.append(el(d,'strong',{text:'Источник'}));
  if(/^https?:\/\//i.test(issue.sourceUrl))source.append(el(d,'a',{text:issue.sourceTitle+' ↗',attributes:{href:issue.sourceUrl,target:'_blank',rel:'noopener noreferrer',tabindex:'0'}}));else source.append(el(d,'span',{text:issue.sourceTitle}));
  source.append(el(d,'small',{text:'Откроется внешний сайт. Дата события: '+date(issue.eventDate)+'.'}));article.append(source);page.append(article);
 }else{
  page.append(el(d,'h1',{text:'Архив выпусков'}),el(d,'p',{className:'uw-news-archive-intro',text:'Новый выпуск каждые три игровых дня. Здесь только уже опубликованные материалы; дата события указана отдельно.'}));
  let currentMonth='';
  for(const issue of route.issues){const month=issue.publishDate.slice(0,7);if(month!==currentMonth){currentMonth=month;page.append(el(d,'h2',{className:'uw-news-month',text:month.split('-').reverse().join(' / ')}));}const row=el(d,'article',{className:'uw-news-archive-row'});row.append(el(d,'time',{text:date(issue.publishDate)}),link(d,issue.title,()=>navigate(articleUrl(issue))),el(d,'small',{text:issue.category+' · '+issue.sourceTitle+' · событие '+date(issue.eventDate)}));page.append(row);}
  if(!route.issues.length)page.append(el(d,'p',{text:'На эту дату нет опубликованных выпусков.'}));
 }
 page.append(el(d,'footer',{className:'uw-news-footer',text:'Искра · Короткие пересказы исторических событий · Даты публикаций привязаны к игровому календарю.'}));return page;
}
