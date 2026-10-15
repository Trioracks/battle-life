import {BEAT_RULES} from './beat-catalog.js?rev=43';
import {workBlockReason} from './beat-production.js?rev=43';
import {validGameMinute} from './game-minute.js?rev=43';
import {beatResultSeed} from './beat-result.js?rev=43';
import {normalizeRapAnalysis,studyInstallReason,studyHeroSnapshot,validStudyHeroSnapshot,finishStudyReport} from './rap-analysis.js?rev=43';
import {completeJudgeEvidence} from './judge-dossier-analysis.js?rev=43';
import {publicCharacterProfile} from './npc-social-profiles.js?rev=43';
import {caseStudySources} from './rap-research-sources.js?rev=43';

export const CASE_STUDY_MINUTES=Object.freeze({battle:360,round:360,judge:45,opponent:45});
export const STUDY_MINUTES_PER_SECOND=45/8;
const clone=v=>structuredClone(v),record=v=>v&&typeof v==='object'&&!Array.isArray(v),id=v=>typeof v==='string'&&v.length>0;
const ids=v=>Array.isArray(v)&&v.every(id)&&new Set(v).size===v.length;
const snapshotKeys=['sourceIds','reviewIds','judgeIds','trackVersionIds'];
const validSubject=s=>record(s)&&id(s.battleId)&&Object.hasOwn(CASE_STUDY_MINUTES,s.kind)&&(s.kind!=='round'||id(s.roundId))&&(!['judge','opponent'].includes(s.kind)||id(s.characterId));
const validSnapshot=s=>snapshotKeys.every(k=>ids(s?.[k]))&&s.reviewIds.every(id=>s.sourceIds.includes(id))&&s.trackVersionIds.every(id=>s.sourceIds.includes(id))&&validGameMinute(s.cutoff)&&validStudyHeroSnapshot(s.heroSnapshot);
const validJob=j=>record(j)&&id(j.id)&&validSubject(j.subject)&&j.kind===j.subject.kind&&validSnapshot(j)&&j.total===CASE_STUDY_MINUTES[j.kind]&&Number.isFinite(j.elapsed)&&j.elapsed>=0&&j.elapsed<j.total&&['active','paused'].includes(j.status)&&validGameMinute(j.startedAt)&&j.cutoff<=j.startedAt;
const validFinding=f=>record(f)&&id(f.id)&&validSubject(f.subject)&&f.kind===f.subject.kind&&validSnapshot(f)&&validGameMinute(f.createdAt)&&f.createdAt>=f.cutoff&&ids(f.reportIds)&&['unknown','observed'].includes(f.evidenceStatus)&&(f.evidenceStatus==='unknown'?f.reportIds.length===0:f.reportIds.length>0);
const subjectOf=({kind,battleId='makarevich-1',roundId,characterId})=>({kind,battleId,...(kind==='round'?{roundId}:{}),...(['judge','opponent'].includes(kind)?{characterId}:{})});
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sameEvidence=(a,b)=>snapshotKeys.every(k=>equal(a[k],b[k]));

