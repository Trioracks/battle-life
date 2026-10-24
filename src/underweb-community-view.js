import {pcElement as el,pcButton} from './virtual-pc-dom.js?rev=60';
import {COMMUNITY_BOARDS,COMMUNITY_REPLY_LIMIT,normalizeCommunity,communityDay,topicsForDay,topicForDay,replyToTopic} from './underweb-community.js?rev=60';
import {homeDateLabel} from './home-calendar.js?rev=60';
import {createForumArchiveView} from './underweb-forum-archive-view.js?rev=60';
import {publicRoundAnnouncements} from './round-topics.js?rev=60';
import {metadataGameMinute} from './social-registration.js?rev=60';
import {createRoundAnnouncementView} from './round-announcement-view.js?rev=60';
import {publicSeedingPosts} from './social-reactions.js?rev=60';
import {createPostReactionsView} from './social-reactions-view.js?rev=60';
const button=(d,text,fn,attributes={})=>pcButton(d,text,{className:'uw-control uw-forum-link',attributes},fn);
export function createCommunityView(d,{route,getState,getMetadata,onChange,navigate}){
 const day=communityDay(getMetadata().gameDay),state=normalizeCommunity(getState().community);
 if(route.type.startsWith('forum-archive'))return createForumArchiveView(d,{route,day,navigate});
 const site=el(d,'section',{className:'uw-community',attributes:{'aria-label':'Форум Подземка'}}),head=el(d,'header',{className:'uw-forum-header'});
 head.append(button(d,'подземка / forum',()=>navigate('underweb://forum')),el(d,'span',{text:'СЛОВО. ЗВУК. СПОР.'}),el(d,'small',{text:'Сейчас в игре: '+homeDateLabel(day)}));site.append(head);
 const switcher=el(d,'nav',{className:'uw-forum-sections',attributes:{'aria-label':'Режим форума'}});switcher.append(button(d,'Игровой форум',()=>navigate('underweb://forum'),{'aria-current':'page'}),button(d,'Исторический архив Hip-Hop.ru',()=>navigate('underweb://forum/archive')));site.append(switcher);
 site.append(el(d,'p',{className:'uw-fiction-notice',text:'Вымышленный игровой форум. Ники и разговоры придуманы; ответы сохраняются только в твоей игре.'}));
 const topic=route.type==='forum-topic'?topicForDay(route.topic.id,day,state,route.page):null;
 const board=route.board??COMMUNITY_BOARDS.find(b=>b.id===topic?.boardId);
 if(board?.id==='makarevich-1'){const s=getState(),nowMinute=metadataGameMinute(getMetadata()),reaction=postId=>createPostReactionsView(d,{postId:postId+':forum',state:s,nowMinute});for(const post of publicRoundAnnouncements(s,{nowMinute}).reverse()){const node=createRoundAnnouncementView(d,post,{navigate});node.append(reaction(post.id));site.append(node);}for(const p of publicSeedingPosts(s,nowMinute)){const node=el(d,'article',{className:'uw-forum-post'});node.append(el(d,'div',{text:p.body}),reaction(p.id));site.append(node);}}
 const crumbs=el(d,'nav',{className:'uw-forum-crumbs',attributes:{'aria-label':'Путь по форуму'}});crumbs.append(button(d,'Подземка',()=>navigate('underweb://forum')));
 if(board)crumbs.append(el(d,'span',{text:'›'}),button(d,board.title,()=>navigate('underweb://forum/'+board.id)));
 if(topic)crumbs.append(el(d,'span',{text:'›'}),el(d,'span',{text:topic.title}));site.append(crumbs);
 if(topic){
  if((state.readTopics[topic.id]??0)<day)onChange?.({...getState(),community:{...state,readTopics:{...state.readTopics,[topic.id]:day}}});
  const title=el(d,'div',{className:'uw-forum-title'});title.append(el(d,'h1',{text:topic.title}));if(board.category==='battles')title.append(button(d,'Сайт баттла →',()=>navigate('underweb://battles/'+board.id)));site.append(title);
  const pager=()=>{const nav=el(d,'nav',{className:'uw-forum-pagination',attributes:{'aria-label':'Страницы темы'}});nav.append(el(d,'span',{text:'Страница '+topic.page+' из '+topic.pages+' · '+topic.total+' сообщений'}));for(let i=1;i<=topic.pages;i++)if(i===1||i===topic.pages||Math.abs(i-topic.page)<=2){const b=button(d,String(i),()=>navigate('underweb://forum/topic/'+topic.id+'?page='+i),{'aria-label':'Страница темы '+i});if(i===topic.page){b.disabled=true;b.setAttribute('aria-current','page');}nav.append(b);}return nav;};
  site.append(pager());
  for(const [i,post]of topic.posts.entries()){
   const number=(topic.page-1)*6+i+1,article=el(d,'article',{className:'uw-forum-post',dataset:{postId:post.id}}),author=el(d,'aside',{className:'uw-forum-author'});
   author.append(el(d,'strong',{text:post.author}),el(d,'span',{className:'uw-forum-avatar',text:post.author.replaceAll('_',' ').split(' ').map(v=>v[0]).join('').slice(0,2).toUpperCase(),attributes:{'aria-hidden':'true'}}),el(d,'small',{text:post.role??'участник'}));
   const main=el(d,'div',{className:'uw-forum-message'}),meta=el(d,'header');meta.append(el(d,'time',{text:homeDateLabel(post.gameDay)}),el(d,'span',{text:'#'+number}));main.append(meta);
   const quote=post.quoteId&&topic.allPosts.find(p=>p.id===post.quoteId);
   if(quote){const block=el(d,'blockquote');block.append(el(d,'strong',{text:quote.author+' написал:'}),el(d,'p',{text:quote.body}));main.append(block);}
   main.append(el(d,'p',{className:'uw-forum-body',text:post.body}),el(d,'small',{className:'uw-forum-signature',text:post.signature??'Участник локальной сцены.'}),button(d,'Цитата',()=>{
    const current=normalizeCommunity(getState().community),draft=current.drafts[topic.id]??{body:''};
    onChange?.({...getState(),community:{...current,drafts:{...current.drafts,[topic.id]:{...draft,quoteId:post.id}}}});quoteId=post.id;showQuote();input.focus();
   },{'aria-label':'Цитировать сообщение '+number}));article.append(author,main);site.append(article);
  }
  site.append(pager());
  const draft=normalizeCommunity(getState().community).drafts[topic.id]??{body:'',quoteId:null};let quoteId=draft.quoteId;
  const form=el(d,'form',{className:'uw-forum-reply'}),preview=el(d,'div',{className:'uw-reply-quote'}),input=el(d,'textarea',{value:draft.body,attributes:{'aria-label':'Ваш ответ',maxlength:'4000',rows:'5',placeholder:'Ответить по теме…'}}),error=el(d,'p',{className:'uw-form-error',attributes:{'aria-live':'polite'}});
  function persist(){const current=normalizeCommunity(getState().community);onChange?.({...getState(),community:{...current,drafts:{...current.drafts,[topic.id]:{body:input.value,quoteId}}}});}
  function showQuote(){preview.replaceChildren();if(!quoteId)return;const source=topic.allPosts.find(p=>p.id===quoteId);preview.append(el(d,'span',{text:source?'Ответ с цитатой: '+source.author:'Цитата недоступна на эту дату'}),button(d,'Убрать цитату',()=>{quoteId=null;persist();showQuote();}));}
  function submit(){const result=replyToTopic(getState().community,{topicId:topic.id,author:getMetadata().playerName||'Участник',body:input.value,gameDay:communityDay(getMetadata().gameDay),quoteId});if(!result.ok){error.textContent=result.reason;return;}onChange?.({...getState(),community:result.community});navigate('underweb://forum/topic/'+topic.id+'?page=999');}
  input.addEventListener('input',persist);form.addEventListener('submit',event=>{event.preventDefault();submit();});
  form.append(el(d,'h2',{text:'Быстрый ответ'}),el(d,'small',{text:'От имени '+(getMetadata().playerName||'Участник')+' · '+homeDateLabel(day)}),el(d,'small',{text:'Ответов в сохранении: '+state.replies.length+' / '+COMMUNITY_REPLY_LIMIT+'. После достижения лимита история остаётся доступной, новые ответы не отправляются.'}),preview,input,error,button(d,'Отправить ответ',submit));site.append(form);showQuote();
 }else{
  const title=el(d,'div',{className:'uw-forum-title'});title.append(el(d,'h1',{text:board?.title??'Музыка, сцена и разговоры'}));if(board?.category==='battles')title.append(button(d,'Сайт баттла →',()=>navigate('underweb://battles/'+board.id)));site.append(title);
  if(board)site.append(el(d,'p',{className:'uw-forum-board-description',text:board.description}));
  const table=el(d,'table',{className:'uw-forum-table'}),thead=el(d,'thead'),tr=el(d,'tr');for(const name of [board?'Тема':'Раздел','Ответы','Последнее сообщение'])tr.append(el(d,'th',{text:name}));thead.append(tr);table.append(thead);const tbody=el(d,'tbody');
  const groups=board?topicsForDay(board.id,day,state):COMMUNITY_BOARDS.map(b=>{const topics=topicsForDay(b.id,day,state),last=topics.map(t=>t.last).sort((a,b)=>b.gameDay-a.gameDay)[0];return {...b,replies:topics.reduce((n,t)=>n+t.replies,0),last,unread:topics.some(t=>t.unread)};});
  const categories={battles:'Локальные баттлы',music:'Рэп и релизы',workshop:'Рабочая комната',culture:'Хип-хоп культура',lounge:'За пределами трека'};let category;
  for(const item of groups){if(!board&&category!==item.category){category=item.category;const divider=el(d,'tr',{className:'uw-forum-category'});divider.append(el(d,'th',{text:categories[category],attributes:{colspan:'3',scope:'colgroup'}}));tbody.append(divider);}const row=el(d,'tr'),info=el(d,'td'),summary=el(d,'td'),latest=el(d,'td');info.append(el(d,'span',{className:'uw-forum-indicator'+(item.unread?' unread':''),text:item.pinned?'!':'●',attributes:{'aria-label':item.unread?'Есть непрочитанные сообщения':'Прочитано'}}),button(d,(item.pinned?'Важно: ':'')+item.title,()=>navigate(board?'underweb://forum/topic/'+item.id:'underweb://forum/'+item.id)),el(d,'small',{text:board?'Автор: '+item.author:item.description}));summary.append(el(d,'strong',{text:String(item.replies)}));if(item.last)latest.append(el(d,'span',{text:homeDateLabel(item.last.gameDay)}),el(d,'strong',{text:item.last.author}),button(d,'К последнему →',()=>navigate('underweb://forum/topic/'+item.last.topicId+'?page=999')));else latest.append(el(d,'small',{text:'Пока нет сообщений'}));row.append(info,summary,latest);tbody.append(row);}table.append(tbody);site.append(table);
 }
 site.append(el(d,'footer',{className:'uw-forum-footer',text:'Подземка · Локальная игровая сеть · Спорь о работе, уважай участников.'}));return site;
}
