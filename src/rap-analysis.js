import config from '../data/analysis/demo-v2-policy.json' with {type:'json'};
import {BEAT_RULES} from './beat-catalog.js?rev=61';
import {workBlockReason,effectiveBeatSkill} from './beat-production.js?rev=61';
import {effectiveWritingSkill} from './lyric-production.js?rev=61';
import {effectiveVocalSkill} from './vocal-production.js?rev=61';
import {validGameMinute} from './game-minute.js?rev=61';
import {beatResultSeed} from './beat-result.js?rev=61';
import {battleRandom} from './battle-seeding.js?rev=61';
import {publicTournamentTrackIds} from './battle-results-table.js?rev=61';
import {publicCharacterProfile} from './npc-social-profiles.js?rev=61';
import {completeJudgeEvidence} from './judge-dossier-analysis.js?rev=61';
import {validRapReport,reconcileResearchFindings} from './rap-report-schema.js?rev=61';
export const STUDY_POLICY=Object.freeze({...config.study});
export const ANALYSIS_AXES=['text','performance','music','sound'];
export const ANALYSIS_LABELS=['Ужасно','Очень плохо','Плохо','Средне','Хорошо','Очень хорошо','Отлично','Легендарно'];
const skillKeys=['intelligence','writing','musicality','flow','beatmaking','sound'],clone=v=>structuredClone(v),record=v=>v&&typeof v==='object'&&!Array.isArray(v),clamp=(v,max=100)=>Math.max(0,Math.min(max,Number.isFinite(v)?v:0));
const snapshot=skills=>Object.fromEntries(skillKeys.map(k=>[k,clamp(skills?.[k]??10)]));
const validSnapshot=v=>record(v)&&skillKeys.every(k=>Number.isFinite(v[k])&&v[k]>=0&&v[k]<=100);
export {snapshot as studyHeroSnapshot,validSnapshot as validStudyHeroSnapshot};
export const studyInstallReason=state=>state.software?.dossier?.installed===true?'':'Сначала установи Рэп-досье.';
const strings=v=>Array.isArray(v)&&v.every(x=>typeof x==='string');
function validStudyJob(j,reports){
 const kindValid=j?.kind==='study'||j?.kind==='judge-study'&&typeof j.judgeId==='string'&&reports?.[j.analysisReportId]?.trackVersionId===j.trackVersionId;
 return kindValid&&typeof j.id==='string'&&typeof j.trackVersionId==='string'&&typeof j.subjectId==='string'&&validSnapshot(j.heroSnapshot)&&Number.isFinite(j.elapsed)&&j.elapsed>=0&&j.elapsed<j.total&&j.total===STUDY_POLICY.durationGameMinutes&&['active','paused'].includes(j.status)&&strings(j.reviewIds)&&Number.isSafeInteger(j.seed)&&Number.isSafeInteger(j.diversity)&&j.diversity>=0&&validGameMinute(j.startedAt);
}
export function effectiveStudySkills(state,skills={}){return snapshot({...skills,writing:effectiveWritingSkill(state,skills),beatmaking:effectiveBeatSkill(state,skills),flow:effectiveVocalSkill(state,skills,'draft'),sound:effectiveVocalSkill(state,skills,'mix')});}
export function normalizeRapAnalysis(raw){
 const reports={},recovery=Array.isArray(raw?.recovery)?clone(raw.recovery):[],j=raw?.job;
 for(const [id,r]of Object.entries(record(raw?.reports)?raw.reports:{})){
  if(r?.id===id&&validRapReport(r))reports[id]=clone(r);
  else recovery.push({type:'report',id,recoveryData:clone(r),reason:'Повреждённый отчёт сохранён отдельно.'});
 }
 let job=null;
 if(j){if(validStudyJob(j,reports)&&!reports[j.id])job=clone(j);else recovery.push({type:'job',recoveryData:clone(j),reason:'Повреждённая работа не завершена автоматически.'});}
 const lastSequence=Math.max(0,...[...Object.keys(reports),job?.id].map(id=>/^study:\d+$/.test(id??'')?Number(id.split(':')[1]):0));
 return {version:1,job,reports,sourceIds:[...new Set(strings(raw?.sourceIds)?raw.sourceIds:[])],nextSequence:Math.max(lastSequence+1,Number.isSafeInteger(raw?.nextSequence)?raw.nextSequence:1),recovery};
}
export function publishedStudyReviews(state,{trackVersionId,nowMinute}={}){
 if(!validGameMinute(nowMinute))return [];
 const due=new Map();
 for(const t of Object.values(state.tournaments?.byId??{}))for(const r of Object.values(t.rounds??{}))for(const b of Object.values(r.judgeBatches??{}))if(b.publishedAt<=nowMinute)for(const id of b.resultIds)due.set(id,b.publishedAt);
 for(const e of state.socialRuntime?.events??[])if(e.type==='judge-review'&&e.dueAt<=nowMinute)due.set(e.resultId,e.dueAt);
 return [...due].map(([id,publishedAt])=>({...state.judging?.results?.[id],publishedAt})).filter(r=>r.id&&r.trackVersionId===trackVersionId);
}
export function canStudyTrack(state,trackVersionId,nowMinute){
 const v=state.trackVersions?.byId?.[trackVersionId];if(!v||v.createdAtMinute>nowMinute||!validGameMinute(nowMinute))return false;
 if(!v.npc)return true;
 return publicTournamentTrackIds(state,{battleId:v.npc.battleId,nowMinute}).has(trackVersionId)||publicCharacterProfile(state,{characterId:v.npc.characterId,nowMinute}).publicTrackVersionIds?.includes(trackVersionId)===true;
}
export function startTrackStudy(state,{trackVersionId,reviewIds=[],heroSnapshot,nowMinute}={}){
 const fail=reason=>({ok:false,state,reason});
 const installation=studyInstallReason(state);if(installation)return fail(installation);
 if(state.rapResearch?.job?.status==='active')return fail('Сначала приостанови текущее изучение.');
 if(!canStudyTrack(state,trackVersionId,nowMinute))return fail('Эта запись пока недоступна для изучения.');
 if(state.music?.job||state.writing?.job||state.recording?.job)return fail('Сначала приостанови текущую работу.');
 const blocked=workBlockReason(state);if(blocked)return fail(blocked);
 if(!strings(reviewIds))return fail('Не удалось прочитать источники.');
 const reviews=[...new Set(reviewIds)].sort(),published=new Set(publishedStudyReviews(state,{trackVersionId,nowMinute}).map(r=>r.id));
 if(reviews.some(id=>!published.has(id)))return fail('Можно изучать только опубликованный отзыв о выбранной версии.');
 const a=normalizeRapAnalysis(state.rapAnalysis),hero=snapshot(heroSnapshot),v=state.trackVersions.byId[trackVersionId];
 const prepared={...state,rapAnalysis:a,...(state.rapResearch?{rapResearch:reconcileResearchFindings(state.rapResearch,a)}:{})};
 if(a.job){if(a.job.trackVersionId!==trackVersionId)return fail('Сначала заверши начатое изучение.');a.job.status='active';return {ok:true,state:prepared,jobId:a.job.id};}
 const prior=Object.values(a.reports).filter(r=>r.trackVersionId===trackVersionId).sort((a,b)=>a.createdAt-b.createdAt);
 const existing=prior.find(r=>JSON.stringify(r.heroSnapshot)===JSON.stringify(hero)&&JSON.stringify(r.reviewIds)===JSON.stringify(reviews));
 if(existing)return {ok:true,state:prepared,reportId:existing.id,reason:'Этот разбор уже сохранён.'};
 const id='study:'+a.nextSequence++,seed=beatResultSeed(trackVersionId+':'+JSON.stringify(hero)+':'+reviews.join('|'));
 a.job={id,kind:'study',trackVersionId,trackName:v.name,subjectId:v.npc?.characterId??'player',heroSnapshot:hero,reviewIds:reviews,seed,diversity:a.sourceIds.length,total:STUDY_POLICY.durationGameMinutes,elapsed:0,status:'active',startedAt:nowMinute,supersedes:prior.at(-1)?.id??null};
 return {ok:true,state:prepared,jobId:id};
}
export function pauseStudy(state){if(!state.rapAnalysis?.job)return state;return {...state,rapAnalysis:{...state.rapAnalysis,job:{...state.rapAnalysis.job,status:'paused'}}};}
function profileSkill(hero,axis){return axis==='text'?hero.writing:axis==='performance'?(hero.flow+hero.musicality)/2:axis==='music'?(hero.musicality+hero.beatmaking)/2:hero.sound;}
export function finishStudyReport(version,job,createdAt){
 const p=STUDY_POLICY,random=battleRandom(job.seed),observations={};
 for(const axis of ANALYSIS_AXES){const own=profileSkill(job.heroSnapshot,axis),confidence=clamp(p.baseAccuracy+p.intelligenceWeight*job.heroSnapshot.intelligence/100+p.profileWeight*own/100+p.diversityWeight*Math.min(1,job.diversity/p.diversitySources),1),q=Number.isFinite(version.qualities?.[axis])?clamp(version.qualities[axis],10):null;
  const relative=clamp(p.relativeCenter+(q-own/10)*p.relativeSlope,10),estimate=clamp(relative*(1-confidence)+q*confidence+(random()*2-1)*p.noiseAmplitude*(1-confidence),10);
  observations[axis]={band:q===null||confidence<p.unknownBelow&&random()<.35?null:Math.min(7,Math.floor(estimate/10*8)),confidence};
 }return {id:job.id,subjectId:job.subjectId,trackVersionId:job.trackVersionId,trackName:job.trackName,createdAt,heroSnapshot:clone(job.heroSnapshot),observations,sourceIds:[job.trackVersionId],reviewIds:[...job.reviewIds],supersedes:job.supersedes};
}
export function advanceStudy(state,{gameMinutes,nowMinute}={}){
 const idle={state,minutes:0,events:[],finished:false,blocked:false,practiceGained:0},saved=state.rapAnalysis;
 if(saved?.job&&!validStudyJob(saved.job,saved.reports))return {...idle,state:{...state,rapAnalysis:normalizeRapAnalysis(saved)},blocked:true,reason:'Повреждённое изучение сохранено отдельно.'};
 const a=saved?{...saved,job:saved.job?{...saved.job}:null}:normalizeRapAnalysis(),j=a.job;
 if(!j||j.status!=='active'||!Number.isFinite(gameMinutes)||gameMinutes<=0||!validGameMinute(nowMinute))return idle;
 if(studyInstallReason(state)||state.rapResearch?.job?.status==='active'||state.music?.job||state.writing?.job||state.recording?.job)return {...idle,state:pauseStudy(state),blocked:true,reason:studyInstallReason(state)||'Сначала приостанови текущую работу.'};
 const v=state.trackVersions?.byId?.[j.trackVersionId];if(!v)return {...idle,state:pauseStudy(state),blocked:true,reason:'Источник недоступен; изучение сохранено на паузе.'};
 const n=state.music.needs,r=BEAT_RULES,minutes=Math.max(0,Math.min(gameMinutes,j.total-j.elapsed,(n.satiety-r.minSatiety)/r.satietyPerMinute,(n.energy-r.minEnergy)/r.energyPerMinute));
 j.elapsed+=minutes;const needs={satiety:clamp(n.satiety-minutes*r.satietyPerMinute),energy:clamp(n.energy-minutes*r.energyPerMinute)},finished=j.total-j.elapsed<1e-7,events=[];let practiceGained=0;
 let report=null;const endedAt=nowMinute-gameMinutes+minutes;
 if(finished){report=j.kind==='judge-study'?a.reports[j.analysisReportId]:finishStudyReport(v,j,endedAt);if(!report)return {...idle,state:pauseStudy(state),blocked:true,reason:'Исходный разбор недоступен; изучение сохранено на паузе.'};if(j.kind!=='judge-study'){a.reports={...a.reports,[report.id]:report};if(!a.sourceIds.includes(j.trackVersionId)){a.sourceIds=[...a.sourceIds,j.trackVersionId];practiceGained=1;}}a.job=null;events.push({type:'study-completed',reportId:report.id,dueAt:endedAt});}
 const blocked=!finished&&(needs.satiety<=r.minSatiety+1e-7||needs.energy<=r.minEnergy+1e-7);if(blocked)j.status='paused';
 let next={...state,music:{...state.music,needs},rapAnalysis:a};if(finished)next=completeJudgeEvidence(next,{job:j,report,nowMinute:endedAt});
 return {state:next,minutes,events,finished,blocked,practiceGained,reason:blocked?'Нужно поесть или отдохнуть. Изучение сохранено.':''};
}
export function publicAnalysisReport(report){
 if(!report)return null;const labels={},segments={};
 for(const axis of ANALYSIS_AXES){const o=report.observations[axis];labels[axis]=o.band===null?'Не удалось определить':ANALYSIS_LABELS[o.band];segments[axis]=o.band!==null&&profileSkill(report.heroSnapshot,axis)>=STUDY_POLICY.segmentSkill&&o.confidence>=STUDY_POLICY.segmentConfidence?ANALYSIS_LABELS.map((label,i)=>({label,selected:i===o.band})):null;}
 const confidence=ANALYSIS_AXES.reduce((n,k)=>n+report.observations[k].confidence,0)/4;
 return {id:report.id,subjectId:report.subjectId,trackVersionId:report.trackVersionId,trackName:report.trackName,createdAt:report.createdAt,supersedes:report.supersedes,labels,segments,confidenceText:confidence<.4?'Неуверенное впечатление':confidence<.75?'Есть основания для вывода':'Уверенное, но субъективное мнение',sources:[...report.sourceIds,...report.reviewIds]};
}
