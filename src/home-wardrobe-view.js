import {APPEARANCE_OPTIONS} from './avatar-v3-profile.js?rev=23';
import {WARDROBE_STYLES,WARDROBE_CLOTHING,canWear,wearAppearance} from './home-wardrobe.js?rev=23';

export function mountHomeWardrobeView(root,{onPreview=()=>{},onApply=()=>({ok:true}),onClose=()=>{},returnFocus}={}){
 const doc=root.ownerDocument;let profile=null,draft=null,controls=[],sections=[],categoryButtons=[],yaw=0,category='top';
 root.className='home-wardrobe';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Шкаф');root.tabIndex=-1;
 const title=doc.createElement('h2');title.textContent='Шкаф';
 const note=doc.createElement('p');note.textContent='Твои вещи и причёска. Другие варианты станут доступны после покупки. Форма лица остаётся прежней.';
 const layout=doc.createElement('div');layout.className='wardrobe-layout';
 const preview=doc.createElement('div');preview.className='wardrobe-preview';preview.setAttribute('aria-label','Предпросмотр одежды');
 const options=doc.createElement('div');options.className='wardrobe-options';
 const warning=doc.createElement('p');warning.setAttribute('role','status');warning.className='wardrobe-warning';
 const footer=doc.createElement('div');footer.className='wardrobe-footer';
 function button(label,fn){const b=doc.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);return b;}
 const rotate=button('Повернуть героя',()=>{yaw+=Math.PI/2;}),cancel=button('Отмена',()=>close(false)),apply=button('Применить',()=>{
  const result=wearAppearance(profile,draft);if(!result.ok){warning.textContent=result.reason;return;}
  const saved=onApply(result.profile)??{ok:true};if(saved.ok===false){warning.textContent=saved.error||'Не удалось сохранить одежду.';return;}
  profile=result.profile;close(true);
 });
 layout.append(preview,options);footer.append(rotate,cancel,apply);root.append(title,note,layout,warning,footer);
 function close(accepted=false){if(root.hidden)return;onPreview({...profile.appearance});root.hidden=true;onClose(accepted);returnFocus?.focus?.();}
 function render(){
  controls=[];sections=[];categoryButtons=[];options.replaceChildren();
  const nav=doc.createElement('nav');nav.className='wardrobe-categories';nav.setAttribute('aria-label','Категория гардероба');options.append(nav);
  for(const key of [...WARDROBE_STYLES,...WARDROBE_CLOTHING]){
   const tab=button(APPEARANCE_OPTIONS[key].label,()=>{category=key;refreshCategories();});tab.dataset.wardrobeCategory=key;nav.append(tab);categoryButtons.push(tab);
   const section=doc.createElement('section'),heading=doc.createElement('h3');heading.textContent=APPEARANCE_OPTIONS[key].label;section.append(heading);
   const owned=doc.createElement('div'),locked=doc.createElement('div');owned.className='wardrobe-owned';locked.className='wardrobe-locked';locked.hidden=true;let lockedCount=0;
   const toggle=button('Недоступные варианты',()=>{locked.hidden=!locked.hidden;toggle.setAttribute('aria-expanded',String(!locked.hidden));});toggle.setAttribute('aria-expanded','false');section.append(owned,toggle,locked);
   const choices=WARDROBE_STYLES.includes(key)?APPEARANCE_OPTIONS[key].options.map(option=>({id:option.id,label:option.label,changes:{[key]:option.id}})):
    APPEARANCE_OPTIONS[key].options.flatMap(option=>APPEARANCE_OPTIONS[key+'Color'].options.map(color=>({id:option.id+':'+color.id,label:option.label+' · '+color.label,changes:{[key]:option.id,[key+'Color']:color.id}})));
   for(const choice of choices){
    const candidate={...draft,...choice.changes},available=canWear(profile,candidate);
    const b=button(choice.label+(available?'':' — недоступно'),()=>{const next={...draft,...choice.changes};if(!canWear(profile,next))return;draft=next;onPreview({...draft});refresh();});
    b.dataset.category=key;b.dataset.option=choice.id;b.disabled=!available;b.setAttribute('aria-pressed',String(Object.entries(choice.changes).every(([k,v])=>draft[k]===v)));(available?owned:locked).append(b);if(!available)lockedCount++;controls.push({button:b,candidate:choice.changes,category:key});
   }
   toggle.textContent='Недоступные варианты ('+lockedCount+')';options.append(section);sections.push({key,section,toggle});
  }
  refreshCategories();
 }
 function refreshCategories(){for(const item of sections)item.section.hidden=item.key!==category;for(const tab of categoryButtons)tab.setAttribute('aria-pressed',String(tab.dataset.wardrobeCategory===category));}
 // Choices are independent per body channel. Always recheck against current draft.
 function refresh(){for(const control of controls){const next={...draft,...control.candidate};control.button.disabled=!canWear(profile,next);control.button.setAttribute('aria-pressed',String(Object.entries(control.candidate).every(([k,v])=>draft[k]===v)));}if(controls.some(c=>c.button===doc.activeElement&&c.button.disabled))cancel.focus();}
 function keydown(event){
  if(root.hidden)return;
  if(event.key==='Escape'){event.preventDefault();close(false);}
  if(event.key==='Tab'){event.preventDefault();const buttons=[...categoryButtons,...controls.filter(c=>c.category===category&&!c.button.disabled).map(c=>c.button),sections.find(s=>s.key===category).toggle,rotate,cancel,apply],index=buttons.indexOf(doc.activeElement);buttons[(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}
 }
 root.addEventListener('keydown',keydown);
 return {get isOpen(){return !root.hidden;},get previewRect(){return preview.getBoundingClientRect();},get yaw(){return yaw;},open(next,message=''){profile=next;draft={...next.appearance};yaw=0;category='top';warning.textContent=message;render();root.hidden=false;cancel.focus();},close:()=>close(false),dispose(){root.removeEventListener('keydown',keydown);root.replaceChildren();root.hidden=true;}};
}
