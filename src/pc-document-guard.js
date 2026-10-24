import {pcElement as el,pcButton as button,pcFocusable} from './virtual-pc-dom.js?rev=60';
import {documentIsDirty,discardPcDocument} from './pc-document-session.js?rev=60';
export function createDocumentGuard(root,{appId,getState,onCommit,onSave}={}){
 const d=root.ownerDocument;let node=null,pending=null,resolvePending=null,after=null,prior=[],returnFocus=null;
 function clear(){node?.remove();node=null;for(const [child,inert]of prior)child.inert=inert;prior=[];}
 function finish(outcome){clear();const resolve=resolvePending,callback=after;pending=null;resolvePending=null;after=null;returnFocus?.focus();if(outcome!=='cancelled')callback?.();resolve?.(outcome);}
 function request({onClose}={}){
  if(pending)return pending;
  if(!documentIsDirty(getState(),appId)){onClose?.();return Promise.resolve('saved');}
  after=onClose;returnFocus=d.activeElement;pending=new Promise(resolve=>{resolvePending=resolve;});
  node=el(d,'section',{className:'pc-document-guard pc-file-picker',attributes:{role:'dialog','aria-modal':'true','aria-label':'Сохранить изменения?'}});
  const notice=el(d,'p',{attributes:{role:'status'}});
  node.append(el(d,'h2',{text:'Сохранить изменения?'}),el(d,'p',{text:'Изменения проекта ещё не сохранены в файл.'}),button(d,'Сохранить',{},()=>{clear();onSave({onSaved:()=>finish('saved'),onCancel:()=>finish('cancelled')});}),button(d,'Не сохранять',{},()=>{const r=discardPcDocument(getState(),appId);if(!r.ok||onCommit(r.state)===false){notice.textContent=r.reason||'Не удалось закрыть проект. Повтори попытку.';return;}finish('discarded');}),button(d,'Отмена',{},()=>finish('cancelled')),notice);
  node.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish('cancelled');}else if(e.key==='Tab'){e.preventDefault();e.stopPropagation();const items=pcFocusable(node),i=items.indexOf(d.activeElement);items[(i+(e.shiftKey?-1:1)+items.length)%items.length]?.focus();}});
  prior=[...root.children].map(child=>[child,child.inert]);for(const [child]of prior)child.inert=true;root.append(node);pcFocusable(node)[0]?.focus();return pending;
 }
 return {request,update(){if(node&&!node.parentNode)root.append(node);},dispose(){if(pending)finish('cancelled');else clear();}};
}
