import {pcElement as el} from './virtual-pc-dom.js?rev=38';
import {normalizePhone,hoverPhoneNotice} from './phone-notifications.js?rev=38';
export function mountPhoneHud(root,{getState,onChange,playVibration=()=>{}}){
 const d=root.ownerDocument,device=el(d,'div',{className:'bl-phone-device',attributes:{role:'img','aria-label':'Телефон'}}),screen=el(d,'div',{className:'bl-phone-screen'}),notice=el(d,'div',{className:'bl-phone-notice',dataset:{phoneNotice:'true'},attributes:{tabindex:'0',role:'status','aria-live':'polite','aria-label':'Уведомление телефона. Наведи и отведи указатель, чтобы закрыть.'}}),source=el(d,'small'),sender=el(d,'strong'),body=el(d,'p',{className:'bl-phone-body'}),hint=el(d,'small',{className:'bl-phone-hint',text:'Полностью — в сообщениях на ПК'});
 root.className='bl-phone-hud';screen.append(el(d,'span',{text:'Р'}));device.append(screen,el(d,'i',{className:'bl-phone-key'}));notice.append(source,sender,body,hint);root.replaceChildren(notice,device);
 let disposed=false,lastShown=null,lastContent='';
 function hover(inside){if(disposed)return;const phone=normalizePhone(getState());if(!phone.activeId)return;const next=hoverPhoneNotice(phone,phone.activeId,inside);if(JSON.stringify(next)===JSON.stringify(phone))return;try{onChange(next);}catch{/* Keep the persisted notice. */}update();}
 const enter=()=>hover(true),leave=()=>hover(false);
 notice.addEventListener('pointerenter',enter);notice.addEventListener('pointerleave',leave);notice.addEventListener('focus',enter);notice.addEventListener('blur',leave);
 function update(){
  if(disposed)return;const phone=normalizePhone(getState()),event=phone.queue.find(e=>e.id===phone.activeId),signature=JSON.stringify(event??null);
  notice.hidden=!event;device.className='bl-phone-device'+(event?' has-message':'');
  if(signature!==lastContent){lastContent=signature;source.textContent=event?.source??'';sender.textContent=event?.sender??'';body.textContent=event?.text??'';}
  if(!event){lastShown=null;return;}
  if(!root.hidden&&lastShown!==event.id){lastShown=event.id;
   const reduced=d.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
   if(!reduced)device.animate?.([{transform:'rotate(0deg)'},{transform:'rotate(-5deg)'},{transform:'rotate(5deg)'},{transform:'rotate(-3deg)'},{transform:'rotate(0deg)'}],{duration:280,iterations:1});
   try{Promise.resolve(playVibration()).catch(()=>{});}catch{/* Autoplay failure never removes/replays a notice. */}
  }
 }
 update();return {update,dispose(){disposed=true;notice.removeEventListener('pointerenter',enter);notice.removeEventListener('pointerleave',leave);notice.removeEventListener('focus',enter);notice.removeEventListener('blur',leave);root.replaceChildren();}};
}
