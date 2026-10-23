import {mountSocialFeed} from './social-feed-page.js?rev=58';
import {pcElement as el} from './virtual-pc-dom.js?rev=58';
import {communityById,profileById} from './social-catalog.js?rev=58';
import {normalizeSocial,subscribeCommunity} from './social-state.js?rev=58';
import {socialAvatar,socialButton,socialHeading,socialPost,socialLink} from './social-dom.js?rev=58';
import {socialImageUrl,recoverableSocialImage} from './social-image.js?rev=58';
import {createSocialResultView} from './social-result-view.js?rev=58';
import {registerBattle,battleDeadlineLabel,metadataGameMinute} from './social-registration.js?rev=58';
import {currentBattleWindow,canSubmitToBattleWindow} from './battle-windows.js?rev=58';
import {publicTournamentTrackIds,publicRoundTable} from './battle-results-table.js?rev=58';
import {publicRoundAnnouncements} from './round-topics.js?rev=58';
import {createRoundAnnouncementView} from './round-announcement-view.js?rev=58';
import {publicCommunityPosts,publicAnnouncedJudges} from './social-community-publications.js?rev=58';
import {gameDateTimeLabel} from './home-calendar.js?rev=58';
import {createPostReactionsView} from './social-reactions-view.js?rev=58';
import {battleStage,battleStageText} from './battle-stage.js?rev=58';

