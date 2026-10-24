import {pcElement as el} from './virtual-pc-dom.js?rev=61';
import {socialButton,socialHeading,socialPeerLink} from './social-dom.js?rev=61';
import {searchDialogs,blockAndRemoveFriend} from './social-personal.js?rev=61';
import {profileById} from './social-catalog.js?rev=61';
import {gameDateTimeLabel as gameMinuteLabel} from './home-calendar.js?rev=61';
import {createDialogLayout,dialogMessageField,dialogListAvatar} from './social-dialog-layout.js?rev=61';
export function mountSocialMessages(d,{getState,navigate}){
 const root=el(d,'section',{className:'sn-messages'}),input=el(d,'input',{className:'sn-search',attributes:{'aria-label':'Поиск по сообщениям',placeholder:'Имя или фраза из переписки…'}}),list=el(d,'div');let last='',disposed=false;
 root.append(socialHeading(d,'Мои сообщения'),input,list);
 function update(){
  if(disposed)return;const rows=searchDialogs(getState(),input.value??''),signature=JSON.stringify(rows);if(signature===last)return;last=signature;list.replaceChildren();
  for(const row of rows){const card=socialButton(d,'',()=>navigate('underweb://social/dialog/'+row.id),{className:'sn-message-row'+(row.unread?' is-unread':''),attributes:{'aria-label':row.name}}),info=el(d,'div'),msg=row.lastMessage;
   info.append(el(d,'strong',{text:row.name}),el(d,'p',{text:msg?.body??'Переписка ещё не началась.'}),el(d,'small',{text:msg?.archived?msg.dateLabel:gameMinuteLabel(msg?.at)}));
   card.append(dialogListAvatar(d,row.avatar,row.name),info);if(row.unread)card.append(el(d,'span',{className:'sn-message-dot',text:'Новое'}));list.append(card);
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
 const person=profileById(id),layout=createDialogLayout(d,{id,getState,navigate}),{root,history,notice}=layout;let last='',disposed=false;
 if(!person)return {root,update(){},dispose(){}};
 const personPeer={kind:'person',id},heading=socialHeading(d,'Сообщения · ');heading.append(socialPeerLink(d,personPeer,person.name,navigate));
 layout.head.append(heading,socialButton(d,'← Мои сообщения',()=>navigate('underweb://social/messages'),{className:'sn-link'}));
 const field=dialogMessageField(d),send=socialButton(d,'Отправить',()=>{}),answer=socialButton(d,'Ответить',()=>{}),actions=el(d,'div',{className:'sn-actions'});field.disabled=true;field.setAttribute('placeholder','Сейчас ответ не требуется.');send.disabled=true;answer.disabled=true;actions.append(send,answer);
 const block=socialButton(d,'Заблокировать и удалить из друзей',()=>commit(blockAndRemoveFriend(getState(),id)));if(id==='vitya')actions.append(block);layout.footer.append(field,actions,notice);
 const read=visibleDialogReader({id,getState,isVisible,onRead});
 function update(markRead=true){
  if(disposed)return;const state=getState(),dialog=state.social?.dialogs?.[id],signature=JSON.stringify(dialog?.messages??[]);
  if(last!==signature){last=signature;layout.scroller.render(dialog?.messages??[],()=>{history.replaceChildren();for(const msg of dialog?.messages??[]){const outgoing=msg.sender==='player',name=outgoing?getMetadata().playerName??'Игрок':person.name,row=el(d,'article',{className:'sn-dialog-message'+(outgoing?' sn-outgoing':'')}),body=el(d,'div');
   const senderPeer=outgoing?{kind:'person',id:'me'}:personPeer;
   body.append(socialPeerLink(d,senderPeer,name,navigate),el(d,'small',{text:msg.archived?msg.dateLabel:gameMinuteLabel(msg.at)}),el(d,'p',{text:msg.body}));row.append(socialPeerLink(d,senderPeer,name,navigate,outgoing?{mark:'Я',src:state.social?.playerPortrait?.url}:person.avatar),body);history.append(row);
  }});}
  const blocked=state.social?.blockedProfileIds?.includes(id);block.hidden=Boolean(blocked);notice.textContent=blocked?'Пользователь заблокирован и удалён из друзей. История переписки сохранена.':id==='vitya'?'Ответить сейчас нельзя. Можно прочитать историю или заблокировать пользователя.':'Старая переписка. Сейчас ответ не требуется.';
  layout.update();if(markRead)read();
 }
 update(false);return {root,update,dispose(){disposed=true;layout.dispose();root.replaceChildren();}};
}
