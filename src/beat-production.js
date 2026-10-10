import {BEAT_RULES as R,BEAT_GENRES,DRUMS,drumById} from './beat-catalog.js';
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const clamp=(v,lo=0,hi=100)=>Math.max(lo,Math.min(hi,finite(v)));
const text=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
const sliders=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)?v.map(x=>Math.round(clamp(x,0,10))):null;
export function normalizeBeat(p){
 if(p?.version!==2||p.kind!=='beat'||!text(p.id,100)||!text(p.name,64)||!BEAT_GENRES.some(g=>g.id===p.genre)||!(p.drumId==='primitive'||drumById(p.drumId)))return null;
 const stages=[];
 for(const s of (Array.isArray(p.stages)?p.stages:[]).slice(0,3)){const values=sliders(s?.sliders);if(!values)break;stages.push({sliders:values,fit:clamp(s.fit),quality:clamp(s.quality)});}
 return {version:2,kind:'beat',id:text(p.id,100),name:text(p.name,64),genre:p.genre,bpm:90,drumId:p.drumId,stages,status:stages.length===3?'ready':'draft'};
}
export function normalizeMusic(value,projects=[]){
 const m=value??{},seen=new Set(),owned=(Array.isArray(m.owned)?m.owned:[]).filter(a=>drumById(a?.id)?.bank==='shop'&&['buy','torrent','rip'].includes(a.method)&&!seen.has(a.id)&&seen.add(a.id)).map(a=>({id:a.id,method:a.method}));
 const job=m.job,beat=projects.map(normalizeBeat).find(p=>p?.id===job?.beatId),values=sliders(job?.sliders);
 const validJob=beat&&beat.stages.length<3&&job.stage===beat.stages.length&&values&&Number.isFinite(job.total)&&job.total>0&&job.total<=600&&Number.isFinite(job.elapsed)&&job.elapsed>=0&&job.elapsed<job.total;
 return {cash:clamp(finite(m.cash,R.startingCash),0,1e9),needs:{satiety:clamp(finite(m.needs?.satiety,68)),energy:clamp(finite(m.needs?.energy,72))},practice:clamp(m.practice),genrePractice:Object.fromEntries(BEAT_GENRES.map(g=>[g.id,clamp(m.genrePractice?.[g.id])])),owned,ripline:m.ripline===true,infected:m.infected===true,activeBeatId:typeof m.activeBeatId==='string'&&projects.some(p=>normalizeBeat(p)?.id===m.activeBeatId)?m.activeBeatId:null,job:validJob?{beatId:beat.id,stage:job.stage,sliders:values,total:job.total,elapsed:job.elapsed,skill:clamp(job.skill)}:null};
}
const normalized=s=>({...s,projects:[...(s.projects??[])],music:normalizeMusic(s.music,s.projects)});
const result=(state,ok=true,reason='')=>({state,ok,reason});
export const effectiveBeatSkill=(state,skills={})=>clamp(finite(skills.beatmaking,10)+finite(state.music?.practice));
export function workBlockReason(state){
 if(state.music.needs.satiety<=R.minSatiety+1e-7)return 'Хочу поесть. Сейчас не могу работать.';
 if(state.music.needs.energy<=R.minEnergy+1e-7)return 'Нужно поспать. Сейчас не могу работать.';
 return '';
}
export function createBeat(input,options,skills={},random=Math.random){
 const s=normalized(input),id=text(options.id,100),name=text(options.name,64),genre=BEAT_GENRES.find(g=>g.id===options.genre&&g.available);
 if(!id||!name||!genre||s.projects.some(p=>p.id===id))return result(s,false,'Укажи название и доступный жанр.');
 if(s.projects.length>=590)return result(s,false,'Недостаточно места для нового проекта.');
 if(options.assetId&&!s.music.owned.some(a=>a.id===options.assetId))return result(s,false,'Этот луп ещё не получен.');
 const free=DRUMS.filter(d=>d.bank==='free'),drumId=options.assetId||(effectiveBeatSkill(s,skills)>=R.freeSkill?free[Math.floor(clamp(random(),0,.999999)*free.length)].id:'primitive');
 const beat=normalizeBeat({version:2,kind:'beat',id,name,genre:genre.id,drumId,stages:[]});
 s.projects.push(beat);s.music.activeBeatId=id;return result(s);
}
export function startBeatStage(input,id,values,skills={}){
 const s=normalized(input),beat=normalizeBeat(s.projects.find(p=>p.id===id)),v=sliders(values),blocked=workBlockReason(s);
 if(blocked)return result(s,false,blocked);
 if(!beat||beat.status==='ready'||!v)return result(s,false,'Этот этап недоступен.');
 if(s.music.job&&s.music.job.beatId!==id)return result(s,false,'Сначала закончи текущую работу.');
 if(!s.music.job){const skill=effectiveBeatSkill(s,skills),practice=s.music.genrePractice[beat.genre];
  s.music.job={beatId:id,stage:beat.stages.length,sliders:v,total:Math.round(R.stageMinutes[beat.stages.length]*Math.max(.55,1-skill*.003-practice*.004)*(s.music.infected?1.35:1)),elapsed:0,skill};}
 s.music.activeBeatId=id;return result(s);
}
export function advanceBeatWork(input,requested){
 const s=normalized(input),job=s.music.job;
 if(!job||!Number.isFinite(requested)||requested<=0)return {state:s,minutes:0,finished:false,blocked:false};
 const needs=s.music.needs,minutes=Math.max(0,Math.min(requested,job.total-job.elapsed,(needs.satiety-R.minSatiety)/R.satietyPerMinute,(needs.energy-R.minEnergy)/R.energyPerMinute));
 job.elapsed+=minutes;needs.satiety=clamp(needs.satiety-minutes*R.satietyPerMinute);needs.energy=clamp(needs.energy-minutes*R.energyPerMinute);
 const finished=job.total-job.elapsed<1e-7;
 if(finished){
  const index=s.projects.findIndex(p=>p.id===job.beatId),beat=normalizeBeat(s.projects[index]),target=BEAT_GENRES.find(g=>g.id===beat.genre).targets[job.stage];
  const fit=Math.round(100-job.sliders.reduce((n,x,i)=>n+Math.abs(x-target[i]),0)/30*100),quality=Math.round(job.skill*.7+fit*.3);
  beat.stages.push({sliders:job.sliders,fit,quality});beat.status=beat.stages.length===3?'ready':'draft';s.projects[index]=beat;
  s.music.practice=clamp(s.music.practice+1);s.music.genrePractice[beat.genre]=clamp(s.music.genrePractice[beat.genre]+1);s.music.job=null;
 }
 return {state:s,minutes,finished,blocked:!finished&&Boolean(workBlockReason(s))};
}
export function acquireDrum(input,id,method,random=Math.random){
 const s=normalized(input),asset=drumById(id);
 if(asset?.bank!=='shop'||!['buy','torrent','rip'].includes(method))return result(s,false,'Источник недоступен.');
 if(s.music.owned.some(a=>a.id===id))return result(s,true,'Уже в библиотеке.');
 if(method==='rip'&&!s.music.ripline)return result(s,false,'Сначала установи RIPLINE.');
 if(method==='buy'&&s.music.cash<asset.price)return result(s,false,'Недостаточно игровых денег.');
 if(method==='buy')s.music.cash-=asset.price;
 else if(random()<(method==='rip'?R.ripRisk:R.torrentRisk))s.music.infected=true;
 s.music.owned.push({id,method});return result(s,true,s.music.infected?'Луп получен. Обнаружено подозрительное ПО — компьютер работает медленнее.':'Луп добавлен в библиотеку FT.');
}
export function installRipline(input){const s=normalized(input);s.music.ripline=true;return s;}
export function cleanMusicVirus(input){const s=normalized(input);if(!s.music.infected)return result(s);if(s.music.cash<R.cleanup)return result(s,false,'Недостаточно игровых денег.');s.music.cash-=R.cleanup;s.music.infected=false;return result(s,true,'Игровой компьютер очищен.');}
export function restoreMusicNeeds(input,kind,minutes=0){
 const s=normalized(input);
 if(kind==='meal')s.music.needs.satiety=clamp(s.music.needs.satiety+65);
 if(kind==='sleep')s.music.needs.energy=clamp(s.music.needs.energy+Math.max(0,finite(minutes))*.22);
 return s;
}
