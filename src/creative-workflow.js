import {BEAT_RULES,RETIRED_DRUM_MESSAGE} from './beat-catalog.js?rev=43';
import {normalizeMusic,normalizeBeat,startBeatStage,effectiveBeatSkill,workBlockReason} from './beat-production.js?rev=45';
import {normalizeWriting,startLyricWork,effectiveWritingSkill} from './lyric-production.js?rev=45';
const owner=kind=>kind==='beat'?'music':'writing';
const jobId=j=>j?.beatId??j?.projectId;
const triple=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)?v.map(x=>Math.max(0,Math.min(10,Math.round(x)))):null;
const duration=n=>Number.isFinite(n)&&n>0&&n<=600;
function validJob(kind,job,projects){
 if(!job)return null;
 return (kind==='beat'?normalizeMusic:normalizeWriting)({job},projects).job;
}

export function normalizeCreativeWork(value,projects=[]){
 const items=[],seen=new Set();
 for(const raw of Array.isArray(value?.items)?value.items:[]){
  const p=projects.find(p=>p.id===raw?.projectId&&p.kind===raw?.kind);
  if(!p||p.recoveryIssue||seen.has(p.id)||!['beat','lyrics'].includes(p.kind))continue;
  const plans=(Array.isArray(raw.plans)?raw.plans:[]).slice(0,3).map((v,stage)=>({stage,total:v?.total,sliders:triple(v?.sliders)}));
  if(plans.length!==3||plans.some(v=>!duration(v.total)||!v.sliders))continue;
  seen.add(p.id);items.push({projectId:p.id,kind:p.kind,plans,pausedJob:validJob(p.kind,raw.pausedJob,projects)});
 }
 return {version:1,activeId:items.some(i=>i.projectId===value?.activeId)?value.activeId:null,items};
}

export function startCreativeChain(input,{kind,projectId,stageSliders,gameDay=1}={},skills={},random=Math.random){
 const fail=reason=>({state:input,ok:false,reason});
 if(input.rapAnalysis?.job?.status==='active'||input.rapResearch?.job?.status==='active')return fail('Сначала приостанови изучение.');
 const p=input.projects?.find(p=>p.id===projectId&&p.kind===kind);
 if(!p||p.recoveryIssue||!['beat','lyrics'].includes(kind)||p.stages?.length>=3)return fail('Эта работа недоступна.');
 if(kind==='beat'&&normalizeBeat(p)?.audioIssue==='retired-source')return fail(RETIRED_DRUM_MESSAGE);
 const active=input.music?.job??input.writing?.job;
 if(input.recording?.job||active&&(jobId(active)!==projectId||active.kind&&active.kind!=='stage'))return fail('Сначала приостанови текущую работу.');
 const blocked=workBlockReason(input);if(blocked)return fail(blocked);
 const creativeWork=normalizeCreativeWork(input.creativeWork,input.projects);
 let item=creativeWork.items.find(i=>i.projectId===projectId);
 if(!item){
  const skill=kind==='beat'?effectiveBeatSkill(input,skills):effectiveWritingSkill(input,skills);
  const plans=Array.from({length:3},(_,stage)=>{
   const old=active?.stage===stage?active:null;
   const chosen=kind==='lyrics'&&skill<25?null:triple(stageSliders?.[stage]);
   return {stage,total:old?.total??(kind==='lyrics'?60:Math.round(BEAT_RULES.stageMinutes[stage]*Math.max(.55,1-skill*.003)*(input.music.infected?1.35:1))),sliders:old?.sliders??p.stages[stage]?.sliders??chosen??Array.from({length:3},()=>Math.floor(Math.max(0,Math.min(.999999,random()))*11))};
  });
  item={projectId,kind,plans,pausedJob:null};creativeWork.items.push(item);
 }
 const key=owner(kind),saved=item.pausedJob;
 let s={...input,creativeWork};
 if(saved&&!active){s={...s,[key]:{...s[key],job:saved,...(kind==='beat'?{activeBeatId:projectId}:{activeTextId:projectId})}};}
 else {
  const plan=item.plans[p.stages.length];
  const r=kind==='beat'?startBeatStage(s,projectId,plan.sliders,skills,random,plan):startLyricWork(s,{projectId,gameDay},skills,random,plan);
  if(!r.ok)return fail(r.reason);s=r.state;
 }
 item.pausedJob=null;creativeWork.activeId=projectId;
 return {state:s,ok:true,reason:''};
}

export function pauseCreativeChain(input){
 const creativeWork=normalizeCreativeWork(input.creativeWork,input.projects);
 const item=creativeWork.items.find(i=>i.projectId===creativeWork.activeId);
 if(!item)return input;
 const key=owner(item.kind),job=input[key]?.job;
 if(jobId(job)===item.projectId)item.pausedJob=validJob(item.kind,job,input.projects);
 creativeWork.activeId=null;
 return {...input,creativeWork,[key]:{...input[key],job:null}};
}

export function creativeChainProgress(state,projectId){
 const p=state.projects?.find(p=>p.id===projectId),completed=p?.stages?.length??0;
 // Load and commands validate the full archive. A frame needs only this plan.
 const raw=Array.isArray(state.creativeWork?.items)?state.creativeWork.items.find(i=>i?.projectId===projectId):null;
 const item=raw&&p?normalizeCreativeWork({items:[raw]},[p]).items[0]:null;
 const j=item&&(jobId(state[owner(item.kind)]?.job)===projectId?state[owner(item.kind)].job:item.pausedJob);
 const total=item?.plans.reduce((sum,p)=>sum+p.total,0)??3;
 const elapsed=item?item.plans.slice(0,completed).reduce((sum,p)=>sum+p.total,0)+(j?.elapsed??0):completed;
 return {overall:Math.min(1,Math.max(0,elapsed/total)),stage:j?j.elapsed/j.total:completed===3?1:0,index:Math.min(2,completed),count:3};
}
