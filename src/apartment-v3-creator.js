import {APPEARANCE_OPTIONS,DEFAULT_APPEARANCE,CLOTHING_COLORS,normalizeAppearance} from './avatar-v3-profile.js?rev=61';

const categories=['face','hair','beard','mustache','top','bottom','footwear'];
const sections={appearance:['face','hair','beard','mustache'],clothing:['top','bottom','footwear']};
const zones={face:'head',hair:'head',beard:'head',mustache:'head',top:'top',bottom:'bottom',footwear:'footwear'};
const descriptions={face:'Черты лица меняют силуэт челюсти, нос и скулы. Посмотри героя с разных сторон.',hair:'Выбранная причёска подогнана к форме лица. Поверни героя, чтобы увидеть затылок и пробор.',beard:'Борода выбирается отдельно от усов. Их цвет согласован с волосами.',mustache:'Тонкий акцент или заметный характер. Можно сочетать с любой бородой.',top:'Выбери покрой и цвет ткани. Манжеты, отделка и детали сохраняют свой оттенок.',bottom:'Свободный силуэт или строгая линия. Цвет низа не зависит от верха.',footwear:'Разная форма, высота и подошва. Цвет меняет верх обуви, а не все её детали.'};
export function decorateCreatorButton(button,id){
 const doc=button.ownerDocument,svg=doc.createElementNS('http://www.w3.org/2000/svg','svg'),use=doc.createElementNS('http://www.w3.org/2000/svg','use');
 svg.setAttribute('class','creator-icon');svg.setAttribute('aria-hidden','true');svg.setAttribute('viewBox','0 0 24 24');use.setAttribute('href','./assets/ui/creator-symbols.svg#'+id);svg.append(use);button.append(svg);
}
export class CreatorSelection{
  constructor(){this.reset();}
  reset(){this.appearance={...DEFAULT_APPEARANCE,topColor:'white'};this.section='appearance';this.selected='face';this.lastCategory={appearance:'face',clothing:'top'};this.zone='body';this.zoom=1;}
  selectSection(section){
    if(!Object.hasOwn(sections,section))return;
    this.section=section;
    this.category(this.lastCategory[section]);
  }
  categories(){return sections[this.section].map(id=>({id,label:APPEARANCE_OPTIONS[id].label}));}
  category(key){if(categories.includes(key)){this.section=sections.appearance.includes(key)?'appearance':'clothing';this.lastCategory[this.section]=key;this.selected=key;this.zone=zones[key];this.zoom=1;}}
  frame(zone){if(['body','head','top','bottom','footwear'].includes(zone)){this.zone=zone;this.zoom=1;}}
  setZoom(value){this.zoom=Math.max(.8,Math.min(1.5,value));}
  select(key,id){if(APPEARANCE_OPTIONS[key]?.options.some(x=>x.id===id))this.appearance=normalizeAppearance({...this.appearance,[key]:id});}
  options(){return APPEARANCE_OPTIONS[this.selected].options.map(x=>({...x,pressed:x.id===this.appearance[this.selected]}));}
  swatches(){const key=this.selected+'Color';return (APPEARANCE_OPTIONS[key]?.options??[]).map(x=>({...x,pressed:x.id===this.appearance[key],color:'#'+CLOTHING_COLORS[x.id].toString(16).padStart(6,'0')}));}
}

export function mountCreator(root,onChange,{categoryRoot=root}={}){
  const selection=new CreatorSelection(),doc=root.ownerDocument;
  function button(label,pressed,callback){const b=doc.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',String(pressed));b.addEventListener('click',callback);return b;}
  const tabs=doc.createElement('nav');tabs.className='look-categories';tabs.setAttribute('aria-label','Категория внешности');
  const choices=doc.createElement('div');choices.className='look-options';choices.setAttribute('role','group');
  const palette=doc.createElement('div');palette.className='look-palette';palette.setAttribute('role','group');
  const current=doc.createElement('p');current.className='look-current';current.setAttribute('aria-live','polite');
  const description=doc.createElement('p');description.className='look-description';
  categoryRoot.append(tabs);root.append(current,choices,palette,description);
  const categoryButtons=new Map();
  for(const key of categories){const b=button(APPEARANCE_OPTIONS[key].label,false,()=>{selection.category(key);render();});b.dataset.category=key;decorateCreatorButton(b,key);tabs.append(b);categoryButtons.set(key,b);}
  function render(){
    for(const [key,b] of categoryButtons){b.setAttribute('aria-pressed',String(key===selection.selected));b.hidden=!sections[selection.section].includes(key);}
    const label=APPEARANCE_OPTIONS[selection.selected].label;
    description.textContent=descriptions[selection.selected];
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
  render();return {selection,reset(){selection.reset();render();},selectSection(section){selection.selectSection(section);render();}};
}
