import config from '../data/analysis/demo-v2-policy.json' with {type:'json'};
import {judgeProfile} from './judge-profiles.js?rev=61';
import {startTrackStudy,publishedStudyReviews,studyInstallReason} from './rap-analysis.js?rev=61';
import {beatResultSeed} from './beat-result.js?rev=61';
import {validGameMinute} from './game-minute.js?rev=61';
export const JUDGE_STUDY_POLICY=Object.freeze({...config.judgeStudy});
const clone=v=>structuredClone(v),record=v=>v&&typeof v==='object'&&!Array.isArray(v),strings=v=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const axes=new Set(['text','performance','music','sound']),directions=new Set(['more','less','attention']);
export function normalizeJudgeDossier(raw){const evidence=[],studies=[],recovery=Array.isArray(raw?.recovery)?clone(raw.recovery):[];for(const e of Array.isArray(raw?.evidence)?raw.evidence:[]){if(typeof e?.id==='string'&&typeof e.judgeId==='string'&&typeof e.reviewId==='string'&&typeof e.trackVersionId==='string'&&typeof e.analysisReportId==='string'&&typeof e.topic==='string'&&typeof e.observationKey==='string'&&axes.has(e.aspect)&&directions.has(e.direction)&&Number.isFinite(e.confidence)&&e.confidence>=0&&e.confidence<=1&&validGameMinute(e.createdAt))evidence.push(clone(e));else recovery.push({type:'evidence',recoveryData:clone(e)});}for(const s of Array.isArray(raw?.studies)?raw.studies:[]){if(typeof s?.id==='string'&&typeof s.analysisReportId==='string'&&typeof s.trackVersionId==='string'&&strings(s.reviewIds)&&validGameMinute(s.createdAt))studies.push(clone(s));else recovery.push({type:'study',recoveryData:clone(s)});}return {version:1,evidence,studies,recovery};}
function profileSkill(hero,aspect){return aspect==='text'?hero.writing:aspect==='performance'?(hero.flow+hero.musicality)/2:aspect==='music'?(hero.musicality+hero.beatmaking)/2:hero.sound;}
function clues(version,review){
 const families=review.families??[],facts=version.facts??[],text=review.comment.toLowerCase(),result=[],mix=facts.find(f=>f.key==='text.contentMix'),address=facts.find(f=>f.key==='text.addressing');
 const diss=/дисс|соперник|оппонент/.test(text)||families.some(f=>['format.diss','text.addressing'].includes(f));
 if(diss&&(mix||address)){const less=/перебор|слишком много|лишн|дисс[^.]{0,20}не нужен/.test(text),more=/без дисса|мало дисса|не хватает|недостаточно/.test(text);result.push({aspect:'text',topic:'diss',direction:less?'less':more?'more':'attention',value:(mix??address).value});}
 for(const family of families){if(family==='text.addressing'||family.startsWith('reaction.')||family.startsWith('pair.')||family.startsWith('format.')||family.startsWith('mixed.'))continue;const fact=facts.find(f=>f.key===family);if(!fact)continue;const aspect=family.startsWith('vocal.')?'performance':family.split('.')[0];if(axes.has(aspect))result.push({aspect,topic:family,direction:'attention',value:fact.value});}
 return [...new Map(result.map(c=>[c.topic,c])).values()];
}
export function inferJudgeEvidence({version,publishedReviews=[],analysisReport,heroSnapshot,priorEvidence=[],policy=JUDGE_STUDY_POLICY,nowMinute=analysisReport?.createdAt}={}){
 if(!version||analysisReport?.trackVersionId!==version.id||!validGameMinute(nowMinute)||analysisReport.createdAt>nowMinute)return [];
 const output=[];
 for(const review of publishedReviews){if(review.trackVersionId!==version.id||!validGameMinute(review.publishedAt)||review.publishedAt>nowMinute||typeof review.comment!=='string')continue;const judge=judgeProfile(review.judgeId);if(!judge)continue;
  for(const clue of clues(version,review)){const own=Math.min(profileSkill(heroSnapshot,clue.aspect),profileSkill(analysisReport.heroSnapshot,clue.aspect)),observation=analysisReport.observations[clue.aspect];if(own<policy.minimumProfile||judge.competence[clue.aspect]*100-own>policy.maximumCompetenceGap||observation.band===null)continue;
   const confidence=policy.profileWeight*own/100+policy.intelligenceWeight*Math.min(heroSnapshot.intelligence,analysisReport.heroSnapshot.intelligence)/100+policy.reportWeight*observation.confidence;if(confidence<policy.minimumConfidence)continue;
   const id=analysisReport.id+':'+review.id+':'+clue.topic;if(priorEvidence.some(e=>e.id===id)||output.some(e=>e.id===id))continue;
   output.push({id,judgeId:review.judgeId,reviewId:review.id,trackVersionId:version.id,analysisReportId:analysisReport.id,aspect:clue.aspect,topic:clue.topic,direction:clue.direction,confidence,observationKey:String(beatResultSeed(JSON.stringify(clue.value))),createdAt:nowMinute});
  }
 }return output;
}
const topics={diss:'работу против соперника','text.clarity':'ясность мысли','text.theme':'раскрытие темы','text.personal':'личное содержание','text.story':'историю','text.rhymes':'рифмы','text.line_rhythm':'ритм текста','text.complexity':'сложность текста','text.images':'образы','text.originality':'самобытность','text.image_density':'плотность образов','text.reference':'отсылки','music.groove':'ритм музыки','music.movement':'движение музыки','music.fills':'сбивки','music.melody':'мелодию','music.harmony':'гармонию','music.texture':'тембр','music.repetition':'повторы','music.development':'развитие музыки','music.transitions':'переходы','vocal.timing':'попадание в ритм','vocal.diction':'дикцию','vocal.delivery':'подачу','sound.balance':'баланс записи','sound.intelligibility':'разборчивость записи'};
export function publicJudgeHypotheses(evidence,nowMinute){
 const latest=new Map();for(const e of evidence??[])if(e.createdAt<=nowMinute){const key=e.judgeId+':'+e.reviewId+':'+e.topic,old=latest.get(key);if(!old||old.createdAt<e.createdAt)latest.set(key,e);}
 const groups=new Map();for(const e of latest.values()){const key=e.judgeId+':'+e.topic;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);}
 return [...groups.values()].map(rows=>{const first=rows[0],sources=new Set(rows.map(e=>e.trackVersionId)).size,variation=new Set(rows.map(e=>e.observationKey)).size,conflict=rows.some(e=>e.direction==='more')&&rows.some(e=>e.direction==='less'),confidence=rows.reduce((n,e)=>n+e.confidence,0)/rows.length,p=JUDGE_STUDY_POLICY,stage=conflict?'clue':sources>=p.confidentSources&&variation>=p.confidentSources&&confidence>=p.confidentThreshold?'confident':sources>=p.severalSources&&variation>=p.severalSources?'several':'clue',focus=topics[first.topic]??'этот аспект';
  return {judgeId:first.judgeId,aspect:first.aspect,topic:first.topic,stage,statement:conflict?'Пока не могу связать его требования к этому аспекту.':(stage==='clue'?'Похоже, обращает внимание на ':stage==='several'?'В нескольких разных работах выделяет ':'Устойчиво обращает внимание на ')+focus+'.',confidenceText:conflict?'Противоречивые источники снижают уверенность.':stage==='confident'?'Уверенная гипотеза, не раскрытый параметр судьи.':stage==='several'?'Есть несколько согласованных наблюдений.':'Слабая зацепка. Нужны другие работы.',sources:[...new Set(rows.map(e=>e.reviewId))]};});
}
export function startJudgeStudy(state,{judgeId,trackVersionId,reviewIds,analysisReportId,heroSnapshot,nowMinute}={}){
 const fail=reason=>({ok:false,state,reason}),report=state.rapAnalysis?.reports?.[analysisReportId];
 const installation=studyInstallReason(state);if(installation)return fail(installation);
 if(state.rapResearch?.job?.status==='active'||state.music?.job||state.writing?.job||state.recording?.job)return fail('Сначала приостанови текущую работу.');
 if(!report||report.trackVersionId!==trackVersionId||report.createdAt>nowMinute)return fail('Нужен законченный разбор именно этой версии трека.');
 if(!strings(reviewIds)||!reviewIds.length)return fail('Выбери опубликованный отзыв.');
 const available=new Set(publishedStudyReviews(state,{trackVersionId,nowMinute}).filter(r=>r.judgeId===judgeId).map(r=>r.id));if(reviewIds.some(id=>!available.has(id)))return fail('Отзыв ещё не опубликован или относится к другой работе либо судье.');
 const history=normalizeJudgeDossier(state.judgeDossier),used=new Set(history.studies.flatMap(s=>s.reviewIds)),fresh=[...new Set(reviewIds)].filter(id=>!used.has(id));
 if(!fresh.length)return {ok:true,state,alreadyStudied:true,reason:'Эти источники уже изучены; повторного расхода времени нет.'};
 const existing=state.rapAnalysis?.job;if(existing&&(existing.kind!=='judge-study'||existing.judgeId!==judgeId||existing.analysisReportId!==analysisReportId||existing.trackVersionId!==trackVersionId||JSON.stringify([...existing.reviewIds].sort())!==JSON.stringify([...fresh].sort())))return fail('Сначала заверши начатое изучение. Его источники не заменены.');
 const started=startTrackStudy(state,{trackVersionId,reviewIds:fresh,heroSnapshot,nowMinute});if(!started.ok)return started;if(!started.jobId)return fail('Разбор уже существует. Новых источников для отдельного изучения нет.');
 const j=started.state.rapAnalysis.job;
 if(j.kind==='judge-study'&&j.analysisReportId!==analysisReportId||j.kind!=='judge-study'&&j.elapsed>0)return fail('Сначала заверши начатое изучение.');
 return {...started,state:{...started.state,rapAnalysis:{...started.state.rapAnalysis,job:{...j,kind:'judge-study',judgeId,analysisReportId}}}};
}
export function completeJudgeEvidence(state,{job,report,nowMinute}){
 if(!job.reviewIds.length)return state;const history=normalizeJudgeDossier(state.judgeDossier);if(history.studies.some(s=>s.id===job.id))return state;
 const reviews=publishedStudyReviews(state,{trackVersionId:job.trackVersionId,nowMinute}).filter(r=>job.reviewIds.includes(r.id));
 const evidence=inferJudgeEvidence({version:state.trackVersions.byId[job.trackVersionId],publishedReviews:reviews,analysisReport:report,heroSnapshot:job.heroSnapshot,priorEvidence:history.evidence,nowMinute});
 history.evidence.push(...evidence);history.studies.push({id:job.id,analysisReportId:report.id,trackVersionId:job.trackVersionId,reviewIds:reviews.map(r=>r.id),createdAt:nowMinute});
 const dossier=clone(state.rapDossier??{version:1,cards:{},recovery:[]});
 for(const review of reviews){const card=dossier.cards[review.judgeId]??{characterId:review.judgeId,firstRecordedAt:nowMinute,reportIds:[],quotes:[]};if(!card.reportIds.includes(report.id))card.reportIds.push(report.id);if(!card.quotes.some(q=>q.id===review.id))card.quotes.push({id:review.id,judgeId:review.judgeId,trackVersionId:review.trackVersionId,comment:review.comment,publishedAt:review.publishedAt,recordedAt:nowMinute,grade:review.grade??null});dossier.cards[review.judgeId]=card;}
 return {...state,judgeDossier:history,rapDossier:dossier};
}
