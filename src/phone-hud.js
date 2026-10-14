import {pcElement as el} from './virtual-pc-dom.js?rev=41';
import {normalizePhone,hoverPhoneNotice} from './phone-notifications.js?rev=41';
import {normalizePhonePresentation,phonePresentation} from './phone-presentation.js?rev=41';
import {SOCIAL_IDENTITY} from './social-identity.js?rev=41';

export function mountPhoneHud(root,{getState,getContext,getPresentation,onPresentationChange,onChange,playVibration=()=>{}}){
 const d=root.ownerDocument;
 const device=el(d,'button',{type:'button',className:'bl-phone-device',dataset:{phoneToggle:'true'},attributes:{'aria-label':'Телефон: время и потребности','aria-expanded':'false','aria-controls':'phone-details',title:'Телефон · время, потребности и сообщения'}});
 const screen=el(d,'span',{className:'bl-phone-screen',attributes:{'aria-hidden':'true'}}),clock=el(d,'span',{className:'bl-phone-clock'}),content=el(d,'div',{className:'bl-phone-content'});
 const panel=el(d,'section',{id:'phone-details',className:'bl-phone-details',dataset:{phonePanel:'true'},attributes:{'aria-label':'Время и потребности'}});
 const time=el(d,'time'),satiety=el(d,'p'),energy=el(d,'p');panel.append(time,satiety,energy);
 const notice=el(d,'div',{className:'bl-phone-notice',dataset:{phoneNotice:'true'},attributes:{tabindex:'0',role:'status','aria-live':'polite','aria-label':'Уведомление телефона. Наведи и отведи указатель, чтобы закрыть.'}});
 const source=el(d,'small'),sender=el(d,'strong'),body=el(d,'p',{className:'bl-phone-body'}),hint=el(d,'small',{className:'bl-phone-hint',text:'Полностью — в сообщениях на ПК'});
 screen.append(clock);device.append(screen,el(d,'span',{className:'bl-phone-key',attributes:{'aria-hidden':'true'}}));notice.append(source,sender,body,hint);content.append(panel,notice);root.className='bl-phone-hud';root.replaceChildren(content,device);
 let disposed=false,open=false,lastContent='',phoneInput=Symbol(),phoneCache;
 const failedAttempts=new Set();
 function currentPhone(){const raw=getState();if(raw!==phoneInput){phoneInput=raw;phoneCache=normalizePhone(raw);}return phoneCache;}
 function persistPresentation(next,key){
  if(failedAttempts.has(key))return false;
  try{const saved=onPresentationChange(next);if(saved===true||saved?.ok===true)return true;}catch{/* A failed durable acknowledgment cannot consume the cue. */}
  failedAttempts.add(key);return false;
 }
 function hover(inside){
  if(disposed||notice.hidden||root.hidden)return;const phone=currentPhone();if(!phone.activeId)return;
  const next=hoverPhoneNotice(phone,phone.activeId,inside);if(JSON.stringify(next)===JSON.stringify(phone))return;
  try{onChange(next);}catch{/* Keep the persisted notice. */}update();
 }
 const enter=()=>hover(true),leave=()=>hover(false);
 notice.addEventListener('pointerenter',enter);notice.addEventListener('pointerleave',leave);notice.addEventListener('focus',enter);notice.addEventListener('blur',leave);
 function close(){if(!open)return;open=false;update();}
 function toggle(){failedAttempts.clear();open=!open;update();}
 function keydown(event){if(open&&event.key==='Escape'){event.preventDefault();event.stopPropagation();close();device.focus();}}
 function outside(event){if(open&&!root.contains(event.target))close();}
 device.addEventListener('click',toggle);d.addEventListener?.('keydown',keydown);d.addEventListener?.('pointerdown',outside);
 const write=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
 function update(){
  if(disposed)return;const context=getContext();let presentation=normalizePhonePresentation(getPresentation());
  let shown=phonePresentation({phonePresentation:presentation,music:{needs:context.needs}},context);
  if(shown.visible&&!context.sleeping&&presentation.firstWakeAtMinute===null&&Number.isFinite(context.nowMinute)&&context.nowMinute>=0){
   const next={...presentation,firstWakeAtMinute:context.nowMinute};
   if(persistPresentation(next,'first-wake')){presentation=next;shown=phonePresentation({phonePresentation:presentation,music:{needs:context.needs}},context);}
  }
  root.hidden=!shown.visible;if(root.hidden)open=false;
  const phone=currentPhone(),event=shown.canNotify?phone.queue.find(e=>e.id===phone.activeId):null,signature=JSON.stringify(event??null);
  notice.hidden=!event;panel.hidden=!open;content.hidden=!open&&!event;
  root.dataset.open=String(open);device.setAttribute('aria-expanded',String(open));device.className='bl-phone-device'+(event?' has-message':'');
  write(clock,/\d\d:\d\d$/.test(shown.time)?shown.time.slice(-5):'--:--');
  if(open){write(time,shown.time);write(satiety,'Сытость · '+Math.round(shown.needs.satiety)+' / 100');write(energy,'Энергия · '+Math.round(shown.needs.energy)+' / 100');}
  if(signature!==lastContent){lastContent=signature;write(source,event?.source.replace(/^Рифмосеть(?=\s|$)/u,SOCIAL_IDENTITY.name)??'');write(sender,event?.sender??'');write(body,event?.text??'');}
  if(!event||presentation.announcedIds.includes(event.id))return;
  if(!persistPresentation({...presentation,announcedIds:[...presentation.announcedIds,event.id]},'notice:'+event.id))return;
  if(!d.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches)device.animate?.([{rotate:'0deg'},{rotate:'-5deg'},{rotate:'5deg'},{rotate:'-3deg'},{rotate:'0deg'}],{duration:380,iterations:1});
  try{Promise.resolve(playVibration()).catch(()=>{});}catch{/* Autoplay failure leaves the durable, visible notice intact. */}
 }
 update();return {update,dispose(){disposed=true;notice.removeEventListener('pointerenter',enter);notice.removeEventListener('pointerleave',leave);notice.removeEventListener('focus',enter);notice.removeEventListener('blur',leave);device.removeEventListener('click',toggle);d.removeEventListener?.('keydown',keydown);d.removeEventListener?.('pointerdown',outside);root.replaceChildren();}};
}
