import {BEAT_GENRES,BEAT_PRACTICE} from './beat-catalog.js?rev=40';
const clamp=(v,max=100)=>Math.max(0,Math.min(max,Number.isFinite(v)?v:0));
export const GENRES=Object.freeze([{id:'experimental',name:'Экспериментальный',targets:BEAT_PRACTICE.targets},...BEAT_GENRES]);
export const genreById=id=>GENRES.find(g=>g.id===id);
export function normalizeGenreProgression(value){
 const v=value?.version===1?value:{},chosen=[...new Set((Array.isArray(v.chosen)?v.chosen:[]).filter(id=>id!=='experimental'&&genreById(id)))].slice(0,3);
 const available=['experimental',...chosen],primary=available.includes(v.primary)?v.primary:null;
 return {version:1,chosen,primary,xp:Object.fromEntries(GENRES.map(g=>[g.id,available.includes(g.id)?clamp(v.xp?.[g.id],g.id===primary?100:75):0]))};
}
export function genreOptions(value,skill){
 const g=normalizeGenreProgression(value),slots=[25,50,75].filter(n=>clamp(skill)>=n).length;
 return {slots,remaining:Math.max(0,slots-g.chosen.length),available:['experimental',...g.chosen],candidates:GENRES.filter(v=>v.id!=='experimental'&&!g.chosen.includes(v.id)),canSpecialize:clamp(skill)>=100&&!g.primary};
}
export function chooseGenre(value,id,skill){
 const g=normalizeGenreProgression(value),o=genreOptions(g,skill);
 if(!o.remaining||!o.candidates.some(v=>v.id===id))return {ok:false,value:g,reason:'Нет свободного жанрового слота или жанр уже выбран.'};
 return {ok:true,value:{...g,chosen:[...g.chosen,id]},reason:''};
}
export function chooseSpecialization(value,id,skill){
 const g=normalizeGenreProgression(value),o=genreOptions(g,skill);
 if(!o.canSpecialize||!o.available.includes(id))return {ok:false,value:g,reason:'Главная специализация недоступна или уже выбрана.'};
 return {ok:true,value:{...g,primary:id},reason:''};
}
export const genreCap=(value,id)=>normalizeGenreProgression(value).primary===id?100:75;
export function addGenrePractice(value,id,amount){
 const g=normalizeGenreProgression(value);if(!['experimental',...g.chosen].includes(id))return g;
 g.xp[id]=clamp(g.xp[id]+clamp(amount),genreCap(g,id));return g;
}
export function normalizeGenreSnapshot(value){
 if(value?.version!==1||!genreById(value.id)||!Number.isFinite(value.xp))return null;
 return {version:1,id:value.id,xp:clamp(value.xp)};
}
export function genreSnapshot(value,id='experimental'){
 const g=normalizeGenreProgression(value);return normalizeGenreSnapshot({version:1,id,xp:g.xp[id]});
}