export function normalizeRapResearch(raw){
 const recovery=Array.isArray(raw?.recovery)?clone(raw.recovery):[],findings={};
 const recover=(type,data,key)=>recovery.push({type,...(key?{id:key}:{}),recoveryData:clone(data),reason:'Повреждённое изучение сохранено отдельно и не завершено автоматически.'});
 if(raw!=null&&(!record(raw)||raw.version!==undefined&&raw.version!==1)){recover('research',raw);return {version:1,job:null,findings,nextSequence:1,recovery};}
 for(const [key,f]of Object.entries(record(raw?.findings)?raw.findings:{})){if(f?.id===key&&validFinding(f))findings[key]=clone(f);else recover('finding',f,key);}
 if(raw?.findings!=null&&!record(raw.findings))recover('findings',raw.findings);
 let job=null;if(raw?.job!=null){if(validJob(raw.job)&&!findings[raw.job.id])job=clone(raw.job);else recover('job',raw.job);}
 const sequence=Math.max(0,...[...Object.keys(findings),job?.id].map(key=>/^case-study:\d+$/.test(key??'')?Number(key.split(':')[1]):0));
 return {version:1,job,findings,nextSequence:Math.max(sequence+1,Number.isSafeInteger(raw?.nextSequence)&&raw.nextSequence>0?raw.nextSequence:1),recovery};
}
// Both ledgers must be normalized first: a rejected report cannot keep a case
// marked complete and prevent the player from studying the same sources again.
export function reconcileResearchFindings(research,analysis){
 const invalid=Object.values(research.findings).filter(f=>{
  const reports=f.reportIds.map(id=>analysis.reports[id]);
  return reports.length!==f.trackVersionIds.length||reports.some(r=>!r||!f.trackVersionIds.includes(r.trackVersionId)||r.createdAt>f.createdAt)||new Set(reports.map(r=>r?.trackVersionId)).size!==f.trackVersionIds.length;
 });
 if(!invalid.length)return research;
 const findings={...research.findings},recovery=[...research.recovery];
 for(const finding of invalid){delete findings[finding.id];recovery.push({type:'finding',id:finding.id,recoveryData:clone(finding),reason:'Отчёт этого изучения недоступен или повреждён. Исходное изучение сохранено; источники можно изучить снова.'});}
 return {...research,findings,recovery};
}
const otherWork=state=>state.music?.job||state.writing?.job||state.recording?.job||state.rapAnalysis?.job?.status==='active';
const missingSources=(state,j)=>j.trackVersionIds.some(id=>!state.trackVersions?.byId?.[id])||j.reviewIds.some(id=>!state.judging?.results?.[id]);
function availableSubject(state,subject,sources,nowMinute){
 const t=state.tournaments?.byId?.[subject.battleId];
 if(subject.kind==='battle')return Object.values(t?.rounds??{}).some(r=>r.opensAt<=nowMinute);
 if(subject.kind==='round')return t?.rounds?.[subject.roundId]?.opensAt<=nowMinute;
 if(subject.kind==='judge')return sources.judgeIds.includes(subject.characterId);
 return sources.trackVersionIds.length>0||publicCharacterProfile(state,{characterId:subject.characterId,nowMinute}).canView===true;
}
export function startCaseStudy(state,request={}){
 const fail=reason=>({ok:false,state,reason}),installation=studyInstallReason(state),subject=subjectOf(request),nowMinute=request.nowMinute;
 if(installation)return fail(installation);
 if(!validSubject(subject)||!validGameMinute(nowMinute))return fail('Не удалось определить предмет или дату изучения.');
 if(otherWork(state))return fail('Сначала приостанови текущую работу.');
 const blocked=workBlockReason(state);if(blocked)return fail(blocked);
 const analysis=normalizeRapAnalysis(state.rapAnalysis),research=reconcileResearchFindings(normalizeRapResearch(state.rapResearch),analysis),prepared={...state,rapAnalysis:analysis,rapResearch:research};
 if(research.job){
  if(!equal(research.job.subject,subject))return fail('Сначала заверши начатое изучение. Его источники не заменены.');
  if(nowMinute<research.job.startedAt||missingSources(state,research.job))return {...fail('Источник недоступен; изучение сохранено на паузе.'),state:pauseCaseStudy(prepared)};
  research.job.status='active';return {ok:true,state:prepared,jobId:research.job.id};
 }
 const sources=caseStudySources(state,{...subject,nowMinute}),heroSnapshot=studyHeroSnapshot(request.heroSnapshot);
 if(!availableSubject(state,subject,sources,nowMinute))return fail('Этот предмет изучения ещё не опубликован.');
 const prior=Object.values(research.findings).find(f=>equal(f.subject,subject)&&equal(f.heroSnapshot,heroSnapshot)&&sameEvidence(f,sources));
 if(prior)return {ok:true,state:prepared,findingId:prior.id,reason:'Это изучение уже сохранено.'};
 const id='case-study:'+research.nextSequence++;
 research.job={id,kind:subject.kind,subject,...sources,heroSnapshot,startedAt:nowMinute,total:CASE_STUDY_MINUTES[subject.kind],elapsed:0,status:'active'};
 return {ok:true,state:prepared,jobId:id};
}
export function pauseCaseStudy(state){if(!state.rapResearch?.job||state.rapResearch.job.status==='paused')return state;return {...state,rapResearch:{...state.rapResearch,job:{...state.rapResearch.job,status:'paused'}}};}