export function createSocialCommunityView(d,{id,getState,getMetadata=()=>({}),navigate,commit,audio,expandedResults=new Set(),onResultViewed,onRegistered=()=>{},uiState={}}){
 const c=communityById(id),root=el(d,'section',{className:'sn-community'});if(!c)return root;
 const state=getState(),nowMinute=metadataGameMinute(getMetadata()),subscribed=normalizeSocial(state.social).subscriptions.includes(id);
 const window=c.battleId?currentBattleWindow(state,c.battleId,nowMinute):null,deadline=battleDeadlineLabel(window,nowMinute);
 const announcements=publicRoundAnnouncements(state,{battleId:c.battleId,nowMinute}).sort((a,b)=>b.at-a.at),current=announcements[0];
 const cover=el(d,'div',{className:'sn-community-cover',attributes:{'aria-label':'Обложка сообщества: '+c.name}});
 cover.style.setProperty('--community-color',c.avatar.color??'#526a82');
 if(c.avatar.src){const image=el(d,'img',{attributes:{src:socialImageUrl(c.avatar.src),alt:'',decoding:'async'}});cover.append(image);recoverableSocialImage(d,image,cover,'Обложка сообщества: '+c.name);}
 else cover.append(el(d,'span',{className:'sn-community-cover-mark',text:c.avatar.mark,attributes:{'aria-hidden':'true'}}));
 root.append(cover);

 const header=el(d,'header',{className:'sn-community-header'}),intro=el(d,'div',{className:'sn-community-intro'}),actions=el(d,'div',{className:'sn-actions sn-community-actions'});
 intro.append(socialHeading(d,c.name),el(d,'p',{text:c.description}));
 actions.append(socialButton(d,subscribed?'Вы подписаны':'Подписаться',()=>commit(subscribeCommunity(getState(),id,!subscribed,{nowMinute:metadataGameMinute(getMetadata())}))));
 if(c.battleId&&subscribed){
  const registered=state.battleApplications?.some(a=>a.battleId===c.battleId);
  const register=socialButton(d,registered?'Сдать трек':'Зарегистрироваться',()=>{
   if(registered){navigate('underweb://social/dialog/'+id);return;}
   const result=registerBattle(getState(),{battleId:c.battleId,playerName:getMetadata().playerName,nowMinute:metadataGameMinute(getMetadata())});if(commit(result))onRegistered(c.battleId);
  });
  register.disabled=registered?!deadline.open||!canSubmitToBattleWindow(state,window):Boolean(window)&&!deadline.open;
  actions.append(register);
 }
 header.append(socialAvatar(d,c.avatar,c.name),intro,actions);root.append(header);

 const columns=el(d,'div',{className:'sn-community-columns'}),main=el(d,'main',{className:'sn-community-main'}),side=el(d,'aside',{className:'sn-community-sidebar'});
 const information=el(d,'section',{className:'sn-community-information',dataset:{communityPanel:'information'},attributes:{role:'tabpanel',id:'community-'+id+'-information','aria-labelledby':'community-'+id+'-information-tab'}});
 const tables=el(d,'section',{className:'sn-community-tables',dataset:{communityPanel:'tables'},attributes:{role:'tabpanel',id:'community-'+id+'-tables','aria-labelledby':'community-'+id+'-tables-tab'}});
 const tabs=el(d,'nav',{className:'sn-community-tabs',attributes:{role:'tablist','aria-label':'Материалы сообщества'}}),tabButtons=[];
 if(uiState.communityId!==id){uiState.communityId=id;uiState.tab='information';uiState.visibleCount=3;}
 if(!c.battleId||!['information','tables'].includes(uiState.tab))uiState.tab='information';
 const selectTab=tab=>{
  uiState.tab=tab;information.hidden=tab!=='information';tables.hidden=tab!=='tables';
  for(const [key,button]of tabButtons){button.setAttribute('aria-selected',String(key===tab));button.setAttribute('tabindex',key===tab?'0':'-1');}
 };
 for(const [key,title]of [['information','Актуальная информация'],...(c.battleId?[['tables','Таблицы раунда']]:[])]){
  const button=socialButton(d,title,()=>selectTab(key),{className:'sn-community-tab',attributes:{role:'tab',id:'community-'+id+'-'+key+'-tab','aria-controls':'community-'+id+'-'+key}});
  button.addEventListener('keydown',event=>{
   const index=tabButtons.findIndex(([name])=>name===key),next=event.key==='Home'?0:event.key==='End'?tabButtons.length-1:event.key==='ArrowRight'?(index+1)%tabButtons.length:event.key==='ArrowLeft'?(index+tabButtons.length-1)%tabButtons.length:null;
   if(next===null)return;event.preventDefault();selectTab(tabButtons[next][0]);tabButtons[next][1].focus();
  });tabButtons.push([key,button]);tabs.append(button);
 }
 main.append(tabs,information,tables);selectTab(uiState.tab);
 const details=el(d,'div',{className:'sn-community-details'});details.append(el(d,'p',{text:c.description}));
 if(c.battleId){const stage=battleStage(state,{battleId:c.battleId,nowMinute});details.append(el(d,'p',{className:'sn-community-deadline',text:window?battleStageText(stage):'Зарегистрируйся, чтобы открыть приём работ на семь игровых дней.'}));if(window)details.append(socialLink(d,'Таблица '+(stage.roundId==='selection'?'отбора':'раунда'),stage.tableUrl,navigate));}
 information.append(details);

 const members=el(d,'section',{className:'sn-community-card sn-community-members'});members.append(socialHeading(d,'Участники',c.memberCount+Number(subscribed)));
 const memberGrid=el(d,'div',{className:'sn-community-member-grid'});
 for(const memberId of c.members){const p=profileById(memberId);if(!p)continue;const member=el(d,'div',{className:'sn-member'});member.append(socialAvatar(d,p.avatar,p.name),socialButton(d,p.name,()=>navigate('underweb://social/profile/'+memberId),{className:'sn-link'}));memberGrid.append(member);}
 members.append(memberGrid);side.append(members);
 if(c.battleId){
  const links=el(d,'section',{className:'sn-community-card sn-community-links'});links.append(socialHeading(d,'Ссылки'),socialLink(d,'Правила баттла','underweb://battles/'+c.battleId+'/rules',navigate));side.append(links);
  tables.append(socialHeading(d,'Таблицы раунда'));
  const currentRound=window?.roundId??current?.roundId??'selection',table=publicRoundTable(state,{battleId:c.battleId,roundId:currentRound,nowMinute});
  const rounds=table.availableRounds.length?table.availableRounds:[{id:'selection',title:'Отбор'}];
  for(const round of rounds){
   const published=publicRoundTable(state,{battleId:c.battleId,roundId:round.id,nowMinute}),row=el(d,'article',{className:'sn-community-round-table'});
   row.append(socialLink(d,round.title,'underweb://social/results/'+c.battleId+'/'+round.id,navigate),el(d,'p',{text:published.message}));tables.append(row);
  }
 }

 const reactions=(postId,collapseComments=false)=>createPostReactionsView(d,{postId,state,getState,nowMinute,commit,collapseComments});
 const administratorPost=(node,{label=false}={})=>{
  const content=el(d,'div',{className:'sn-community-post-content'}),children=[...node.children];
  if(label)content.append(el(d,'strong',{className:'sn-community-post-author',text:c.name+' · организаторы'}));
  content.append(...children);
  const avatar=socialLink(d,'','underweb://social/community/'+id,navigate);avatar.className+=' sn-community-post-avatar';avatar.setAttribute('aria-label','Открыть сообщество: '+c.name);avatar.append(socialAvatar(d,c.avatar,c.name));
  node.replaceChildren(avatar,content);node.className+=' sn-community-admin-post';return node;
 };
 if(c.battleId){
  const pinned=current?createRoundAnnouncementView(d,current,{navigate,stage:battleStage(state,{battleId:c.battleId,nowMinute})}):el(d,'article',{className:'sn-post sn-round-announcement'});pinned.className+=' sn-pinned-announcement';pinned.dataset.pinnedAnnouncement='true';pinned.setAttribute('aria-label','Закреплённый анонс');
  if(current)pinned.append(reactions(current.id,true));else pinned.append(el(d,'h3',{text:'Текущий раунд'}),el(d,'p',{text:window?deadline.text:'Информация о раунде появится здесь после объявления.'}));
  information.append(administratorPost(pinned,{label:true}));
 }
 const wall=el(d,'section',{className:'sn-community-wall',attributes:{'aria-label':'Стена группы'}});wall.append(socialHeading(d,'Стена группы'));
 const wallPosts=publicCommunityPosts(state,{communityId:id,nowMinute}).sort((a,b)=>b.at-a.at||(a.kind==='static'&&b.kind==='static'?c.history.findIndex(p=>p.id===b.id)-c.history.findIndex(p=>p.id===a.id):b.id.localeCompare(a.id)));
 const judges=new Map(publicAnnouncedJudges(state,{battleId:c.battleId,nowMinute}).map(j=>[j.id,j]));
 mountSocialFeed(wall,{posts:wallPosts,uiState,pinnedId:current?.id,renderPost:post=>{
  const staticPost=c.history.find(p=>p.id===post.id),node=socialPost(d,{...staticPost,...post,date:staticPost?.date??gameDateTimeLabel(post.at)},{author:post.authorName,navigate,profileById,reactions:state.socialReactions?.plans?.[post.id]?reactions(post.id):null});
  node.dataset.communityPost=post.id;
  if(post.kind==='round-theme')node.append(socialLink(d,'Таблица раунда','underweb://social/results/'+c.battleId+'/'+post.roundId,navigate));
  if(post.kind==='judge-announcement'){
   const judge=judges.get(post.judgeId),index=judge?post.body.indexOf(judge.name):-1;
   if(index>=0){const body=node.children[2];body.textContent='';body.append(el(d,'span',{text:post.body.slice(0,index)}),socialLink(d,judge.name,judge.profileUrl,navigate),el(d,'span',{text:post.body.slice(index+judge.name.length)}));}
  }
  return administratorPost(node);
 }});
 information.append(wall);columns.append(main,side);root.append(columns);

 const archive=el(d,'section',{className:'sn-community-archive',attributes:{'aria-label':'Аудиотека группы'}});
 const publicIds=publicTournamentTrackIds(state,{battleId:c.battleId,nowMinute}),versions=(state.communityAudio?.[id]??[]).filter(id=>!state.trackVersions?.byId?.[id]?.npc||publicIds.has(id));
 archive.append(socialHeading(d,'Аудиотека'),socialHeading(d,'Работы текущего сезона',versions.length));
 for(const submission of state.battleSubmissions??[])if(submission.communityId===id&&submission.status!=='recovery')archive.append(createSocialResultView(d,{submission,getState,commit,expandedResults,onResultViewed}));
 for(const versionId of versions)archive.append(audio.row(d,{version:state.trackVersions?.byId?.[versionId]}));
 if(c.audio.length)archive.append(socialHeading(d,'Игровые фоновые записи · прошлый сезон',c.audio.length),el(d,'p',{className:'sn-note',text:'Вымышленные авторы и домашние демо. Это не заявки текущего отбора и не записи реальных участников.'}));
 for(const item of c.audio)archive.append(audio.row(d,{item}));
 if(c.battleId)archive.append(el(d,'p',{className:'sn-note',text:'Новые работы участников публикуются после окончания приёма. Прикрепление и ответ администратора не публикуют трек.'}));
 root.append(archive);return root;
}
