import {pcElement as el} from './virtual-pc-dom.js?rev=42';
import {socialAvatar,socialButton,socialHeading} from './social-dom.js?rev=42';
import {searchDialogs,blockAndRemoveFriend} from './social-personal.js?rev=42';
import {profileById} from './social-catalog.js?rev=42';
import {gameDateTimeLabel as gameMinuteLabel} from './home-calendar.js?rev=42';
export function mountSocialMessages(d,{getState,navigate}){
 const root=el(d,'section',{className:'sn-messages'}),input=el(d,'input',{className:'sn-search',attributes:{'aria-label':'Поиск по сообщениям',placeholder:'Имя или фраза из переписки…'}}),list=el(d,'div');let last='',disposed=false;
 root.append(socialHeading(d,'Мои сообщения'),input,list);
 function update(){
  if(disposed)return;const rows=searchDialogs(getState(),input.value??''),signature=JSON.stringify(rows);if(signature===last)return;last=signature;list.replaceChildren();
  for(const row of rows){const card=socialButton(d,'',()=>navigate('underweb://social/dialog/'+row.id),{className:'sn-message-row'+(row.unread?' is-unread':''),attributes:{'aria-label':row.name}}),info=el(d,'div'),msg=row.lastMessage;
   info.append(el(d,'strong',{text:row.name}),el(d,'p',{text:msg?.body??'Переписка ещё не началась.'}),el(d,'small',{text:msg?.archived?msg.dateLabel:gameMinuteLabel(msg?.at)}));
   card.append(socialAvatar(d,row.avatar,row.name),info);if(row.unread)card.append(el(d,'span',{className:'sn-message-dot',text:'Новое'}));list.append(card);
  }
  if(!rows.length)list.append(el(d,'p',{className:'sn-empty',text:'Сообщений по этому запросу нет.'}));
 }
 const search=()=>update();input.addEventListener('input',search);update();return {root,update,dispose(){disposed=true;input.removeEventListener('input',search);root.replaceChildren();}};
}
export function visibleDialogReader({id,getState,isVisible=()=>true,onRead=()=>{}}){
 let attempted='',busy=false;return ()=>{
  if(!isVisible()){attempted='';return;}
  const dialog=getState().social?.dialogs?.[id];if(!dialog?.unread||busy)return;
  const token=JSON.stringify([id,dialog.messages?.at(-1)?.id,dialog.messages?.length]);if(token===attempted)return;attempted=token;busy=true;
  try{onRead(id);}finally{busy=false;}
 };
}
export function mountPersonalDialog(d,{id,getState,getMetadata,navigate,commit,isVisible,onRead}){
 const person=profileById(id),root=el(d,'section',{className:'sn-dialog'}),history=el(d,'div',{className:'sn-dialog-history'}),notice=el(d,'p',{className:'sn-note'});let last='',disposed=false;
 if(!person)return {root,update(){},dispose(){}};
 root.append(socialHeading(d,'Сообщения · '+person.name),socialButton(d,'← Мои сообщения',()=>navigate('underweb://social/messages'),{className:'sn-link'}),history);
 const block=socialButton(d,'Заблокировать и удалить из друзей',()=>commit(blockAndRemoveFriend(getState(),id)));if(id==='vitya')root.append(block);root.append(notice);
 const read=visibleDialogReader({id,getState,isVisible,onRead});
 function update(markRead=true){
  if(disposed)return;const state=getState(),dialog=state.social?.dialogs?.[id],signature=JSON.stringify(dialog?.messages??[]);
  if(last!==signature){last=signature;history.replaceChildren();for(const msg of dialog?.messages??[]){const outgoing=msg.sender==='player',name=outgoing?getMetadata().playerName??'Игрок':person.name,row=el(d,'article',{className:'sn-dialog-message'+(outgoing?' sn-outgoing':'')}),body=el(d,'div');
   body.append(el(d,'strong',{text:name}),el(d,'small',{text:msg.archived?msg.dateLabel:gameMinuteLabel(msg.at)}),el(d,'p',{text:msg.body}));row.append(socialAvatar(d,outgoing?{mark:'Я',src:state.social?.playerPortrait?.url}:person.avatar,name),body);history.append(row);
  }}
  const blocked=state.social?.blockedProfileIds?.includes(id);block.hidden=Boolean(blocked);notice.textContent=blocked?'Пользователь заблокирован и удалён из друзей. История переписки сохранена.':id==='vitya'?'Ответить сейчас нельзя. Можно прочитать историю или заблокировать пользователя.':'Старая переписка. Сейчас ответ не требуется.';
  if(markRead)read();
 }
 update(false);return {root,update,dispose(){disposed=true;root.replaceChildren();}};
}
