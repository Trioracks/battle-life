import {FOOD_CATALOG,FOOD_TEST_MODE,normalizeHousehold} from './home-food.js?rev=57';
export function mountHomeNeedsView(root,{onConsume=()=>{},onClose=()=>{},returnFocus=null,foodMode=FOOD_TEST_MODE}={}) {
 const doc=root.ownerDocument,make=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 root.className='home-fridge-overlay';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Холодильник');
 const panel=make('div');panel.className='home-fridge-panel';const title=make('h2','Холодильник'),satiety=make('p'),mode=make('p',foodMode.infiniteFood?'Временный тестовый режим · Еда бесконечна':'Запасы продуктов'),rows=[],warning=make('p'),closeButton=make('button','Закрыть');warning.setAttribute('role','status');closeButton.type='button';satiety.className='home-fridge-satiety';mode.className='home-fridge-mode';
 panel.append(title,satiety,mode);
 const interior=make('div');interior.className='home-fridge-interior';
 function emptySlot(parent,index,text='Пусто'){
  const slot=make('div',text);slot.className='home-food-slot home-food-empty';slot.dataset.slot=String(index+1);parent.append(slot);
 }
 const freezer=make('section'),freezerTitle=make('h3','Морозилка'),freezerNote=make('p','Место для замороженных ингредиентов');freezer.className='home-fridge-freezer';freezer.dataset.fridgeCompartment='freezer';freezer.setAttribute('aria-label','Морозилка');freezer.append(freezerTitle,freezerNote);
 const freezerSlots=make('div');freezerSlots.className='home-fridge-slots';freezer.append(freezerSlots);
 for(let index=0;index<3;index++)emptySlot(freezerSlots,index);
 interior.append(freezer);
 const icons={apple:'🍎',pear:'🍐',banana:'🍌',sausage:'🌭',bread:'🍞',cheese:'🧀'};
 for(const [index,ids]of [['apple','pear','banana'],[null,null,null],['sausage','bread','cheese']].entries()){
  const shelf=make('section');shelf.className='home-fridge-shelf';shelf.dataset.fridgeShelf=String(index+1);shelf.setAttribute('aria-label','Полка '+(index+1));
  const slots=make('div');slots.className='home-fridge-slots';shelf.append(make('h3','Полка '+(index+1)),slots);
  for(const [slotIndex,id]of ids.entries()){
   if(!id){emptySlot(slots,slotIndex);continue;}
   const item=FOOD_CATALOG[id],row=make('div'),icon=make('span',icons[id]),name=make('strong',item.name),count=make('span'),purpose=make('small','Сразу +30 сытости · Ингредиент'),eat=make('button','Съесть');
   row.className='home-food-slot';row.dataset.slot=String(slotIndex+1);icon.className='home-food-icon';icon.setAttribute('aria-hidden','true');count.className='home-food-stock';eat.type='button';eat.dataset.foodId=item.id;eat.setAttribute('aria-label','Съесть: '+item.name);eat.addEventListener('click',()=>{if(!eat.disabled)onConsume(item.id);});
   row.append(icon,name,count,purpose,eat);slots.append(row);rows.push({item,count,eat});
  }
  interior.append(shelf);
 }
 panel.append(interior,warning,closeButton);root.append(panel);
 function close(){if(root.hidden)return;root.hidden=true;onClose();returnFocus?.focus();}
 closeButton.addEventListener('click',close);
 function keydown(event){
  if(root.hidden)return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
  if(event.key==='Tab'){
   const buttons=[...rows.map(r=>r.eat),closeButton].filter(b=>!b.disabled),index=buttons.indexOf(doc.activeElement);
   event.preventDefault();buttons[(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();
  }
 }
 root.addEventListener('keydown',keydown);
 function update(state,message=''){
  const focused=doc.activeElement;
  const fridge=normalizeHousehold(state.household).fridge; satiety.textContent='Сытость: '+Math.round(state.music.needs.satiety)+' / 100';warning.textContent=message;
  for(const {item,count,eat}of rows){count.textContent='Осталось: '+(foodMode.infiniteFood?'∞':fridge[item.id]);eat.disabled=!item.edibleRaw||(!foodMode.infiniteFood&&fridge[item.id]<1)||state.music.needs.satiety>=100;}
  if(!root.hidden&&rows.some(({eat})=>eat===focused&&eat.disabled))(rows.find(({eat})=>!eat.disabled)?.eat??closeButton).focus();
 }
 return {get isOpen(){return !root.hidden;},open(state,message=''){update(state,message);root.hidden=false;(rows.find(r=>!r.eat.disabled)?.eat??closeButton).focus();},close,update,dispose(){root.removeEventListener('keydown',keydown);root.replaceChildren();root.hidden=true;}};
}
export function mountCharacterSpeech(root) {
 const doc=root.ownerDocument,bubble=doc.createElement('div'),live=doc.createElement('span');let announced=-1;
 root.className='character-speech';root.hidden=true;bubble.setAttribute('aria-hidden','true');live.className='home-visually-hidden';live.setAttribute('aria-live','polite');live.setAttribute('aria-atomic','true');root.append(bubble,live);
 return {update(snapshot,anchor,{firstPerson=false,width=1280,height=720,bottomLimit=height-100}={}){
  root.hidden=!snapshot.visible;root.dataset.firstPerson=String(firstPerson);bubble.textContent=snapshot.text;
  if(!snapshot.visible)return;
  if(snapshot.visible&&snapshot.serial!==announced){announced=snapshot.serial;live.textContent=snapshot.fullText;}
  const rect=root.getBoundingClientRect(),half=Math.min(rect.width||320,width-24)/2;
  root.style.left=Math.max(half+12,Math.min(width-half-12,firstPerson?width/2:anchor?.x??width/2))+'px';
  root.style.top=Math.max((rect.height||80)+12,Math.min(height-24,firstPerson?bottomLimit:anchor?.y??height/2))+'px';
 },dispose(){root.replaceChildren();}};
}
