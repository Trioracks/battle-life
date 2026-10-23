import {pcElement as el} from './virtual-pc-dom.js?rev=57';
import {socialButton} from './social-dom.js?rev=57';
export function mountReplyPanel(root,{getContext,onChoose=()=>{},onAttach=()=>{},onSend=()=>{}}={}){
 const d=root.ownerDocument,panel=el(d,'section',{className:'sn-dialog-options sn-reply-panel',attributes:{'aria-label':'Выбор ответа'}}),hint=el(d,'p',{className:'sn-reply-hint',attributes:{role:'status'}}),list=el(d,'div',{className:'sn-reply-choices'});let signature='',disposed=false;
 panel.append(el(d,'strong',{text:'Выберите ответ'}),hint,list);panel.hidden=true;root.append(panel);
 const answer=socialButton(d,'Ответить',()=>{panel.hidden=!panel.hidden;answer.setAttribute('aria-expanded',String(!panel.hidden));update();}),send=socialButton(d,'Отправить',onSend),attach=socialButton(d,'Прикрепить',onAttach);answer.disabled=false;answer.setAttribute('aria-expanded','false');
 function update(){if(disposed)return;const context=getContext()??{choices:[]},choices=context.choices??[],key=JSON.stringify(choices);hint.textContent=context.hint??'Сейчас нет доступных ответов.';if(key!==signature){signature=key;list.replaceChildren();for(const [id,body]of choices)list.append(socialButton(d,body,()=>{onChoose(id,body);panel.hidden=true;answer.setAttribute('aria-expanded','false');}));}}
 update();return {panel,answer,send,attach,update,close(){panel.hidden=true;answer.setAttribute('aria-expanded','false');},dispose(){disposed=true;panel.remove();answer.remove();send.remove();attach.remove();}};
}
