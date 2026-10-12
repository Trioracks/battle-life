import {pcElement as el} from './virtual-pc-dom.js?rev=21';
import {communityById,profileById} from './social-catalog.js?rev=36';
import {normalizeSocial,subscribeCommunity} from './social-state.js?rev=36';
import {socialAvatar,socialButton,socialHeading,socialPost} from './social-dom.js?rev=36';
export function createSocialCommunityView(d,{id,getState,navigate,commit,audio}){
 const c=communityById(id),root=el(d,'section',{className:'sn-community'});if(!c)return root;
 const state=getState(),subscribed=normalizeSocial(state.social).subscriptions.includes(id),header=el(d,'header',{className:'sn-community-header'});
 const intro=el(d,'div');intro.append(socialHeading(d,c.name),el(d,'p',{text:c.description}));header.append(socialAvatar(d,c.avatar,c.name,true),intro);root.append(header);
 const actions=el(d,'div',{className:'sn-actions'});actions.append(socialButton(d,subscribed?'Вы подписаны':'Подписаться',()=>commit(subscribeCommunity(getState(),id,!subscribed))));
 if(c.battleId)actions.append(socialButton(d,'Сдать трек',()=>navigate('underweb://social/dialog/'+id)),socialButton(d,'Правила и регистрация',()=>navigate('underweb://battles/'+c.battleId+'/rules'),{className:'sn-link'}));root.append(actions);
 const columns=el(d,'div',{className:'sn-community-columns'}),wall=el(d,'main'),side=el(d,'aside');
 side.append(socialHeading(d,'Участники',c.memberCount+Number(subscribed)));
 for(const id of c.members){const p=profileById(id);if(!p)continue;const member=el(d,'div',{className:'sn-member'});member.append(socialAvatar(d,p.avatar,p.name),socialButton(d,p.name,()=>navigate('underweb://social/profile/'+id),{className:'sn-link'}));side.append(member);}
 const versions=state.communityAudio?.[id]??[];wall.append(socialHeading(d,'Аудиозаписи',versions.length+c.audio.length));
 for(const versionId of versions)wall.append(audio.row(d,{version:state.trackVersions?.byId?.[versionId]}));
 if(c.audio.length)wall.append(el(d,'p',{className:'sn-note',text:'Фоновый архив · домашние демо до начала текущего отбора. Не заявки и не записи реальных участников.'}));
 for(const item of c.audio)wall.append(audio.row(d,{item}));
 if(c.battleId)wall.append(el(d,'p',{className:'sn-note',text:'Новые работы участников публикуются после окончания приёма. Прикрепление и ответ администратора не публикуют трек.'}));
 wall.append(socialHeading(d,'Стена сообщества',c.history.length));for(const post of [...c.history].reverse())wall.append(socialPost(d,post,{author:c.name,navigate,profileById}));
 columns.append(wall,side);root.append(columns);return root;
}
