import {pcElement as el,pcButton as button,pcFocusable} from './virtual-pc-dom.js?rev=38';
import {submissionCandidates} from './battle-submission.js?rev=38';
import {attachSubmissionTrack} from './social-submission.js?rev=38';
// File picker only attaches a frozen version. Sending is a separate dialog action.
export function mountBattleSubmissionPicker(root,{getState,battleId,communityId=battleId,getGameMinute=()=>null,onChange,onClose=()=>{}}){
 const d=root.ownerDocument,box=el(d,'section',{className:'battle-submit',attributes:{role:'dialog','aria-modal':'true','aria-label':'Прикрепить трек'}}),list=el(d,'div',{className:'battle-submit-files'}),details=el(d,'p'),status=el(d,'p',{attributes:{role:'status'}});
 let selected=null,signature='',disposed=false;
 const attach=button(d,'Прикрепить выбранный трек',{},()=>{
  const r=attachSubmissionTrack(getState(),{communityId,projectId:selected,nowMinute:getGameMinute()});if(!r.ok){status.textContent=r.reason;return;}
  let saved;try{saved=onChange(r.state);}catch{saved=false;}
  if(saved===false||saved?.ok===false){status.textContent='Вложение не сохранено. Освободи место для сохранения и попробуй снова.';return;}
  onClose();
 });
 box.append(el(d,'h2',{text:'Мои проекты · выбор трека'}),el(d,'small',{text:'Только игровые аудиофайлы · прикрепление ещё не отправляет работу'}),list,details,status,attach,button(d,'Отмена',{},onClose));root.replaceChildren(box);
 function selection(){
  const c=submissionCandidates(getState(),battleId).find(p=>p.projectId===selected);for(const row of list.children)row.setAttribute('aria-pressed',String(row.dataset.projectId===selected));
  attach.disabled=!c||Boolean(c.issue);details.textContent=c?c.issue||c.seconds.toFixed(2)+' сек. · '+c.postStage+' · '+(c.topicMatch===null?'Связь с темой не подтверждена.':c.topicMatch?'Текст написан для этого баттла.':'Трек для другой темы. Отправка разрешена.'):'Выбери готовый бит с вокалом.';
 }
 function update(){
  if(disposed)return;const candidates=submissionCandidates(getState(),battleId),next=JSON.stringify(candidates);if(next===signature)return;signature=next;
  const focus=d.activeElement?.dataset?.projectId;list.replaceChildren();for(const item of candidates){const row=button(d,'Выбрать: '+item.name,{dataset:{projectId:item.projectId}},()=>{selected=item.projectId;status.textContent='';selection();});row.disabled=Boolean(item.issue);list.append(row);if(item.issue)list.append(el(d,'small',{text:item.name+' — '+item.issue}));}
  if(!candidates.length)list.append(el(d,'p',{text:'Пока нет работ. Создай готовый бит и добавь вокал в FT Studio.'}));
  if(!candidates.some(p=>p.projectId===selected))selected=null;selection();if(focus)pcFocusable(list).find(n=>n.dataset.projectId===focus)?.focus();
 }
 const keydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}else if(e.key==='Tab'){const items=pcFocusable(box),i=items.indexOf(d.activeElement);e.preventDefault();e.stopPropagation();items[(i+(e.shiftKey?-1:1)+items.length)%items.length]?.focus();}};
 root.addEventListener('keydown',keydown);update();return {update,dispose(){disposed=true;root.removeEventListener('keydown',keydown);root.replaceChildren();}};
}
