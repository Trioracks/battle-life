// Persisted, symbolic writing: no copyrighted lyrics or generated prose.
import {BATTLE_BRIEFS} from './virtual-pc-catalog.js?rev=43';
import {BEAT_RULES,RETIRED_DRUM_MESSAGE} from './beat-catalog.js?rev=43';
import {normalizeBeat,normalizeMusic,workBlockReason} from './beat-production.js?rev=47';
import {softwareDiskBytes} from './pc-software.js?rev=43';
import {homeDateLabel} from './home-calendar.js?rev=43';
import {lyricOutcomes,normalizeProductionOutcome} from './production-outcomes.js?rev=43';
import {chooseTrackReferences,STARTING_REFERENCE_TOPICS,REFERENCE_CATALOG} from './cultural-references.js?rev=43';
import {normalizeContentMix,createAutomaticContentMix,redistributeContentMix,CONTENT_POLICY_VERSION} from './text-content-mix.js?rev=43';
import {currentRoundTopic} from './round-topics.js?rev=43';
import {ROUND_LABELS} from './battle-results-table.js?rev=43';
import {distinctProjectName} from './beat-names.js?rev=43';

export const LYRIC_STAGES=Object.freeze([
 {name:'Общее создание',sliders:['Ясность мысли','Развитие темы','Личное отношение'],target:[8,7,6]},
 {name:'Написание рифм',sliders:['Точность рифм','Ритм строк','Сложность'],target:[8,8,5]},
 {name:'Добавление образов',sliders:['Наглядность','Оригинальность','Плотность образов'],target:[8,7,5]},
]);
const number=(v,f=0)=>Number.isFinite(v)?v:f;
const clamp=(v,lo=0,hi=100)=>Math.max(lo,Math.min(hi,number(v)));
const text=(v,n=100)=>typeof v==='string'?v.trim().slice(0,n):'';
const values=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)?v.map(x=>Math.round(clamp(x,0,10))):null;
const kinds=new Set(['stage','diss','story','chorus','adapt','refine']);
const workReward=kind=>kind==='refine'?1/9:1/3;
const count=value=>Math.max(0,Math.floor(number(value)));
const sectionTypes=new Set(['draft','intro','verse','bridge','chorus','outro','diss','story']);
const titles={draft:'',intro:'Интро',verse:'Куплет',bridge:'Бридж',chorus:'Припев',outro:'Аутро',diss:'Диссовая часть',story:'Сюжетный куплет'};
const validDay=v=>Number.isSafeInteger(v)&&v>0&&v<100000?v:1;
const outcome=(state,ok=true,reason='')=>({state,ok,reason});
function generator(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
function normalizeSections(list){
 return (Array.isArray(list)?list:[]).slice(0,16).filter(s=>sectionTypes.has(s?.type)).map(s=>({type:s.type,title:s.type==='draft'?'':text(s.title,64)||titles[s.type],...(['prose','lines'].includes(s.presentation)?{presentation:s.presentation}:{}),lines:(Array.isArray(s.lines)?s.lines:[]).slice(0,32).map(l=>({words:(Array.isArray(l?.words)?l.words:[]).slice(0,24).filter(w=>text(w?.text,32)).map(w=>({text:text(w.text,32),error:w.error===true})),note:text(l?.note,96),unfinished:l?.unfinished===true,indent:Math.round(clamp(l?.indent,0,3)),gapBefore:l?.gapBefore===true})).filter(l=>l.words.length)}));
}
export function normalizeLyric(p){
 if(p?.schemaVersion!==1||p.kind!=='lyrics'||!text(p.id)||!text(p.name,64))return null;
 const battle=BATTLE_BRIEFS.find(b=>b.id===p.battleId),stages=[];
 for(const s of (Array.isArray(p.stages)?p.stages:[]).slice(0,3)){const v=values(s?.sliders);if(!v)break;stages.push({sliders:v,skill:clamp(s.skill),quality:clamp(s.quality),...(s.resultVersion===1?{resultVersion:1}:{})});}
 const produced=normalizeProductionOutcome(p.productionOutcome),contentMix=normalizeContentMix(p.contentMix);
 const history=(Array.isArray(p.revisionHistory)?p.revisionHistory:[]).map(snapshot=>normalizeLyric({...snapshot,revisionHistory:null})).filter(Boolean);
 const references=(Array.isArray(p.referenceUses)?p.referenceUses:[]).slice(0,2).filter(use=>REFERENCE_CATALOG.some(r=>r.id===use.referenceId&&r.sourceId===use.sourceId)&&Number.isFinite(use.fit)&&Number.isFinite(use.clarity)).map(use=>({referenceId:use.referenceId,sourceId:use.sourceId,fit:clamp(use.fit,0,1),clarity:clamp(use.clarity,0,1),placement:use.placement==='ending'?'ending':'body',origin:'production-simulation'}));
 return {refinementCount:count(p.refinementCount),adaptationCount:Math.max(count(p.adaptationCount),p.adaptation&&text(p.adaptation.beatId)?1:0),...(history.length?{revisionHistory:history}:{}),...(contentMix?{contentMix,contentPolicyVersion:CONTENT_POLICY_VERSION,contentEvidence:'known'}:{contentEvidence:'legacy'}),...(text(p.contentSource?.id)?{contentSource:{id:text(p.contentSource.id),revision:Math.max(1,Math.floor(number(p.contentSource.revision,1)))}}:{}),schemaVersion:1,kind:'lyrics',id:text(p.id),name:text(p.name,64),seed:Math.floor(clamp(p.seed,0,4294967295)),revision:Math.max(1,Math.floor(clamp(p.revision,1,10000))),createdDay:validDay(p.createdDay),updatedDay:validDay(p.updatedDay??p.createdDay),createdDate:homeDateLabel(validDay(p.createdDay)),updatedDate:homeDateLabel(validDay(p.updatedDay??p.createdDay)),battleId:battle?.id??null,battleName:battle?.title??'Вне баттла',round:text(p.round,64)||'Отбор',roundId:text(p.roundId,64)||'selection',themeId:text(p.themeId,120)||null,opponent:text(p.opponent,64)||'Не назначен',stages,status:stages.length===3?'ready':'draft',sections:normalizeSections(p.sections),additions:(Array.isArray(p.additions)?p.additions:[]).slice(0,6).filter(a=>['diss','story','chorus'].includes(a?.kind)).map(a=>({kind:a.kind,skill:clamp(a.skill),...(a.resultVersion===1?{resultVersion:1}:{})})),adaptation:p.adaptation&&text(p.adaptation.beatId)?{beatId:text(p.adaptation.beatId),beatName:text(p.adaptation.beatName,64),bpm:90,skill:clamp(p.adaptation.skill)}:null,...(produced?{productionOutcome:produced}:{}),...(references.length?{referenceUses:references}:{})};
}
function selectedLyric(projects,id){
 if(typeof id!=='string')return null;
 for(const raw of projects){
  if(text(raw?.id)!==id)continue;
  const lyric=normalizeLyric(raw);if(lyric)return lyric;
 }
 return null;
}
export function normalizeWriting(value,projects=[]){
 const w=value??{},j=w.job,p=selectedLyric(projects,j?.projectId),v=values(j?.sliders);
 const valid=p&&kinds.has(j.kind)&&j.baseRevision===p.revision&&j.stage===p.stages.length&&v&&Number.isFinite(j.total)&&j.total>0&&j.total<=600&&(j.kind!=='refine'||j.total===60)&&Number.isFinite(j.elapsed)&&j.elapsed>=0&&j.elapsed<j.total&&(j.kind==='stage'?p.status==='draft':p.status==='ready');
 const job=valid?{projectId:p.id,kind:j.kind,stage:j.stage,baseRevision:p.revision,sliders:v,total:j.total,elapsed:j.elapsed,skill:clamp(j.skill),practiceCredit:clamp(j.practiceCredit,0,j.elapsed/j.total*workReward(j.kind)),gameDay:validDay(j.gameDay),beatId:text(j.beatId)||null}:null;
 const active=p?.id===w.activeTextId?p:selectedLyric(projects,w.activeTextId);
 return {practice:clamp(w.practice),activeTextId:active?active.id:null,job,
  ...(Array.isArray(w.referenceHistory)?{referenceHistory:w.referenceHistory.slice(-50).map(work=>({referenceIds:(Array.isArray(work?.referenceIds)?work.referenceIds:[]).filter(id=>REFERENCE_CATALOG.some(r=>r.id===id))}))}:{}),
  ...(Array.isArray(w.knownReferenceTopics)?{knownReferenceTopics:[...new Set(w.knownReferenceTopics.filter(g=>REFERENCE_CATALOG.some(r=>r.group===g)))]}:{})};
}
function normalized(input){const projects=[...(input.projects??[])];return {...input,projects,music:normalizeMusic(input.music,projects),writing:normalizeWriting(input.writing,projects)};}
export const effectiveWritingSkill=(state,skills={})=>clamp(number(skills.writing,10)+number(state.writing?.practice));
// Resolve legacy contentSource chains only at selection/command boundaries.
function lyricLineage(p,byId){const seen=new Set();while(p?.contentSource?.id&&!seen.has(p.id)){seen.add(p.id);const parent=byId.get(p.contentSource.id);if(!parent)return p.contentSource.id;p=parent;}return p?.id;}
export function latestReadyLyrics(projects=[]){
 const lyrics=projects.filter(p=>p.kind==='lyrics'),byId=new Map(lyrics.map(p=>[p.id,p])),groups=new Map();
 for(const raw of lyrics){if(raw.status!=='ready')continue;const key=lyricLineage(raw,byId),previous=groups.get(key);if(!previous||raw.revision>previous.revision||raw.revision===previous.revision&&(raw.updatedDay??0)>=(previous.updatedDay??0))groups.set(key,raw);}
 return [...groups.values()];
}
export function latestReadyLyric(projects,id){
 const source=projects.find(p=>p.id===id&&p.kind==='lyrics');if(!source)return null;
 const byId=new Map(projects.filter(p=>p.kind==='lyrics').map(p=>[p.id,p]));
 return normalizeLyric(latestReadyLyrics(projects).find(p=>lyricLineage(p,byId)===lyricLineage(source,byId)));
}
export function lyricBattleOptions(state){const briefs=BATTLE_BRIEFS.map(b=>({...b,theme:currentRoundTopic(state,b.id)?.title??b.theme}));return {registered:briefs.filter(b=>state.battleApplications?.some(a=>a.battleId===b.id)),other:briefs.filter(b=>!state.battleApplications?.some(a=>a.battleId===b.id))};}
export function createLyric(input,options={},skills={},random=Math.random){
 if(input.recording?.job)return {state:input,ok:false,reason:'Сначала заверши запись.'};
 const s=normalized(input),battle=BATTLE_BRIEFS.find(b=>b.id===options.battleId),topic=battle?currentRoundTopic(s,battle.id):null,id=text(options.id),name=text(options.name,64)||topic?.title||battle?.theme;
 if(!id||!name||s.projects.some(p=>p.id===id)||options.battleId&&!battle)return outcome(s,false,'Укажи название и доступный баттл.');
 const distinct=distinctProjectName(name,s.projects.filter(p=>p.kind==='lyrics').map(p=>p.name));if(distinct!==name)return outcome(s,false,'Такой текст уже есть. Попробуй «'+distinct+'».');
 if(softwareDiskBytes(s).free<2000000)return outcome(s,false,'Недостаточно места для нового текста.');
 if(s.writing.job||s.music.job)return outcome(s,false,'Сначала закончи текущую работу.');
 const day=validDay(options.gameDay),seed=Math.floor(clamp(random(),0,.999999999)*4294967296),p=normalizeLyric({schemaVersion:1,kind:'lyrics',id,name,battleId:battle?.id,roundId:topic?.roundId,round:ROUND_LABELS[topic?.roundId]??'Отбор',themeId:topic?.id,seed,contentMix:createAutomaticContentMix(seed),contentPolicyVersion:CONTENT_POLICY_VERSION,revision:1,createdDay:day,updatedDay:day,stages:[],sections:[],additions:[]});
 s.projects.push(p);s.writing.activeTextId=id;return outcome(s);
}
export function canEditLyricContentMix(state,project){
 return Boolean(project?.contentMix&&project.stages.length===0&&!state.writing?.job&&!state.recording?.job&&!state.creativeWork?.items.some(i=>i.projectId===project.id));
}
export function setLyricContentMix(input,{projectId,key,value}={},skills={}){
 const p=normalizeLyric(input.projects?.find(p=>p.id===projectId));
 if(effectiveWritingSkill(input,skills)<25)return outcome(input,false,'Распределение содержания откроется на Письме 25.');
 if(!canEditLyricContentMix(input,p))return outcome(input,false,'Содержание начатой работы сохранено. Готовый текст можно доработать.');
 const contentMix=redistributeContentMix(p.contentMix,{key,value,step:10});if(!contentMix)return outcome(input,false,'Проверь доли содержания.');
 return outcome({...input,projects:input.projects.map(item=>item.id===projectId?{...p,contentMix}:item)});
}
export function createLyricContentRevision(input,{projectId,gameDay=1}={},skills={}){
 return startLyricWork(input,{projectId,kind:'refine',gameDay},skills);
}
export function lyricRefinementReason(state,p,skills={}){
 if(p?.status!=='ready')return 'Сначала закончи три этапа текста.';
 if(p.refinementCount>=3)return 'Все три доработки этого текста использованы.';
 const ceiling=effectiveWritingSkill(state,skills);
 return p.stages.some(stage=>stage.quality<ceiling)?'':'Письмо пока не позволяет улучшить этот текст. Повысь навык.';
}
export function startLyricWork(input,{projectId,kind='stage',sliders,beatId,gameDay=1}={},skills={},random=Math.random,plan=null){
 if(input.rapAnalysis?.job?.status==='active'||input.rapResearch?.job?.status==='active')return {ok:false,state:input,reason:'Сначала приостанови изучение.'};
 if(input.recording?.job)return {state:input,ok:false,reason:'Сначала заверши запись.'};
 // Check the raw other job before normalization can discard unknown older projects.
 if(input.music?.job)return outcome(input,false,'Сначала закончи работу над битом.');
 const s=normalized(input),p=normalizeLyric(s.projects.find(p=>p.id===projectId)),blocked=workBlockReason(s);
 if(blocked)return outcome(s,false,blocked);
 if(!p||!kinds.has(kind))return outcome(s,false,'Работа недоступна.');
 const adaptationBeat=kind==='adapt'?normalizeBeat(s.projects.find(b=>b.id===(s.writing.job?.beatId??beatId))):null;
 if(adaptationBeat?.audioIssue)return outcome(s,false,adaptationBeat.audioIssue==='retired-source'?RETIRED_DRUM_MESSAGE:'Бит для адаптации больше не доступен.');
 if(s.writing.job){if(s.writing.job.projectId!==projectId||s.writing.job.kind!==kind)return outcome(s,false,'Сначала закончи текущий текст.');s.writing.activeTextId=projectId;return outcome(s);}
 if(kind==='stage'?p.status!=='draft':p.status!=='ready')return outcome(s,false,'Сначала закончи три этапа текста.');
 if(kind==='refine'){const reason=lyricRefinementReason(s,p,skills);if(reason)return outcome(s,false,reason);}
 if(kind==='adapt'&&p.adaptationCount>=3)return outcome(s,false,'Все три адаптации этого текста использованы.');
 if(['diss','story','chorus'].includes(kind)&&(p.battleId==='yard-cipher'||p.additions.length>=6))return outcome(s,false,'Этот формат не допускает новых частей.');
 if(kind==='chorus'&&p.battleId==='open-mic-17')return outcome(s,false,'В этом баттле требуется история без припева.');
 const beat=normalizeBeat(s.projects.find(b=>b.id===beatId));
 if(kind==='adapt'&&(!beat||beat.status!=='ready'))return outcome(s,false,'Выбери готовый бит.');
 const skill=effectiveWritingSkill(s,skills),v=plan?values(plan.sliders):skill<25||sliders===undefined?Array.from({length:3},()=>Math.floor(clamp(random(),0,.999999)*11)):values(sliders);
 if(!v)return outcome(s,false,'Проверь настройки этапа.');
 s.writing.job={projectId,kind,stage:p.stages.length,baseRevision:p.revision,sliders:v,total:kind==='refine'?60:Number.isFinite(plan?.total)&&plan.total>0&&plan.total<=600?plan.total:kind==='stage'?60:45,elapsed:0,skill,practiceCredit:0,gameDay:validDay(gameDay),beatId:kind==='adapt'?beat.id:null};s.writing.activeTextId=projectId;return outcome(s);
}
function makeSections(p){
 const phase=p.stages.length,baseLevel=p.stages.reduce((n,s)=>n+s.quality,0)/Math.max(1,phase),adapted=p.adaptation?Math.min(12,p.adaptation.skill*.15):0,baseCraft=Math.min(100,baseLevel+adapted);
 const authorSkill=p.stages.reduce((n,s)=>n+s.skill,0)/Math.max(1,phase),prose=authorSkill<25&&!p.adaptation;
 let types=prose||phase===1?['draft']:baseCraft<25?['verse']:baseCraft<55||phase===2?['verse','chorus','verse']:['intro','verse','bridge','chorus','verse','bridge','chorus','outro'];
 if(p.battleId==='open-mic-17')types=types.filter(t=>t!=='chorus');
 if(p.battleId==='yard-cipher')types=[prose||phase===1?'draft':'verse'];
 const baseSections=types.length;types.push(...p.additions.map(a=>a.kind));
 const notes=authorSkill<25?[]:authorSkill<50?['Придумать потом рифму','Закончить эту мысль','Найти другое слово','Поправить, чтобы легло в бит']:['Придумать потом рифму','Тут надо придумать панч','Нужно сравнение…','Поправить, чтобы легло в бит','Поменять размерность','Закончить эту мысль','Найти другое слово'];
 const topic=p.name+' '+p.battleName,motif=/ден(?:ьг|ег)|бабк|кэш|богат|cash|money|доллар/i.test(topic)?'$$$':/спальн|район|сон|ноч|двор/i.test(topic)?'Zzz…':null;
 let lineIndex=0;
 return types.map((type,section)=>{
  const level=section>=baseSections?p.additions[section-baseSections].skill:baseLevel,craft=Math.min(100,level+adapted);
  const count=p.battleId==='yard-cipher'?8:type==='draft'||type==='verse'&&craft<25?12:['verse','diss','story'].includes(type)?8:type==='chorus'?4:2;
  const lines=Array.from({length:count},(_,line)=>{
   const index=lineIndex++,r=generator(p.seed+Math.imul(index+1,2654435761)),rawCount=3+Math.floor(r()*8),target=7+index%2;
   // Rework the same seeded words, not an unrelated document on every pass.
   const regularity=p.adaptation ? .8+Math.min(.18,p.adaptation.skill*.0018) : phase===1 ? .03 : phase===2 ? .35+craft*.001 : .65+craft*.001;
   const wordCount=Math.round(rawCount+(target-rawCount)*regularity);
   const rank=(index*7+p.seed%10)%10,budget=p.adaptation?Math.max(0,2-Math.floor(p.adaptation.skill/40)):phase===1?8:phase===2?5:3;
   const note=notes.length&&index<12&&rank<budget?notes[(index+Math.floor(p.seed/10))%notes.length]:'';
   const unfinished=Boolean(note)&&index%2===0;
   const words=Array.from({length:wordCount},(_,word)=>{
    const wr=generator(p.seed+Math.imul(index+1,7919)+Math.imul(word+1,104729)),length=2+Math.floor(wr()*6);
    const symbols=Array.from({length},(_,i)=>i%2===0?'∎':'□').join('');
    const error=level<85&&(wr()<(1-level/85)*(.25-phase*.035)||level<25&&index===0&&word===1);
    return {text:symbols,error};
   });
   if(motif&&index%6===0)words[Math.min(2,words.length-1)]={text:motif,error:false};
   const punctuation=unfinished?'…':['.',',','!?',':','!','###','****'][Math.floor(r()*7)];
   if(words.at(-1).text!==motif)words.at(-1).text+=punctuation;
   return {words,note,unfinished,indent:prose?0:phase===1?Math.floor(r()*4):phase===2&&index%4===1?1:0,gapBefore:prose?line>0&&line%7===0:phase===1?r()>.55:line>0&&line%4===0};
  });return {type,presentation:prose&&section<baseSections?'prose':'lines',title:type==='draft'?'':titles[type]+(['verse','bridge'].includes(type)?' '+(types.slice(0,section+1).filter(t=>t===type).length):''),lines};
 });
}
export function advanceLyricWork(input,requested,clock=null){
 if(input.rapAnalysis?.job?.status==='active'||input.rapResearch?.job?.status==='active')return {state:input,minutes:0,finished:false,blocked:true,practiceGained:0,reason:'Сначала приостанови изучение.'};
 const s=normalized(input),j=s.writing.job,empty={state:s,minutes:0,finished:false,blocked:false,practiceGained:0};
 if(!j||!Number.isFinite(requested)||requested<=0)return empty;
 const p=normalizeLyric(s.projects.find(p=>p.id===j.projectId)),needs=s.music.needs,R=BEAT_RULES;
 const adaptationBeat=j.kind==='adapt'?normalizeBeat(s.projects.find(b=>b.id===j.beatId)):null;
 if(adaptationBeat?.audioIssue)return {...empty,blocked:true,reason:adaptationBeat.audioIssue==='retired-source'?RETIRED_DRUM_MESSAGE:'Бит для адаптации больше не доступен.'};
 if(j.kind==='adapt'&&adaptationBeat?.status!=='ready')return {...empty,blocked:true,reason:'Бит для адаптации больше не доступен.'};
 const minutes=Math.max(0,Math.min(requested,j.total-j.elapsed,(needs.satiety-R.minSatiety)/R.satietyPerMinute,(needs.energy-R.minEnergy)/R.energyPerMinute));
 j.elapsed+=minutes;needs.satiety=clamp(needs.satiety-minutes*R.satietyPerMinute);needs.energy=clamp(needs.energy-minutes*R.energyPerMinute);
 const finished=j.total-j.elapsed<1e-7,credit=(finished?1:j.elapsed/j.total)*workReward(j.kind);
 s.writing.practice=clamp(s.writing.practice+Math.max(0,credit-j.practiceCredit),0,Math.max(s.writing.practice,100-j.skill+s.writing.practice-j.practiceCredit));j.practiceCredit=credit;
 if(finished){
  if(j.kind==='stage'){
   const target=LYRIC_STAGES[j.stage].target,fit=1-j.sliders.reduce((sum,v,i)=>sum+Math.abs(v-target[i]),0)/30;
   p.stages.push({sliders:j.sliders,skill:j.skill,quality:Math.round(clamp(j.skill*(.55+.45*fit))),resultVersion:1});
  }else {
   const {revisionHistory,...snapshot}=p;p.revisionHistory=[...(revisionHistory??[]),structuredClone(snapshot)];p.revision++;
   if(j.kind==='adapt'){const b=s.projects.find(p=>p.id===j.beatId);p.adaptation={beatId:b.id,beatName:b.name,bpm:90,skill:j.skill};p.adaptationCount++;}
   else if(j.kind==='refine'){p.refinementCount++;p.stages=p.stages.map(stage=>{const gain=Math.min(2,Math.max(0,j.skill-stage.quality));return {...stage,quality:stage.quality+gain,skill:stage.skill+Math.min(gain,Math.max(0,j.skill-stage.skill))};});}
   else p.additions.push({kind:j.kind,skill:j.skill});
  }
  // The job may cross midnight or resume several days after it was started.
  p.updatedDay=clock&&Number.isSafeInteger(clock.day)&&clock.day>0&&Number.isFinite(clock.minutes)?validDay(clock.day+Math.floor((clock.minutes+minutes)/1440)):j.gameDay;p.status=p.stages.length===3?'ready':'draft';
  const generated=makeSections(p);p.sections=['diss','story','chorus'].includes(j.kind)?[...p.sections,generated.at(-1)]:generated;
  if(j.kind==='stage'&&j.stage===2){
   const topic=p.name+' '+p.battleName,theme=/ден|money|cash/i.test(topic)?'money':/район|двор|спальн/i.test(topic)?'district':/памят|прошл|детств/i.test(topic)?'memory':'rivalry';
   const gameDate=homeDateLabel(p.updatedDay).split('.').reverse().join('-');
   const selected=chooseTrackReferences({seed:p.seed,gameDate,knownTopics:s.writing.knownReferenceTopics??STARTING_REFERENCE_TOPICS,theme,history:s.writing.referenceHistory,limit:1});
   p.referenceUses=selected.uses.map(use=>({...use,fit:use.fit*j.skill/100,clarity:use.clarity*(.4+.6*j.skill/100)}));
   s.writing.referenceHistory=selected.history;
  }
  if(['diss','story','chorus'].includes(j.kind))p.additions.at(-1).resultVersion=1;
  p.productionOutcome=lyricOutcomes({project:p});
  s.projects[s.projects.findIndex(v=>v.id===p.id)]=normalizeLyric(p);s.writing.job=null;
 }
 return {state:s,minutes,finished,blocked:!finished&&Boolean(workBlockReason(s)),practiceGained:Math.min(credit,100-j.skill)};
}
