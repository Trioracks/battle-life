import {pcElement as el} from './virtual-pc-dom.js?rev=41';
import {publicCharacterProfile} from './npc-social-profiles.js?rev=41';
import {metadataGameMinute} from './social-registration.js?rev=41';
import {socialAvatar,socialButton,socialHeading,socialPhoto,socialPost} from './social-dom.js?rev=41';
import {gameDateTimeLabel} from './home-calendar.js?rev=41';
import {createPostReactionsView} from './social-reactions-view.js?rev=41';
const statuses={submitted:'Сдал работу',no_show:'Не сдал',won:'Победа',lost:'Поражение',technical_win:'Технический проход',bye:'Проход пустой ветки',eliminated:'Выбыл'};
export function createNpcSocialProfileView(d,{id,view='page',getState,getMetadata,navigate,audio,commit}){
 const root=el(d,'section',{className:'sn-profile'}),p=publicCharacterProfile(getState(),{characterId:id,nowMinute:metadataGameMinute(getMetadata())});
 if(!p.canView){root.append(socialHeading(d,'Страница недоступна'),el(d,'p',{className:'sn-empty',text:p.reason}));return root;}
 const url=kind=>'underweb://social/profile/'+id+(kind==='page'?'':'?view='+kind);
 const aside=el(d,'aside',{className:'sn-profile-aside'}),main=el(d,'div',{className:'sn-profile-main'});
 aside.append(socialAvatar(d,p.avatar,p.name,true));
 for(const [kind,title]of [['page','Страница'],['photos','Фотографии'],['audio','Аудиозаписи'],['history','История баттлов']])aside.append(socialButton(d,title,()=>navigate(url(kind)),{attributes:kind===view?{'aria-current':'page'}:{}}));
 main.append(socialHeading(d,p.name),el(d,'p',{className:'sn-note',text:p.description}));
 if(view==='photos'){const gallery=el(d,'div',{className:'sn-photos'});p.photos.forEach(photo=>gallery.append(socialPhoto(d,photo)));main.append(gallery);if(!p.photos.length)main.append(el(d,'p',{text:'Личных фотографий нет.'}));}
 else if(view==='audio'){for(const trackId of p.publicTrackVersionIds)main.append(audio.row(d,{version:getState().trackVersions.byId[trackId]}));if(!p.publicTrackVersionIds.length)main.append(el(d,'p',{text:'Опубликованных работ пока нет.'}));}
 else if(view==='history'){for(const event of p.history){const row=el(d,'article',{className:'sn-post'});row.append(el(d,'strong',{text:statuses[event.status]??event.status}),el(d,'small',{text:gameDateTimeLabel(event.occurredAt)}),socialButton(d,'Таблица раунда',()=>navigate('underweb://social/results/'+event.battleId+'/'+event.roundId),{className:'sn-link'}));if(event.trackVersionId&&p.publicTrackVersionIds.includes(event.trackVersionId))row.append(audio.row(d,{version:getState().trackVersions.byId[event.trackVersionId]}));main.append(row);}if(!p.history.length)main.append(el(d,'p',{text:'В истории пока нет опубликованных событий.'}));}
 else{main.append(el(d,'p',{text:p.profileType==='personal'?'Личная страница':'Страница под сценическим именем'}),el(d,'p',{className:'sn-note',text:p.reason}),socialHeading(d,'Стена',p.posts.length));for(const post of [...p.posts].reverse()){const reactions=getState().socialReactions?.plans?.[post.id]?createPostReactionsView(d,{postId:post.id,state:getState(),getState,nowMinute:metadataGameMinute(getMetadata()),commit}):null;main.append(socialPost(d,post,{author:p.name,reactions}));}if(!p.posts.length)main.append(el(d,'p',{text:'Публичных записей пока нет.'}));}
 root.append(aside,main);return root;
}
