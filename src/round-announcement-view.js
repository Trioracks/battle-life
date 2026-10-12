import {pcElement as el} from './virtual-pc-dom.js?rev=39';
import {socialButton} from './social-dom.js?rev=39';
export function createRoundAnnouncementView(d,post,{navigate,onWrite}={}){
 const root=el(d,'article',{className:'sn-post sn-round-announcement',dataset:{themeId:post.theme.id}});
 const cover=el(d,'div',{className:'sn-round-cover',attributes:{'aria-label':'Тема раунда: '+post.theme.title}});cover.append(el(d,'span',{text:post.theme.title}));root.append(cover,el(d,'small',{text:post.date}),el(d,'h3',{text:post.theme.title}),el(d,'p',{text:post.body}));
 root.append(socialButton(d,'Автор темы · '+post.author,()=>navigate('underweb://social/profile/'+post.authorJudgeId)),socialButton(d,'Таблица раунда',()=>navigate('underweb://social/results/'+post.battleId+'/'+post.roundId)),socialButton(d,'Обсудить на форуме',()=>navigate('underweb://forum/'+post.battleId)));
 if(onWrite)root.append(socialButton(d,'Написать текст на эту тему',()=>onWrite(post)));return root;
}
