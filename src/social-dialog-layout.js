import {pcElement as el} from './virtual-pc-dom.js?rev=43';
import {socialAvatar,socialButton} from './social-dom.js?rev=57';
import {searchDialogs} from './social-personal.js?rev=57';

// Avatar retries are buttons on profile pages. A dialog row is itself a native
// button, so its avatar uses a noninteractive fallback rather than nesting one.
export function dialogListAvatar(d,avatar,name){
 const node=socialAvatar(d,avatar,name),img=[...node.children].find(n=>n.tagName==='IMG');
 for(const child of [...node.children])if(child.tagName==='BUTTON')child.remove();
 if(img){const fallback=el(d,'span',{text:avatar?.mark??name[0]??'Р'});fallback.hidden=true;node.append(fallback);img.addEventListener('error',()=>{fallback.hidden=false;});img.addEventListener('load',()=>{fallback.hidden=true;});}
 return node;
}

export function dialogMessageField(d){
 const field=el(d,'textarea',{className:'sn-dialog-input',attributes:{'aria-label':'Сообщение',rows:'3',readonly:'',placeholder:'Нажми «Ответить» и выбери игровой ответ…'}});
 field.readOnly=true;field.value='';return field;
}

// Keep scroll decisions outside the row renderer: replacing a history must not
// turn a background incoming message into an instruction to abandon old text.
export function createDialogScroll(history,jump){
 let ids=new Set(),initialized=false,following=true,disposed=false,revision=0,frame=null;
 const window=history.ownerDocument.defaultView;
 const bottom=()=>Math.max(0,(history.scrollHeight??0)-(history.clientHeight??0));
 const near=()=>bottom()-(history.scrollTop??0)<=48;
 function down(){if(!initialized||history.clientHeight>0)history.scrollTop=bottom();following=true;jump.hidden=true;}
 function layout(){if(disposed||!history.clientHeight)return;if(!initialized||following)down();initialized=true;}
 const scroll=()=>{if(!history.clientHeight)return;revision++;following=near();if(following)jump.hidden=true;};
 const loaded=()=>{if(following)down();};
 const click=()=>{revision++;down();};
 history.addEventListener('scroll',scroll);history.addEventListener('load',loaded,true);jump.addEventListener('click',click);jump.hidden=true;
 return {
  render(messages,renderRows){
   const top=history.scrollTop??0,follow=!initialized||(history.clientHeight>0?near():following),added=messages.filter(m=>!ids.has(m.id)),own=added.some(m=>m.sender==='player');
   ids=new Set(messages.map(m=>m.id));renderRows();
   following=follow||own;if(following)down();else{history.scrollTop=top;if(added.length)jump.hidden=false;}
   if(history.clientHeight>0)initialized=true;
   if(window?.requestAnimationFrame){if(frame!==null)window.cancelAnimationFrame(frame);const token=revision;frame=window.requestAnimationFrame(()=>{frame=null;if(token===revision)layout();});}
  },layout,
  dispose(){disposed=true;if(frame!==null)window?.cancelAnimationFrame?.(frame);history.removeEventListener('scroll',scroll);history.removeEventListener('load',loaded,true);jump.removeEventListener('click',click);}
 };
}

export function createDialogLayout(d,{id,getState,navigate}){
 const root=el(d,'section',{className:'sn-dialog'}),head=el(d,'header',{className:'sn-dialog-heading'}),grid=el(d,'div',{className:'sn-dialog-layout'}),main=el(d,'div',{className:'sn-dialog-main'}),history=el(d,'div',{className:'sn-dialog-history',attributes:{role:'log','aria-label':'История переписки',tabindex:'0'}}),footer=el(d,'div',{className:'sn-dialog-footer'}),notice=el(d,'p',{className:'sn-note',attributes:{role:'status'}}),jump=socialButton(d,'К новым сообщениям ↓',()=>{},{className:'sn-dialog-jump'}),sidebar=el(d,'aside',{className:'sn-dialog-sidebar',attributes:{'aria-label':'Другие диалоги'}}),search=el(d,'input',{className:'sn-search',attributes:{'aria-label':'Поиск других диалогов',placeholder:'Поиск диалогов'}}),list=el(d,'div',{className:'sn-dialog-list'});
 sidebar.append(el(d,'strong',{text:'Другие диалоги'}),search,list);main.append(history,jump,footer);grid.append(main,sidebar);root.append(head,grid);
 const scroller=createDialogScroll(history,jump);let signature='',disposed=false;
 function update(){
  if(disposed)return;const rows=searchDialogs(getState(),search.value??'').filter(row=>row.id!==id),key=JSON.stringify(rows);
  if(key!==signature){signature=key;list.replaceChildren();for(const row of rows){
   const button=socialButton(d,'',()=>navigate('underweb://social/dialog/'+row.id),{className:'sn-dialog-peer'+(row.unread?' is-unread':''),attributes:{'aria-label':row.name}}),body=el(d,'span');
   body.append(el(d,'strong',{text:row.name}),el(d,'small',{text:row.lastMessage?.body??'Начать переписку'}));button.append(dialogListAvatar(d,row.avatar,row.name),body);if(row.unread)button.append(el(d,'span',{className:'sn-message-dot',text:'●'}));list.append(button);
  }if(!rows.length)list.append(el(d,'p',{className:'sn-empty',text:'Диалогов нет.'}));}
  scroller.layout();
 }
 search.addEventListener('input',update);
 return {root,head,history,footer,notice,scroller,update,dispose(){disposed=true;scroller.dispose();search.removeEventListener('input',update);}};
}
