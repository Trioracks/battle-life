import {pcElement as el} from './virtual-pc-dom.js?rev=38';
import {communityById,profileById} from './social-catalog.js?rev=38';
import {normalizeSocial,subscribeCommunity} from './social-state.js?rev=38';
import {socialAvatar,socialButton,socialHeading,socialPost} from './social-dom.js?rev=38';
import {revealBattleKnowledge,battleKnowledgeHints} from './battle-knowledge.js?rev=38';
import {createSocialResultView} from './social-result-view.js?rev=38';
import {gameMinuteLabel} from './game-minute.js?rev=38';
export function createSocialCommunityView(d,{id,getState,getMetadata=()=>({}),navigate,commit,audio,expandedResults=new Set(),onResultViewed}){
 const c=communityById(id),root=el(d,'section',{className:'sn-community'});if(!c)return root;
 const state=getState(),subscribed=normalizeSocial(state.social).subscriptions.includes(id),header=el(d,'header',{className:'sn-community-header'});
 const intro=el(d,'div');intro.append(socialHeading(d,c.name),el(d,'p',{text:c.description}));header.append(socialAvatar(d,c.avatar,c.name,true),intro);root.append(header);
 const actions=el(d,'div',{className:'sn-actions'});actions.append(socialButton(d,subscribed?'Вы подписаны':'Подписаться',()=>commit(subscribeCommunity(getState(),id,!subscribed))));
 if(c.battleId)actions.append(socialButton(d,'Сдать трек',()=>navigate('underweb://social/dialog/'+id)),socialButton(d,'Правила и регистрация',()=>navigate('underweb://battles/'+c.battleId+'/rules'),{className:'sn-link'}));root.append(actions);
 const columns=el(d,'div',{className:'sn-community-columns'}),wall=el(d,'main'),side=el(d,'aside');
 if(c.battleId){
  const window=state.battleWindows?.find(w=>w.battleId===c.battleId);
  if(window)root.append(el(d,'p',{className:'sn-note',text:window.issue??'Приём работ до '+gameMinuteLabel(window.closesAt)+' · одна отправка без замены.'}));
  const options={battleId:c.battleId,roundId:'selection'},known=battleKnowledgeHints(state.battleKnowledge,options);
  side.append(socialHeading(d,'О площадке'),el(d,'p',{text:'Уверенность: '+known.confidence}));
  for(const hint of known.hints)side.append(el(d,'p',{className:'sn-note',text:hint}));
  side.append(socialButton(d,'Изучить площадку',()=>{const current=getState(),skills=getMetadata().skills;return commit({ok:true,state:{...current,battleKnowledge:revealBattleKnowledge(current.battleKnowledge,{...options,analysisSkill:skills?.analysis??skills?.intelligence??0,evidenceId:'rules:v1'})}});}));
 }
 side.append(socialHeading(d,'Участники',c.memberCount+Number(subscribed)));
 for(const id of c.members){const p=profileById(id);if(!p)continue;const member=el(d,'div',{className:'sn-member'});member.append(socialAvatar(d,p.avatar,p.name),socialButton(d,p.name,()=>navigate('underweb://social/profile/'+id),{className:'sn-link'}));side.append(member);}
 const versions=state.communityAudio?.[id]??[];wall.append(socialHeading(d,'Аудиозаписи',versions.length+c.audio.length));
 for(const submission of state.battleSubmissions??[])if(submission.communityId===id&&submission.status!=='recovery')wall.append(createSocialResultView(d,{submission,getState,commit,expandedResults,onResultViewed}));
 for(const versionId of versions)wall.append(audio.row(d,{version:state.trackVersions?.byId?.[versionId]}));
 if(c.audio.length)wall.append(el(d,'p',{className:'sn-note',text:'Фоновый архив · домашние демо до начала текущего отбора. Не заявки и не записи реальных участников.'}));
 for(const item of c.audio)wall.append(audio.row(d,{item}));
 if(c.battleId)wall.append(el(d,'p',{className:'sn-note',text:'Новые работы участников публикуются после окончания приёма. Прикрепление и ответ администратора не публикуют трек.'}));
 wall.append(socialHeading(d,'Стена сообщества',c.history.length));for(const post of [...c.history].reverse())wall.append(socialPost(d,post,{author:c.name,navigate,profileById}));
 columns.append(wall,side);root.append(columns);return root;
}
