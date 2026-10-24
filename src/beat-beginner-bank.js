import {USER_EXPERIMENTAL_BANK,USER_EXPERIMENTAL_RECIPES} from './beat-user-experimental-bank.js?rev=59';
import {JURA_EXPERIMENTAL_BANK,JURA_EXPERIMENTAL_RECIPES} from './beat-jura-experimental-bank.js?rev=59';
import {ABSTRACT_BANK,chooseAbstractRecipe} from './beat-abstract-bank.js?rev=59';
import {EXPERIMENTAL_LEAD_BANK,EXPERIMENTAL_LEAD_RECIPES} from './beat-experimental-leads-bank.js?rev=59';
export {USER_EXPERIMENTAL_BANK} from './beat-user-experimental-bank.js?rev=59';
const legacyBank = ['drums','theme','arrangement'].flatMap(kind =>
  Array.from({length:16}, (_,index) => {
    const number=String(index+1).padStart(2,'0');
    return Object.freeze({id:'beginner-'+kind+'-'+number,kind,bpm:90,bars:4,key:'A minor',
      name:({drums:'Ритм',theme:'Тема',arrangement:'Развитие'})[kind]+' / '+number,
      path:'./assets/audio/ft/beginner-v1/'+kind+'/'+number+'.wav'});
  })
);
export const BEGINNER_FAMILIES=Object.freeze([
  'Прямой пульс','Offbeat','Вместе в долю','Без малого','Без бочки',
  'Редкие удары','Половинный шаг','Ломаный грув','Свинг','Шестнадцатые',
  'Длинный бас','Басовые ответы','Тёмный марш','Лёгкий гараж','Ночной минимал',
]);
const expandedBank=['drums','theme','arrangement'].flatMap(kind=>
  Array.from({length:kind==='theme'?34:30},(_,index)=>{
    const number=String(index+17).padStart(2,'0');
    return Object.freeze({id:'beginner-'+kind+'-'+number,kind,bpm:90,bars:4,key:'A minor',
      name:({drums:'Ритм',theme:'Тема',arrangement:'Развитие'})[kind]+' / '+number,
      path:'./assets/audio/ft/beginner-v2/'+kind+'/'+number+'.wav'});
  })
);
// Saved projects retain every legacy ID/path. Only new selections use the expanded bank.
export const BEGINNER_BANK=Object.freeze([...legacyBank,...expandedBank]);
const partId=(kind,index)=>'beginner-'+kind+'-'+String(index+17).padStart(2,'0');
export const BEGINNER_RECIPES=Object.freeze(BEGINNER_FAMILIES.flatMap((name,family)=>
  Array.from({length:6},(_,variant)=>Object.freeze({
    id:'beginner-recipe-'+String(family*6+variant+1).padStart(2,'0'),family,name:name+' / '+(variant+1),
    drumsId:partId('drums',family*2+variant%2),
    themeId:family===10&&variant===5?'beginner-theme-16':partId('theme',family>=11&&variant>=4?30+family-11:(family*2+Math.floor(variant/2))%30),
    arrangementId:partId('arrangement',family*2+(variant%3===0?0:1)),
  }))
));
export const USER_DRUM_BANK=Object.freeze(Array.from({length:10},(_,index)=>{
 const number=String(index+1).padStart(2,'0');
 return Object.freeze({id:'user-drums-20261012-'+number,kind:'drums',bpm:90,bars:4,key:null,authorship:'user',name:'Авторский ритм / '+number,path:'./assets/audio/ft/user-drums-v1/'+number+'.wav'});
}));
const catalogue=new Map([...BEGINNER_BANK,...USER_DRUM_BANK,...USER_EXPERIMENTAL_BANK,...JURA_EXPERIMENTAL_BANK,...ABSTRACT_BANK,...EXPERIMENTAL_LEAD_BANK].map(part=>[part.id,part]));
const experimentalRecipes=[...USER_EXPERIMENTAL_RECIPES,...EXPERIMENTAL_LEAD_RECIPES];
export const beginnerById=id=>catalogue.get(id);
export function chooseBeginnerParts(random=Math.random,{skill,genre,genreXP}={}){
  if(genre==='abstract'){
    const {id,family,indices,drumsId,themeId,arrangementId}=chooseAbstractRecipe(random);
    return {drumsId,themeId,arrangementId,abstractRecipe:{version:1,id,family,indices:[...indices]}};
  }
  const value=random();let unit=Number.isFinite(value)?Math.max(0,Math.min(.999999,value)):0;
  // Explicit genre context is required. Older callers preserve the exact old mapping.
  if(genre==='experimental'&&Number.isFinite(genreXP)&&genreXP>=0&&genreXP<50){
    if(unit<1/3){const {drumsId,themeId,arrangementId}=experimentalRecipes[Math.floor(unit*3*experimentalRecipes.length)];return {drumsId,themeId,arrangementId};}
    if(unit<1/2)return {...JURA_EXPERIMENTAL_RECIPES[Math.floor((unit-1/3)*6*JURA_EXPERIMENTAL_RECIPES.length)]};
    unit=(unit-1/2)*2;
  }
  const index=Math.floor(unit*BEGINNER_RECIPES.length),{drumsId,themeId,arrangementId}=BEGINNER_RECIPES[index];
  const author=Number.isFinite(skill)&&skill<50&&index%3===0;
  return {drumsId:author?USER_DRUM_BANK[Math.floor(index/3)%10].id:drumsId,themeId,arrangementId};
}
