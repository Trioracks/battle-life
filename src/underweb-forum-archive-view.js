import {pcElement as el,pcButton} from './virtual-pc-dom.js?rev=42';
import {FORUM_ARCHIVE_BOARDS,archiveBoardsForDay,archiveTopicsForDay,archiveTopicForDay} from './underweb-forum-archive.js?rev=42';
import {homeDateLabel} from './home-calendar.js?rev=42';
const button=(d,text,fn,attributes={})=>pcButton(d,text,{className:'uw-control uw-forum-link',attributes},fn);
const dateLabel=date=>date.split('-').reverse().join('.');
function sourceLink(d,post){return el(d,'a',{text:'Открыть источник ↗',attributes:{href:post.sourceUrl,target:'_blank',rel:'noopener noreferrer','aria-label':'Источник: '+post.sourceTitle}});}
export function createForumArchiveView(d,{route,day,navigate}){
 const site=el(d,'section',{className:'uw-community uw-historical-archive',attributes:{'aria-label':'Исторический архив Hip-Hop.ru'}}),head=el(d,'header',{className:'uw-forum-header'});
 head.append(button(d,'Hip-Hop.ru / архив',()=>navigate('underweb://forum/archive')),el(d,'span',{text:'ИСТОРИЯ ФОРУМА'}),el(d,'small',{text:'Доступно на '+homeDateLabel(day)}));site.append(head);
 const switcher=el(d,'nav',{className:'uw-forum-sections',attributes:{'aria-label':'Режим форума'}});switcher.append(button(d,'Игровой форум',()=>navigate('underweb://forum')),button(d,'Исторический архив',()=>navigate('underweb://forum/archive'),{'aria-current':'page'}));site.append(switcher);
 site.append(el(d,'p',{className:'uw-fiction-notice',text:'Исторический архив · только чтение. Реальные ники и даты, краткие цитаты и редакторские пересказы с источниками. Это выборка отдельных сообщений, а не полная копия темы. Оформление реконструировано; точный вид сайта в 2012 году не подтверждён.'}));
 const topic=route.type==='forum-archive-topic'?archiveTopicForDay(route.archiveTopicId??route.topic?.id,day,route.page):null,boardId=topic?.boardId??route.archiveBoardId,board=FORUM_ARCHIVE_BOARDS.find(b=>b.id===boardId);
 const crumbs=el(d,'nav',{className:'uw-forum-crumbs',attributes:{'aria-label':'Путь по архиву'}});crumbs.append(button(d,'Архив Hip-Hop.ru',()=>navigate('underweb://forum/archive')));if(board)crumbs.append(el(d,'span',{text:'›'}),button(d,board.title,()=>navigate('underweb://forum/archive?board='+board.id)));if(topic)crumbs.append(el(d,'span',{text:'›'}),el(d,'span',{text:topic.title}));site.append(crumbs);
 if(route.type==='forum-archive-topic'&&!topic){site.append(el(d,'p',{className:'uw-error',text:'Тема недоступна на текущую игровую дату.'}));return site;}
 if(topic){
  site.append(el(d,'h1',{text:topic.title}),el(d,'p',{className:'uw-archive-summary',text:topic.sourceTitle+' · в выборке '+topic.total+' сообщений. Номера ниже относятся к нашей выборке.'}));
  const pager=()=>{const nav=el(d,'nav',{className:'uw-forum-pagination',attributes:{'aria-label':'Страницы архивной выборки'}});nav.append(el(d,'span',{text:'Страница '+topic.page+' из '+topic.pages}));for(let i=1;i<=topic.pages;i++){const control=button(d,String(i),()=>navigate('underweb://forum/archive/topic/'+topic.id+'?page='+i),{'aria-label':'Страница архива '+i});if(i===topic.page){control.disabled=true;control.setAttribute('aria-current','page');}nav.append(control);}return nav;};
  site.append(pager());
  for(const [i,post]of topic.posts.entries()){
   const article=el(d,'article',{className:'uw-forum-post',dataset:{postId:post.id}}),author=el(d,'aside',{className:'uw-forum-author'});author.append(el(d,'strong',{text:post.author}),el(d,'small',{text:'Ник в источнике'}));
   const main=el(d,'div',{className:'uw-forum-message'}),meta=el(d,'header');meta.append(el(d,'time',{text:dateLabel(post.date)+' · '+post.time,attributes:{datetime:post.date+'T'+post.time}}),el(d,'span',{text:'Выборка #'+((topic.page-1)*6+i+1)}));main.append(meta,el(d,'small',{className:'uw-archive-post-kind',text:post.kind==='excerpt'?'Короткая цитата из источника':'Пересказ сообщения · редакция архива'}));
   main.append(el(d,post.kind==='excerpt'?'blockquote':'p',{className:'uw-forum-body',text:post.body}),sourceLink(d,post));article.append(author,main);site.append(article);
  }
  site.append(pager(),el(d,'p',{className:'uw-archive-readonly',text:'Обсуждение сохранено как исторический источник. Ответы и цитирование в игровую переписку здесь недоступны.'}));
 }else{
  site.append(el(d,'h1',{text:board?.title??'Форум: историческая читальня'}),el(d,'p',{className:'uw-archive-summary',text:board?.description??'Открой раздел или тему. Показываем только сообщения, опубликованные к текущему дню игры; выборка пополняется по мере движения календаря.'}));
  if(!board){const directory=el(d,'nav',{className:'uw-archive-directory',attributes:{'aria-label':'Разделы исторического архива'}});for(const b of archiveBoardsForDay(day)){const cell=el(d,'div');cell.append(button(d,b.title,()=>navigate('underweb://forum/archive?board='+b.id)),el(d,'small',{text:b.description}));directory.append(cell);}site.append(directory);}
  const topics=archiveTopicsForDay(boardId,day),table=el(d,'table',{className:'uw-forum-table'}),thead=el(d,'thead'),tr=el(d,'tr');for(const title of ['Тема / источник','В выборке','Последняя дата'])tr.append(el(d,'th',{text:title}));thead.append(tr);table.append(thead);const body=el(d,'tbody');
  for(const t of topics){const row=el(d,'tr'),info=el(d,'td'),count=el(d,'td',{text:String(t.total)}),last=el(d,'td');info.append(button(d,t.title,()=>navigate('underweb://forum/archive/topic/'+t.id)),el(d,'small',{text:FORUM_ARCHIVE_BOARDS.find(b=>b.id===t.boardId).title}),sourceLink(d,t));last.append(el(d,'time',{text:dateLabel(t.last.date)}),el(d,'strong',{text:t.last.author}),button(d,'К последнему →',()=>navigate('underweb://forum/archive/topic/'+t.id+'?page=999')));row.append(info,count,last);body.append(row);}table.append(body);site.append(table);
  if(!topics.length)site.append(el(d,'p',{text:'В этом разделе пока нет сообщений, доступных на текущую дату.'}));
 }
 site.append(el(d,'footer',{className:'uw-forum-footer',text:'Hip-Hop.ru · исторические источники · короткие выдержки и пересказ · игровое оформление'}));return site;
}
