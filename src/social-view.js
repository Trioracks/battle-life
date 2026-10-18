import {pcElement as el,pcFind} from './virtual-pc-dom.js?rev=43';
import {SOCIAL_SECTIONS} from './social-catalog.js?rev=43';
import {listCommunities} from './social-state.js?rev=43';
import {socialAvatar,socialButton,socialHeading,showRegistrationNotice} from './social-dom.js?rev=43';
import {createSocialAudio} from './social-audio-view.js?rev=47';
import {createSocialProfileView} from './social-profile-view.js?rev=47';
import {createSocialCommunityView} from './social-community-view.js?rev=47';
import {mountSocialDialog} from './social-dialog-view.js?rev=47';
import {SOCIAL_IDENTITY} from './social-identity.js?rev=43';
import {mountSocialMessages} from './social-messages-view.js?rev=43';
import {unreadDialogCount} from './social-personal.js?rev=43';
import {markDialogRead} from './social-submission.js?rev=47';
import {battleDeadlineLabel,metadataGameMinute} from './social-registration.js?rev=47';
import {publicRoundTable} from './battle-results-table.js?rev=43';
import {createBattleResultsTableView} from './battle-results-table-view.js?rev=43';
import {reactionVisibilitySignature} from './social-reactions-view.js?rev=43';
import {communityUnreadCounts,publicCommunityPosts,markCommunitySeen} from './social-community-publications.js?rev=43';
export function mountSocial(root,{route,getState,getMetadata=()=>({}),onChange,navigate,audio,onStudyTarget=()=>{},onResultViewed=()=>{},isVisible=()=>true}){
 const d=root.ownerDocument,shell=el(d,'section',{className:'sn-network',attributes:{'aria-label':SOCIAL_IDENTITY.name}}),head=el(d,'header',{className:'sn-top'});
 const brand=el(d,'strong',{className:'sn-brand'});brand.append(el(d,'span',{className:'sn-brandmark',text:SOCIAL_IDENTITY.mark}),el(d,'b',{text:SOCIAL_IDENTITY.name}));
 head.append(brand,el(d,'span',{className:'sn-tagline',text:'Друзья. Знакомые. Наши истории.'}));
 const grid=el(d,'div',{className:'sn-layout'}),nav=el(d,'nav',{className:'sn-nav',attributes:{'aria-label':'Разделы: '+SOCIAL_IDENTITY.name}}),content=el(d,'div',{className:'sn-content'}),message=el(d,'p',{className:'sn-message',attributes:{'aria-live':'polite'}});
 for(const [id,title]of SOCIAL_SECTIONS)nav.append(socialButton(d,title,()=>navigate('underweb://social/'+id),{className:'sn-nav-link',dataset:{socialSection:id},attributes:route.section===id?{'aria-current':'page'}:{}}));
 grid.append(nav,content);shell.append(head,grid,message,el(d,'footer',{className:'sn-footer',text:SOCIAL_IDENTITY.name+' · '+SOCIAL_IDENTITY.year+' · Вымышленная локальная сеть'}));root.replaceChildren(shell);
 const playback=createSocialAudio(audio,{getState,getMetadata,navigate,onAnalyze:startAnalysis}),expandedResults=new Set(),tableUiState={};let last='',query='',disposed=false,dialogView=null,messagesView=null,tableView=null,tableWasVisible=isVisible(),lastUnread=-1,closeRegistration=null;
 function startAnalysis(options){if(disposed)return;if(!getState().software?.dossier?.installed){message.textContent='Для изучения нужен Рэп-досье. Скачай и установи приложение; результаты останутся в нём.';navigate('underweb://dump/dossier');return;}onStudyTarget(options);}
 let publicationCache=null,lastGroups=-1,readAttempt='';
 function publications(){const state=getState(),minute=Math.floor(metadataGameMinute(getMetadata())),refs=[state.social,state.tournaments,state.roundThemes,state.socialReactions];if(publicationCache?.minute===minute&&refs.every((v,i)=>v===publicationCache.refs[i]))return publicationCache;
  const posts=route.section==='community'?publicCommunityPosts(state,{communityId:route.communityId,nowMinute:minute}):[];
  return publicationCache={minute,refs,counts:communityUnreadCounts(state,{nowMinute:minute}),ids:posts.map(p=>p.id).join('|')};
 }
 function updateBadge(){for(const [section,title,count,previous]of [['messages','Мои сообщения',unreadDialogCount(getState()),lastUnread],['groups','Мои группы',publications().counts.total,lastGroups]]){if(count===previous)continue;if(section==='messages')lastUnread=count;else lastGroups=count;const link=pcFind(nav,n=>n.dataset?.socialSection===section);link.replaceChildren();link.textContent=title;link.setAttribute('aria-label',title);link.setAttribute('title',(section==='groups'?'Непрочитанных публикаций: ':'Непрочитанных диалогов: ')+count);if(count)link.append(el(d,'span',{className:'sn-unread-badge',text:'+'+count}));}}
 function readVisibleCommunity(){if(route.section!=='community')return;if(!isVisible()){readAttempt='';return;}const token=publications().ids;if(token===readAttempt)return;readAttempt=token;const result=markCommunitySeen(getState(),{communityId:route.communityId,nowMinute:metadataGameMinute(getMetadata())});if(result.state===getState())return;let saved;try{saved=onChange(result.state);}catch{saved=false;}if(saved===false||saved?.ok===false)message.textContent='Не удалось сохранить прочтение. Открой группу ещё раз.';updateBadge();}
 const signature=()=>JSON.stringify([publications().ids,publications().counts,reactionVisibilitySignature(getState(),metadataGameMinute(getMetadata())),Object.keys(getState().rapAnalysis?.reports??{}),getState().social,Object.keys(getState().trackVersions?.byId??{}),getState().communityAudio,getState().battleSubmissions,getState().battleApplications,getState().socialRuntime?.events,getState().battleKnowledge,getMetadata().playerName,getMetadata().portraitKey,(getState().battleWindows??[]).map(w=>battleDeadlineLabel(w,metadataGameMinute(getMetadata())))]);
 function commit(result){
  if(!result?.ok){message.textContent=result?.reason??'Не удалось выполнить действие.';return false;}
  let saved;try{saved=onChange(result.state);}catch{saved=false;}
  if(saved===false||saved?.ok===false){message.textContent='Не удалось сохранить изменение. Освободи место для сохранения и повтори.';return false;}
  message.textContent='';render();return true;
 }
 function groups(){
  const section=el(d,'section');section.append(socialHeading(d,'Мои группы',listCommunities(getState()).length));
  const input=el(d,'input',{className:'sn-search',value:query,attributes:{'aria-label':'Поиск групп',placeholder:'Название или интерес…'}}),list=el(d,'div');section.append(input,list);
  const fill=()=>{list.replaceChildren();for(const c of listCommunities(getState(),{query,nowMinute:metadataGameMinute(getMetadata())})){
   const card=el(d,'article',{className:'sn-group-card'}),info=el(d,'div');info.append(socialButton(d,c.name,()=>navigate('underweb://social/community/'+c.id),{className:'sn-link'}),el(d,'p',{text:c.description}),el(d,'small',{text:c.displayMemberCount+' участников'+(c.subscribed?' · Вы подписаны':'')}));
   if(c.unreadCount)info.append(el(d,'span',{className:'sn-unread-badge',text:'+'+c.unreadCount,attributes:{'aria-label':'Новых публикаций: '+c.unreadCount}}));card.append(socialAvatar(d,c.avatar,c.name),info);list.append(card);
  }if(!list.children.length)list.append(el(d,'p',{className:'sn-empty',text:'Групп по этому запросу нет.'}));};
  input.addEventListener('input',()=>{query=input.value;fill();});fill();return section;
 }
 function render(){
  updateBadge();
  if(dialogView){dialogView.update();last=signature();return;}
  if(messagesView){messagesView.update();last=signature();return;}
  const identity=n=>n?.dataset?.focusId||n?.getAttribute?.('aria-label'),focus=content.contains(d.activeElement)?d.activeElement:null,label=identity(focus),start=focus?.selectionStart,end=focus?.selectionEnd;
  const options={onAnalyze:startAnalysis,getState,getMetadata,navigate,commit,audio:playback,isVisible,onRegistered:id=>{closeRegistration?.();closeRegistration=showRegistrationNotice(shell,getState().battleApplications.find(a=>a.battleId===id).nickname,()=>navigate('underweb://social/dialog/'+id));},onRead:id=>commit(markDialogRead(getState(),id)),onResultViewed:id=>{pcFind(content,n=>n.dataset?.resultSummary===id)?.focus?.({preventScroll:true});onResultViewed(id);},expandedResults};
  let node;
  if(route.section==='groups')node=groups();
  else if(route.section==='results'){tableView?.dispose();node=tableView=createBattleResultsTableView(d,{...options,uiState:tableUiState,table:publicRoundTable(getState(),{battleId:route.battleId,roundId:route.roundId,nowMinute:metadataGameMinute(getMetadata())})});}
  else if(route.section==='community')node=createSocialCommunityView(d,{...options,id:route.communityId});
  else if(route.section==='messages'){messagesView=mountSocialMessages(d,options);node=messagesView.root;}
  else if(route.section==='dialog'){dialogView=mountSocialDialog(d,{...options,peer:route.peer,id:route.communityId??route.profileId});node=dialogView.root;}
  else node=createSocialProfileView(d,{...options,id:route.profileId??'me',view:route.section==='profile'?route.view:['friends','photos','audio'].includes(route.section)?route.section:'page'});
  playback.releaseRows(content);content.replaceChildren(node);tableView?.layout();readVisibleCommunity();last=signature();
  if(label){const field=pcFind(content,n=>identity(n)===label);field?.focus?.({preventScroll:true});if(Number.isInteger(start))field?.setSelectionRange?.(start,end);}
 }
 render();if(route.section==='me'||route.profileId==='me')void getMetadata().requestPlayerPortrait?.();return {tickOutgoingMessage:(dt,options)=>dialogView?.tickOutgoingMessage?.(dt,options),update(){if(disposed)return;if(last!==signature())render();else dialogView?.update();readVisibleCommunity();const visible=isVisible();if(visible&&!tableWasVisible)tableView?.layout();tableWasVisible=visible;updateBadge();},dispose(){disposed=true;closeRegistration?.();dialogView?.dispose();messagesView?.dispose();tableView?.dispose();playback.dispose();root.replaceChildren();}};
}
