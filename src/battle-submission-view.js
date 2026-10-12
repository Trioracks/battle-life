import {pcElement as el,pcButton as button,pcFocusable} from './virtual-pc-dom.js?rev=21';
import {submissionCandidates,submitBattleTrack} from './battle-submission.js?rev=36';
export function mountBattleSubmissionPicker(root,{getState,battleId,getGameDay=()=>1,onChange,onClose=()=>{}}){
 const d=root.ownerDocument,box=el(d,'section',{className:'battle-submit',attributes:{role:'dialog','aria-modal':'true','aria-label':'Отправить трек на баттл'}});
 const list=el(d,'div',{className:'battle-submit-files'}),details=el(d,'p'),status=el(d,'p',{attributes:{role:'status'}}),confirmation=el(d,'div',{className:'battle-submit-confirm'});
 let selected=null,signature='',disposed=false,confirming=false;
 const send=button(d,'Отправить работу',{},()=>submit(false));
 box.append(el(d,'h2',{text:'Мои проекты · выбор трека'}),el(d,'small',{text:'C:\\Мои документы\\Мои проекты · только игровые файлы'}),list,details,status,confirmation,send,button(d,'Отмена',{},onClose));root.replaceChildren(box);
 function updateSelection(){
  const candidate=submissionCandidates(getState(),battleId).find(p=>p.projectId===selected);
  for(const row of list.children)row.setAttribute('aria-pressed',String(row.dataset.projectId===selected));
  send.disabled=!candidate||Boolean(candidate.issue)||confirming;
  details.textContent=candidate?candidate.issue||candidate.seconds.toFixed(2)+' сек. · '+candidate.postStage+' · '+(candidate.topicMatch===null?'Связь с темой не подтверждена. Можно отправить.':candidate.topicMatch?'Текст написан для этого баттла.':'Трек для другой темы. Отправка разрешена.'):'Выбери готовый бит с вокалом.';
 }
 function submit(replace){
  const r=submitBattleTrack(getState(),{battleId,projectId:selected,gameDay:getGameDay(),replace});
  if(!r.ok){
   status.textContent=r.reason;
   if(!replace&&getState().battleSubmissions?.some(s=>s.battleId===battleId)){
    confirming=true;confirmation.replaceChildren(el(d,'p',{text:'Предыдущая отправленная версия будет заменена. Исходный проект останется.'}),button(d,'Заменить работу',{},()=>submit(true)),button(d,'Назад к выбору',{},()=>{confirming=false;confirmation.replaceChildren();status.textContent='';updateSelection();}));pcFocusable(confirmation)[0]?.focus();
   }updateSelection();return;
  }
  let saved;try{saved=onChange(r.state);}catch{saved=false;}
  if(saved===false||saved?.ok===false){status.textContent='Работа не сохранена и не отправлена. Освободи место для сохранения и попробуй снова.';return;}
  onClose();
 }
 function update(){
  if(disposed)return;const candidates=submissionCandidates(getState(),battleId),next=JSON.stringify(candidates);
  if(next===signature)return;signature=next;const focus=d.activeElement?.dataset?.projectId;
  list.replaceChildren();
  for(const item of candidates){const row=button(d,'Выбрать: '+item.name,{dataset:{projectId:item.projectId},attributes:{'aria-pressed':String(item.projectId===selected)}},()=>{selected=item.projectId;status.textContent='';updateSelection();});row.disabled=Boolean(item.issue);list.append(row);if(item.issue)list.append(el(d,'small',{text:item.name+' — '+item.issue}));}
  if(!candidates.length)list.append(el(d,'p',{text:'Пока нет работ. Создай готовый бит и добавь вокал в FT Studio.'}));
  if(!candidates.some(p=>p.projectId===selected))selected=null;updateSelection();
  if(focus)pcFocusable(list).find(n=>n.dataset.projectId===focus)?.focus();
 }
 const keydown=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}else if(event.key==='Tab'){const items=pcFocusable(box),i=items.indexOf(d.activeElement);event.preventDefault();event.stopPropagation();items[(i+(event.shiftKey?-1:1)+items.length)%items.length]?.focus();}};
 root.addEventListener('keydown',keydown);update();return {update,dispose(){disposed=true;root.removeEventListener('keydown',keydown);root.replaceChildren();}};
}
