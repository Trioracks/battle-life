import {pcElement as el,pcFind} from './virtual-pc-dom.js?rev=42';
import {SOCIAL_SECTIONS} from './social-catalog.js?rev=42';
import {listCommunities} from './social-state.js?rev=42';
import {socialAvatar,socialButton,socialHeading,showRegistrationNotice} from './social-dom.js?rev=42';
import {createSocialAudio} from './social-audio-view.js?rev=42';
import {createSocialProfileView} from './social-profile-view.js?rev=42';
import {createSocialCommunityView} from './social-community-view.js?rev=42';
import {mountSocialDialog} from './social-dialog-view.js?rev=42';
import {SOCIAL_IDENTITY} from './social-identity.js?rev=42';
import {mountSocialMessages} from './social-messages-view.js?rev=42';
import {unreadDialogCount} from './social-personal.js?rev=42';
import {markDialogRead} from './social-submission.js?rev=42';
import {battleDeadlineLabel,metadataGameMinute} from './social-registration.js?rev=42';
import {publicRoundTable} from './battle-results-table.js?rev=42';
import {createBattleResultsTableView} from './battle-results-table-view.js?rev=42';
import {startTrackStudy,pauseStudy,effectiveStudySkills} from './rap-analysis.js?rev=42';
import {createRapAnalysisView} from './rap-analysis-view.js?rev=42';
import {startJudgeStudy} from './judge-dossier-analysis.js?rev=42';
import {reactionVisibilitySignature} from './social-reactions-view.js?rev=42';
export function mountSocial(root,{route,getState,getMetadata=()=>({}),onChange,navigate,audio,onWork=()=>false,onResultViewed=()=>{},isVisible=()=>true}){
 const d=root.ownerDocument,shell=el(d,'section',{className:'sn-network',attributes:{'aria-label':SOCIAL_IDENTITY.name}}),head=el(d,'header',{className:'sn-top'});
 const brand=el(d,'strong',{className:'sn-brand'});brand.append(el(d,'span',{className:'sn-brandmark',text:SOCIAL_IDENTITY.mark}),el(d,'b',{text:SOCIAL_IDENTITY.name}));
 head.append(brand,el(d,'span',{className:'sn-tagline',text:'Друзья. Знакомые. Наши истории.'}));
 const grid=el(d,'div',{className:'sn-layout'}),nav=el(d,'nav',{className:'sn-nav',attributes:{'aria-label':'Разделы: '+SOCIAL_IDENTITY.name}}),content=el(d,'div',{className:'sn-content'}),message=el(d,'p',{className:'sn-message',attributes:{'aria-live':'polite'}});
 for(const [id,title]of SOCIAL_SECTIONS)nav.append(socialButton(d,title,()=>navigate('underweb://social/'+id),{className:'sn-nav-link',dataset:{socialSection:id},attributes:route.section===id?{'aria-current':'page'}:{}}));
 grid.append(nav,content);shell.append(head,grid,message,el(d,'footer',{className:'sn-footer',text:SOCIAL_IDENTITY.name+' · '+SOCIAL_IDENTITY.year+' · Вымышленная локальная сеть'}));root.replaceChildren(shell);
 const analysisRoot=el(d,'div'),playback=createSocialAudio(audio,{getState,getMetadata,navigate,onAnalyze:startAnalysis}),expandedResults=new Set(),tableUiState={};let last='',query='',disposed=false,dialogView=null,messagesView=null,tableView=null,tableWasVisible=isVisible(),lastUnread=-1,closeRegistration=null,selectedReportId=null;
 function startAnalysis(options){const m=getMetadata(),r=(options.judgeId?startJudgeStudy:startTrackStudy)(getState(),{...options,heroSnapshot:effectiveStudySkills(getState(),m.skills),nowMinute:metadataGameMinute(m)});if(!r.ok||r.alreadyStudied){message.textContent=r.reason;return;}selectedReportId=r.reportId??r.jobId;if(!commit(r))return;if(r.jobId&&!onWork()){commit({ok:true,state:pauseStudy(getState())});message.textContent='Изучение сохранено на паузе. Сначала сядь за компьютер.';}}
 function updateBadge(){const count=unreadDialogCount(getState());if(count===lastUnread)return;lastUnread=count;const link=pcFind(nav,n=>n.dataset?.socialSection==='messages');link.replaceChildren();link.textContent='Мои сообщения';link.setAttribute('aria-label','Мои сообщения');link.setAttribute('title','Непрочитанных диалогов: '+count);if(count)link.append(el(d,'span',{className:'sn-unread-badge',text:'+'+count}));}
 const signature=()=>JSON.stringify([reactionVisibilitySignature(getState(),metadataGameMinute(getMetadata())),getState().rapAnalysis,getState().social,Object.keys(getState().trackVersions?.byId??{}),getState().communityAudio,getState().battleSubmissions,getState().battleApplications,getState().socialRuntime?.events,getState().battleKnowledge,getMetadata().playerName,getMetadata().portraitKey,(getState().battleWindows??[]).map(w=>battleDeadlineLabel(w,metadataGameMinute(getMetadata())))]);
 function commit(result){
  if(!result?.ok){message.textContent=result?.reason??'Не удалось выполнить действие.';return false;}
  let saved;try{saved=onChange(result.state);}catch{saved=false;}
  if(saved===false||saved?.ok===false){message.textContent='Не удалось сохранить изменение. Освободи место для сохранения и повтори.';return false;}
  message.textContent='';render();return true;
 }
 function groups(){
  const section=el(d,'section');section.append(socialHeading(d,'Мои группы',listCommunities(getState()).length));
  const input=el(d,'input',{className:'sn-search',value:query,attributes:{'aria-label':'Поиск групп',placeholder:'Название или интерес…'}}),list=el(d,'div');section.append(input,list);
  const fill=()=>{list.replaceChildren();for(const c of listCommunities(getState(),{query})){
   const card=el(d,'article',{className:'sn-group-card'}),info=el(d,'div');info.append(socialButton(d,c.name,()=>navigate('underweb://social/community/'+c.id),{className:'sn-link'}),el(d,'p',{text:c.description}),el(d,'small',{text:c.displayMemberCount+' участников'+(c.subscribed?' · Вы подписаны':'')}));
   card.append(socialAvatar(d,c.avatar,c.name),info);list.append(card);
  }if(!list.children.length)list.append(el(d,'p',{className:'sn-empty',text:'Групп по этому запросу нет.'}));};
  input.addEventListener('input',()=>{query=input.value;fill();});fill();return section;
 }
 function render(){
  updateBadge();
  analysisRoot.replaceChildren(createRapAnalysisView(d,{getState,onStart:startAnalysis,commit,selectedReportId,navigate}));
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
  playback.releaseRows(content);content.replaceChildren(analysisRoot,node);tableView?.layout();last=signature();
  if(label){const field=pcFind(content,n=>identity(n)===label);field?.focus?.({preventScroll:true});if(Number.isInteger(start))field?.setSelectionRange?.(start,end);}
 }
 render();if(route.section==='me'||route.profileId==='me')void getMetadata().requestPlayerPortrait?.();return {tickOutgoingMessage:(dt,options)=>dialogView?.tickOutgoingMessage?.(dt,options),update(){if(disposed)return;if(last!==signature())render();else dialogView?.update();const visible=isVisible();if(visible&&!tableWasVisible)tableView?.layout();tableWasVisible=visible;updateBadge();},dispose(){disposed=true;closeRegistration?.();dialogView?.dispose();messagesView?.dispose();tableView?.dispose();playback.dispose();root.replaceChildren();}};
}
