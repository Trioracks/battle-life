import {pcElement as el} from './virtual-pc-dom.js?rev=42';
import {communityById,profileById} from './social-catalog.js?rev=42';
import {normalizeSocial,subscribeCommunity} from './social-state.js?rev=42';
import {socialAvatar,socialButton,socialHeading,socialPost,socialLink} from './social-dom.js?rev=42';
import {createSocialResultView} from './social-result-view.js?rev=42';
import {registerBattle,battleDeadlineLabel,metadataGameMinute} from './social-registration.js?rev=42';
import {currentBattleWindow,canSubmitToBattleWindow} from './battle-windows.js?rev=42';
import {publicTournamentTrackIds} from './battle-results-table.js?rev=42';
import {publicRoundAnnouncements} from './round-topics.js?rev=42';
import {createRoundAnnouncementView} from './round-announcement-view.js?rev=42';
import {publicSeedingPosts,publicJudgeAnnouncements} from './social-reactions.js?rev=42';
import {createPostReactionsView} from './social-reactions-view.js?rev=42';
export function createSocialCommunityView(d,{id,getState,getMetadata=()=>({}),navigate,commit,audio,expandedResults=new Set(),onResultViewed,onRegistered=()=>{}}){
 const c=communityById(id),root=el(d,'section',{className:'sn-community'});if(!c)return root;
 const state=getState(),subscribed=normalizeSocial(state.social).subscriptions.includes(id),header=el(d,'header',{className:'sn-community-header'});
 const intro=el(d,'div',{className:'sn-community-intro'}),identity=el(d,'aside',{className:'sn-community-identity'});intro.append(socialHeading(d,c.name),el(d,'p',{text:c.description}));identity.append(socialAvatar(d,c.avatar,c.name,true),el(d,'small',{text:(c.memberCount+Number(subscribed))+' участников'}));header.append(intro,identity);root.append(header);
 const actions=el(d,'div',{className:'sn-actions'});actions.append(socialButton(d,subscribed?'Вы подписаны':'Подписаться',()=>commit(subscribeCommunity(getState(),id,!subscribed))));
 if(c.battleId){const registered=state.battleApplications?.some(a=>a.battleId===c.battleId),window=currentBattleWindow(state,c.battleId,metadataGameMinute(getMetadata())),deadline=battleDeadlineLabel(window,metadataGameMinute(getMetadata()));const register=socialButton(d,registered?'Сдать трек':'Зарегистрироваться',()=>{if(registered){navigate('underweb://social/dialog/'+id);return;}const result=registerBattle(getState(),{battleId:c.battleId,playerName:getMetadata().playerName,nowMinute:metadataGameMinute(getMetadata())});if(commit(result))onRegistered(c.battleId);});register.disabled=Boolean(window)&&(!deadline.open||registered&&!canSubmitToBattleWindow(state,window));actions.append(register);}intro.append(actions);
 const columns=el(d,'div',{className:'sn-community-columns'}),wall=el(d,'main',{attributes:{'aria-label':'Стена группы'}}),side=el(d,'aside'),archive=el(d,'section',{className:'sn-community-archive',attributes:{'aria-label':'Аудиоархив группы'}});
 if(c.battleId){
  const window=currentBattleWindow(state,c.battleId,metadataGameMinute(getMetadata()));
  const links=el(d,'nav',{className:'sn-group-links',attributes:{'aria-label':'Материалы группы'}});links.append(socialLink(d,'Правила баттла','underweb://battles/'+c.battleId+'/rules',navigate),socialLink(d,'Таблица судейства','underweb://social/results/'+c.battleId+'/'+(window?.roundId??'selection'),navigate));intro.append(links);
 }
 side.append(socialHeading(d,'Участники',c.memberCount+Number(subscribed)));
 for(const id of c.members){const p=profileById(id);if(!p)continue;const member=el(d,'div',{className:'sn-member'});member.append(socialAvatar(d,p.avatar,p.name),socialButton(d,p.name,()=>navigate('underweb://social/profile/'+id),{className:'sn-link'}));side.append(member);}
 const nowMinute=metadataGameMinute(getMetadata()),reactions=(postId,collapseComments=false)=>createPostReactionsView(d,{postId,state,getState,nowMinute,commit,collapseComments});
 const announcements=publicRoundAnnouncements(state,{battleId:c.battleId,nowMinute}).sort((a,b)=>b.at-a.at),current=announcements[0];
 if(c.battleId){const pinned=current?createRoundAnnouncementView(d,current,{navigate}):el(d,'article',{className:'sn-post sn-round-announcement'});pinned.className+=' sn-pinned-announcement';pinned.dataset.pinnedAnnouncement='true';pinned.setAttribute('aria-label','Закреплённый анонс');
  if(current)pinned.append(reactions(current.id,true));else{const window=currentBattleWindow(state,c.battleId,nowMinute);pinned.append(el(d,'strong',{text:c.name+' · организаторы'}),el(d,'h3',{text:'Текущий раунд'}),el(d,'p',{text:battleDeadlineLabel(window,nowMinute).text}));}root.append(pinned);
 }
 wall.append(socialHeading(d,'Стена группы'));
 for(const post of announcements.slice(1)){const node=socialPost(d,post,{author:c.name+' · организаторы',reactions:reactions(post.id)});node.append(socialLink(d,'Таблица раунда','underweb://social/results/'+c.battleId+'/'+post.roundId,navigate));wall.append(node);}
 if(c.battleId==='makarevich-1'){for(const p of publicSeedingPosts(state,nowMinute).reverse())wall.append(socialPost(d,p,{author:c.name+' · организаторы',reactions:reactions(p.id)}));for(const p of publicJudgeAnnouncements(state,nowMinute).reverse()){const node=socialPost(d,p,{author:'',reactions:reactions(p.id)});node.children[0].append(socialLink(d,'Судья · '+p.name,'underweb://social/profile/'+p.judgeId,navigate));wall.append(node);}}
 for(const post of [...c.history].reverse())wall.append(socialPost(d,post,{author:c.name,navigate,profileById}));
 const publicIds=publicTournamentTrackIds(state,{battleId:c.battleId,nowMinute}),versions=(state.communityAudio?.[id]??[]).filter(id=>!state.trackVersions?.byId?.[id]?.npc||publicIds.has(id));archive.append(socialHeading(d,'Работы текущего сезона',versions.length));
 for(const submission of state.battleSubmissions??[])if(submission.communityId===id&&submission.status!=='recovery')archive.append(createSocialResultView(d,{submission,getState,commit,expandedResults,onResultViewed}));
 for(const versionId of versions)archive.append(audio.row(d,{version:state.trackVersions?.byId?.[versionId]}));
 if(c.audio.length)archive.append(socialHeading(d,'Игровые фоновые записи · прошлый сезон',c.audio.length),el(d,'p',{className:'sn-note',text:'Вымышленные авторы и домашние демо. Это не заявки текущего отбора и не записи реальных участников.'}));
 for(const item of c.audio)archive.append(audio.row(d,{item}));
 if(c.battleId)archive.append(el(d,'p',{className:'sn-note',text:'Новые работы участников публикуются после окончания приёма. Прикрепление и ответ администратора не публикуют трек.'}));
 columns.append(wall,side);root.append(columns,archive);return root;
}
