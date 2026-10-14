import {pcElement as el} from './virtual-pc-dom.js?rev=41';
import {socialButton,socialLink} from './social-dom.js?rev=41';
import {battleCover} from './battle-content-assets.js?rev=41';
export function createRoundAnnouncementView(d,post,{navigate,onWrite}={}){
 const root=el(d,'article',{className:'sn-post sn-round-announcement',dataset:{themeId:post.theme.id}});
 const asset=battleCover(post.theme.coverId);
 const cover=el(d,'div',{className:'sn-round-cover',attributes:{'aria-label':'Тема раунда: '+post.theme.title}});if(asset.src){const img=el(d,'img',{attributes:{src:asset.src,alt:'',loading:'lazy'}});img.addEventListener('error',()=>img.remove());cover.append(img);}cover.append(el(d,'h3',{text:post.theme.title}));root.append(cover,el(d,'small',{text:post.date}),el(d,'p',{text:post.body}));
 const links=el(d,'nav',{className:'sn-group-links',attributes:{'aria-label':'Материалы анонса'}});links.append(socialLink(d,'Автор темы · '+post.author,'underweb://social/profile/'+post.authorJudgeId,navigate),socialLink(d,'Таблица раунда','underweb://social/results/'+post.battleId+'/'+post.roundId,navigate),socialLink(d,'Обсудить на форуме','underweb://forum/'+post.battleId,navigate));root.append(links);
 if(onWrite)root.append(socialButton(d,'Написать текст на эту тему',()=>onWrite(post)));return root;
}
