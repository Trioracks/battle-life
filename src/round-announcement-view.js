import {pcElement as el} from './virtual-pc-dom.js?rev=61';
import {socialButton,socialLink} from './social-dom.js?rev=61';
import {battleCover} from './battle-content-assets.js?rev=61';
import {socialImageUrl,recoverableSocialImage} from './social-image.js?rev=61';
import {battleStageText} from './battle-stage.js?rev=61';
import {ROUND_LABELS} from './battle-results-table.js?rev=61';
import {gameDateTimeLabel} from './home-calendar.js?rev=61';
export function createRoundAnnouncementView(d,post,{navigate,onWrite,stage}={}){
 const root=el(d,'article',{className:'sn-post sn-round-announcement',dataset:{themeId:post.theme.id}});
 if(stage)root.append(el(d,'p',{className:'sn-battle-stage',text:battleStageText(stage)}));
 const asset=battleCover(post.theme.coverId);
 const cover=el(d,'div',{className:'sn-round-cover',attributes:{'aria-label':'Тема раунда: '+post.theme.title}});if(asset.src){const img=el(d,'img',{attributes:{src:socialImageUrl(asset.src),alt:''}});cover.append(img);recoverableSocialImage(d,img,cover,'Обложка: '+post.theme.title);}
 const summary=el(d,'div',{className:'sn-round-cover-summary'});summary.append(el(d,'p',{text:'Этап: '+(ROUND_LABELS[post.roundId]??'Раунд')}),el(d,'h3',{text:'Тема на раунд: '+post.theme.title}),el(d,'p',{text:'Сроки: До '+gameDateTimeLabel(post.theme.closesAt)}));cover.append(summary);root.append(cover,el(d,'small',{text:post.date}),el(d,'p',{text:post.body}));
 const links=el(d,'nav',{className:'sn-group-links',attributes:{'aria-label':'Материалы анонса'}});links.append(socialLink(d,'Автор темы · '+post.author,'underweb://social/profile/'+post.authorJudgeId,navigate),socialLink(d,'Таблица раунда','underweb://social/results/'+post.battleId+'/'+post.roundId,navigate),socialLink(d,'Обсудить на форуме','underweb://forum/'+post.battleId,navigate));root.append(links);
 if(onWrite)root.append(socialButton(d,'Написать текст на эту тему',()=>onWrite(post)));return root;
}
