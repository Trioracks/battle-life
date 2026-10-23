import {discussionForPost} from './social-discussion.js?rev=57';
import {mountSocialFeed} from './social-feed-page.js?rev=57';
import {pcElement as el} from './virtual-pc-dom.js?rev=57';
import {profileById} from './social-catalog.js?rev=57';
import {normalizeSocial,profileAccess,addSocialFriend} from './social-state.js?rev=57';
import {socialAvatar,socialButton,socialHeading,socialPhoto,socialPost} from './social-dom.js?rev=57';
import {battleCharacter} from './battle-demo-config.js?rev=57';
import {createNpcSocialProfileView} from './npc-social-profile-view.js?rev=57';
import {createPostReactionsView} from './social-reactions-view.js?rev=57';
import {metadataGameMinute} from './social-registration.js?rev=57';
import {createGoblinProfileView} from './goblin-profile-view.js?rev=57';
import {createFilyaProfileView} from './filya-profile-view.js?rev=57';
import {profilePhoto} from './social-photo-view.js?rev=57';
import {playerLifePosts} from './player-life-photos.js?rev=57';
export function playerSocialProfile(state,metadata={}){
 const social=normalizeSocial(state.social),portrait=social.playerPortrait&&(!metadata.portraitKey||social.playerPortrait.key===metadata.portraitKey)?social.playerPortrait:null;
 const album=social.playerAlbum&&(!metadata.portraitKey||social.playerAlbum.key===metadata.portraitKey)?social.playerAlbum.photos:[];
 return {id:'me',name:metadata.playerName??'Игрок',avatar:{mark:'Я',color:'#648577',src:portrait?.url},description:'На связи, пока чайник не закипел.',birthday:null,education:'скрыто',languages:['ru'],friends:social.friends,photos:[...(portrait?[{id:'room',title:'Дома, за своим столом',date:'2012-09-01',src:portrait.url}]:[]),...album],audio:social.personalAudioIds,wall:[...playerLifePosts(album),...social.posts]};
}
const languages={ru:'Русский',en:'Английский',de:'Немецкий'};
export function createSocialProfileView(d,{id='me',view='page',getState,getMetadata,navigate,commit,audio,onAnalyze,onPhotoClose,uiState={}}){
 if(id==='mak-npc-06')return createGoblinProfileView(d,{view,getState,getMetadata,navigate,commit,audio,onAnalyze,onPhotoClose,uiState});
 if(id==='mc-filya')return createFilyaProfileView(d,{view,getState,getMetadata,navigate,commit,audio,onPhotoClose,uiState});
 if(battleCharacter(id))return createNpcSocialProfileView(d,{id,view,getState,getMetadata,navigate,audio,commit,onAnalyze,onPhotoClose,uiState});
 const state=getState(),root=el(d,'section',{className:'sn-profile'});
 // Access is checked before constructing any private fields, including subpages.
 const access=profileAccess(state,id);if(!access.allowed){root.append(socialHeading(d,'Страница недоступна'),el(d,'p',{className:'sn-empty',text:access.reason}));return root;}
 const p=id==='me'?playerSocialProfile(state,getMetadata()):profileById(id),social=normalizeSocial(state.social);
 const url=kind=>id==='me'?'underweb://social/'+(kind==='page'?'me':kind):'underweb://social/profile/'+id+'?view='+kind;
 const photoCard=(photo,post)=>profilePhoto(d,photo,{host:root,profileId:id,post,postId:post?.id,getState,getMetadata,commit,onClose:onPhotoClose});
 const aside=el(d,'aside',{className:'sn-profile-aside'});aside.append(socialAvatar(d,p.avatar,p.name,true));
 if(id==='me'&&!p.avatar.src)aside.append(el(d,'p',{className:'sn-note',text:'Фото ещё не готово'}),socialButton(d,'Повторить снимок',()=>getMetadata().requestPlayerPortrait?.()));
 if(id==='me'&&state.social?.playerAlbum?.key!==getMetadata().portraitKey&&getMetadata().requestPlayerPhotos){const prepare=socialButton(d,'Подготовить фотографии',async()=>{prepare.disabled=true;prepare.textContent='Готовим фотографии…';const result=await getMetadata().requestPlayerPhotos();prepare.disabled=false;prepare.textContent=result?.ok?'Фотографии готовы':'Повторить подготовку фото';});aside.append(prepare);}
 if(id!=='me'){if(!social.blockedProfileIds.includes(id))aside.append(socialButton(d,social.friends.includes(id)?'У вас в друзьях':'Добавить в друзья',()=>commit(addSocialFriend(getState(),id))));else aside.append(el(d,'p',{className:'sn-note',text:'Пользователь заблокирован'}));aside.append(socialButton(d,'Сообщения',()=>navigate('underweb://social/dialog/'+id)));}
 for(const [kind,title]of [['page','Страница'],['photos','Фотографии ('+p.photos.length+')'],['audio','Аудиозаписи ('+p.audio.length+')'],['friends','Друзья ('+(p.friendCount??p.friends.length)+')']]){const button=socialButton(d,title,()=>navigate(url(kind)),{attributes:kind===view?{'aria-current':'page'}:{}});button.disabled=kind===view;aside.append(button);}
 const main=el(d,'div',{className:'sn-profile-main'});main.append(socialHeading(d,p.name),el(d,'p',{className:'sn-profile-description',text:p.description}));
 if(view==='photos'){main.append(socialHeading(d,'Фотографии',p.photos.length));const gallery=el(d,'div',{className:'sn-photos'});p.photos.forEach(photo=>gallery.append(photoCard(photo)));main.append(gallery);root.append(aside,main);return root;}
 if(view==='friends'){const friends=id==='me'?p.friends:p.friends.filter(id=>social.friends.includes(id));main.append(socialHeading(d,id==='me'?'Друзья':'Общие друзья',friends.length));for(const friend of friends){const f=profileById(friend);if(!f)continue;const card=el(d,'article',{className:'sn-person'});card.append(socialAvatar(d,f.avatar,f.name),socialButton(d,f.name,()=>navigate('underweb://social/profile/'+f.id),{className:'sn-link'}));main.append(card);}root.append(aside,main);return root;}
 if(view==='audio'){main.append(socialHeading(d,'Аудиозаписи',p.audio.length));for(const versionId of p.audio)main.append(audio.row(d,{version:state.trackVersions?.byId?.[versionId],displayName:state.audioExports?.files.find(f=>f.id===social.personalAudioFiles?.[versionId])?.filename.replace(/\.(wav|mp3)$/i,'')}));if(!p.audio.length)main.append(el(d,'p',{className:'sn-empty',text:'Пока нет аудиозаписей.'}));root.append(aside,main);return root;}
 const fields=el(d,'dl',{className:'sn-fields'});for(const [label,value]of [['День рождения',p.birthday??'скрыто'],['Образование',p.education??'скрыто'],['Языки',p.languages.map(id=>languages[id]??id).join(', ')]])fields.append(el(d,'dt',{text:label}),el(d,'dd',{text:value}));main.append(fields);
 main.append(socialHeading(d,'Фотографии',p.photos.length));const strip=el(d,'div',{className:'sn-photo-strip'});p.photos.slice(0,3).forEach(photo=>strip.append(photoCard(photo)));main.append(strip,socialHeading(d,'Стена',p.wall.length));
 const feed=el(d,'div',{className:'sn-profile-feed'});main.append(feed);if(uiState.profileId!==id){uiState.profileId=id;uiState.visibleCount=3;}
 mountSocialFeed(feed,{posts:[...p.wall].filter(p=>!Number.isFinite(p.createdAt)||p.createdAt<=metadataGameMinute(getMetadata())).reverse(),uiState,renderPost:post=>{
  const discussion=discussionForPost(state,{profileId:id,post,nowMinute:metadataGameMinute(getMetadata())}),photo=p.photos.find(photo=>photo.id===post.photoId),reactions=state.socialReactions?.plans?.[post.id]?createPostReactionsView(d,{postId:post.id,state,getState,nowMinute:metadataGameMinute(getMetadata()),commit,hideComments:Boolean(photo),commentCount:photo?discussion.comments.length:undefined}):null;
  const node=socialPost(d,post,{author:p.name,authorProfile:p,navigate,profileById:authorId=>authorId==='me'?playerSocialProfile(state,getMetadata()):profileById(authorId),reactions,discussion:photo?discussion:null,photoNode:photo?photoCard(photo,post):null});if(post.trackVersionId)node.append(audio.row(d,{version:state.trackVersions?.byId?.[post.trackVersionId]}));return node;
 }});
 if(!p.wall.length)main.append(el(d,'p',{className:'sn-empty',text:'Первые записи появятся здесь после отзывов о твоей работе.'}));
 root.append(aside,main);return root;
}
