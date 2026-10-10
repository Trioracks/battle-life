// Persisted, symbolic writing: no copyrighted lyrics or generated prose.
import {BATTLE_BRIEFS} from './virtual-pc-catalog.js?rev=26';
import {BEAT_RULES} from './beat-catalog.js';
import {normalizeBeat,normalizeMusic,workBlockReason} from './beat-production.js?rev=26';
import {softwareDiskBytes} from './pc-software.js?rev=26';
import {homeDateLabel} from './home-calendar.js?rev=26';

export const LYRIC_STAGES=Object.freeze([
 {name:'Общее создание',sliders:['Ясность мысли','Развитие темы','Личное отношение'],target:[8,7,6]},
 {name:'Написание рифм',sliders:['Точность рифм','Ритм строк','Сложность'],target:[8,8,5]},
 {name:'Добавление образов',sliders:['Наглядность','Оригинальность','Плотность образов'],target:[8,7,5]},
]);
const number=(v,f=0)=>Number.isFinite(v)?v:f;
const clamp=(v,lo=0,hi=100)=>Math.max(lo,Math.min(hi,number(v)));
const text=(v,n=100)=>typeof v==='string'?v.trim().slice(0,n):'';
const values=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)?v.map(x=>Math.round(clamp(x,0,10))):null;
const kinds=new Set(['stage','diss','story','chorus','adapt']);
const sectionTypes=new Set(['intro','verse','bridge','chorus','outro','diss','story']);
const titles={intro:'Интро',verse:'Куплет',bridge:'Бридж',chorus:'Припев',outro:'Аутро',diss:'Диссовая часть',story:'Сюжетный куплет'};
const validDay=v=>Number.isSafeInteger(v)&&v>0&&v<100000?v:1;
const outcome=(state,ok=true,reason='')=>({state,ok,reason});
function generator(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
function normalizeSections(list){
 return (Array.isArray(list)?list:[]).slice(0,16).filter(s=>sectionTypes.has(s?.type)).map(s=>({type:s.type,title:text(s.title,64)||titles[s.type],lines:(Array.isArray(s.lines)?s.lines:[]).slice(0,32).map(l=>({words:(Array.isArray(l?.words)?l.words:[]).slice(0,24).filter(w=>text(w?.text,32)).map(w=>({text:text(w.text,32),error:w.error===true}))})).filter(l=>l.words.length)}));
}
export function normalizeLyric(p){
 if(p?.schemaVersion!==1||p.kind!=='lyrics'||!text(p.id)||!text(p.name,64))return null;
 const battle=BATTLE_BRIEFS.find(b=>b.id===p.battleId),stages=[];
 for(const s of (Array.isArray(p.stages)?p.stages:[]).slice(0,3)){const v=values(s?.sliders);if(!v)break;stages.push({sliders:v,skill:clamp(s.skill),quality:clamp(s.quality)});}
 return {schemaVersion:1,kind:'lyrics',id:text(p.id),name:text(p.name,64),seed:Math.floor(clamp(p.seed,0,4294967295)),revision:Math.max(1,Math.floor(clamp(p.revision,1,10000))),createdDay:validDay(p.createdDay),updatedDay:validDay(p.updatedDay??p.createdDay),createdDate:homeDateLabel(validDay(p.createdDay)),updatedDate:homeDateLabel(validDay(p.updatedDay??p.createdDay)),battleId:battle?.id??null,battleName:battle?.title??'Вне баттла',round:'Отбор',opponent:'Не назначен',stages,status:stages.length===3?'ready':'draft',sections:normalizeSections(p.sections),additions:(Array.isArray(p.additions)?p.additions:[]).slice(0,6).filter(a=>['diss','story','chorus'].includes(a?.kind)).map(a=>({kind:a.kind,skill:clamp(a.skill)})),adaptation:p.adaptation&&text(p.adaptation.beatId)?{beatId:text(p.adaptation.beatId),beatName:text(p.adaptation.beatName,64),bpm:90,skill:clamp(p.adaptation.skill)}:null};
}
export function normalizeWriting(value,projects=[]){
 const w=value??{},texts=projects.map(normalizeLyric).filter(Boolean),j=w.job,p=texts.find(p=>p.id===j?.projectId),v=values(j?.sliders);
 const valid=p&&kinds.has(j.kind)&&j.baseRevision===p.revision&&j.stage===p.stages.length&&v&&Number.isFinite(j.total)&&j.total>0&&j.total<=600&&Number.isFinite(j.elapsed)&&j.elapsed>=0&&j.elapsed<j.total&&(j.kind==='stage'?p.status==='draft':p.status==='ready');
 const job=valid?{projectId:p.id,kind:j.kind,stage:j.stage,baseRevision:p.revision,sliders:v,total:j.total,elapsed:j.elapsed,skill:clamp(j.skill),practiceCredit:clamp(j.practiceCredit,0,j.elapsed/j.total/3),gameDay:validDay(j.gameDay),beatId:text(j.beatId)||null}:null;
 return {practice:clamp(w.practice),activeTextId:texts.some(p=>p.id===w.activeTextId)?w.activeTextId:null,job};
}
function normalized(input){const projects=[...(input.projects??[])];return {...input,projects,music:normalizeMusic(input.music,projects),writing:normalizeWriting(input.writing,projects)};}
export const effectiveWritingSkill=(state,skills={})=>clamp(number(skills.writing,10)+number(state.writing?.practice));
export function lyricBattleOptions(state){return {registered:BATTLE_BRIEFS.filter(b=>state.battleApplications?.some(a=>a.battleId===b.id)),other:BATTLE_BRIEFS.filter(b=>!state.battleApplications?.some(a=>a.battleId===b.id))};}
export function createLyric(input,options={},skills={},random=Math.random){
 const s=normalized(input),battle=BATTLE_BRIEFS.find(b=>b.id===options.battleId),id=text(options.id),name=battle?.theme??text(options.name,64);
 if(!id||!name||s.projects.some(p=>p.id===id)||options.battleId&&!battle)return outcome(s,false,'Укажи название и доступный баттл.');
 if(softwareDiskBytes(s).free<2000000)return outcome(s,false,'Недостаточно места для нового текста.');
 if(s.writing.job||s.music.job)return outcome(s,false,'Сначала закончи текущую работу.');
 const day=validDay(options.gameDay),p=normalizeLyric({schemaVersion:1,kind:'lyrics',id,name,battleId:battle?.id,seed:Math.floor(clamp(random(),0,.999999999)*4294967296),revision:1,createdDay:day,updatedDay:day,stages:[],sections:[],additions:[]});
 s.projects.push(p);s.writing.activeTextId=id;return outcome(s);
}
export function startLyricWork(input,{projectId,kind='stage',sliders,beatId,gameDay=1}={},skills={},random=Math.random){
 // Check the raw other job before normalization can discard unknown older projects.
 if(input.music?.job)return outcome(input,false,'Сначала закончи работу над битом.');
 const s=normalized(input),p=normalizeLyric(s.projects.find(p=>p.id===projectId)),blocked=workBlockReason(s);
 if(blocked)return outcome(s,false,blocked);
 if(!p||!kinds.has(kind))return outcome(s,false,'Работа недоступна.');
 if(s.writing.job){if(s.writing.job.projectId!==projectId||s.writing.job.kind!==kind)return outcome(s,false,'Сначала закончи текущий текст.');s.writing.activeTextId=projectId;return outcome(s);}
 if(kind==='stage'?p.status!=='draft':p.status!=='ready')return outcome(s,false,'Сначала закончи три этапа текста.');
 if(kind!=='stage'&&kind!=='adapt'&&(p.battleId==='yard-cipher'||p.additions.length>=6))return outcome(s,false,'Этот формат не допускает новых частей.');
 if(kind==='chorus'&&p.battleId==='open-mic-17')return outcome(s,false,'В этом баттле требуется история без припева.');
 const beat=normalizeBeat(s.projects.find(b=>b.id===beatId));
 if(kind==='adapt'&&(!beat||beat.status!=='ready'))return outcome(s,false,'Выбери готовый бит.');
 const skill=effectiveWritingSkill(s,skills),v=skill<25||sliders===undefined?Array.from({length:3},()=>Math.floor(clamp(random(),0,.999999)*11)):values(sliders);
 if(!v)return outcome(s,false,'Проверь настройки этапа.');
 s.writing.job={projectId,kind,stage:p.stages.length,baseRevision:p.revision,sliders:v,total:kind==='stage'?60:45,elapsed:0,skill,practiceCredit:0,gameDay:validDay(gameDay),beatId:kind==='adapt'?beat.id:null};s.writing.activeTextId=projectId;return outcome(s);
}
function makeSections(p){
 const baseLevel=p.stages.reduce((n,s)=>n+s.quality,0)/Math.max(1,p.stages.length),r=generator(p.seed+p.revision*101),adapted=p.adaptation?Math.min(12,p.adaptation.skill*.15):0,baseCraft=Math.min(100,baseLevel+adapted);
 let types=baseCraft<25?['verse']:baseCraft<55?['verse','chorus','verse']:['intro','verse','bridge','chorus','verse','bridge','chorus','outro'];
 if(p.battleId==='open-mic-17')types=types.filter(t=>t!=='chorus');
 if(p.battleId==='yard-cipher')types=['verse'];
 const baseSections=types.length;types.push(...p.additions.map(a=>a.kind));
 const glyphs=['˜','°','*','”','·','˘','¦','∴'];
 return types.map((type,section)=>{
  const level=section>=baseSections?p.additions[section-baseSections].skill:baseLevel,craft=Math.min(100,level+adapted);
  const count=p.battleId==='yard-cipher'?8:craft<25?3+Math.floor(r()*5):type==='verse'||type==='diss'||type==='story'?8:type==='chorus'?4:2;
  const lines=Array.from({length:count},(_,line)=>{
   const wordCount=craft<25?(p.adaptation?5+Math.floor(r()*4):3+Math.floor(r()*7)):craft<55?5+Math.floor(r()*3):7+(line%2);
   const words=Array.from({length:wordCount},(_,word)=>{
    const length=craft<25?(p.adaptation?3+Math.floor(r()*4):2+Math.floor(r()*7)):3+(word+line%2)%3;
    const symbols=Array.from({length},()=>glyphs[Math.floor(r()*glyphs.length)]).join('');
    const error=level<85&&r()<(1-level/85)*(.25-p.stages.length*.035);
    return {text:symbols,error};
   });return {words};
  });return {type,title:titles[type]+(['verse','bridge'].includes(type)?' '+(types.slice(0,section+1).filter(t=>t===type).length):''),lines};
 });
}
export function advanceLyricWork(input,requested,clock=null){
 const s=normalized(input),j=s.writing.job,empty={state:s,minutes:0,finished:false,blocked:false,practiceGained:0};
 if(!j||!Number.isFinite(requested)||requested<=0)return empty;
 const p=normalizeLyric(s.projects.find(p=>p.id===j.projectId)),needs=s.music.needs,R=BEAT_RULES;
 if(j.kind==='adapt'&&!s.projects.some(b=>normalizeBeat(b)?.id===j.beatId&&b.status==='ready'))return {...empty,blocked:true,reason:'Бит для адаптации больше не доступен.'};
 const minutes=Math.max(0,Math.min(requested,j.total-j.elapsed,(needs.satiety-R.minSatiety)/R.satietyPerMinute,(needs.energy-R.minEnergy)/R.energyPerMinute));
 j.elapsed+=minutes;needs.satiety=clamp(needs.satiety-minutes*R.satietyPerMinute);needs.energy=clamp(needs.energy-minutes*R.energyPerMinute);
 const finished=j.total-j.elapsed<1e-7,credit=(finished?1:j.elapsed/j.total)/3;
 s.writing.practice=clamp(s.writing.practice+Math.max(0,credit-j.practiceCredit),0,Math.max(0,100-(j.skill-s.writing.practice)));j.practiceCredit=credit;
 if(finished){
  if(j.kind==='stage'){
   const target=LYRIC_STAGES[j.stage].target,fit=1-j.sliders.reduce((sum,v,i)=>sum+Math.abs(v-target[i]),0)/30;
   p.stages.push({sliders:j.sliders,skill:j.skill,quality:Math.round(clamp(j.skill*(.55+.45*fit)))});
  }else {p.revision++;if(j.kind==='adapt'){const b=s.projects.find(p=>p.id===j.beatId);p.adaptation={beatId:b.id,beatName:b.name,bpm:90,skill:j.skill};}else p.additions.push({kind:j.kind,skill:j.skill});}
  // The job may cross midnight or resume several days after it was started.
  p.updatedDay=clock&&Number.isSafeInteger(clock.day)&&clock.day>0&&Number.isFinite(clock.minutes)?validDay(clock.day+Math.floor((clock.minutes+minutes)/1440)):j.gameDay;p.status=p.stages.length===3?'ready':'draft';
  const generated=makeSections(p);p.sections=['diss','story','chorus'].includes(j.kind)?[...p.sections,generated.at(-1)]:generated;
  s.projects[s.projects.findIndex(v=>v.id===p.id)]=normalizeLyric(p);s.writing.job=null;
 }
 return {state:s,minutes,finished,blocked:!finished&&Boolean(workBlockReason(s)),practiceGained:Math.min(credit,100-j.skill)};
}