function completeCase(state,j,createdAt){
 const old=state.rapAnalysis??normalizeRapAnalysis(),analysis={...old,reports:{...old.reports},sourceIds:[...old.sourceIds]},reportIds=[];
 let next={...state,rapAnalysis:analysis},practiceGained=0;
 for(const trackVersionId of j.trackVersionIds){
  const version=state.trackVersions.byId[trackVersionId],reviewIds=j.reviewIds.filter(id=>state.judging.results[id]?.trackVersionId===trackVersionId);
  const prior=Object.values(analysis.reports).filter(r=>r.trackVersionId===trackVersionId).sort((a,b)=>a.createdAt-b.createdAt);
  let report=prior.find(r=>equal(r.heroSnapshot,j.heroSnapshot)&&equal(r.reviewIds,reviewIds));
  const reportJob={id:report?.id??'study:'+analysis.nextSequence++,trackVersionId,trackName:version.name,subjectId:version.npc?.characterId??'player',heroSnapshot:j.heroSnapshot,reviewIds,seed:beatResultSeed(trackVersionId+':'+JSON.stringify(j.heroSnapshot)+':'+reviewIds.join('|')),diversity:old.sourceIds.length,supersedes:prior.at(-1)?.id??null};
  if(!report){report=finishStudyReport(version,reportJob,createdAt);analysis.reports[report.id]=report;}
  reportIds.push(report.id);
  if(!analysis.sourceIds.includes(trackVersionId)){analysis.sourceIds.push(trackVersionId);practiceGained++;}
  // A case discovers people. Only a separate judge study grants taste hypotheses.
  if(j.kind==='judge')next=completeJudgeEvidence(next,{job:{...reportJob,id:j.id+':'+trackVersionId},report,nowMinute:createdAt});
 }
 const finding={id:j.id,kind:j.kind,subject:clone(j.subject),...Object.fromEntries(snapshotKeys.map(k=>[k,[...j[k]]])),cutoff:j.cutoff,heroSnapshot:clone(j.heroSnapshot),createdAt,reportIds,evidenceStatus:reportIds.length?'observed':'unknown'};
 return {state:{...next,rapResearch:{...state.rapResearch,job:null,findings:{...state.rapResearch.findings,[finding.id]:finding}}},practiceGained,finding};
}
export function advanceCaseStudy(state,{gameMinutes,nowMinute}={}){
 const idle={state,minutes:0,events:[],finished:false,blocked:false,practiceGained:0},j=state.rapResearch?.job;
 if(!j)return idle;
 if(!validJob(j))return {...idle,state:{...state,rapResearch:normalizeRapResearch(state.rapResearch)},blocked:true,reason:'Повреждённое изучение сохранено для восстановления.'};
 if(j.status!=='active'||!Number.isFinite(gameMinutes)||gameMinutes<=0||!validGameMinute(nowMinute)||nowMinute-gameMinutes<j.startedAt-1e-7)return idle;
 const installation=studyInstallReason(state);
 if(installation||otherWork(state)||missingSources(state,j))return {...idle,state:pauseCaseStudy(state),blocked:true,reason:installation||'Источник или работа недоступны; изучение сохранено на паузе.'};
 const n=state.music.needs,r=BEAT_RULES,minutes=Math.max(0,Math.min(gameMinutes,j.total-j.elapsed,(n.satiety-r.minSatiety)/r.satietyPerMinute,(n.energy-r.minEnergy)/r.energyPerMinute));
 const job={...j,elapsed:j.elapsed+minutes},finished=job.total-job.elapsed<1e-7,endedAt=nowMinute-gameMinutes+minutes;
 if(finished){
  const available=caseStudySources(state,{...j.subject,nowMinute:j.cutoff});
  if(snapshotKeys.some(k=>j[k].some(id=>!available[k].includes(id))))return {...idle,state:pauseCaseStudy(state),blocked:true,reason:'Сохранённые публичные источники недоступны; изучение на паузе.'};
 }
 const needs={satiety:Math.max(0,n.satiety-minutes*r.satietyPerMinute),energy:Math.max(0,n.energy-minutes*r.energyPerMinute)},blocked=!finished&&(needs.satiety<=r.minSatiety+1e-7||needs.energy<=r.minEnergy+1e-7);
 if(blocked)job.status='paused';
 let next={...state,music:{...state.music,needs},rapResearch:{...state.rapResearch,job}},practiceGained=0,events=[];
 if(finished){const done=completeCase(next,job,endedAt);next=done.state;practiceGained=done.practiceGained;events=[{type:'case-study-completed',findingId:job.id,dueAt:endedAt}];}
 return {state:next,minutes,events,finished,blocked,practiceGained,reason:blocked?'Нужно поесть или отдохнуть. Изучение сохранено.':''};
}
