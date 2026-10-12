import {pcElement as el} from './virtual-pc-dom.js?rev=39';
import {profileById} from './social-catalog.js?rev=39';
import {normalizeSocial,profileAccess,addSocialFriend} from './social-state.js?rev=39';
import {socialAvatar,socialButton,socialHeading,socialPhoto,socialPost} from './social-dom.js?rev=39';
export function playerSocialProfile(state,metadata={}){
 const social=normalizeSocial(state.social),portrait=social.playerPortrait&&(!metadata.portraitKey||social.playerPortrait.key===metadata.portraitKey)?social.playerPortrait:null;
 return {id:'me',name:metadata.playerName??'Игрок',avatar:{mark:'Я',color:'#648577',src:portrait?.url},description:'Своя комната. Первые записи. Всё ещё впереди.',birthday:null,education:'скрыто',languages:['ru'],friends:social.friends,photos:portrait?[{id:'room',title:'Дома, за своим столом',date:'2012-09-01',src:portrait.url}]:[],audio:social.personalAudioIds,wall:social.posts};
}
const languages={ru:'Русский',en:'Английский',de:'Немецкий'};
export function createSocialProfileView(d,{id='me',view='page',getState,getMetadata,navigate,commit,audio}){
 const state=getState(),root=el(d,'section',{className:'sn-profile'});
 // Access is checked before constructing any private fields, including subpages.
 const access=profileAccess(state,id);if(!access.allowed){root.append(socialHeading(d,'Страница недоступна'),el(d,'p',{className:'sn-empty',text:access.reason}));return root;}
 const p=id==='me'?playerSocialProfile(state,getMetadata()):profileById(id),social=normalizeSocial(state.social);
 const url=kind=>id==='me'?'underweb://social/'+kind:'underweb://social/profile/'+id+'?view='+kind;
 if(view==='photos'){root.append(socialHeading(d,'Фотографии · '+p.name,p.photos.length));const gallery=el(d,'div',{className:'sn-photos'});p.photos.forEach(photo=>gallery.append(socialPhoto(d,photo)));root.append(gallery);return root;}
 if(view==='friends'){root.append(socialHeading(d,'Друзья · '+p.name,p.friends.length));for(const friend of p.friends){const f=profileById(friend);if(!f)continue;const card=el(d,'article',{className:'sn-person'});card.append(socialAvatar(d,f.avatar,f.name),socialButton(d,f.name,()=>navigate('underweb://social/profile/'+f.id),{className:'sn-link'}));root.append(card);}return root;}
 if(view==='audio'){root.append(socialHeading(d,'Аудиозаписи · '+p.name,p.audio.length));for(const versionId of p.audio)root.append(audio.row(d,{version:state.trackVersions?.byId?.[versionId]}));if(!p.audio.length)root.append(el(d,'p',{className:'sn-empty',text:'Пока нет аудиозаписей. Прикрепи готовый трек в диалоге баттла — он появится здесь.'}));return root;}
 const aside=el(d,'aside',{className:'sn-profile-aside'});aside.append(socialAvatar(d,p.avatar,p.name,true));
 if(id==='me'&&!p.avatar.src)aside.append(el(d,'p',{className:'sn-note',text:'Фото ещё не готово'}),socialButton(d,'Повторить снимок',()=>getMetadata().requestPlayerPortrait?.()));
 if(id!=='me'){if(!social.blockedProfileIds.includes(id))aside.append(socialButton(d,social.friends.includes(id)?'У вас в друзьях':'Добавить в друзья',()=>commit(addSocialFriend(getState(),id))));else aside.append(el(d,'p',{className:'sn-note',text:'Пользователь заблокирован'}));aside.append(socialButton(d,'Сообщения',()=>navigate('underweb://social/dialog/'+id)));}
 aside.append(socialButton(d,'Фотографии ('+p.photos.length+')',()=>navigate(url('photos'))),socialButton(d,'Друзья ('+p.friends.length+')',()=>navigate(url('friends'))));
 const main=el(d,'div',{className:'sn-profile-main'});main.append(socialHeading(d,p.name),el(d,'p',{className:'sn-profile-description',text:p.description}));
 const fields=el(d,'dl',{className:'sn-fields'});for(const [label,value]of [['День рождения',p.birthday??'скрыто'],['Образование',p.education??'скрыто'],['Языки',p.languages.map(id=>languages[id]??id).join(', ')]])fields.append(el(d,'dt',{text:label}),el(d,'dd',{text:value}));main.append(fields);
 main.append(socialButton(d,'Аудиозаписи ('+p.audio.length+')',()=>navigate(url('audio'))),socialHeading(d,'Фотографии',p.photos.length));const strip=el(d,'div',{className:'sn-photo-strip'});p.photos.slice(0,3).forEach(photo=>strip.append(socialPhoto(d,photo)));main.append(strip,socialHeading(d,'Стена',p.wall.length));
 for(const post of [...p.wall].reverse()){const node=socialPost(d,post,{author:p.name,navigate,profileById});if(post.trackVersionId)node.append(audio.row(d,{version:state.trackVersions?.byId?.[post.trackVersionId]}));main.append(node);}
 if(!p.wall.length)main.append(el(d,'p',{className:'sn-empty',text:'Первые записи появятся здесь после отзывов о твоей работе.'}));
 root.append(aside,main);return root;
}
