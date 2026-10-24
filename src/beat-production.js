import {BEAT_RULES as R,BEAT_PRACTICE,BEAT_GENRES,drumById,RETIRED_DRUM_MESSAGE} from './beat-catalog.js?rev=60';
import {beginnerById,chooseBeginnerParts} from './beat-beginner-bank.js?rev=60';
import {ABSTRACT_RECIPES} from './beat-abstract-bank.js?rev=60';
import {softwareDiskBytes} from './pc-software.js?rev=60';
import {createBeatMix,normalizeBeatMix} from './beat-mix.js?rev=60';
import {createBeatResult} from './beat-result.js?rev=60';
import {normalizeRecording,effectiveSoundSkill} from './vocal-result.js?rev=60';
import {normalizeSongForm} from './beat-song-form.js?rev=60';
import {genreById,normalizeGenreProgression,genreOptions,genreSnapshot,normalizeGenreSnapshot,addGenrePractice} from './genre-progression.js?rev=60';
import {beatPracticeBudget} from './beat-practice-curve.js?rev=60';
import {createBeatExecutionSnapshot,validBeatExecutionMix} from './beat-execution-snapshot.js?rev=60';
import {normalizeAudioBacking} from './pc-audio-backing.js?rev=60';
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const clamp=(v,lo=0,hi=100)=>Math.max(lo,Math.min(hi,finite(v)));
const text=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
const sliders=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)?v.map(x=>Math.round(clamp(x,0,10))):null;
const PRACTICE_PER_STAGE=1/3;
export function normalizeBeat(p){
 if(![2,3].includes(p?.version)||p.kind!=='beat'||!text(p.id,100)||!text(p.name,64)||(p.genre!==BEAT_PRACTICE.id&&!genreById(p.genre)))return null;
 if(!validBeatExecutionMix(p.mix))return null;
 if(p.version===2&&!(p.drumId==='primitive'||drumById(p.drumId)))return null;
 const stages=[];
 for(const s of (Array.isArray(p.stages)?p.stages:[]).slice(0,3)){const values=sliders(s?.sliders);if(!values)break;stages.push({sliders:values,fit:clamp(s.fit),quality:clamp(s.quality,0,p.mix?.version===2?110:100)});}
 const beat={version:p.version,kind:'beat',id:text(p.id,100),name:text(p.name,64),genre:p.genre,bpm:90,drumId:text(p.drumId,100),stages,status:stages.length===3?'ready':'draft'};
 if(p.practicePolicy===2){
  beat.practicePolicy=2;
  const plan=p.practicePlan;
  if(plan?.version===2&&Number.isFinite(plan.startSkill)&&plan.startSkill>=0&&plan.startSkill<=100&&Number.isFinite(plan.totalBudget)&&plan.totalBudget>0&&plan.totalBudget<=3)beat.practicePlan={version:2,startSkill:plan.startSkill,totalBudget:plan.totalBudget};
 }
 if(Number.isSafeInteger(p.createdDay)&&p.createdDay>0&&p.createdDay<100000)beat.createdDay=p.createdDay;
 if(p.songFormVersion===1)beat.songFormVersion=1;
 const genreProfile=normalizeGenreSnapshot(p.genreProfile);if(genreProfile&&genreProfile.id===beat.genre)beat.genreProfile=genreProfile;
 const mix=normalizeBeatMix(p.mix);if(mix)beat.mix=mix;
 const recording=normalizeRecording(p.recording);
 // A rejected stored take must recover as a blocked project, never an empty
 // ready beat that can overwrite the original recording on the next save.
 if(p.recording!=null&&(!recording||beat.status!=='ready'))return null;
 if(recording)beat.recording=recording;
 if(p.audioBacking!==undefined){const backing=normalizeAudioBacking(p.audioBacking);if(!backing||beat.status!=='ready')return null;beat.audioBacking=backing;}
 if(p.version===3){
  beat.productionMode=p.productionMode==='beginner'?'beginner':'automatic';
  beat.audio={bankVersion:p.audio?.bankVersion===1?1:0,bars:p.audio?.bars===4?4:0,themeId:text(p.audio?.themeId,100),arrangementId:text(p.audio?.arrangementId,100)};
  if(p.audio?.levelVersion===1)beat.audio.levelVersion=1;
  if(!(drumById(beat.drumId)||beginnerById(beat.drumId)?.kind==='drums')||
   beat.audio.bankVersion!==1||beat.audio.bars!==4||beginnerById(beat.audio.themeId)?.kind!=='theme'||beginnerById(beat.audio.arrangementId)?.kind!=='arrangement')beat.audioIssue='invalid-bank';
  const stored=p.audio?.abstractRecipe,ids=[beat.drumId,beat.audio.themeId,beat.audio.arrangementId];
  if(stored!==undefined||beat.genre==='abstract'||ids.some(id=>id.startsWith('abstract-20261020-'))){
   const recipe=ABSTRACT_RECIPES.find(r=>r.id===stored?.id);
   if(stored!==undefined)beat.audio.abstractRecipe=structuredClone(stored);
   if(stored?.version!==1||!recipe||stored.family!==recipe.family||!Array.isArray(stored.indices)||stored.indices.length!==2||stored.indices[0]!==recipe.indices[0]||stored.indices[1]!==recipe.indices[1]||
    beat.drumId!==recipe.drumsId||beat.audio.themeId!==recipe.themeId||beat.audio.arrangementId!==recipe.arrangementId)beat.audioIssue='invalid-abstract-recipe';
  }
 }
 if(drumById(beat.drumId)?.retired)beat.audioIssue='retired-source';
 if(p.songForm!==undefined){const form=normalizeSongForm(p.songForm,beat);beat.songForm=form??structuredClone(p.songForm);if(!form)beat.audioIssue='invalid-song-form';}
 return beat;
}
function selectedBeat(projects,id){
 if(typeof id!=='string')return null;
 for(const raw of projects){
  if(text(raw?.id,100)!==id)continue;
  const beat=normalizeBeat(raw);if(beat)return beat;
 }
 return null;
}
export function normalizeMusic(value,projects=[]){
 const m=value??{},seen=new Set(),owned=(Array.isArray(m.owned)?m.owned:[]).filter(a=>drumById(a?.id)?.bank==='shop'&&['buy','torrent','rip'].includes(a.method)&&!seen.has(a.id)&&seen.add(a.id)).map(a=>({id:a.id,method:a.method}));
 const job=m.job,beat=selectedBeat(projects,job?.beatId),values=sliders(job?.sliders);
 const validJob=beat&&beat.stages.length<3&&job.stage===beat.stages.length&&values&&Number.isFinite(job.total)&&job.total>0&&job.total<=600&&Number.isFinite(job.elapsed)&&job.elapsed>=0&&job.elapsed<job.total;
 // Old partial jobs earned nothing until completion, so a missing credit ledger starts at zero.
 const stageBudget=beat?.practicePolicy===2&&beat.practicePlan?beat.practicePlan.totalBudget/3:PRACTICE_PER_STAGE;
 const earned=validJob?job.elapsed/job.total*stageBudget:0;
 const savedJob=validJob?{beatId:beat.id,stage:job.stage,sliders:values,total:job.total,elapsed:job.elapsed,skill:clamp(job.skill),genreSkill:clamp(finite(job.genreSkill,m.genrePractice?.[beat.genre])),stageBudget,practiceCredit:clamp(finite(job.practiceCredit,beat.practicePolicy===2?earned:0),0,earned)}:null;
 if(savedJob){
  // Missing genre ledger means pre-migration work: never award elapsed work again.
  savedJob.genreCredit=clamp(finite(job.genreCredit,earned),0,earned);
  const profile=normalizeGenreSnapshot(job.genreProfile);if(profile)savedJob.genreProfile=profile;
 }
 return {cash:clamp(finite(m.cash,R.startingCash),0,1e9),needs:{satiety:clamp(finite(m.needs?.satiety,68)),energy:clamp(finite(m.needs?.energy,72))},practice:clamp(m.practice),genres:normalizeGenreProgression(m.genres),genrePractice:Object.fromEntries(BEAT_GENRES.map(g=>[g.id,clamp(m.genrePractice?.[g.id])])),owned,ripline:m.ripline===true,infected:m.infected===true,activeBeatId:selectedBeat(projects,m.activeBeatId)?m.activeBeatId:null,job:savedJob};
}
const normalized=s=>({...s,projects:[...(s.projects??[])],music:normalizeMusic(s.music,s.projects)});
const result=(state,ok=true,reason='')=>({state,ok,reason});
export const effectiveBeatSkill=(state,skills={})=>clamp(finite(skills.beatmaking)+finite(state.music?.practice));
export function workBlockReason(state){
 if(state.music.needs.satiety<=R.minSatiety+1e-7)return 'Хочу поесть. Сейчас не могу работать.';
 if(state.music.needs.energy<=R.minEnergy+1e-7)return 'Нужно поспать. Сейчас не могу работать.';
 return '';
}
export function createBeat(input,options={},skills={},random=Math.random){
 if(input.recording?.job)return result(input,false,'Сначала заверши запись.');
 const s=normalized(input),id=text(options.id,100),name=text(options.name,64),genre=!options.genre||options.genre===BEAT_PRACTICE.id?'experimental':options.genre;
 if(!id||!name||s.projects.some(p=>p.id===id))return result(s,false,'Укажи название проекта.');
 if(!genreOptions(s.music.genres,effectiveBeatSkill(s,skills)).available.includes(genre))return result(s,false,'Жанровая специализация пока недоступна.');
 if(softwareDiskBytes(s).free<2000000)return result(s,false,'Недостаточно места для нового проекта.');
 if(options.assetId&&drumById(options.assetId)?.retired)return result(s,false,RETIRED_DRUM_MESSAGE);
 if(options.assetId&&!s.music.owned.some(a=>a.id===options.assetId))return result(s,false,'Этот луп ещё не получен.');
 const skill=effectiveBeatSkill(s,skills),profile=genreSnapshot(s.music.genres,genre),parts=chooseBeginnerParts(random,{skill,genre,genreXP:profile.xp});
 const drumId=options.assetId||parts.drumsId;
 const beat=normalizeBeat({version:3,kind:'beat',id,name,genre,practicePolicy:2,songFormVersion:1,createdDay:Number.isSafeInteger(options.gameDay)&&options.gameDay>0?options.gameDay:1,genreProfile:profile,drumId,stages:[],mix:createBeatMix(id,{beatmaking:skill,sound:effectiveSoundSkill(s,skills)}),productionMode:skill<25?'beginner':'automatic',
  audio:{bankVersion:1,bars:4,levelVersion:1,themeId:parts.themeId,arrangementId:parts.arrangementId,...(parts.abstractRecipe?{abstractRecipe:parts.abstractRecipe}:{})}});
 s.projects.push(beat);s.music.activeBeatId=id;return result(s);
}
export function startBeatStage(input,id,values,skills={},random=Math.random,plan=null){
 if(input.rapAnalysis?.job?.status==='active'||input.rapResearch?.job?.status==='active')return result(input,false,'Сначала приостанови изучение.');
 if(input.recording?.job)return result(input,false,'Сначала заверши запись.');
 const s=normalized(input),beat=normalizeBeat(s.projects.find(p=>p.id===id)),blocked=workBlockReason(s);
 if(input.writing?.job)return result(s,false,'Сначала закончи текущий текст.');
 if(blocked)return result(s,false,blocked);
 if(!beat||beat.status==='ready')return result(s,false,'Этот этап недоступен.');
 if(beat.audioIssue)return result(s,false,beat.audioIssue==='retired-source'?RETIRED_DRUM_MESSAGE:'Не найден аудиобанк проекта. Работа сохранена.');
 if(s.music.job&&s.music.job.beatId!==id)return result(s,false,'Сначала закончи текущую работу.');
 if(!s.music.job){
  const v=plan?sliders(plan.sliders):values===undefined?Array.from({length:3},()=>Math.floor(clamp(random(),0,.999999)*11)):sliders(values);
  if(!v)return result(s,false,'Этот этап недоступен.');
  const skill=effectiveBeatSkill(s,skills);
  if(beat.practicePolicy===2&&!beat.practicePlan)beat.practicePlan={version:2,startSkill:skill,totalBudget:beatPracticeBudget(skill)};
  const stageBudget=beat.practicePolicy===2?beat.practicePlan.totalBudget/3:PRACTICE_PER_STAGE;
  const genreProfile=genreSnapshot(s.music.genres,beat.genreProfile?.id??'experimental');
  s.music.job={beatId:id,stage:beat.stages.length,sliders:v,total:Math.round(R.stageMinutes[beat.stages.length]*Math.max(.55,1-skill*.003)*(s.music.infected?1.35:1)),elapsed:0,skill,genreSkill:genreProfile.xp,genreProfile,stageBudget,practiceCredit:0,genreCredit:0};
  if(Number.isFinite(plan?.total)&&plan.total>0&&plan.total<=600)s.music.job.total=plan.total;
  if(beat.mix?.version===2){
   const profile=beat.genre===BEAT_PRACTICE.id?BEAT_PRACTICE:genreById(beat.genre);
   beat.mix.layers[beat.stages.length]=createBeatResult({seed:beat.mix.seed,stage:beat.stages.length,skills:{beatmaking:skill,sound:effectiveSoundSkill(s,skills)},sliders:v,targets:profile.targets[beat.stages.length],...(beat.genreProfile?{genreProfile}:{}),...(beat.practicePolicy===2?{execution:createBeatExecutionSnapshot({beatmaking:skill,genreXP:genreProfile.xp})}:{})});
  }
  s.projects[s.projects.findIndex(p=>p.id===id)]=beat;
 }
 s.music.activeBeatId=id;return result(s);
}
export function advanceBeatWork(input,requested){
 if(input.rapAnalysis?.job?.status==='active'||input.rapResearch?.job?.status==='active')return {state:input,minutes:0,finished:false,blocked:true,reason:'Сначала приостанови изучение.'};
 const s=normalized(input),job=s.music.job;
 if(!job||!Number.isFinite(requested)||requested<=0)return {state:s,minutes:0,finished:false,blocked:false};
 const current=normalizeBeat(s.projects.find(p=>p.id===job.beatId));
 if(!current||current.audioIssue)return {state:s,minutes:0,finished:false,blocked:true,reason:current?.audioIssue==='retired-source'?RETIRED_DRUM_MESSAGE:'Не найден аудиобанк проекта. Работа сохранена.'};
 const needs=s.music.needs,minutes=Math.max(0,Math.min(requested,job.total-job.elapsed,(needs.satiety-R.minSatiety)/R.satietyPerMinute,(needs.energy-R.minEnergy)/R.energyPerMinute));
 job.elapsed+=minutes;needs.satiety=clamp(needs.satiety-minutes*R.satietyPerMinute);needs.energy=clamp(needs.energy-minutes*R.energyPerMinute);
 const finished=job.total-job.elapsed<1e-7;
 if(minutes>0){
  const credit=(finished?1:job.elapsed/job.total)*job.stageBudget,gain=Math.max(0,credit-job.practiceCredit);
  s.music.practice=clamp(s.music.practice+gain,0,Math.max(s.music.practice,100-job.skill+s.music.practice-job.practiceCredit));job.practiceCredit=credit;
  s.music.genres=addGenrePractice(s.music.genres,job.genreProfile?.id??'experimental',Math.max(0,credit-job.genreCredit)*(current.practicePolicy===2?2:1));job.genreCredit=credit;
 }
 const practiceGained=Math.min(job.practiceCredit,100-job.skill);
 if(finished){
  const index=s.projects.findIndex(p=>p.id===job.beatId),beat=current;
  const layer=beat.mix?.version===2?beat.mix.layers[job.stage]:null;
  const fit=layer?.fit??0,quality=layer?.quality??Math.round(job.skill);
  beat.stages.push({sliders:job.sliders,fit,quality});beat.status=beat.stages.length===3?'ready':'draft';s.projects[index]=beat;
  s.music.job=null;
 }
 return {state:s,minutes,finished,practiceGained,blocked:!finished&&Boolean(workBlockReason(s))};
}
export function acquireDrum(input,id,method,random=Math.random){
 const s=normalized(input),asset=drumById(id);
 if(asset?.retired||asset?.bank!=='shop'||!['buy','torrent','rip'].includes(method))return result(s,false,'Источник недоступен.');
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
