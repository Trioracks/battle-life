import {discussionForPost} from './social-discussion.js?rev=57';
import {mountSocialFeed} from './social-feed-page.js?rev=57';
import {pcElement as el} from './virtual-pc-dom.js?rev=57';
import {socialAvatar,socialButton,socialHeading,socialPhoto,socialComment} from './social-dom.js?rev=57';
import {profileById} from './social-catalog.js?rev=57';
import {gameDateTimeLabel} from './home-calendar.js?rev=57';
import {profilePhoto} from './social-photo-view.js?rev=57';
export function createMusicianProfileView(d,{profile,posts,photos,stateKey,subtitle,historyLabel,view='page',getState,getMetadata,navigate,commit,audio,onAnalyze,onPhotoClose,uiState={}}){
 const state=getState(),tracks=posts.filter(p=>p.release||p.trackVersionId);
 const root=el(d,'section',{className:'sn-profile sn-goblin-profile'}),aside=el(d,'aside',{className:'sn-profile-aside'}),main=el(d,'div',{className:'sn-profile-main'});
 const url=kind=>'underweb://social/profile/'+profile.id+(kind==='page'?'':'?view='+kind);
 const personLink=(id,name)=>socialButton(d,name,()=>navigate('underweb://social/profile/'+id),{className:'sn-link'});
 const photoCard=(p,post)=>{post??=posts.find(item=>(item.cardId??item.art??item.id)===p.id);return profilePhoto(d,p,{host:root,profileId:profile.id,post:post?discussionPost(post):undefined,postId:post?.id,getState,getMetadata,commit,onClose:onPhotoClose});};
 aside.append(socialAvatar(d,profile.avatar,profile.name,true),el(d,'p',{className:'sn-note',text:subtitle}));
 if(stateKey==='goblin')aside.append(socialButton(d,'Написать сообщение',()=>navigate('underweb://social/dialog/'+profile.id)));
 for(const [id,name]of [['page','Страница'],['photos','Фотографии ('+photos.length+')'],['audio','Аудиозаписи ('+tracks.length+')'],['friends','Друзья ('+(profile.friendCount??profile.friends.length)+')'],...(historyLabel?[['history','Баттлы']]:[])]){
  const button=socialButton(d,name,()=>navigate(url(id)),{attributes:id===view?{'aria-current':'page'}:{}});button.disabled=id===view;aside.append(button);
 }
 main.append(socialHeading(d,profile.name),el(d,'p',{className:'sn-profile-description',text:profile.description}));
 const player=post=>{
  if(post.trackVersionId)return audio.row(d,{version:state.trackVersions.byId[post.trackVersionId]});
  const r=post.release,box=el(d,'div',{className:'sn-goblin-player'});
  if(audio?.capabilities?.recordedPlayback===false){box.append(el(d,'strong',{text:r.title}),el(d,'small',{className:'sn-note',text:audio.capabilities.reason}));return box;}
  const source=new URL('../'+r.mediaUrl.replace(/^\.\//,''),import.meta.url).href;
  const control=el(d,'audio',{attributes:{controls:'',preload:view==='audio'?'metadata':'none',src:source,'aria-label':r.title,'data-goblin-audio':'true'}});
  const missing=el(d,'small',{className:'sn-note',attributes:{'aria-live':'polite'}});missing.hidden=true;
  const retry=socialButton(d,'Повторить загрузку',()=>{missing.hidden=true;retry.hidden=true;control.setAttribute('src',source);control.load();});retry.hidden=true;
  control.addEventListener('error',()=>{const code=control.error?.code;missing.textContent=code===2?'Не удалось загрузить запись с локального сервера. Проверь, что сервер игры работает.':code===3?'Браузер не смог декодировать эту запись.':code===4?'Источник записи недоступен или браузер не поддерживает его формат.':'Воспроизведение прервано. Можно загрузить запись снова.';missing.hidden=false;retry.hidden=false;});
  control.addEventListener('loadedmetadata',()=>{missing.hidden=true;retry.hidden=true;});
  control.addEventListener('play',()=>{audio.stop();for(const a of d.querySelectorAll?.('audio[data-goblin-audio]')??[])if(a!==control)a.pause();});
  box.append(el(d,'strong',{text:r.title}),control,missing,retry);return box;
 };
 function discussionPost(post){const match=/^([^:]+):\s*(.*)$/s.exec(post.comment??''),names={'МЦ Филя':'mc-filya','MC Филя':'mc-filya','Гоблин Ссаблей':'mak-npc-06','Анна Лесная':'anya'};return {...post,photoId:post.cardId??post.art??post.id,comments:[...(post.comment?[{authorId:names[match?.[1]],authorName:match?.[1],body:match?.[2]??post.comment}]:[]),...(post.reply?[{authorId:profile.id,authorName:profile.name,body:post.reply}]:[])]};}
 const comments=post=>{const thread=el(d,'section',{className:'sn-comments',attributes:{'aria-label':'Комментарии'}}),discussion=discussionForPost(state,{profileId:profile.id,post:discussionPost(post)});for(const comment of discussion.comments){const author=comment.authorId==='me'?{name:getMetadata().playerName??'Игрок',avatar:{mark:'Я',src:state.social?.playerPortrait?.url}}:profileById(comment.authorId)??{name:comment.authorName??'Читатель'};thread.append(socialComment(d,{author,body:comment.body,date:comment.date??(Number.isFinite(comment.at)?gameDateTimeLabel(comment.at):post.dateLabel??'')},navigate));}return thread;};
 if(view==='photos'){const gallery=el(d,'div',{className:'sn-photos'});for(const p of photos)gallery.append(photoCard({...p,date:''}));main.append(gallery);}
 else if(view==='audio'){for(const p of tracks)main.append(player(p));if(!tracks.length)main.append(el(d,'p',{text:'Пока только фотографии. Новую музыку выложу позже.'}));}
 else if(view==='friends'){const mutual=profile.friends.filter(id=>state.social?.friends?.includes(id));main.append(socialHeading(d,'Общие друзья',mutual.length));for(const id of mutual){const f=profileById(id);if(!f)continue;const card=el(d,'article',{className:'sn-person'});card.append(socialAvatar(d,f.avatar,f.name),personLink(id,f.name));main.append(card);}if(!mutual.length)main.append(el(d,'p',{className:'sn-empty',text:'Общих друзей пока нет.'}));}
 else if(view==='history'){
  for(const p of posts.filter(p=>p.trackVersionId))main.append(el(d,'p',{text:p.body}),player(p));
  if(!posts.some(p=>p.trackVersionId))main.append(el(d,'p',{text:historyLabel??'Пока нет публичных баттловых работ.'}));
 }else{
  const strip=el(d,'div',{className:'sn-photo-strip'});photos.slice(0,2).forEach(p=>strip.append(photoCard({...p,date:''})));
  main.append(strip,socialHeading(d,'Стена',posts.length));
  const feed=el(d,'div',{className:'sn-profile-feed'});main.append(feed);if(uiState.profileId!==profile.id){uiState.profileId=profile.id;uiState.visibleCount=3;}
  mountSocialFeed(feed,{posts,uiState,renderPost:post=>{
   const row=el(d,'article',{className:'sn-post'});
   const content=el(d,'div',{className:'sn-post-content'}),avatar=el(d,'div',{className:'sn-post-avatar'});
   avatar.append(socialAvatar(d,profile.avatar,profile.name));row.append(avatar,content);
   content.append(personLink(profile.id,profile.name),el(d,'p',{text:post.body}));
   content.append(photoCard({id:post.cardId??post.art??post.id,src:post.src,title:post.title??post.release?.title??'Из домашнего архива',date:''},post));
   if(post.release||post.trackVersionId)content.append(player(post));
   const liked=state.social?.[stateKey]?.likes?.includes(post.id);
   const footer=el(d,'div',{className:'sn-post-footer'});
   footer.append(el(d,'time',{text:post.dateLabel??gameDateTimeLabel(post.at)}),socialButton(d,liked?'♥ Нравится':'♡ Нравится',()=>{
    const s=getState(),wall=s.social[stateKey],likes=wall.likes.includes(post.id)?wall.likes.filter(id=>id!==post.id):[...wall.likes,post.id];
    commit({ok:true,state:{...s,social:{...s.social,[stateKey]:{...wall,likes}}}});
   },{className:'sn-link',attributes:{'aria-pressed':String(!!liked)}}));
   content.append(footer,comments(post));return row;
  }});
 }
 root.append(aside,main);return root;
}
