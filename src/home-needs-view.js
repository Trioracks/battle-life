import {FOOD_CATALOG,normalizeHousehold} from './home-food.js';
export function mountHomeNeedsView(root,{onConsume=()=>{},onClose=()=>{},returnFocus=null}={}) {
 const doc=root.ownerDocument,make=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 root.className='home-fridge-overlay';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Холодильник');
 const panel=make('div');panel.className='home-fridge-panel';const title=make('h2','Холодильник'),satiety=make('p'),rows=[],warning=make('p'),closeButton=make('button','Закрыть');warning.setAttribute('role','status');closeButton.type='button';
 panel.append(title,satiety);
 for(const item of Object.values(FOOD_CATALOG)){
  const row=make('div'),name=make('strong',item.name),count=make('span'),purpose=make('small','Можно съесть сразу · Ингредиент'),eat=make('button','Съесть');
  row.className='home-food-row';eat.type='button';eat.dataset.foodId=item.id;eat.setAttribute('aria-label','Съесть: '+item.name);eat.addEventListener('click',()=>{if(!eat.disabled)onConsume(item.id);});
  row.append(name,count,purpose,eat);panel.append(row);rows.push({item,count,eat});
 }
 panel.append(warning,closeButton);root.append(panel);
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
  for(const {item,count,eat}of rows){count.textContent='Осталось: '+fridge[item.id];eat.disabled=!item.edibleRaw||fridge[item.id]<1||state.music.needs.satiety>=100;}
  if(!root.hidden&&rows.some(({eat})=>eat===focused&&eat.disabled))(rows.find(({eat})=>!eat.disabled)?.eat??closeButton).focus();
 }
 return {get isOpen(){return !root.hidden;},open(state,message=''){update(state,message);root.hidden=false;(rows.find(r=>!r.eat.disabled)?.eat??closeButton).focus();},close,update,dispose(){root.removeEventListener('keydown',keydown);root.replaceChildren();root.hidden=true;}};
}
export function mountCharacterSpeech(root) {
 const doc=root.ownerDocument,bubble=doc.createElement('div'),live=doc.createElement('span');let announced=-1;
 root.className='character-speech';root.hidden=true;bubble.setAttribute('aria-hidden','true');live.className='home-visually-hidden';live.setAttribute('aria-live','polite');live.setAttribute('aria-atomic','true');root.append(bubble,live);
 return {update(snapshot,anchor,{firstPerson=false,width=1280,height=720,bottomLimit=height-100}={}){
  root.hidden=!snapshot.visible;root.dataset.firstPerson=String(firstPerson);bubble.textContent=snapshot.text;
  if(snapshot.visible&&snapshot.serial!==announced){announced=snapshot.serial;live.textContent=snapshot.fullText;}
  const rect=root.getBoundingClientRect(),half=Math.min(rect.width||320,width-24)/2;
  root.style.left=Math.max(half+12,Math.min(width-half-12,firstPerson?width/2:anchor?.x??width/2))+'px';
  root.style.top=Math.max((rect.height||80)+12,Math.min(height-24,firstPerson?bottomLimit:anchor?.y??height/2))+'px';
 },dispose(){root.replaceChildren();}};
}
