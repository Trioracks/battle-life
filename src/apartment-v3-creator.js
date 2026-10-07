import {APPEARANCE_OPTIONS,DEFAULT_APPEARANCE,CLOTHING_COLORS,normalizeAppearance} from './avatar-v3-profile.js?rev=10';

const categories=['face','hair','beard','mustache','top','bottom','footwear'];
const zones={face:'head',hair:'head',beard:'head',mustache:'head',top:'top',bottom:'bottom',footwear:'footwear'};
export class CreatorSelection{
  constructor(){this.reset();}
  reset(){this.appearance={...DEFAULT_APPEARANCE,topColor:'white'};this.selected='top';this.zone='body';this.zoom=1;}
  category(key){if(categories.includes(key)){this.selected=key;this.zone=zones[key];this.zoom=1;}}
  frame(zone){if(['body','head','top','bottom','footwear'].includes(zone)){this.zone=zone;this.zoom=1;}}
  setZoom(value){this.zoom=Math.max(.8,Math.min(1.5,value));}
  select(key,id){if(APPEARANCE_OPTIONS[key]?.options.some(x=>x.id===id))this.appearance=normalizeAppearance({...this.appearance,[key]:id});}
  options(){return APPEARANCE_OPTIONS[this.selected].options.map(x=>({...x,pressed:x.id===this.appearance[this.selected]}));}
  swatches(){const key=this.selected+'Color';return (APPEARANCE_OPTIONS[key]?.options??[]).map(x=>({...x,pressed:x.id===this.appearance[key],color:'#'+CLOTHING_COLORS[x.id].toString(16).padStart(6,'0')}));}
}

export function mountCreator(root,onChange){
  const selection=new CreatorSelection(),doc=root.ownerDocument;
  function button(label,pressed,callback){const b=doc.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',String(pressed));b.addEventListener('click',callback);return b;}
  const tabs=doc.createElement('nav');tabs.className='look-categories';tabs.setAttribute('aria-label','Категория внешности');
  const choices=doc.createElement('div');choices.className='look-options';choices.setAttribute('role','group');
  const palette=doc.createElement('div');palette.className='look-palette';palette.setAttribute('role','group');
  const current=doc.createElement('p');current.className='look-current';current.setAttribute('aria-live','polite');
  root.append(tabs,current,choices,palette);
  const categoryButtons=new Map();
  for(const key of categories){const b=button(APPEARANCE_OPTIONS[key].label,false,()=>{selection.category(key);render();});b.dataset.category=key;tabs.append(b);categoryButtons.set(key,b);}
  function render(){
    for(const [key,b] of categoryButtons)b.setAttribute('aria-pressed',String(key===selection.selected));
    const label=APPEARANCE_OPTIONS[selection.selected].label;
    choices.setAttribute('aria-label',label);palette.setAttribute('aria-label','Цвет: '+label);
    current.textContent=label+' / '+selection.options().find(x=>x.pressed).label;
    choices.replaceChildren(...selection.options().map(option=>{
      const b=button(option.label,option.pressed,()=>{selection.select(selection.selected,option.id);onChange(selection.appearance);refreshSelection();});
      b.dataset.option=option.id;return b;
    }));
    palette.replaceChildren(...selection.swatches().map(option=>{
      const b=button(option.label,option.pressed,()=>{selection.select(selection.selected+'Color',option.id);onChange(selection.appearance);refreshSelection();});
      b.dataset.color=option.id;b.style.setProperty('--swatch',option.color);b.setAttribute('aria-label','Цвет: '+option.label);return b;
    }));palette.hidden=!selection.swatches().length;
  }
  function refreshSelection(){
    for(const b of choices.children)b.setAttribute('aria-pressed',String(b.dataset.option===selection.appearance[selection.selected]));
    for(const b of palette.children)b.setAttribute('aria-pressed',String(b.dataset.color===selection.appearance[selection.selected+'Color']));
    current.textContent=APPEARANCE_OPTIONS[selection.selected].label+' / '+selection.options().find(x=>x.pressed).label;
  }
  render();return {selection,reset(){selection.reset();render();}};
}
