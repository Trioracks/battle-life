import {testSkillRows} from './test-skills.js?rev=57';

export function mountTestSkills(root,{getProfile,getState,onRaise,onClose=()=>{},returnFocus}={}){
 const doc=root.ownerDocument,make=(tag,text)=>{const node=doc.createElement(tag);if(text)node.textContent=text;return node;};
 let controls=[];
 root.className='test-skills-overlay';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Тестовые навыки');
 const panel=make('div'),title=make('h2','Тестовый режим · Навыки'),note=make('p','Локальная настройка героя: +1 к выбранному навыку. Во время работы или изучения изменения недоступны.'),list=make('div'),status=make('p'),closeButton=make('button','Закрыть');
 panel.className='test-skills-panel';list.className='test-skills-list';status.setAttribute('role','status');status.setAttribute('aria-live','polite');closeButton.type='button';panel.append(title,note,list,status,closeButton);root.append(panel);
 const enabled=()=>[...controls.map(c=>c.button),closeButton].filter(b=>!b.disabled);
 function close(){if(root.hidden)return;root.hidden=true;onClose();returnFocus?.focus?.();}
 closeButton.addEventListener('click',close);
 function update(){
  const rows=testSkillRows(getProfile(),getState());
  if(rows.map(r=>r.kind+':'+r.id).join('|')!==controls.map(c=>c.row.kind+':'+c.row.id).join('|')){
   controls=rows.map(row=>{
    const element=make('div'),label=make('span',row.label),value=make('output'),button=make('button','+1');element.className='test-skills-row';button.type='button';button.dataset.kind=row.kind;button.dataset.id=row.id;value.dataset.valueFor=row.id;button.setAttribute('aria-label','Повысить: '+row.label+' на 1');
    button.addEventListener('click',()=>{
     if(button.disabled)return;
     try{const result=onRaise({kind:row.kind,id:row.id});status.textContent=result?.ok===true?'Сохранено: '+row.label:result?.reason||result?.error||'Не удалось сохранить изменение навыка.';}catch(error){status.textContent=error?.message||'Не удалось сохранить изменение навыка.';}
     update();
    });element.append(label,value,button);return {row,element,value,button};
   });list.replaceChildren(...controls.map(c=>c.element));
  }
  for(const [index,control]of controls.entries()){
   const row=rows[index];control.value.textContent=Number(row.value.toFixed(2)).toLocaleString('ru-RU')+' / 100';control.button.disabled=!row.canRaise;
  }
  if(!root.hidden&&(!root.contains(doc.activeElement)||doc.activeElement?.disabled))enabled()[0].focus();
 }
 function keydown(event){
  if(root.hidden)return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
  else if(event.key==='Tab'){event.preventDefault();const buttons=enabled(),index=buttons.indexOf(doc.activeElement);buttons[(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}
 }
 function stop(event){event.stopPropagation();}
 root.addEventListener('keydown',keydown);root.addEventListener('pointerdown',stop);root.addEventListener('click',stop);
 return {get isOpen(){return !root.hidden;},open(){status.textContent='';update();root.hidden=false;enabled()[0].focus();},close,update,dispose(){root.removeEventListener('keydown',keydown);root.removeEventListener('pointerdown',stop);root.removeEventListener('click',stop);root.replaceChildren();root.hidden=true;}};
}
