import {discussionForPhoto,addDiscussionComment} from './social-discussion.js?rev=59';
import {profileById} from './social-catalog.js?rev=59';
import {pcElement as el,pcFocusable} from './virtual-pc-dom.js?rev=59';
import {socialPhoto,socialButton,socialComment} from './social-dom.js?rev=59';
import {socialPhotoSource} from './social-portraits.js?rev=59';
import {photoFeedbackKey,changePhotoFeedback} from './social-photo-feedback.js?rev=59';
import {gameDateTimeLabel} from './home-calendar.js?rev=59';
import {socialImageUrl} from './social-image.js?rev=59';
export function profilePhoto(d,photo,options){
 const figure=socialPhoto(d,photo),src=socialPhotoSource(photo.src);if(!src)return figure;
 const image=figure.children[0],opener=socialButton(d,'',()=>openPhoto(d,photo,options,opener),{className:'sn-photo-open',attributes:{'aria-label':'Открыть фотографию: '+photo.title,'aria-haspopup':'dialog'}});
 image.remove();opener.append(image);figure.prepend?figure.prepend(opener):figure.append(opener);return figure;
}
function openPhoto(d,photo,{host,profileId,postId,post,getState,getMetadata,commit,onClose},opener){
 const dialog=el(d,'dialog',{className:'sn-photo-dialog',attributes:{'aria-label':'Фотография: '+photo.title,'aria-modal':'true'}}),card=el(d,'div',{className:'sn-photo-card'});
 const key=photoFeedbackKey(profileId,photo),entry=()=>getState().social?.photoFeedback?.[key]??{liked:false,comments:[]};
 const close=()=>{dialog.close?.();dialog.remove();if(opener.isConnected)opener.focus();onClose?.();};
 const dismiss=socialButton(d,'×',close,{className:'sn-photo-close',attributes:{'aria-label':'Закрыть фотографию'}});
 const image=el(d,'img',{className:'sn-photo-full',attributes:{src:socialImageUrl(socialPhotoSource(photo.src)),alt:photo.title}}),info=el(d,'section',{className:'sn-photo-info'}),thread=el(d,'div',{className:'sn-comments'}),status=el(d,'p',{className:'sn-message',attributes:{'aria-live':'polite'}});
 const save=change=>{const discussion=discussionForPhoto(getState(),{profileId,photoId:photo.id,postId,post,nowMinute:getMetadata?.()?.gameMinutes});const result=change.like!==undefined?changePhotoFeedback(getState(),key,change):addDiscussionComment(getState(),{threadId:discussion.threadId,body:change.body,at:change.at});if(!result.ok){status.textContent=result.reason;return false;}if(commit(result,{refresh:false})===false){status.textContent='Не удалось сохранить. Попробуй ещё раз.';return false;}status.textContent='';renderFeedback();return true;};
 const like=socialButton(d,'',()=>save({like:!entry().liked}),{className:'sn-link',attributes:{'aria-label':'Нравится фотографии'}});
 const input=el(d,'textarea',{attributes:{'aria-label':'Комментарий к фотографии',placeholder:'Написать комментарий…',maxlength:'1000',rows:'3'}});
 const send=socialButton(d,'Отправить комментарий',()=>{if(save({body:input.value,at:getMetadata?.()?.gameMinutes??getState().socialRuntime?.lastMinute??0})){input.value='';input.focus();}});
 function renderFeedback(){
  const current=entry();like.textContent=current.liked?'♥ Нравится · 1':'♡ Нравится';like.setAttribute('aria-pressed',String(current.liked));thread.replaceChildren();
  const author={name:getMetadata?.()?.playerName??'Игрок',avatar:{mark:'Я',src:getState().social?.playerPortrait?.url}};
  for(const comment of discussionForPhoto(getState(),{profileId,photoId:photo.id,postId,post,nowMinute:getMetadata?.()?.gameMinutes}).comments){const person=comment.authorId==='me'?author:profileById(comment.authorId)??{name:comment.authorName??'Читатель'};const row=socialComment(d,{author:person,body:comment.body,date:comment.date??(Number.isFinite(comment.at)?gameDateTimeLabel(comment.at):'')});row.className+=comment.authorId==='me'?' sn-photo-user-comment':' sn-photo-authored-comment';thread.append(row);}
 }
 image.addEventListener('error',()=>{status.textContent='Не удалось загрузить фотографию. Закрой карточку и попробуй снова.';});
 info.append(el(d,'h2',{text:photo.title}),el(d,'small',{text:photo.date??''}),like,thread,input,send,status);card.append(dismiss,image,info);dialog.append(card);host.append(dialog);
 dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
 dialog.addEventListener('cancel',e=>{e.preventDefault();e.stopPropagation();close();});
 dialog.addEventListener('keydown',e=>{
  e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}
  if(e.key==='Tab'){const fields=pcFocusable(card),first=fields[0],last=fields.at(-1);if(e.shiftKey&&d.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&d.activeElement===last){e.preventDefault();first.focus();}}
 });
 renderFeedback();dialog.showModal?.();dismiss.focus();
}
