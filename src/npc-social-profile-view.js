import {pcElement as el} from './virtual-pc-dom.js?rev=57';
import {publicCharacterProfile} from './npc-social-profiles.js?rev=57';
import {metadataGameMinute} from './social-registration.js?rev=57';
import {socialAvatar,socialButton,socialHeading,socialPhoto,socialPost} from './social-dom.js?rev=57';
import {gameDateTimeLabel} from './home-calendar.js?rev=57';
import {createPostReactionsView} from './social-reactions-view.js?rev=57';
import {profilePhoto} from './social-photo-view.js?rev=57';
const statuses={submitted:'Сдал работу',no_show:'Не сдал',won:'Победа',lost:'Поражение',technical_win:'Технический проход',bye:'Проход пустой ветки',eliminated:'Выбыл'};
export function createNpcSocialProfileView(d,{id,view='page',getState,getMetadata,navigate,audio,commit,onAnalyze}){
 const root=el(d,'section',{className:'sn-profile'}),p=publicCharacterProfile(getState(),{characterId:id,nowMinute:metadataGameMinute(getMetadata())});
 if(!p.canView){root.append(socialHeading(d,'Страница недоступна'),el(d,'p',{className:'sn-empty',text:p.reason}));return root;}
 const url=kind=>'underweb://social/profile/'+id+(kind==='page'?'':'?view='+kind);
 const aside=el(d,'aside',{className:'sn-profile-aside'}),main=el(d,'div',{className:'sn-profile-main'});
 const photoCard=photo=>profilePhoto(d,photo,{host:root,profileId:id,getState,getMetadata,commit});
 aside.append(socialAvatar(d,p.avatar,p.name,true));
 if(onAnalyze){aside.append(socialButton(d,'Изучить в Рэп-досье',()=>onAnalyze({characterId:id})));if(!getState().software?.dossier?.installed)aside.append(el(d,'p',{className:'sn-note',text:'Для изучения скачай и установи Рэп-досье.'}));}
 for(const [kind,title]of [['page','Страница'],['photos','Фотографии'],['audio','Аудиозаписи'],['history','История баттлов']]){const button=socialButton(d,title,()=>navigate(url(kind)),{attributes:kind===view?{'aria-current':'page'}:{}});button.disabled=kind===view;aside.append(button);}
 main.append(socialHeading(d,p.name),el(d,'p',{className:'sn-note',text:p.description}));
 if(view==='photos'){const gallery=el(d,'div',{className:'sn-photos'});p.photos.forEach(photo=>gallery.append(photoCard(photo)));main.append(gallery);if(!p.photos.length)main.append(el(d,'p',{text:'Личных фотографий нет.'}));}
 else if(view==='audio'){for(const trackId of p.publicTrackVersionIds)main.append(audio.row(d,{version:getState().trackVersions.byId[trackId]}));if(!p.publicTrackVersionIds.length)main.append(el(d,'p',{text:'Опубликованных работ пока нет.'}));}
 else if(view==='history'){for(const event of p.history){const row=el(d,'article',{className:'sn-post'});row.append(el(d,'strong',{text:statuses[event.status]??event.status}),el(d,'small',{text:gameDateTimeLabel(event.occurredAt)}),socialButton(d,'Таблица раунда',()=>navigate('underweb://social/results/'+event.battleId+'/'+event.roundId),{className:'sn-link'}));if(event.trackVersionId&&p.publicTrackVersionIds.includes(event.trackVersionId))row.append(audio.row(d,{version:getState().trackVersions.byId[event.trackVersionId]}));main.append(row);}if(!p.history.length)main.append(el(d,'p',{text:'В истории пока нет опубликованных событий.'}));}
 else{const strip=el(d,'div',{className:'sn-photo-strip'});p.photos.slice(0,3).forEach(photo=>strip.append(photoCard(photo)));main.append(strip,socialHeading(d,'Стена',p.posts.length));for(const post of [...p.posts].reverse()){const reactions=getState().socialReactions?.plans?.[post.id]?createPostReactionsView(d,{postId:post.id,state:getState(),getState,nowMinute:metadataGameMinute(getMetadata()),commit}):null,photo=p.photos.find(photo=>photo.id===post.photoId);main.append(socialPost(d,post,{author:p.name,authorProfile:{...p,id},navigate,reactions,photoNode:photo?photoCard(photo):null}));}if(!p.posts.length)main.append(el(d,'p',{text:'Публичных записей пока нет.'}));}
 main.append(el(d,'small',{className:'sn-fictional-notice',text:p.fictionalNotice}));
 root.append(aside,main);return root;
}
